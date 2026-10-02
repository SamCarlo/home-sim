// Task 21: mortgage application and loan options (05 §4, §7): lava-zone rules, FHA credit floor, cash to close,
// 15- vs 30-year interest, and each step's complete() effects.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed, SAMPLE_MORTGAGE_APPLICATION } from '../../app/src/dev/seeds.js';
import { FINANCE, UNDERWRITING } from '../../app/src/config.js';
import { validateForm } from '../../app/src/forms/validate.js';
import { validateState } from '../../app/src/state/schema.js';
import { mulRate } from '../../app/src/finance/money.js';
import { loanOptions, optionKey, creditTier } from '../../app/src/finance/loanOptions.js';
import { stepStatus } from '../../app/src/phases/paperwork/flow.js';
import mortgageApplication, { mortgageSchema, estimatedGross } from '../../app/src/phases/paperwork/steps/mortgage-application.js';
import loanOptionsStep from '../../app/src/phases/paperwork/steps/loan-options.js';

const byKey = (r, program, pct, years) => r.options.find((o) => o.key === optionKey({ program, downPaymentPct: pct, termYears: years }));

test('Lava Zones 1–2: FHA and anything under 20% down are disabled with the reason', () => {
  const r = loanOptions(buildSeed('paperwork-pahoa-house-options', 0));
  assert.equal(r.lavaZone, 1);
  assert.equal(r.options.length, 8);
  for (const o of r.options) {
    if (o.program === 'fha') assert.match(o.disabledReason, /FHA won’t insure homes in Lava Zones 1–2/);
    else if (o.downPaymentPct < 0.2) assert.match(o.disabledReason, /at least 20% down/);
    else assert.equal(o.disabledReason, null);
  }
  // The same student in Katy (no lava zone) can use FHA and low down payments.
  const katy = loanOptions(buildSeed('paperwork-house-options', 0));
  assert.equal(byKey(katy, 'fha', 0.035, 30).disabledReason, null);
  assert.equal(byKey(katy, 'conventional', 0.05, 30).disabledReason, null);
});

test('FHA needs credit ≥ 580; conventional needs ≥ 620; tiers change the rate', () => {
  const s = buildSeed('paperwork-house-options', 0);
  s.finances.credit.score = 579;
  let r = loanOptions(s);
  assert.match(byKey(r, 'fha', 0.035, 30).disabledReason, /580 or more\. Yours is 579/);
  assert.match(byKey(r, 'conventional', 0.1, 30).disabledReason, /620 or more/);
  s.finances.credit.score = 580;
  r = loanOptions(s);
  assert.equal(byKey(r, 'fha', 0.035, 30).disabledReason, null);
  assert.match(byKey(r, 'conventional', 0.1, 30).disabledReason, /620 or more/);
  assert.equal(byKey(r, 'fha', 0.035, 30).rate, FINANCE.mortgageRate + 0.005);
  assert.equal(creditTier(745).rateAdj, -0.0025);
  assert.equal(creditTier(500), null);
});

test('cash to close = down + closing + unpaid fees + 2 months of housing; short cash disables with the amount', () => {
  const s = buildSeed('paperwork-house-options', 0);
  const r = loanOptions(s);
  const o = byKey(r, 'conventional', 0.1, 30);
  const price = r.priceCents;
  assert.equal(o.downCents, mulRate(price, 0.1));
  assert.equal(o.loanCents, price - o.downCents);
  assert.equal(o.closingCents, mulRate(price, FINANCE.closingPct));
  assert.equal(r.feesCents, FINANCE.inspectionCents + FINANCE.appraisalCents);
  assert.equal(o.housingCents, o.piCents + o.mortgageInsuranceCents + r.fixedCents);
  assert.equal(o.reservesCents, 2 * o.housingCents);
  assert.equal(o.cashToCloseCents, o.downCents + o.closingCents + r.feesCents + o.reservesCents);
  assert.equal(o.insuranceKind, 'pmi');
  assert.equal(byKey(r, 'conventional', 0.2, 30).mortgageInsuranceCents, 0);
  // FHA finances 1.75% upfront MIP and charges 0.55%/yr.
  const f = byKey(r, 'fha', 0.035, 30);
  assert.equal(f.upfrontMipCents, mulRate(f.baseLoanCents, FINANCE.fha.upfrontMipPct));
  assert.equal(f.loanCents, f.baseLoanCents + f.upfrontMipCents);
  assert.equal(f.insuranceKind, 'mip');
  // $80,000 isn't enough for 20% down on a $375k house.
  const twenty = byKey(r, 'conventional', 0.2, 30);
  assert.equal(twenty.shortCents, twenty.cashToCloseCents - r.cashCents);
  assert.match(twenty.disabledReason, /You need \$[\d,]+ more/);
  // A fee already paid isn't counted twice.
  s.paperwork.paidUpfront = { inspection: FINANCE.inspectionCents };
  assert.equal(loanOptions(s).feesCents, FINANCE.appraisalCents);
});

