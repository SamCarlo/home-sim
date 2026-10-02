// Task 22: HOA review, home inspection, appraisal and closing disclosure (05 §4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds } from '../../app/src/dev/seeds.js';
import { BUYING } from '../../app/src/config.js';
import { hoaReport, inspectionFindings, inspectionReport, inspectorFinds, repairCreditDecision, creditAsk,
  appraisalResult, canPayGap, resolvePurchase, closingDisclosure, flagRow, closingOutcome, CLOSING_ROWS } from '../../app/src/finance/buying.js';
import { loanOptions, findOption } from '../../app/src/finance/loanOptions.js';
import { pmt } from '../../app/src/finance/loans.js';
import { stepsFor } from '../../app/src/phases/paperwork/flow.js';
import hoaStep from '../../app/src/phases/paperwork/steps/hoa-review.js';
import inspStep, { hireInspector, requestRepairCredit } from '../../app/src/phases/paperwork/steps/home-inspection.js';
import apprStep, { orderAppraisal, askSeller, payGap } from '../../app/src/phases/paperwork/steps/appraisal.js';
import cdStep from '../../app/src/phases/paperwork/steps/closing-disclosure.js';
import { validateState } from '../../app/src/state/schema.js';

const build = (name) => seeds[name].build(0);
const cash = (s) => s.finances.checkingCents + s.finances.savingsCents;

test('findings are deterministic, 3–6 items; thorough finds all, cheaper inspectors miss and schedule surprises', () => {
  const a = build('paperwork-house-inspection');
  const b = build('paperwork-house-inspection');
  assert.deepEqual(inspectionFindings(a), inspectionFindings(b));
  const all = inspectionFindings(a);
  assert.ok(all.length >= 3 && all.length <= 6);
  assert.equal(inspectionReport(a, 'thorough').missed.length, 0);
  const budget = inspectionReport(a, 'budget');
  const standard = inspectionReport(a, 'standard');
  assert.ok(budget.found.length <= standard.found.length && standard.found.length <= all.length);
  assert.equal(budget.found.length + budget.missed.length, all.length);
  for (const m of budget.missedFindings) {
    assert.ok(m.month >= 1 && m.month <= 7 && Number.isInteger(m.cents) && m.label);
  }
  // Specialty items (termites, sewer) need the thorough inspector.
  assert.equal(inspectorFinds('standard', { specialty: 'termite', hidden: false }), false);
  assert.equal(inspectorFinds('budget', { specialty: null, hidden: true }), false);
  assert.equal(inspectorFinds('standard', { specialty: null, hidden: true }), true);
});

test('hiring charges the inspector fee once, marks the line paid and saves missedFindings', () => {
  const s = build('paperwork-house-inspection');
  const before = cash(s);
  assert.ok(hireInspector(s, 'budget').ok);
  assert.equal(before - cash(s), 30000);
  assert.equal(s.paperwork.paidUpfront.inspection, 50000); // the whole snapshot line is settled
  assert.deepEqual(s.paperwork.options.missedFindings, inspectionReport(s, 'budget').missedFindings);
  const d = requestRepairCredit(s);
  assert.equal(d.creditCents, d.accepted ? creditAsk(s.paperwork.options.inspection.found).cents : 0);
  assert.ok(inspStep.complete(s, { decision: 'credit' }, 1).ok);
  assert.equal(s.paperwork.steps['home-inspection'].status, 'done');
  assert.deepEqual(validateState(s), []);
});

test('repair credit odds rise with severity; an accepted credit lowers cash to close', () => {
  const s = build('paperwork-house-inspection');
  const minor = [{ severity: 'minor', cents: 10000 }];
  const major = [{ severity: 'major', cents: 300000 }, { severity: 'minor', cents: 10000 }];
  assert.equal(repairCreditDecision(s, minor).probability, BUYING.inspection.creditChance.minor);
  assert.equal(repairCreditDecision(s, major).probability, BUYING.inspection.creditChance.major);
  assert.equal(creditAsk(major).cents, 300000);
  const before = findOption(loanOptions(s), s.paperwork.options).cashToCloseCents;
  s.paperwork.options.repairCreditCents = 200000;
  assert.equal(findOption(loanOptions(s), s.paperwork.options).cashToCloseCents, before - 200000);
});

