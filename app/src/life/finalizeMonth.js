// finalizeMonth (09 §5–§8, task 44). Pure and deterministic: charges exactly what planMonth fixed, in the 09 §6 order:
// income → housing → utilities & insurance → living → lifestyle → events → the card cycle → late fees → loans → sweep;
// then credit, care, investments, wellbeing, and eviction/foreclosure on the 3rd missed housing payment in a row.
// Missed payments (credit −60) are creditor bills only: housing, utilities & insurance, the card minimum. Living,
// lifestyle and event costs that money can't cover are `wentWithout` (see DEVIATIONS, task 44).
// Mutates the state it's given (a store draft, like ledger.js) and returns {state, result}.
import { CREDIT, LIFE } from '../config.js';
import { freshPaperwork } from '../state/schema.js';
import { mulRate } from '../finance/money.js';
import {
  post, charge, transfer, available, payLoan, closeLoan, removeRecurring, setAgreementStatus, compactHistory,
} from '../finance/ledger.js';
import { cash, netWorth, monthTotalsOf } from '../finance/ledgerTotals.js';
import { cycle, applyCycle } from '../finance/creditCard.js';
import { monthlyUpdate, adjustScore, utilization } from '../finance/creditScore.js';
import { PET_NAMES, HEN_NAMES } from '../phases/design/houseModel.js';
import { byId } from '../data/locations/index.js';
import { monthName } from '../util/dates.js';
import { hasYard } from './timeBudget.js';
import { monthBills, monthRng, livingPlants, presentAnimals } from './planMonth.js';
import { isOwner } from './events.js';
import { wellbeingDeltas, applyWellbeing } from './wellbeing.js';

const CASH = ['checking', 'savings'];
const ANY = ['checking', 'savings', 'card'];
const sum = (items) => items.reduce((s, i) => s + i.cents, 0);
const money = (c) => `$${Math.round(Math.abs(c) / 100).toLocaleString('en-US')}`;

/** Pay a group of bills all or nothing from `sources`; one transaction set per item. → true when paid. */
function payGroup(s, items, sources, month, day) {
  const total = sum(items);
  if (total <= 0) return true;
  if (sources.reduce((r, a) => r + available(s, a), 0) < total) return false;
  for (const it of items) charge(s, sources, it.cents, { month, day, label: it.label, category: it.category });
  return true;
}

/** The home & garden answer (09 §3 q5): add the new plant or animals to the home. */
function adopt(s, pick, month, rng) {
  const home = s.home;
  const next = (list, p) => `${p}${list.reduce((m, x) => Math.max(m, Number(String(x.id).slice(1)) || 0), 0) + 1}`;
  if (pick === 'garden') {
    const yard = hasYard(home);
    home.plants.push({ id: next(home.plants, 'p'), kind: yard ? 'garden-bed' : 'potted',
      spot: yard ? `bed-${home.plants.length}` : home.plants.length, alive: true, plantedMonth: month });
  } else if (pick === 'cat') {
    home.animals.push({ id: next(home.animals, 'a'), kind: 'cat', name: rng.pick(PET_NAMES), spot: 'yard', present: true, adoptedMonth: month });
  } else if (pick === 'chickens') {
    for (const name of rng.shuffle(HEN_NAMES).slice(0, 3)) {
      home.animals.push({ id: next(home.animals, 'a'), kind: 'chicken', name, spot: 'coop', present: true, adoptedMonth: month });
    }
  }
}

/**
 * Plants and animals after the month (09 §10): at a care rate ≥ `LIFE.careSurviveRate` all stay; below it each one is
 * lost with chance 1 − rate ÷ threshold (seeded). → {plantsSurvived, animalsStayed, lost, gardenAlive}.
 */
