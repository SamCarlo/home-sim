import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../../app/src/dev/seeds.js';
import { validateState } from '../../app/src/state/schema.js';
import { cash } from '../../app/src/finance/ledger.js';
import {
  STEP_ORDER, stepsFor, stepStatus, nextStep, allDone, checklist, completeStep, setStep, withdraw, payFee,
} from '../../app/src/phases/paperwork/flow.js';
import { STEPS } from '../../app/src/phases/paperwork/steps/index.js';

const NOW = 1_900_000_000_000;
const seed = (name) => buildSeed(`paperwork-${name}`, NOW);

test('every home type lists its 05 §3 steps in order; footnote steps only when they apply', () => {
  const lists = {
    apartment: stepsFor(seed('apartment-start')), shared: stepsFor(seed('shared-start')),
    condo: stepsFor(seed('condo-start')), house: stepsFor(seed('house-start')), build: stepsFor(seed('build-start')),
  };
  for (const [type, ids] of Object.entries(lists)) {
    assert.deepEqual(ids, STEP_ORDER[type].filter((id) => id !== 'cosigner-request' && id !== 'credit-explanation'), type);
    assert.equal(ids.at(-1), 'results');
  }
  assert.ok(stepsFor(seed('apartment-cosigner')).includes('cosigner-request'));
  const lowCredit = seed('house-start');
  lowCredit.finances.credit.score = 640;
  assert.deepEqual(stepsFor(lowCredit).slice(2, 5), ['loan-purpose', 'credit-explanation', 'home-inspection']);
  assert.deepEqual(stepsFor(buildSeed('plan-comfortable', NOW)), []);
});

test('every step id has a registry module with a title', () => {
  for (const ids of Object.values(STEP_ORDER)) for (const id of ids) {
    assert.ok(STEPS[id], id);
    assert.equal(STEPS[id].id, id);
    assert.ok(STEPS[id].title);
  }
});

test('steps unlock in order, letters only need their prerequisite, results need everything', () => {
  const s = seed('apartment-cosigner');
  assert.equal(nextStep(s), 'rental-application');
  assert.equal(stepStatus(s, 'rental-cover'), 'locked');
  completeStep(s, 'rental-application', { upfrontKey: 'application' });
  assert.equal(stepStatus(s, 'rental-cover'), 'todo');
  assert.equal(stepStatus(s, 'cosigner-request'), 'todo');
  assert.equal(stepStatus(s, 'renters-insurance'), 'todo', 'letters never block the form steps');
  setStep(s, 'rental-cover', 'draft', { text: 'Aloha' });
  assert.equal(stepStatus(s, 'rental-cover'), 'draft');
  assert.equal(nextStep(s), 'rental-cover');
  for (const id of ['rental-cover', 'cosigner-request', 'renters-insurance', 'lease', 'move-in-payment']) completeStep(s, id);
  assert.equal(allDone(s), false);
  assert.equal(stepStatus(s, 'results'), 'locked');
  setStep(s, 'credit-card-offer', 'skipped');
  assert.equal(allDone(s), true);
  assert.equal(stepStatus(s, 'results'), 'todo');
  assert.equal(nextStep(s), 'results');
  assert.deepEqual(validateState(s), []);
});

test('fees are charged once, marked paid, and refused all-or-nothing', () => {
  const s = seed('apartment-start');
  const before = cash(s);
  assert.deepEqual(completeStep(s, 'rental-application', { upfrontKey: 'application' }), { ok: true, shortfallCents: 0 });
  assert.equal(before - cash(s), 5000);
  assert.equal(s.paperwork.paidUpfront.application, 5000);
  assert.equal(s.finances.transactions.at(-1).month, -1);
  completeStep(s, 'rental-application', { upfrontKey: 'application' });
  assert.equal(before - cash(s), 5000, 'not charged twice');
  const poor = seed('house-start');
  poor.finances.savingsCents = 100;
  const r = completeStep(poor, 'home-inspection', { upfrontKey: 'inspection' });
  assert.equal(r.ok, false);
  assert.ok(r.shortfallCents > 0);
  assert.equal(poor.paperwork.steps['home-inspection'], undefined);
  assert.deepEqual(payFee(poor, { lineKey: 'x', cents: 0, label: 'none' }), { ok: true, shortfallCents: 0 });
});

test('withdrawing records the attempt, keeps fees spent, voids pending records and returns to plan', () => {
  const s = seed('apartment-start');
  completeStep(s, 'rental-application', { upfrontKey: 'application' });
  s.finances.agreements.push({ id: 'ag1', type: 'lease', title: 'Lease', status: 'pending', signedAt: NOW,
    counterparty: 'X', summary: '', terms: {} });
  s.finances.applications.push({ id: 'app1', kind: 'rental', target: 'hilo|apartment', status: 'pending', feeCents: 5000, at: NOW, reasons: [] });
  const spent = cash(seed('apartment-start')) - cash(s);
  withdraw(s, NOW);
  assert.equal(s.phase, 'plan');
  assert.equal(s.choice, null);
  assert.deepEqual(s.paperwork.steps, {});
  assert.equal(cash(seed('apartment-start')) - cash(s), spent);
  assert.deepEqual(s.plan.attempts.at(-1), { locationId: 'hilo', homeTypeId: 'apartment', outcome: 'withdrawn',
    reasons: ['You chose a different home before the paperwork was finished.'], at: NOW });
  assert.equal(s.finances.agreements[0].status, 'void');
  assert.equal(s.finances.applications[0].status, 'denied');
  assert.deepEqual(checklist(s), []);
  assert.deepEqual(validateState(s), []);
});