test('15-year loans pay less total interest than 30-year; best keys only pick usable options', () => {
  for (const name of ['paperwork-house-options', 'paperwork-pahoa-house-options', 'paperwork-condo-start']) {
    const r = loanOptions(buildSeed(name, 0));
    for (const o of r.options.filter((x) => x.termYears === 15)) {
      const thirty = byKey(r, o.program, o.downPaymentPct, 30);
      assert.ok(o.totalInterestCents < thirty.totalInterestCents, `${name} ${o.key}`);
      assert.ok(o.piCents > thirty.piCents);
    }
    for (const k of [r.cheapestMonthlyKey, r.leastInterestKey]) {
      assert.equal(r.options.find((o) => o.key === k).disabledReason, null);
    }
  }
  const p = loanOptions(buildSeed('paperwork-pahoa-house-options', 0));
  assert.equal(p.cheapestMonthlyKey, 'conventional-20-30');
  assert.equal(p.leastInterestKey, 'conventional-20-15');
});

test('mortgage application: gross estimate, declarations, hard inquiry and a pending application', () => {
  const s = buildSeed('paperwork-house-start', 0);
  assert.equal(estimatedGross(600000), Math.round(600000 / FINANCE.netToGross));
  const schema = mortgageSchema(s);
  assert.deepEqual(validateForm(schema, SAMPLE_MORTGAGE_APPLICATION, s), {});
  assert.ok(validateForm(schema, { ...SAMPLE_MORTGAGE_APPLICATION, occupy: 'no' }, s).occupy);
  const before = s.finances.credit.score;
  const cashBefore = s.finances.savingsCents + s.finances.checkingCents;
  const r = mortgageApplication.complete(s, SAMPLE_MORTGAGE_APPLICATION, 5);
  assert.equal(r.ok, true);
  assert.equal(s.finances.credit.score, before - 5);
  assert.equal(s.finances.credit.inquiries.at(-1).kind, 'mortgage');
  const app = s.finances.applications.at(-1);
  assert.equal(app.kind, 'mortgage');
  assert.equal(app.status, 'pending');
  assert.equal(app.target, 'katy|house');
  assert.equal(s.finances.savingsCents + s.finances.checkingCents, cashBefore);
  assert.equal(stepStatus(s, 'mortgage-application'), 'done');
  assert.equal(stepStatus(s, 'loan-options'), 'todo');
  assert.deepEqual(validateState(s), []);
});

test('loan options complete() stores the choice and refuses a disabled option', () => {
  const s = buildSeed('paperwork-pahoa-house-options', 0);
  const bad = loanOptionsStep.complete(s, { program: 'conventional', downPaymentPct: 0.1, termYears: 30 });
  assert.equal(bad.ok, false);
  assert.equal(stepStatus(s, 'loan-options'), 'todo');
  const ok = loanOptionsStep.complete(s, { program: 'conventional', downPaymentPct: 0.2, termYears: 15 }, 7);
  assert.equal(ok.ok, true);
  assert.deepEqual({ ...s.paperwork.options }, { program: 'conventional', downPaymentPct: 0.2, termYears: 15 });
  assert.equal(stepStatus(s, 'loan-options'), 'done');
  assert.equal(UNDERWRITING.mortgage.lavaZoneMinDownPct, 0.2);
  assert.deepEqual(validateState(s), []);
});
