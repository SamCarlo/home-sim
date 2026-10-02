// Named fixtures (01 §7): each returns a full, valid state that jumps straight to a screen.
// Naming: <phase>-<situation>. Later tasks append with addSeed() below or by adding entries to `seeds`.
// Every seed must pass validateState (tests/unit/seeds.test.js checks them all). Pure module.
import { createInitialState } from '../state/schema.js';
import { FINANCE, CREDIT } from '../config.js';
import { post, addRecurring, openLoan, payLoan, addAgreement, addApplication, resolveApplication, pmiSource,
  PAPERWORK_MONTH } from '../finance/ledger.js';
import { recordInquiry, monthlyUpdate } from '../finance/creditScore.js';

/** The dev account every seed runs as (01 §7). */
export const DEV_USER = { uid: 'local-dev', username: 'dev', classCode: 'DEMO' };

/** A fresh state for the dev user, the starting point for every seed. */
export function baseState(now = 0) {
  return createInitialState({ ...DEV_USER, now });
}

/** Intake finished: phase 'plan', with this income and savings (savings land in finances.savingsCents). */
export function afterIntake(s, { netMonthlyIncomeCents, startingSavingsCents, characterName = 'Kai Mana', jobTitle = '' }) {
  s.player = { ...s.player, characterName, jobTitle, netMonthlyIncomeCents, startingSavingsCents };
  s.finances.savingsCents = startingSavingsCents;
  s.phase = 'plan';
  return s;
}

/** name → { phase, description, build(now) → state }. */
export const seeds = {
  fresh: {
    phase: 'intake',
    description: 'Brand-new save: the intake screen.',
    build: (now) => baseState(now),
  },
  'plan-comfortable': {
    phase: 'plan',
    description: 'Intake done: $4,200/mo net, $20,000 savings (04 §8).',
    build: (now) => afterIntake(baseState(now), {
      netMonthlyIncomeCents: 420000, startingSavingsCents: 2000000, jobTitle: 'Dental assistant',
    }),
  },
  'plan-tight': {
    phase: 'plan',
    description: 'Intake done: $2,400/mo net, $3,000 savings; mostly red and yellow (04 §8).',
    build: (now) => afterIntake(baseState(now), {
      netMonthlyIncomeCents: 240000, startingSavingsCents: 300000, jobTitle: 'Cashier',
    }),
  },
  'plan-rich': {
    phase: 'plan',
    description: 'Intake done: $12,000/mo net, $250,000 savings; lots of cyan (04 §8).',
    build: (now) => afterIntake(baseState(now), {
      netMonthlyIncomeCents: 1200000, startingSavingsCents: 25000000, jobTitle: 'Surgeon',
    }),
  },
  'plan-after-denial': {
    phase: 'plan',
    description: 'Back on the plan after a denied Hilo apartment application; the $50 fee is gone (04 §8).',
    build: (now) => {
      const s = afterIntake(baseState(now), {
        netMonthlyIncomeCents: 360000, startingSavingsCents: 900000, jobTitle: 'Electrician apprentice',
      });
      const feeCents = FINANCE.applicationFeeCents.apartment;
      const reasons = ["Your income is less than 2.5× the rent and you don't have a co-signer."];
      s.plan.attempts.push({ locationId: 'hilo', homeTypeId: 'apartment', outcome: 'denied', reasons, at: now });
      s.finances.applications.push({
        id: 'app-1', kind: 'rental', target: 'hilo|apartment', status: 'denied', feeCents, at: now, reasons,
      });
      s.finances.transactions.push({
        id: 't-1', month: 0, day: 1, label: 'Rental application fee (Hilo)', amountCents: -feeCents,
        account: 'savings', category: 'fees',
      });
      s.finances.savingsCents -= feeCents;
      return s;
    },
  },
  'plan-detail-open': {
    phase: 'plan',
    description: 'plan-after-denial with the Hilo apartment detail panel open (04 §6, task 15).',
    build: (now) => {
      const s = seeds['plan-after-denial'].build(now);
      s.plan.expanded = { locationId: 'hilo', homeTypeId: 'apartment' };
      return s;
    },
  },
};

