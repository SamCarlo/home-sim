// Task 24: insurance shopping (05 §5): quote math, locked add-ons, HPIA, Florida note, the calculator, choosePolicy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds } from '../../app/src/dev/seeds.js';
import { byId } from '../../app/src/data/locations/index.js';
import { INSURANCE } from '../../app/src/config.js';
import { quotes, addOns, hpiaOnly, hurricaneDeductible, outOfPocket, policyKind, basePremiumMonthlyCents,
  policyMonthlyCents, chosenAddOns } from '../../app/src/finance/insurance.js';
import { validateState } from '../../app/src/state/schema.js';
import { stepStatus } from '../../app/src/phases/paperwork/flow.js';
import rentersStep from '../../app/src/phases/paperwork/steps/renters-insurance.js';
import homeStep from '../../app/src/phases/paperwork/steps/home-insurance.js';
import condoStep from '../../app/src/phases/paperwork/steps/condo-insurance.js';

const build = (name) => seeds[name].build(0);

test('policy kinds and base premiums (05 §5)', () => {
  assert.deepEqual(['apartment', 'shared', 'condo', 'house', 'build'].map(policyKind), ['renters', 'renters', 'condo', 'home', 'home']);
  assert.equal(basePremiumMonthlyCents(byId.hilo, 'apartment'), 1500);
  assert.equal(basePremiumMonthlyCents(byId.miami, 'condo'), 10000);           // $1,200 / 12
  const katy = byId.katy;
  assert.equal(basePremiumMonthlyCents(katy, 'house', katy.housing.house.priceCents), 26667);
  // scaled to the value, clamped 0.5–1.5
  assert.equal(basePremiumMonthlyCents(katy, 'house', katy.housing.house.priceCents * 10), Math.round(320000 * 1.5 / 12));
});

test('three quotes: premium × 0.8 / 1.0 / 1.3 with the right deductibles', () => {
  const r = quotes(byId.hilo, 'apartment');
  assert.deepEqual(r.map((q) => q.id), ['basic', 'standard', 'premium']);
  assert.deepEqual(r.map((q) => q.premiumMonthlyCents), [1200, 1500, 1950]);
  assert.deepEqual(r.map((q) => q.deductibleCents), [100000, 50000, 25000]);
  const h = quotes(byId.katy, 'house', byId.katy.housing.house.priceCents);
  assert.deepEqual(h.map((q) => q.deductibleCents), [250000, 100000, 50000]);
  assert.deepEqual(h.map((q) => q.liabilityCents), [10000000, 30000000, 50000000]);
  assert.ok(h[2].extras.length === 2 && h[0].extras.length === 0);
});

test('required hazard add-ons are locked for buyers and builders, never for renters', () => {
  const pahoaHouse = addOns(byId.pahoa, 'house');
  const lava = pahoaHouse.find((a) => a.type === 'lava');
  assert.equal(lava.locked, true);
  assert.equal(pahoaHouse.find((a) => a.type === 'hurricane').locked, false);
  assert.equal(addOns(byId.pahoa, 'build').find((a) => a.type === 'lava').locked, true);
  const pahoaRent = addOns(byId.pahoa, 'apartment').find((a) => a.type === 'lava');
  assert.equal(pahoaRent.locked, false);
  assert.equal(pahoaRent.annualCents, Math.round(400000 * INSURANCE.addOnFactor.renters));
  assert.equal(addOns(byId.katy, 'house').find((a) => a.type === 'flood').locked, false);
  // locked ones count even when not picked
  const q = quotes(byId.pahoa, 'house', byId.pahoa.housing.house.priceCents)[1];
  assert.deepEqual(chosenAddOns(pahoaHouse, []).map((a) => a.type), ['lava']);
  assert.equal(policyMonthlyCents(q, pahoaHouse, []), q.premiumMonthlyCents + lava.monthlyCents);
  assert.equal(policyMonthlyCents(q, pahoaHouse, ['hurricane']), q.premiumMonthlyCents + lava.monthlyCents + 7500);
});

test('HPIA in Lava Zones 1–2 and the Florida hurricane deductible', () => {
  assert.equal(hpiaOnly(byId.pahoa), true);
  assert.equal(hpiaOnly(byId.hilo), false);                                     // zone 3
  assert.match(addOns(byId.pahoa, 'house').find((a) => a.type === 'lava').provider, /HPIA/);
  const fl = hurricaneDeductible(byId.miami, 'condo', 40000000);
  assert.deepEqual([fl.lowCents, fl.highCents], [800000, 2000000]);
  assert.equal(hurricaneDeductible(byId.miami, 'apartment', 0), null);
  assert.equal(hurricaneDeductible(byId.katy, 'house', 37500000), null);
});

test('the calculator: you pay up to the deductible, insurance pays the rest', () => {
  assert.deepEqual(outOfPocket(300000, { deductibleCents: 100000 }), { lossCents: 300000, youPayCents: 100000, insurerPaysCents: 200000 });
  assert.deepEqual(outOfPocket(30000, { deductibleCents: 50000 }), { lossCents: 30000, youPayCents: 30000, insurerPaysCents: 0 });
  assert.deepEqual(outOfPocket(-5, { deductibleCents: 50000 }), { lossCents: 0, youPayCents: 0, insurerPaysCents: 0 });
});

test('renters: choosing stores the policy, recurring draft, deductible, snapshot line and a pending agreement', () => {
  const s = build('paperwork-renters-insurance');
  const before = s.finances.agreements.length;
  rentersStep.complete(s, { quoteId: 'basic', addOns: ['hurricane'] }, 5);
  const p = s.paperwork.options.insurance;
  assert.equal(p.quoteId, 'basic');
  assert.equal(p.monthlyCents, 1200 + 750);
  assert.equal(s.paperwork.options.deductibleCents, 100000);
  assert.deepEqual(p.recurring, { label: 'Renters insurance (Basic)', amountCents: -1950, category: 'insurance', source: 'insurance' });
  const lines = s.choice.snapshot.breakdown.monthly;
  assert.equal(lines.find((l) => l.key === 'renters-insurance').cents, 1200);
  assert.equal(lines.find((l) => l.key === 'hazard').cents, 750);
  assert.equal(s.choice.snapshot.monthlyCents, lines.reduce((a, l) => a + l.cents, 0));
  const ag = s.finances.agreements.at(-1);
  assert.equal(s.finances.agreements.length, before + 1);
  assert.equal(ag.type, 'insurance');
  assert.equal(ag.docType, 'renters-insurance');
  assert.equal(ag.status, 'pending');
  assert.equal(stepStatus(s, 'renters-insurance'), 'done');
  assert.deepEqual(validateState(s), []);
});

test('home (Pāhoa build): lava is forced on even if not picked; condo (Miami) keeps the hurricane note', () => {
  const s = build('paperwork-build-insurance');
  homeStep.complete(s, { quoteId: 'premium', addOns: [] }, 0);
  const p = s.paperwork.options.insurance;
  assert.deepEqual(p.addOns.map((a) => a.type), ['lava']);
  assert.match(p.addOns[0].provider, /HPIA/);
  assert.equal(p.deductibleCents, 50000);
  assert.equal(s.choice.snapshot.breakdown.monthly.filter((l) => l.key === 'hazard').length, 1);
  const c = build('paperwork-condo-insurance');
  condoStep.complete(c, {}, 0);
  assert.equal(c.paperwork.options.insurance.quoteId, 'standard');
  assert.ok(c.paperwork.options.insurance.hurricaneDeductible.lowCents > 0);
  assert.equal(c.finances.agreements.at(-1).docType, 'condo-insurance');
});
