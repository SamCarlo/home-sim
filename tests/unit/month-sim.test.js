// The month simulation (09 §5–§8, 10 §4; task 44): planMonth, finalizeMonth, events, wellbeing, market paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds } from '../../app/src/dev/seeds.js';
import { validateState } from '../../app/src/state/schema.js';
import { LIFE, CREDIT } from '../../app/src/config.js';
import { byId } from '../../app/src/data/locations/index.js';
import { startPlan, startLive, finishLive, nextMonth } from '../../app/src/life/monthFlow.js';
import { planMonth, monthBills } from '../../app/src/life/planMonth.js';
import { finalizeMonth } from '../../app/src/life/finalizeMonth.js';
import { pickEvents, lossCharge, EVENT_TABLE } from '../../app/src/life/events.js';
import { applyWellbeing } from '../../app/src/life/wellbeing.js';
import { gbmPath, marketPaths } from '../../app/src/life/market.js';
import { ledgerSums, accountValue } from '../../app/src/finance/ledger.js';

const NOW = Date.UTC(2026, 9, 2);
const CHOICES = { ...LIFE.defaults };
const build = (name) => seeds[name].build(NOW);

/** A bare month: no events, no care. */
function quietPlan(s, choices = CHOICES) {
  return { ...planMonth(s, choices), events: [] };
}

/** Run n months through the real state machine (care 6 of 8). Returns the results. */
function live(s, n, choices = {}) {
  const out = [];
  for (let i = 0; i < n && s.phase === 'life'; i++) {
    startPlan(s);
    Object.assign(s.life.current.choices, choices);
    startLive(s);
    s.life.current.care = { shown: 8, hits: 6 };
    const r = finishLive(s);
    out.push(r);
    if (!r.evicted) nextMonth(s);
  }
  return out;
}

test('deterministic: the same save and choices give the same plan and the same result', () => {
  for (const name of ['life-month1-apartment', 'life-month1-house', 'life-month1-build']) {
    const a = build(name), b = build(name);
    assert.deepEqual(planMonth(a, CHOICES), planMonth(b, CHOICES), name);
    assert.deepEqual(live(a, 6), live(b, 6), name);
    assert.deepEqual(a, b, name);
    assert.deepEqual(validateState(a), [], name);
  }
  const c = build('life-month1-house');
  c.meta.seed += 1;
  assert.notDeepEqual(live(c, 6).map((r) => r.events), live(build('life-month1-house'), 6).map((r) => r.events));
});

test('the ledger stays consistent over a year (accountValue − ledgerSums never changes)', () => {
  const s = build('life-month1-house');
  const base = Object.fromEntries(['checking', 'savings', 'card'].map((a) => [a, accountValue(s, a) - ledgerSums(s)[a]]));
  live(s, 12);
  for (const a of ['checking', 'savings', 'card']) assert.equal(accountValue(s, a) - ledgerSums(s)[a], base[a], a);
});

test('overdraft order: checking → savings → card for living costs', () => {
  const s = build('life-month1-apartment');
  s.player.netMonthlyIncomeCents = 0;
  s.finances.recurring = [{ id: 'r1', label: 'Groceries', amountCents: 50000, category: 'food', source: 'living', startsMonth: 0 }];
  s.finances.checkingCents = 10000; s.finances.savingsCents = 15000;
  const { result } = finalizeMonth(s, quietPlan(s, { ...CHOICES, exercise: 0, social: 3, deepPractice: 0 }), { ...CHOICES, exercise: 0, social: 3, deepPractice: 0 });
  const g = s.finances.transactions.filter((t) => t.label === 'Groceries');
  assert.deepEqual(g.map((t) => [t.account, t.amountCents]), [['checking', -10000], ['savings', -15000], ['card', -25000]]);
  assert.equal(result.missed.length, 1);                       // the card statement couldn't be paid
  assert.equal(result.missed[0].kind, 'card');
});

test('housing never goes on the card: short of cash it is a missed payment with a 5% late fee', () => {
  const s = build('life-month1-apartment');
  s.player.netMonthlyIncomeCents = 100000;                       // $1,000 < $1,550 rent
  s.finances.savingsCents = 0;
  const { result } = finalizeMonth(s, quietPlan(s), CHOICES);
  assert.ok(!s.finances.transactions.some((t) => t.account === 'card' && t.category === 'housing'));
  const h = result.missed.find((m) => m.kind === 'housing');
  assert.ok(h);
  assert.equal(h.lateFeeCents, Math.round(155000 * LIFE.lateFees.housingPct));
  assert.equal(s.finances.credit.lateHousingStreak, 1);
  assert.ok(result.warnings.some((w) => /final notice/.test(w)));
});