/** Portfolio demo (task 17): a Hilo house bought with a mortgage, a card, recurring bills, three lived months. */
seeds['portfolio-demo'] = {
  phase: 'life',
  description: 'Living in a Hilo house in April 2033: mortgage, card, bills, agreements, letters, applications (task 17).',
  build: (now) => {
    const s = afterIntake(baseState(now), {
      netMonthlyIncomeCents: 520000, startingSavingsCents: 6500000, jobTitle: 'Registered nurse',
    });
    const P = PAPERWORK_MONTH;
    const priceCents = 42500000;
    s.choice = { locationId: 'hilo', homeTypeId: 'house', chosenAt: now,
      snapshot: { upfrontCents: 4800000, monthlyCents: 330000, priceCents, breakdown: [] } };
    // Paperwork: applications, inquiries, fees, letters, agreements.
    const mApp = addApplication(s, { kind: 'mortgage', target: 'hilo|house', feeCents: 50000, at: now - 9 * 864e5 });
    resolveApplication(s, mApp.id, { approved: true, reasons: ['Debt-to-income 31% is under the 43% limit.',
      'Credit score 675 meets the lender minimum.', 'Your cover letter helped (strong).'] });
    const cApp = addApplication(s, { kind: 'credit-card', target: 'Kilauea Credit Union Visa', feeCents: 0, at: now - 8 * 864e5 });
    resolveApplication(s, cApp.id, { approved: true, reasons: ['Score 675: regular card, $1,000 limit.'] });
    const rApp = addApplication(s, { kind: 'rental', target: 'pahoa|apartment', feeCents: 4500, at: now - 30 * 864e5 });
    resolveApplication(s, rApp.id, { approved: false, reasons: ["Your income is less than 2.5× the rent and you don't have a co-signer."] });
    recordInquiry(s, 'mortgage', P);
    recordInquiry(s, 'credit card', P);
    post(s, { month: P, label: 'Mortgage application fee', amountCents: -50000, account: 'savings', category: 'fees' });
    post(s, { month: P, label: 'Rental application fee (Pāhoa)', amountCents: -4500, account: 'savings', category: 'fees' });
    post(s, { month: P, label: 'Down payment and closing costs', amountCents: -4800000, account: 'savings', category: 'housing' });
    post(s, { month: P, label: 'Move to checking', amountCents: -600000, account: 'savings', category: 'transfer' });
    post(s, { month: P, label: 'Move from savings', amountCents: 600000, account: 'checking', category: 'transfer' });
    s.letters = {
      L1: { id: 'L1', type: 'cover', to: 'Kilauea Credit Union, Mortgage Desk', sentAt: now - 9 * 864e5, attempt: 0,
        text: 'Aloha,\n\nI am applying for a mortgage on the house at 214 Waiānuenue Avenue. I have worked as a nurse at '
          + 'Hilo Medical for three years and I have saved for this down payment every month.\n\nMahalo for your time,\nKai Mana',
        score: { likelihood: 0.82, band: 'strong' } },
      L2: { id: 'L2', type: 'landlord', to: 'Puna Rentals LLC', sentAt: now - 30 * 864e5, attempt: 0,
        text: 'Hello,\n\nI would like to rent the apartment on Pāhoa Village Road. I am a good tenant.\n\nKai',
        score: { likelihood: 0.41, band: 'okay' } },
    };
    addAgreement(s, { type: 'mortgage', title: '30-year fixed mortgage', status: 'active', signedAt: now - 7 * 864e5,
      counterparty: 'Kilauea Credit Union', summary: 'You borrow $382,500 at 6.75% for 30 years to buy 214 Waiānuenue Avenue, Hilo.',
      terms: { principalCents: 38250000, rate: 0.0675, termYears: 30, pmiCents: 15900 },
      docValues: { borrowerName: 'Kai Mana', propertyAddress: '214 Waiānuenue Ave, Hilo, HI 96720', signature: 'Kai Mana' } });
    addAgreement(s, { type: 'card', title: 'Credit card agreement', status: 'active', signedAt: now - 8 * 864e5,
      counterparty: 'Kilauea Credit Union', summary: 'A $1,000 Visa card at 25.99% APR. Autopay pays the full balance.',
      terms: { limitCents: 100000, apr: 0.2599, autopay: 'full' } });
    addAgreement(s, { type: 'insurance', title: 'Homeowners insurance policy', status: 'active', signedAt: now - 7 * 864e5,
      counterparty: 'Mauna Shield Insurance', summary: 'Covers the house and your things. You pay the first $1,000 of a claim.',
      terms: { premiumCents: 14500, deductibleCents: 100000 } });
    addAgreement(s, { type: 'lease', title: 'Apartment lease (Pāhoa)', status: 'void', signedAt: now - 30 * 864e5,
      counterparty: 'Puna Rentals LLC', summary: 'Not used: the rental application was denied.', terms: { rentCents: 145000 } });
    // Accounts: card, mortgage, bills.
    s.finances.creditCard = { limitCents: 100000, balanceCents: 38250, apr: 0.2599, minPaymentRule: 'standard',
      lateFeeCents: CREDIT.card.lateFeeCents, graceDays: CREDIT.card.graceDays, autopay: 'full', openedMonth: P,
      secured: false, depositCents: 0, carriedLastMonth: false };
    const loan = openLoan(s, { kind: 'mortgage', label: '30-year mortgage', lender: 'Kilauea Credit Union',
      principalCents: 38250000, rate: 0.0675, termMonths: 360, startMonth: 0, priceCents, pmiCents: 15900,
      escrow: { taxCents: 14200, insuranceCents: 14500 } });
    s.home = { kind: 'house', locationId: 'hilo', styleFamily: 'plantation', label: '214 Waiānuenue Avenue', purchasePriceCents: priceCents,
      house: { seed: 7, listingIndex: 0, address: '214 Waiānuenue Ave', palette: null, extras: [] }, plants: [], animals: [],
      lifestyle: { noise: 0, view: 1, nature: 1, social: 0 } };
    addRecurring(s, { label: 'Mortgage payment', amountCents: loan.paymentCents, category: 'housing', source: `loan:${loan.id}` });
    addRecurring(s, { label: 'PMI', amountCents: 15900, category: 'housing', source: pmiSource(loan.id) });
    addRecurring(s, { label: 'Property tax (escrow)', amountCents: 14200, category: 'housing', source: 'escrow' });
    addRecurring(s, { label: 'Homeowners insurance', amountCents: 14500, category: 'insurance', source: 'policy' });
    addRecurring(s, { label: 'Electricity (HELCO)', amountCents: 21000, category: 'utilities', source: 'utility' });
    addRecurring(s, { label: 'Water and sewer', amountCents: 6800, category: 'utilities', source: 'utility' });
    addRecurring(s, { label: 'Internet', amountCents: 7500, category: 'utilities', source: 'utility' });
    addRecurring(s, { label: 'Groceries', amountCents: 62000, category: 'food', source: 'living' });
    addRecurring(s, { label: 'Car payment', amountCents: 31000, category: 'transportation', source: 'living', endsMonth: 22 });
    addRecurring(s, { label: 'Gas', amountCents: 18000, category: 'transportation', source: 'living' });
    addRecurring(s, { label: 'Phone', amountCents: 5500, category: 'utilities', source: 'living' });
    // Three lived months (Jan–Mar 2033): pay, bills, mortgage amortization, credit updates.
    const bills = s.finances.recurring.reduce((t, r) => t + r.amountCents, 0);
    for (let m = 0; m < 3; m++) {
      post(s, { month: m, day: 1, label: 'Paycheck', amountCents: 520000, account: 'checking', category: 'income' });
      post(s, { month: m, day: 2, label: 'Automatic expenses', amountCents: -bills, account: 'checking', category: 'housing' });
      payLoan(s, loan.id, m);
      monthlyUpdate(s, { allOnTime: true, missedCount: 0, utilization: m === 1 ? 0.45 : 0.2, month: m });
    }
    s.phase = 'life';
    s.life.monthIndex = 3;
    return s;
  },
};

/** Register a seed (later tasks): addSeed('paperwork-apartment-start', { phase, description, build }). */
export function addSeed(name, def) {
  seeds[name] = def;
}

/** Build seed `name` (throws for unknown names). */
export function buildSeed(name, now = 0) {
  const def = seeds[name];
  if (!def) throw new Error(`Unknown seed "${name}". Known: ${Object.keys(seeds).join(', ')}`);
  return def.build(now);
}