function settleCare(s, careRate, month, rng) {
  const plants = livingPlants(s.home), animals = presentAnimals(s.home);
  const lossP = careRate === null ? 0 : Math.max(0, 1 - careRate / LIFE.careSurviveRate);
  let lost = 0;
  for (const p of plants) if (rng.next() < lossP) { p.alive = false; p.diedMonth = month; lost += 1; }
  for (const a of animals) if (rng.next() < lossP) { a.present = false; a.leftMonth = month; lost += 1; }
  return { plantsSurvived: livingPlants(s.home).length, animalsStayed: presentAnimals(s.home).length, lost,
    gardenAlive: livingPlants(s.home).some((p) => p.kind === 'garden-bed') };
}

/** The 3rd missed housing payment in a row (09 §6): lose the home, back to planning. Mutates the draft. */
function evict(s, month) {
  const owner = isOwner(s.home?.kind);
  const kind = owner ? 'foreclosure' : 'eviction';
  for (const l of s.finances.loans) if (!l.closedReason && l.balanceCents > 0) closeLoan(s, l.id, month, kind);
  if (owner) adjustScore(s, -CREDIT.foreclosureCost, [`Foreclosure −${CREDIT.foreclosureCost}`], month);
  for (const r of [...s.finances.recurring]) removeRecurring(s, r.id);   // commit re-adds bills for the next home
  for (const a of s.finances.agreements) {
    if (a.status === 'active' && !String(a.docType ?? a.type).includes('credit-card')) setAgreementStatus(s, a.id, 'void');
  }
  const message = owner
    ? 'You missed three mortgage payments in a row, so the bank took the house back (foreclosure). The equity you built is gone, and your credit took a big hit. You still have your job and your savings. Pick a home your income can carry.'
    : 'You missed three rent payments in a row, so the landlord ended your lease (eviction). You still have your job and your savings. Pick a home your income can carry, and keep rent at about a third of your pay.';
  s.plan.attempts.push({ locationId: s.choice?.locationId ?? s.home?.locationId, homeTypeId: s.choice?.homeTypeId ?? s.home?.kind,
    outcome: 'evicted', reasons: [message], at: month });
  s.plan.notice = { kind, monthIndex: month, title: owner ? 'You lost your house' : 'You were evicted', message };
  s.home = null;
  s.choice = null;
  s.paperwork = freshPaperwork();
  s.phase = 'plan';
  return kind;
}

/**
 * Finish the month (09 §5): `finalizeMonth(state, plan, choices, {careShown, careHits})` → {state, result}. Mutates
 * `state`. careRate = hits ÷ shown; with nothing shown (no animation yet, or no plants/animals) nothing is lost.
 */