test('eviction on the 3rd missed housing payment in a row → phase plan with an evicted attempt', () => {
  const s = build('life-month1-apartment');
  s.player.netMonthlyIncomeCents = 100000;
  s.finances.savingsCents = 0;
  const rs = live(s, 5);
  assert.equal(rs.length, 3);
  assert.deepEqual(rs.map((r) => r.evicted), [false, false, true]);
  assert.ok(rs[1].warnings.some((w) => w.startsWith('Final notice')));
  assert.equal(s.phase, 'plan');
  assert.equal(s.plan.attempts.at(-1).outcome, 'evicted');
  assert.equal(s.plan.notice.kind, 'eviction');
  assert.equal(s.home, null);
  assert.equal(s.choice, null);
  assert.equal(s.finances.recurring.length, 0);
  assert.equal(s.life.history.length, 3);
  assert.deepEqual(validateState(s), []);
});

test('foreclosure: owners lose the home, loans close and credit drops 150 more', () => {
  const s = build('life-month1-house');
  s.player.netMonthlyIncomeCents = 100000;
  s.finances.savingsCents = 0;
  const rs = live(s, 3);
  const last = rs.at(-1);
  assert.equal(last.evicted, true);
  assert.equal(s.plan.notice.kind, 'foreclosure');
  assert.ok(s.finances.loans.every((l) => l.closedReason === 'foreclosure' && l.balanceCents === 0));
  assert.ok(s.finances.credit.history.some((h) => h.reasons.some((r) => r.includes(`Foreclosure −${CREDIT.foreclosureCost}`))));
  assert.ok(last.netWorthCents <= 0);                             // the equity is gone
});

test('renters don’t pay for appliance repairs; owners do', () => {
  const always = { next: () => 0, int: (a) => a, float: (a) => a, shuffle: (x) => x, pick: (x) => x[0] };
  const cases = [['life-month1-apartment', true], ['life-month1-house', false]];
  for (const [name, renter] of cases) {
    const s = build(name);
    const loc = byId[s.home.locationId];
    const ev = pickEvents({ state: s, location: loc, home: s.home, monthIndex: 2, choices: CHOICES }, always)
      .find((e) => e.id === 'appliance-broke');
    if (!ev) continue;                                            // capped out; the table order puts it early
    if (renter) { assert.equal(ev.amountCents, 0); assert.match(ev.message, /landlord fixed it for free/); }
    else assert.ok(ev.amountCents < 0);
  }
  const ap = build('life-month1-apartment');
  const e = EVENT_TABLE.find((x) => x.id === 'appliance-broke');
  assert.ok(e.renterMessage.includes('for free'));
  assert.ok(ap.home.kind === 'apartment');
});

test('insured losses charge only the deductible; uninsured ones the loss up to the cap; flood needs its add-on', () => {
  const s = build('life-month1-house');
  const loc = byId[s.home.locationId];
  const fire = lossCharge(400000, 'fire', s, loc);
  assert.equal(fire.amountCents, -s.paperwork.options.deductibleCents);
  assert.equal(fire.insured.insurerPaysCents, 400000 - s.paperwork.options.deductibleCents);
  const flood = lossCharge(2000000, 'flood', s, loc);              // Katy house, no flood add-on
  assert.equal(flood.amountCents, -LIFE.uninsuredLossCapCents);
  assert.equal(flood.insured.uninsured, true);
  const small = lossCharge(30000, 'fire', s, loc);
  assert.equal(small.amountCents, -30000);                         // under the deductible: you pay it all
  delete s.paperwork.options.insurance;
  assert.equal(lossCharge(300000, 'theft', s, loc).amountCents, -300000);
});

test('events: at most 3 random a month plus scheduled ones; the missed inspection finding arrives on its month', () => {
  const s = build('life-month1-house');
  const loc = byId[s.home.locationId];
  const always = { next: () => 0, int: (a) => a, float: (a) => a, shuffle: (x) => x, pick: (x) => x[0] };
  const finding = s.paperwork.options.missedFindings[0];
  const evs = pickEvents({ state: s, location: loc, home: s.home, monthIndex: finding.month, choices: CHOICES }, always);
  assert.equal(evs.filter((e) => e.id !== 'surprise-repair').length, LIFE.maxRandomEventsPerMonth);
  const sr = evs.find((e) => e.id === 'surprise-repair');
  assert.equal(sr.amountCents, -finding.cents);
  const dec = pickEvents({ state: s, location: loc, home: s.home, monthIndex: 11, choices: CHOICES }, always);
  assert.ok(dec.some((e) => e.id === 'holidays'));                  // December is sure, so it's never capped out
});