test('appraisal gap math: lenders lend on the lower value; pay-gap adds cash, seller-lowered changes the price', () => {
  const s = build('paperwork-house-appraisal-low');
  const before = cash(s);
  assert.ok(orderAppraisal(s).ok);
  assert.equal(before - cash(s), 60000);
  const a = s.paperwork.options.appraisal;
  assert.ok(a.gapCents > 0 && a.appraisedCents === a.priceCents - a.gapCents);
  const f = a.appraisedCents / a.priceCents;
  assert.ok(f >= 0.955 && f <= 1.035);
  assert.deepEqual(appraisalResult(s, a.priceCents), { priceCents: a.priceCents, appraisedCents: a.appraisedCents, gapCents: a.gapCents });
  const plain = findOption(loanOptions(s), s.paperwork.options);
  const paying = structuredClone(s);
  payGap(paying);
  const o = findOption(loanOptions(paying), paying.paperwork.options);
  assert.equal(o.loanCents, a.appraisedCents - Math.round(a.appraisedCents * 0.1));
  assert.ok(o.loanCents < plain.loanCents && o.gapCents === a.gapCents);
  assert.equal(o.cashToCloseCents, o.downCents + o.closingCents + o.feesCents + o.reservesCents + a.gapCents);
  assert.deepEqual(resolvePurchase(a, 'seller-lowered'), { priceCents: a.appraisedCents, appraisedCents: a.appraisedCents,
    gapCents: 0, resolution: 'seller-lowered' });
  assert.equal(canPayGap({ cashCents: 100, cashToCloseCents: 60, gapCents: 40 }), true);
  assert.equal(canPayGap({ cashCents: 99, cashToCloseCents: 60, gapCents: 40 }), false);
  const asked = structuredClone(s);
  const d = askSeller(asked);
  assert.equal(!!asked.paperwork.options.purchase, d.agreed);
  if (d.agreed) assert.equal(asked.paperwork.options.purchase.priceCents, a.appraisedCents);
  payGap(s);
  assert.ok(apprStep.complete(s, {}, 1).ok);
  assert.equal(s.paperwork.steps.appraisal.values.resolution, 'pay-gap');
});

test('closing disclosure: rate 0.25 points high until flagged; only the rate flag is correct; signing records it', () => {
  const s = build('paperwork-house-closing');
  const o = findOption(loanOptions(s), s.paperwork.options);
  const cd = closingDisclosure(o, {});
  assert.equal(cd.shownRate, +(o.rate + 0.0025).toFixed(6));
  assert.equal(cd.rate, cd.shownRate);
  assert.equal(cd.piCents, pmt(o.loanCents, cd.shownRate, o.termMonths));
  assert.ok(cd.piCents > cd.agreedPiCents);
  const fixed = closingDisclosure(o, { flagged: true });
  assert.equal(fixed.rate, o.rate);
  assert.equal(fixed.piCents, o.piCents);
  for (const r of CLOSING_ROWS) assert.equal(flagRow(r).correct, r === 'rate');
  assert.equal(closingOutcome(cd).extraMonthlyCents, cd.piCents - cd.agreedPiCents);
  assert.throws(() => cdStep.complete(structuredClone(s), { signature: 'Someone Else' }));
  const unflagged = structuredClone(s);
  cdStep.complete(unflagged, { signature: 'Kai Mana', flagged: false, wrongFlags: 2 }, 1);
  assert.equal(unflagged.paperwork.options.closing.finalRate, cd.shownRate);
  assert.equal(unflagged.paperwork.options.closing.errorFlagged, false);
  assert.equal(unflagged.paperwork.options.closing.wrongFlags, 2);
  cdStep.complete(s, { signature: 'kai mana', flagged: true }, 1);
  assert.equal(s.paperwork.options.closing.finalRate, o.rate);
  assert.equal(s.paperwork.steps['closing-disclosure'].status, 'done');
});

test('HOA review: Miami assessment adds a special-assessment housing line once; agreement with docType', () => {
  const s = build('paperwork-condo-hoa');
  assert.ok(stepsFor(s).includes('hoa-review'));
  const r = hoaReport(s);
  assert.ok(r.assessment && r.assessment.monthlyCents > 0 && r.assessment.months > 0);
  assert.ok(r.reservePct >= 18 && r.reservePct <= 78);
  const before = loanOptions(s).fixedCents;
  hoaStep.complete(s, { signature: 'Kai Mana' }, 1);
  hoaStep.complete(s, { signature: 'Kai Mana' }, 1);
  const lines = s.choice.snapshot.breakdown.monthly.filter((l) => l.key === 'special-assessment');
  assert.equal(lines.length, 1);
  assert.equal(loanOptions(s).fixedCents, before + r.assessment.monthlyCents);
  assert.equal(s.paperwork.options.specialAssessment.monthlyCents, r.assessment.monthlyCents);
  const ag = s.finances.agreements.find((a) => a.docType === 'hoa-review');
  assert.ok(ag && ag.status === 'pending');
  // The chance is weighted by location: Miami highest.
  assert.ok(BUYING.hoa.assessmentChance.miami > BUYING.hoa.assessmentChance.default);
  assert.deepEqual(validateState(s), []);
});