export function finalizeMonth(state, plan, choices, { careShown = 0, careHits = 0 } = {}) {
  const s = state, f = s.finances, mi = plan.monthIndex, end = plan.days;
  const location = byId[s.home?.locationId];
  const creditBefore = f.credit.score, wellbeingBefore = { ...s.life.wellbeing }, savingsBefore = f.savingsCents;
  const cardStart = f.creditCard?.balanceCents ?? 0;
  const missed = [], warnings = [];

  // 1. Income → checking (two paychecks, overtime on the last day, money events on their day)
  const pay = plan.income.paycheckCents, half = Math.floor(pay / 2);
  if (pay > 0) {
    post(s, { month: mi, day: 1, label: 'Paycheck', amountCents: half, account: 'checking', category: 'income' });
    post(s, { month: mi, day: 15, label: 'Paycheck', amountCents: pay - half, account: 'checking', category: 'income' });
  }
  if (plan.income.overtimeCents > 0) {
    post(s, { month: mi, day: end, label: 'Overtime pay', amountCents: plan.income.overtimeCents, account: 'checking', category: 'income' });
  }
  for (const e of plan.events) {
    if (e.amountCents > 0) post(s, { month: mi, day: e.day, label: e.label, amountCents: e.amountCents, account: 'checking', category: e.category === 'food' ? 'food' : 'income' });
  }

  // 2–5. Bills in order; housing and utilities never go on the card
  if (choices.homeGarden && choices.homeGarden !== 'none' && s.home) adopt(s, choices.homeGarden, mi, monthRng(s, mi, 'adopt'));
  const bills = monthBills(s, { ...choices, homeGarden: s.home ? choices.homeGarden : 'none' }, mi);
  const housingOk = payGroup(s, bills.housing, CASH, mi, 1);
  if (!housingOk) {
    const due = sum(bills.housing);
    missed.push({ kind: 'housing', label: 'Housing payment', cents: due, lateFeeCents: mulRate(due, LIFE.lateFees.housingPct) });
  }
  if (!payGroup(s, bills.utilities, CASH, mi, 5)) {
    missed.push({ kind: 'utilities', label: 'Utilities and insurance', cents: sum(bills.utilities), lateFeeCents: LIFE.lateFees.utilitiesCents });
  }
  // Living, lifestyle and event costs: item by item, card allowed; what can't be paid is gone without (no creditor)
  const wentWithout = [];
  const spend = (it, day) => { if (!payGroup(s, [it], ANY, mi, day)) wentWithout.push({ label: it.label, cents: it.cents }); };
  for (const it of bills.living) spend(it, 10);
  for (const it of bills.lifestyle) spend(it, 20);
  for (const e of plan.events) if (e.amountCents < 0) spend({ label: e.label, cents: -e.amountCents, category: e.category }, e.day);
  if (wentWithout.length) warnings.push(`Money ran out, so you went without: ${wentWithout.map((w) => w.label.toLowerCase()).join(', ')}.`);

  // Debts: the card cycle (statement = carried balance + this month's charges; autopay from checking)
  let card = null;
  if (f.creditCard) {
    const c = f.creditCard;
    const chargesCents = Math.max(0, c.balanceCents - cardStart);
    const cyc = cycle({ ...c, balanceCents: cardStart }, { chargesCents, payFrom: available(s, 'checking') + available(s, 'savings') });
    if (cyc.interestCents) post(s, { month: mi, day: end, label: 'Credit card interest', amountCents: -cyc.interestCents, account: 'card', category: 'interest' });
    if (cyc.paidCents) {
      const shortChecking = cyc.paidCents - available(s, 'checking');
      if (shortChecking > 0) transfer(s, 'savings', 'checking', shortChecking, { month: mi, day: end, label: 'Moved from savings for the card' });
      transfer(s, 'checking', 'card', cyc.paidCents, { month: mi, day: end, label: 'Credit card autopay' });
    }
    if (cyc.missed) {
      post(s, { month: mi, day: end, label: 'Card late fee', amountCents: -cyc.lateFeeCents, account: 'card', category: 'fees' });
      missed.push({ kind: 'card', label: 'Credit card minimum', cents: cyc.minimumCents, lateFeeCents: 0 });
    }
    Object.assign(f.creditCard, applyCycle(c, cyc));
    card = { statementCents: cyc.statementCents, paidCents: cyc.paidCents, interestCents: cyc.interestCents, carried: cyc.carried,
      minimumCents: cyc.minimumCents, balanceCents: f.creditCard.balanceCents };
  }

  // Late fees (housing 5%, utilities $15): cash first, then the card, else they're noted as unpaid
  for (const m of missed) {
    if (!m.lateFeeCents) continue;
    const r = charge(s, ANY, m.lateFeeCents, { month: mi, day: end, label: `Late fee: ${m.label.toLowerCase()}`, category: 'fees' });
    if (!r.ok) warnings.push(`A ${money(m.lateFeeCents)} late fee couldn't be paid.`);
  }

  // Loans: amortize the payments that were made (PMI drops at ≤ 78%)
  const loanPayments = { interestCents: 0, principalCents: 0, balanceCents: 0, pmiDropped: false };
  if (housingOk) {
    for (const src of bills.housing.map((b) => b.source).filter((x) => String(x).startsWith('loan:'))) {
      const r = payLoan(s, src.slice(5), mi);
      if (!r) continue;
      loanPayments.interestCents += r.interestCents;
      loanPayments.principalCents += r.principalCents;
      if (r.pmiDropped) { loanPayments.pmiDropped = true; warnings.push('Good news: you owe less than 78% of the price, so PMI is gone.'); }
    }
  }
  loanPayments.balanceCents = f.loans.filter((l) => !l.closedReason).reduce((t, l) => t + l.balanceCents, 0);

  // Sweep: checking above the buffer moves to savings
  const extra = f.checkingCents - LIFE.checkingBufferCents;
  if (extra > 0) transfer(s, 'checking', 'savings', extra, { month: mi, day: end, label: 'Sweep to savings' });

  // Credit
  const housingMissed = missed.some((m) => m.kind === 'housing');
  monthlyUpdate(s, { allOnTime: !missed.length, missedCount: missed.length, utilization: utilization(s), month: mi, housingMissed });
  const streak = f.credit.lateHousingStreak;
  if (housingMissed && streak === 1) warnings.push('You missed a housing payment. One more and you’ll get a final notice.');
  if (housingMissed && streak === LIFE.finalNoticeStreak) warnings.push('Final notice: miss one more housing payment and you will lose your home.');
  if (missed.some((m) => m.kind === 'card')) warnings.push('You missed the credit card minimum: a late fee and a hit to your credit.');

  // Care, investments
  const careRate = careShown > 0 ? careHits / careShown : null;
  const careOut = s.home ? settleCare(s, careRate, mi, monthRng(s, mi, 'care-loss')) : { plantsSurvived: 0, animalsStayed: 0, lost: 0, gardenAlive: false };
  const investment = { startCents: 0, endCents: 0, pct: 0, pctByKey: {} };
  for (const [key, path] of Object.entries(plan.market ?? {})) {
    const h = f.investments[key];
    const start = h.valueCents, endV = Math.round(start * path[end]);
    h.valueCents = endV;
    investment.startCents += start; investment.endCents += endV;
    investment.pctByKey[key] = start ? (endV - start) / start : 0;
  }
  investment.pct = investment.startCents ? (investment.endCents - investment.startCents) / investment.startCents : 0;

  // Month totals and wellbeing
  const totals = monthTotalsOf(mi, f.transactions.filter((t) => t.month === mi));
  const deltas = wellbeingDeltas({ choices, budget: plan.hours, location, home: s.home ?? {}, events: plan.events,
    money: { incomeCents: totals.incomeCents, expenseCents: totals.expenseCents, savingsCents: f.savingsCents,
      carried: !!card?.carried, missedCount: missed.length, wentWithout: wentWithout.length },
    care: { needed: plan.care.needed, kept: plan.care.needed && !careOut.lost, lost: careOut.lost, gardenAlive: careOut.gardenAlive },
    investment: Object.keys(investment.pctByKey).length ? investment : {}, before: wellbeingBefore });
  s.life.wellbeing = applyWellbeing(wellbeingBefore, deltas);

  const evicted = streak >= LIFE.evictionStreak ? evict(s, mi) : false;
  if (evicted) warnings.push(evicted === 'foreclosure' ? 'Foreclosure: the bank took the house back.' : 'Eviction: the landlord ended your lease.');
  compactHistory(s, { currentMonth: mi });

  const result = {
    monthIndex: mi, label: monthName(mi),
    incomeCents: totals.incomeCents, expenseCents: totals.expenseCents, byCategory: totals.byCategory,
    events: plan.events, card, loanPayments, missed, wentWithout, warnings, evicted: !!evicted,
    savingsDeltaCents: f.savingsCents - savingsBefore, cashAfterCents: cash(s), netWorthCents: netWorth(s),
    creditBefore, creditAfter: f.credit.score,
    wellbeingBefore, wellbeingAfter: { ...s.life.wellbeing }, deltas,
    careRate, plantsSurvived: careOut.plantsSurvived, animalsStayed: careOut.animalsStayed,
    investment: { startCents: investment.startCents, endCents: investment.endCents, pct: investment.pct },
  };
  if (evicted) {
    s.life.history.push({ monthIndex: mi, choices: { ...choices }, result });
    s.life.monthIndex = mi + 1;
    s.life.current = null;
  }
  return { state: s, result };
}