test('lifestyle bills follow the answers (gym, social, deep practice, pets, garden, adoption)', () => {
  const s = build('life-month1-house');
  const b = monthBills(s, { exercise: 7, social: 12, deepPractice: 4, extraWork: 0, homeGarden: 'none' });
  const labels = b.lifestyle.map((x) => x.label);
  assert.ok(labels.includes('Gym membership'));
  assert.ok(labels.includes('Cat food and care') && labels.includes('Chicken food and care') && labels.includes('Garden supplies'));
  assert.equal(b.lifestyle.find((x) => x.label === 'Books, supplies and classes').cents, 1000);
  assert.ok(b.housing.every((x) => x.category === 'housing'));
  const a = build('life-month1-apartment');
  const ab = monthBills(a, { exercise: 0, social: 3, deepPractice: 0, extraWork: 0, homeGarden: 'cat' });
  assert.ok(ab.lifestyle.some((x) => x.label === 'Adopting a cat' && x.cents === LIFE.adoptCents.cat));
  const { result } = finalizeMonth(a, quietPlan(a), { ...CHOICES, homeGarden: 'cat' });
  assert.equal(a.home.animals.filter((x) => x.kind === 'cat').length, 1);
  assert.ok(result.byCategory.pets < 0);
});

test('loans amortize and PMI drops at 78% of the price', () => {
  const s = build('life-month1-house');
  const loan = s.finances.loans[0];
  const before = loan.balanceCents;
  const { result } = finalizeMonth(s, quietPlan(s), CHOICES);
  assert.ok(result.loanPayments.principalCents > 0 && result.loanPayments.interestCents > 0);
  assert.equal(loan.balanceCents, before - result.loanPayments.principalCents);
  const t = build('life-month1-house');
  t.finances.loans[0].balanceCents = t.finances.loans[0].pmiUntilBalanceCents + 10000;
  finalizeMonth(t, quietPlan(t), CHOICES);
  assert.equal(t.finances.loans[0].pmiCents, 0);
  assert.ok(!t.finances.recurring.some((r) => r.source === 'pmi:loan1'));
});

test('sweep keeps $1,000 in checking; the card carries interest only after an unpaid statement', () => {
  const s = build('life-month1-apartment');
  s.finances.checkingCents = 300000;
  const sav = s.finances.savingsCents;
  finalizeMonth(s, quietPlan(s), CHOICES);
  assert.equal(s.finances.checkingCents, LIFE.checkingBufferCents);
  assert.ok(s.finances.savingsCents > sav);
  const c = build('life-month1-apartment');
  Object.assign(c.finances.creditCard, { balanceCents: 50000, carriedLastMonth: true });
  const { result } = finalizeMonth(c, quietPlan(c), CHOICES);
  assert.equal(result.card.interestCents, Math.round(50000 * c.finances.creditCard.apr / 12));
  assert.equal(result.card.carried, false);                          // autopay full from a healthy checking account
  assert.equal(c.finances.creditCard.balanceCents, 0);
});

test('every wellbeing delta has a reason; wellbeing stays 0–100 and is pulled toward 50', () => {
  const runs = [['life-month1-apartment', {}], ['life-month1-shared', { exercise: 0, social: 20, extraWork: 32 }],
    ['life-month1-build', { exercise: 7, deepPractice: 0 }], ['life-month1-condo', { social: 3, extraWork: 16 }]];
  for (const [name, choices] of runs) {
    for (const r of live(build(name), 12, choices)) {
      assert.ok(r.deltas.length > 0, name);
      for (const d of r.deltas) {
        assert.ok(typeof d.reason === 'string' && d.reason.length > 3, `${name}: ${JSON.stringify(d)}`);
        assert.ok(Number.isFinite(d.delta) && d.delta !== 0);
      }
      for (const v of Object.values(r.wellbeingAfter)) assert.ok(v >= 0 && v <= 100 && Number.isInteger(v));
    }
  }
  const up = applyWellbeing({ physical: 90, purpose: 10, financial: 50, social: 50, mental: 50 }, []);
  assert.ok(up.physical < 90 && up.purpose > 10 && up.financial === 50);
});

test('market: GBM paths start at 1, have days+1 points, are seeded per portfolio, and move holdings', () => {
  const p = gbmPath({ mu: 0.09, sigma: 0.18 }, 31, 42);
  assert.equal(p.length, 32);
  assert.equal(p[0], 1);
  assert.deepEqual(p, gbmPath({ mu: 0.09, sigma: 0.18 }, 31, 42));
  const s = build('life-month1-apartment');
  assert.equal(marketPaths(s, 0, 31), null);
  s.finances.investments.high = { valueCents: 100000, basisCents: 100000 };
  const plan = quietPlan(s);
  assert.deepEqual(Object.keys(plan.market), ['high']);
  const { result } = finalizeMonth(s, plan, CHOICES);
  assert.equal(s.finances.investments.high.valueCents, Math.round(100000 * plan.market.high[plan.days]));
  assert.equal(result.investment.startCents, 100000);
});
