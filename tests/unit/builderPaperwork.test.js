// Task 23: builder paperwork and the design budget (05 §4 land-purchase … site-utilities, 04 §3, 07 §5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds, SAMPLE_BUILD_VALUES } from '../../app/src/dev/seeds.js';
import { BUILD, FINANCE } from '../../app/src/config.js';
import { byId } from '../../app/src/data/locations/index.js';
import { cellCost } from '../../app/src/finance/costs.js';
import { designBudgetCents, projectCost, tierTable, contractorBids, contractorRisk, bidMonths, lotListing,
  permitChecklist, utilityOptions, siteUtilityPlan, defaultUtilities } from '../../app/src/finance/build.js';
import { unpaidUpfront } from '../../app/src/finance/ledger.js';
import { validateState } from '../../app/src/state/schema.js';
import landStep from '../../app/src/phases/paperwork/steps/land-purchase.js';
import loanStep, { cashNeeded } from '../../app/src/phases/paperwork/steps/construction-loan-application.js';
import bidStep, { bidsFor } from '../../app/src/phases/paperwork/steps/contractor-bids.js';
import permitStep from '../../app/src/phases/paperwork/steps/building-permit.js';
import utilStep from '../../app/src/phases/paperwork/steps/site-utilities.js';

const pahoa = byId.pahoa;
const build = (name) => seeds[name].build(0);
const cash = (s) => s.finances.checkingCents + s.finances.savingsCents;

test('design budget = tier sq ft × local cost per sq ft × 1.10; project cost matches costs.js for Cozy', () => {
  assert.equal(designBudgetCents(pahoa, 'tiny'), 24750000);
  assert.equal(designBudgetCents(pahoa, 'cozy'), 41250000);
  assert.equal(designBudgetCents(pahoa, 'family'), 66000000);
  const cozy = projectCost(pahoa, { tierId: 'cozy' });
  const table = cellCost(pahoa, 'build');
  assert.equal(cozy.upfrontCents, table.upfrontCents);
  assert.equal(cozy.monthlyCents, table.monthlyCents);
  assert.equal(cozy.project.projectCents, 4500000 + 41250000 + 4500000);
  const rows = tierTable(pahoa);
  assert.deepEqual(rows.map((r) => r.tier.id), ['tiny', 'cozy', 'family']);
  assert.ok(rows[0].cost.project.projectCents < rows[1].cost.project.projectCents);
  assert.ok(rows[1].cost.cashNeededCents < rows[2].cost.cashNeededCents);
  for (const r of rows) assert.equal(r.cost.upfront.find((l) => l.key === 'down-payment').cents, Math.round(r.cost.project.projectCents * 0.2));
});

test('bid adjustments change the price per sq ft and the months; delay adds temporary housing', () => {
  const b = projectCost(pahoa, { tierId: 'cozy', bidId: 'b' });
  const a = projectCost(pahoa, { tierId: 'cozy', bidId: 'a' });
  const c = projectCost(pahoa, { tierId: 'cozy', bidId: 'c' });
  assert.ok(a.project.projectCents < b.project.projectCents && b.project.projectCents < c.project.projectCents);
  assert.equal(b.designBudgetCents, a.designBudgetCents); // the blueprint budget doesn't depend on the builder
  assert.deepEqual(BUILD.bids.map((x) => bidMonths(pahoa, x)), [14, 9, 8]); // Pāhoa takes 12 months
  const late = projectCost(pahoa, { tierId: 'cozy', bidId: 'a', extraMonths: 2 });
  const temp = (p) => p.upfront.find((l) => l.key === 'temporary-housing').cents;
  assert.equal(temp(late) - temp(a), 2 * pahoa.housing.shared.roomRentCents);
});

