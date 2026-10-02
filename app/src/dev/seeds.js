// Named fixtures (01 §7): each returns a full, valid state that jumps straight to a screen.
// Naming: <phase>-<situation>. Later tasks append with addSeed() below or by adding entries to `seeds`.
// Every seed must pass validateState (tests/unit/seeds.test.js checks them all). Pure module.
import { createInitialState } from '../state/schema.js';
import { FINANCE, CREDIT } from '../config.js';
import { post, addRecurring, openLoan, payLoan, addAgreement, addApplication, resolveApplication, pmiSource,
  PAPERWORK_MONTH } from '../finance/ledger.js';
import { recordInquiry, monthlyUpdate } from '../finance/creditScore.js';
import { buildGrid, gridCells } from '../finance/grid.js';
import { applyChoice } from '../phases/plan/detailModel.js';
import { completeStep } from '../phases/paperwork/flow.js';
import { step as paperworkStep } from '../phases/paperwork/steps/index.js';
import { hireInspector } from '../phases/paperwork/steps/home-inspection.js';
import { orderAppraisal, payGap } from '../phases/paperwork/steps/appraisal.js';
import { appraisalResult } from '../finance/buying.js';
import { byId } from '../data/locations/index.js';
import { SAMPLE_LETTERS } from './sampleLetters.js';
import { leaseClauses } from '../phases/paperwork/steps/lease.js';
import { renterTerms } from '../phases/paperwork/steps/renterTerms.js';
import { ROOMMATE_CHOICES } from '../phases/paperwork/steps/roommate-agreement.js';

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
    // Scores are filled in on load by main.js rescoreLetters (task 28), like any save made before the real scorer.
    s.letters = {
      L1: { id: 'L1', type: 'loan-purpose', to: 'Kilauea Credit Union, Mortgage Desk', sentAt: now - 9 * 864e5, attempt: 0,
        text: 'Aloha,\n\nI am applying for a mortgage on the house at 214 Waiānuenue Avenue. I have worked as a nurse at '
          + 'Hilo Medical for three years and I have saved for this down payment every month.\n\nMahalo for your time,\nKai Mana',
        score: { likelihood: null, pending: true } },
      L2: { id: 'L2', type: 'rental-cover', to: 'Puna Rentals LLC', sentAt: now - 30 * 864e5, attempt: 0,
        text: 'Hello,\n\nI would like to rent the apartment on Pāhoa Village Road. I am a good tenant.\n\nKai',
        score: { likelihood: null, pending: true } },
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

/**
 * A player who just chose `locationId|homeTypeId` on the plan table: phase 'paperwork', fresh attempt (05 §11).
 * Throws if that cell can't be chosen with these numbers.
 */
export function paperworkStart(now, { locationId, homeTypeId, netMonthlyIncomeCents, startingSavingsCents, jobTitle = '' }) {
  const s = afterIntake(baseState(now), { netMonthlyIncomeCents, startingSavingsCents, jobTitle });
  const cell = gridCells(buildGrid(s)).find((c) => c.locationId === locationId && c.homeTypeId === homeTypeId);
  return applyChoice(s, cell, now);
}

// Paperwork seeds (05 §11, task 19): each lands on the first step of a fresh attempt.
for (const [name, description, opts] of [
  ['paperwork-apartment-start', 'Paperwork for a Hilo apartment; $4,200/mo covers 2.5× rent, so no co-signer.',
    { locationId: 'hilo', homeTypeId: 'apartment', netMonthlyIncomeCents: 420000, startingSavingsCents: 2000000, jobTitle: 'Dental assistant' }],
  ['paperwork-apartment-cosigner', 'Paperwork for a Hilo apartment on $3,000/mo, under 2.5× the $1,550 rent: the co-signer letter appears.',
    { locationId: 'hilo', homeTypeId: 'apartment', netMonthlyIncomeCents: 300000, startingSavingsCents: 700000, jobTitle: 'Cashier' }],
  ['paperwork-shared-start', 'Paperwork for a room in a shared Honolulu house.',
    { locationId: 'honolulu', homeTypeId: 'shared', netMonthlyIncomeCents: 420000, startingSavingsCents: 2000000, jobTitle: 'Barista' }],
  ['paperwork-condo-start', 'Paperwork for a Miami condo (mortgage, HOA, closing).',
    { locationId: 'miami', homeTypeId: 'condo', netMonthlyIncomeCents: 700000, startingSavingsCents: 8000000, jobTitle: 'Engineer' }],
  ['paperwork-house-start', 'Paperwork for a house in Katy (mortgage, inspection, appraisal, closing).',
    { locationId: 'katy', homeTypeId: 'house', netMonthlyIncomeCents: 600000, startingSavingsCents: 8000000, jobTitle: 'Teacher' }],
  ['paperwork-build-start', 'Paperwork to build in Pāhoa (land, construction loan, bids, permit, utilities).',
    { locationId: 'pahoa', homeTypeId: 'build', netMonthlyIncomeCents: 900000, startingSavingsCents: 15000000, jobTitle: 'Architect' }],
]) seeds[name] = { phase: 'paperwork', description, build: (now) => paperworkStart(now, opts) };

/** Valid rental/room application answers for "Kai Mana" (task 20 seeds and tests). */
export const SAMPLE_APPLICATION = {
  living: 'family', history: 'first', employer: 'Hilo Bay Dental', 'job-title': 'Dental assistant', 'time-at-job': 'year',
  'ref1-name': 'Lani Pereira', 'ref1-relation': 'boss', 'ref1-phone': '(808) 555-0142',
  'ref2-name': 'Mr. Okada', 'ref2-relation': 'teacher', 'ref2-phone': '(808) 555-0177',
  pets: 'none', smoking: 'no', auth: true, signature: 'Kai Mana',
};

/**
 * Finish paperwork steps in order: real `complete()` for built steps (with `values[id]`), completeStep otherwise.
 * Letter steps without values send the type's sample letter (dev/sampleLetters.js).
 */
export function finishSteps(s, ids, values = {}, now = 0) {
  for (const id of ids) {
    const mod = paperworkStep(id);
    const v = values[id] ?? (SAMPLE_LETTERS[id] ? { text: SAMPLE_LETTERS[id] } : {});
    if (mod.complete) mod.complete(s, v, now);
    else completeStep(s, id, { values: v, upfrontKey: mod.upfrontKey, now });
  }
  return s;
}

// Task 20 seeds: land on the lease / roommate agreement with the earlier steps done.
seeds['paperwork-apartment-lease'] = { phase: 'paperwork',
  description: 'Hilo apartment: application, cover letter and renters insurance done; the lease is next.',
  build: (now) => finishSteps(paperworkStart(now, { locationId: 'hilo', homeTypeId: 'apartment', netMonthlyIncomeCents: 420000,
    startingSavingsCents: 2000000, jobTitle: 'Dental assistant' }), ['rental-application', 'rental-cover', 'renters-insurance'],
  { 'rental-application': SAMPLE_APPLICATION }, now) };
seeds['paperwork-shared-agreement'] = { phase: 'paperwork',
  description: 'Honolulu shared house: room application, roommate intro and renters insurance done; the roommate agreement is next.',
  build: (now) => finishSteps(paperworkStart(now, { locationId: 'honolulu', homeTypeId: 'shared', netMonthlyIncomeCents: 420000,
    startingSavingsCents: 2000000, jobTitle: 'Barista' }), ['room-application', 'roommate-intro', 'renters-insurance'],
  { 'room-application': SAMPLE_APPLICATION }, now) };

/** Valid mortgage application answers for "Kai Mana" (task 21 seeds and tests). */
export const SAMPLE_MORTGAGE_APPLICATION = {
  living: 'family', 'first-home': 'yes', employer: 'Katy ISD', 'job-title': 'Teacher', years: '2+', occupy: 'yes',
  bankruptcy: 'no', auth: true, signature: 'Kai Mana',
};

// Task 21 seeds: the mortgage application is done (hard inquiry, pending application); loan options are next.
seeds['paperwork-house-options'] = { phase: 'paperwork',
  description: 'Katy house: mortgage application done (score 675); compare loan options.',
  build: (now) => finishSteps(paperworkStart(now, { locationId: 'katy', homeTypeId: 'house', netMonthlyIncomeCents: 600000,
    startingSavingsCents: 8000000, jobTitle: 'Teacher' }), ['mortgage-application'],
  { 'mortgage-application': SAMPLE_MORTGAGE_APPLICATION }, now) };
seeds['paperwork-pahoa-house-options'] = { phase: 'paperwork',
  description: 'Pāhoa house in Lava Zone 1: mortgage application done; FHA and under-20%-down loans are disabled.',
  build: (now) => finishSteps(paperworkStart(now, { locationId: 'pahoa', homeTypeId: 'house', netMonthlyIncomeCents: 700000,
    startingSavingsCents: 11000000, jobTitle: 'Nurse' }), ['mortgage-application'],
  { 'mortgage-application': { ...SAMPLE_MORTGAGE_APPLICATION, employer: 'Puna Community Clinic', 'job-title': 'Nurse' } }, now) };

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

// Task 22 seeds: buyer documents after the loan is chosen (conventional 10% down, 30 years).
const LOAN_10_30 = { program: 'conventional', downPaymentPct: 0.1, termYears: 30 };
const katyHouse = (now) => paperworkStart(now, { locationId: 'katy', homeTypeId: 'house', netMonthlyIncomeCents: 600000,
  startingSavingsCents: 8000000, jobTitle: 'Teacher' });
const KATY_VALUES = { 'mortgage-application': SAMPLE_MORTGAGE_APPLICATION, 'loan-options': LOAN_10_30 };
seeds['paperwork-condo-hoa'] = { phase: 'paperwork',
  description: 'Miami condo: mortgage application and loan choice done; the HOA review (with a special assessment) is next.',
  build: (now) => finishSteps(paperworkStart(now, { locationId: 'miami', homeTypeId: 'condo', netMonthlyIncomeCents: 700000,
    startingSavingsCents: 8000000, jobTitle: 'Engineer' }), ['mortgage-application', 'loan-options', 'loan-purpose'],
  { 'mortgage-application': { ...SAMPLE_MORTGAGE_APPLICATION, employer: 'Biscayne Engineering' }, 'loan-options': LOAN_10_30 }, now) };
seeds['paperwork-house-inspection'] = { phase: 'paperwork',
  description: 'Katy house: application, loan choice and loan letter done; pick a home inspector next.',
  build: (now) => finishSteps(katyHouse(now), ['mortgage-application', 'loan-options', 'loan-purpose'], KATY_VALUES, now) };
/** Katy house up to the appraisal; `metaSeed` replaces the save's seed (to pick a low appraisal). */
function katyToAppraisal(now, metaSeed = null) {
  const s = katyHouse(now);
  if (metaSeed !== null) s.meta.seed = metaSeed;
  finishSteps(s, ['mortgage-application', 'loan-options', 'loan-purpose'], KATY_VALUES, now);
  hireInspector(s, 'standard');
  return finishSteps(s, ['home-inspection'], { 'home-inspection': { decision: 'accept' } }, now);
}
seeds['paperwork-house-appraisal'] = { phase: 'paperwork',
  description: 'Katy house: inspection done (standard inspector, accepted as-is); order the appraisal next.',
  build: (now) => katyToAppraisal(now) };
seeds['paperwork-house-appraisal-low'] = { phase: 'paperwork',
  description: 'Katy house, a save whose appraisal comes in below the price: pay the gap, ask the seller, or walk away.',
  build: (now) => {
    for (let k = 1; ; k++) {
      const s = katyToAppraisal(now, k);
      if (appraisalResult(s, byId.katy.housing.house.priceCents).gapCents > 0) return s;
    }
  } };
seeds['paperwork-house-closing'] = { phase: 'paperwork',
  description: 'Katy house: inspection, appraisal and home insurance done; review and sign the closing disclosure.',
  build: (now) => {
    const s = seeds['paperwork-house-appraisal'].build(now);
    orderAppraisal(s);
    if (!s.paperwork.options.purchase) payGap(s);
    return finishSteps(s, ['appraisal', 'home-insurance'], {}, now);
  } };

// Task 23 seeds: the Pāhoa build path (Cozy tier, Bid B, catchment + grid). Each lands on the next builder document.
const pahoaBuild = (now) => paperworkStart(now, { locationId: 'pahoa', homeTypeId: 'build', netMonthlyIncomeCents: 900000,
  startingSavingsCents: 15000000, jobTitle: 'Architect' });
/** Valid land-purchase and construction-loan answers for "Kai Mana" (task 23 seeds and tests). */
export const SAMPLE_BUILD_VALUES = {
  'land-purchase': { contingency: true, signature: 'Kai Mana' },
  'construction-loan-application': { employer: 'Puna Design Studio', 'job-title': 'Architect', tier: 'cozy', auth: true,
    signature: 'Kai Mana' },
  'contractor-bids': { contractorId: 'b' },
};
const BUILD_STEPS = ['land-purchase', 'construction-loan-application', 'construction-purpose', 'contractor-bids',
  'building-permit', 'site-utilities'];
for (const [name, upTo, description] of [
  ['paperwork-build-loan', 1, 'Pāhoa build: the lot offer is signed ($1,000 earnest money); the construction loan application is next.'],
  ['paperwork-build-bids', 3, 'Pāhoa build: lot, Cozy-tier loan application and purpose letter done; compare contractor bids.'],
  ['paperwork-build-permit', 4, 'Pāhoa build: Bid B chosen; the building permit checklist is next.'],
  ['paperwork-build-utilities', 5, 'Pāhoa build: permit paid; choose water, power and sewer.'],
]) seeds[name] = { phase: 'paperwork', description, build: (now) => finishSteps(pahoaBuild(now), BUILD_STEPS.slice(0, upTo), SAMPLE_BUILD_VALUES, now) };

// Task 24 seeds: each lands on an insurance shop (05 §5).
seeds['paperwork-renters-insurance'] = { phase: 'paperwork',
  description: 'Hilo apartment: application and cover letter done; shop for renters insurance.',
  build: (now) => finishSteps(paperworkStart(now, { locationId: 'hilo', homeTypeId: 'apartment', netMonthlyIncomeCents: 420000,
    startingSavingsCents: 2000000, jobTitle: 'Dental assistant' }), ['rental-application', 'rental-cover'],
  { 'rental-application': SAMPLE_APPLICATION }, now) };
seeds['paperwork-condo-insurance'] = { phase: 'paperwork',
  description: 'Miami condo: HOA review, inspection and appraisal done; shop for condo insurance (flood, hurricane deductible).',
  build: (now) => {
    const s = seeds['paperwork-condo-hoa'].build(now);
    finishSteps(s, ['hoa-review'], {}, now);
    hireInspector(s, 'standard');
    finishSteps(s, ['home-inspection'], { 'home-inspection': { decision: 'accept' } }, now);
    orderAppraisal(s);
    if (!s.paperwork.options.purchase) payGap(s);
    return finishSteps(s, ['appraisal'], {}, now);
  } };
seeds['paperwork-house-insurance'] = { phase: 'paperwork',
  description: 'Katy house: inspection and appraisal done; shop for home insurance (flood advised).',
  build: (now) => {
    const s = katyToAppraisal(now);
    orderAppraisal(s);
    if (!s.paperwork.options.purchase) payGap(s);
    return finishSteps(s, ['appraisal'], {}, now);
  } };
seeds['paperwork-build-insurance'] = { phase: 'paperwork',
  description: 'Pāhoa build: every builder document done; shop for home insurance (HPIA lava coverage required).',
  build: (now) => finishSteps(pahoaBuild(now), BUILD_STEPS, SAMPLE_BUILD_VALUES, now) };

// Task 25 seed: the rental application is done, so the cover letter's writing box is the active step.
seeds['paperwork-letter'] = { phase: 'paperwork',
  description: 'Hilo apartment: application done; write the cover letter to the landlord.',
  build: (now) => finishSteps(paperworkStart(now, { locationId: 'hilo', homeTypeId: 'apartment', netMonthlyIncomeCents: 420000,
    startingSavingsCents: 2000000, jobTitle: 'Dental assistant' }), ['rental-application'],
  { 'rental-application': SAMPLE_APPLICATION }, now) };

// Task 29 seeds (05 §11): every step done, Results next; the card offer is accepted with autopay in full.
const answer = (choice) => ({ choice, tries: 1, correct: true, firstTry: true, wrong: [] });
/** Signed lease answers for the current renter attempt (all clauses initialed, trap questions right). */
export const leaseValuesFor = (s) => ({ init: Object.fromEntries(leaseClauses(renterTerms(s)).map((c) => [c.id, 'KM'])),
  'q-date': answer('renewal'), 'q-allowed': answer('wear-and-tear'), 'q-late': answer('right'), signature: 'Kai Mana' });
const BEST_ROOMMATE = Object.fromEntries(Object.entries(ROOMMATE_CHOICES)
  .map(([k, l]) => [k, l.reduce((a, b) => (b.comfort > a.comfort ? b : a)).value]));
const MOVE_IN = { 'only-if-approved': true, signature: 'Kai Mana' };
/** Accepting the card offer with autopay in full (task 30). */
export const CARD_ACCEPT = { decision: 'accept', autopay: 'full', auth: true, signature: 'Kai Mana' };
function ready(s, ids, now) {
  for (const id of ids) {
    const v = id === 'lease' ? leaseValuesFor(s) : id === 'move-in-payment' ? MOVE_IN : id === 'closing-disclosure'
      ? { signature: 'Kai Mana', flagged: true } : id === 'credit-card-offer' ? CARD_ACCEPT : id === 'roommate-agreement'
        ? { ...BEST_ROOMMATE, thermostat: 'AC on above 85°F, set to 78°F', signature: 'Kai Mana' } : {};
    finishSteps(s, [id], { [id]: v }, now);
  }
  return s;
}
for (const [type, from, ids, description] of [
  ['apartment', 'paperwork-apartment-lease', ['lease', 'move-in-payment', 'credit-card-offer'], 'Hilo apartment'],
  ['shared', 'paperwork-shared-agreement', ['roommate-agreement', 'lease', 'move-in-payment', 'credit-card-offer'], 'Honolulu room'],
  ['condo', 'paperwork-condo-insurance', ['condo-insurance', 'closing-disclosure', 'credit-card-offer'], 'Miami condo'],
  ['house', 'paperwork-house-closing', ['closing-disclosure', 'credit-card-offer'], 'Katy house'],
  ['build', 'paperwork-build-insurance', ['home-insurance', 'credit-card-offer'], 'Pāhoa build'],
]) seeds[`paperwork-ready-${type}`] = { phase: 'paperwork', description: `${description}: every step done; Results are next.`,
  build: (now) => ready(seeds[from].build(now), ids, now) };

// Task 30 seeds: the card offer is the active step (Hilo apartment, score 680 → regular $1,000 card; and a 620 score →
// secured card).
const cardOfferSeed = (score) => (now) => {
  const s = seeds['paperwork-apartment-lease'].build(now);
  finishSteps(s, ['lease', 'move-in-payment'], { lease: leaseValuesFor(s), 'move-in-payment': MOVE_IN }, now);
  if (score) s.finances.credit.score = score;
  return s;
};
seeds['paperwork-card-offer'] = { phase: 'paperwork',
  description: 'Hilo apartment: lease and move-in done; the credit card offer is next (regular card).', build: cardOfferSeed(null) };
seeds['paperwork-card-offer-secured'] = { phase: 'paperwork',
  description: 'Hilo apartment with a 620 credit score: the card offer is a secured card.', build: cardOfferSeed(620) };