test('lot listing is seeded; Pāhoa is lava zone 1–2 with catchment and a required septic system', () => {
  const s = build('paperwork-build-start');
  const lot = lotListing(s);
  assert.deepEqual(lot, lotListing(build('paperwork-build-start')));
  assert.ok([1, 2].includes(lot.lavaZone));
  assert.ok(lot.septicRequired);
  assert.match(lot.sewer, /cesspools aren?’?t|cesspools are not allowed/);
  assert.match(lot.water, /catchment/);
  assert.equal(lot.priceCents, pahoa.housing.build.lotPriceCents);
});

test('land purchase: earnest money paid and counted toward the down payment; contingency on by default', () => {
  const s = build('paperwork-build-start');
  const before = cash(s);
  const r = landStep.complete(s, { signature: 'Kai Mana' }, 1);
  assert.equal(r.ok, true);
  assert.equal(cash(s), before - BUILD.earnestMoneyCents);
  assert.equal(s.paperwork.paidUpfront['down-payment'], BUILD.earnestMoneyCents);
  assert.equal(s.paperwork.options.land.contingency, true);
  assert.equal(s.paperwork.steps['land-purchase'].status, 'done');
  assert.equal(s.finances.agreements.at(-1).docType, 'land-purchase');
  const off = build('paperwork-build-start');
  landStep.complete(off, { contingency: false, signature: 'Kai Mana' }, 1);
  assert.equal(off.paperwork.options.land.contingency, false);
  const poor = build('paperwork-build-start');
  poor.finances.savingsCents = 0; poor.finances.checkingCents = 500;
  assert.equal(landStep.complete(poor, {}, 1).ok, false);
  assert.equal(poor.paperwork.options.land, undefined);
});

test('construction loan: hard inquiry, pending application, tier + design budget stored, snapshot follows the tier', () => {
  const s = build('paperwork-build-loan');
  const score = s.finances.credit.score;
  loanStep.complete(s, { ...SAMPLE_BUILD_VALUES['construction-loan-application'], tier: 'tiny' }, 2);
  assert.equal(s.finances.credit.score, score - 5);
  assert.equal(s.finances.applications.at(-1).kind, 'construction');
  assert.equal(s.paperwork.options.buildTier, 'tiny');
  assert.equal(s.paperwork.options.designBudgetCents, designBudgetCents(pahoa, 'tiny'));
  const tiny = projectCost(pahoa, { tierId: 'tiny' });
  assert.equal(s.choice.snapshot.upfrontCents, tiny.upfrontCents);
  assert.equal(s.paperwork.options.project.sqft, 600);
  // Cash check: the earnest money already paid comes off what's still needed.
  assert.equal(cashNeeded(s, 'tiny'), tiny.upfrontCents - BUILD.earnestMoneyCents);
  assert.deepEqual(validateState(s), []);
});

test('contractor bids: A −8%/14 mo with risk flags and seeded risk, B local price, C +10%', () => {
  const s = build('paperwork-build-bids');
  const bids = bidsFor(s);
  assert.equal(bids.length, 3);
  assert.equal(new Set(bids.map((b) => b.company)).size, 3);
  const base = 1000 * pahoa.housing.build.buildCostPerSqftCents;
  assert.deepEqual(bids.map((b) => b.priceCents), [Math.round(base * 0.92), base, Math.round(base * 1.1)]);
  assert.ok(bids[0].flags.includes('No warranty'));
  assert.equal(bids[1].flags.length, 0);
  assert.deepEqual(contractorBids(s, []).map((b) => b.id), ['a', 'b', 'c']);
  const risk = contractorRisk(s);
  assert.ok(risk.extraMonths >= 1 && risk.extraMonths <= 4);
  assert.ok(risk.defect.month >= 0 && risk.defect.month <= 5 && risk.defect.cents > 0);
  bidStep.complete(s, { contractorId: 'a' }, 3);
  assert.equal(s.paperwork.options.contractorId, 'a');
  assert.deepEqual(s.paperwork.options.contractorRisk, risk);
  const delayed = projectCost(pahoa, { tierId: 'cozy', bidId: 'a', extraMonths: risk.extraMonths });
  assert.equal(s.choice.snapshot.upfrontCents, delayed.upfrontCents);
  const b = build('paperwork-build-bids');
  bidStep.complete(b, { contractorId: 'b' }, 3);
  assert.equal(b.paperwork.options.contractorRisk, undefined);
});

test('building permit: Hawaiʻi checklist has the solar water heater; fee charged once and permits line paid', () => {
  const items = permitChecklist(pahoa);
  assert.deepEqual(items.map((i) => i.id), ['site-plan', 'setbacks', 'septic', 'energy', 'catchment']);
  assert.match(items.find((i) => i.id === 'energy').label, /solar water heater/);
  assert.ok(!permitChecklist(byId.katy).some((i) => i.id === 'catchment' || /solar water/.test(i.label)));
  const s = build('paperwork-build-permit');
  const before = cash(s);
  const values = Object.fromEntries(items.map((i) => [`item-${i.id}`, true]));
  assert.equal(permitStep.complete(s, { ...values, signature: 'Kai Mana' }, 4).ok, true);
  assert.equal(cash(s), before - pahoa.housing.build.permitCents);
  assert.equal(s.paperwork.paidUpfront.permits, pahoa.housing.build.permitCents);
  assert.ok(!unpaidUpfront(s).some((l) => l.key === 'permits'));
  assert.equal(s.paperwork.options.permit.approved, true);
});

test('site utilities: options by location, upgrades come out of the design budget, solar cuts the bill', () => {
  const o = utilityOptions(pahoa);
  assert.deepEqual(o.water.map((x) => x.id), ['catchment', 'well']);
  assert.deepEqual(o.sewer.map((x) => x.id), ['septic']);
  assert.deepEqual(utilityOptions(byId.katy).water.map((x) => x.id), ['county']);
  assert.deepEqual(defaultUtilities(pahoa), { water: 'catchment', power: 'grid', sewer: 'septic' });
  const plan = siteUtilityPlan(pahoa, { water: 'catchment', power: 'grid-solar', sewer: 'septic' });
  assert.equal(plan.upgradeCents, 1500000);
  const bill = Math.round(pahoa.living.utilitiesMonthlyCents * FINANCE.utilityFactor.build);
  assert.equal(plan.monthlyDeltaCents, -Math.round(Math.round(bill * 0.6) * 0.6));
  assert.equal(plan.solarKw, 5);
  assert.equal(plan.catchmentGallons, 10000);
  assert.throws(() => siteUtilityPlan(pahoa, { water: 'county', power: 'grid', sewer: 'septic' }));
  const s = build('paperwork-build-utilities');
  const util = (st) => st.choice.snapshot.breakdown.monthly.find((l) => l.key === 'utilities').cents;
  const before = util(s);
  utilStep.complete(s, { water: 'catchment', power: 'grid-solar', sewer: 'septic' }, 5);
  const op = s.paperwork.options;
  assert.equal(op.designBudgetCents, designBudgetCents(pahoa, 'cozy') - 1500000);
  assert.equal(op.designBudgetBaseCents, designBudgetCents(pahoa, 'cozy'));
  assert.equal(util(s), before + plan.monthlyDeltaCents);
  assert.deepEqual(validateState(s), []);
});

test('the Pāhoa build path: every builder step done with sensible numbers', () => {
  const s = build('paperwork-build-utilities');
  utilStep.complete(s, {}, 5);
  for (const id of ['land-purchase', 'construction-loan-application', 'contractor-bids', 'building-permit', 'site-utilities']) {
    assert.equal(s.paperwork.steps[id].status, 'done', id);
  }
  const o = s.paperwork.options;
  assert.equal(o.buildTier, 'cozy');
  assert.equal(o.contractorId, 'b');
  assert.equal(o.designBudgetCents, 41250000);
  assert.ok(cash(s) > unpaidUpfront(s).reduce((t, l) => t + l.cents, 0), 'the seed can still afford closing');
  assert.ok(s.choice.snapshot.monthlyCents > 300000 && s.choice.snapshot.monthlyCents < 400000);
});
