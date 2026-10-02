import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid, gridCells } from '../../app/src/finance/grid.js';
import { buildSeed } from '../../app/src/dev/seeds.js';
import { byId } from '../../app/src/data/locations/index.js';
import { homeType } from '../../app/src/data/homeTypes.js';
import { validateState } from '../../app/src/state/schema.js';
import {
  detailTitle, utilityNotes, hazardLabel, chooseCheck, confirmText, choiceSnapshot, applyChoice,
} from '../../app/src/phases/plan/detailModel.js';

const state = () => buildSeed('plan-comfortable', 1_900_000_000_000);
const cellOf = (s, loc, type) => gridCells(buildGrid(s)).find((c) => c.locationId === loc && c.homeTypeId === type);

test('title, hazard labels and water/sewer notes', () => {
  assert.equal(detailTitle(byId['hilo'], homeType('apartment')), 'Apartment in Hilo');
  assert.equal(hazardLabel('extreme-heat'), 'Extreme heat');
  const pahoa = utilityNotes(byId['pahoa']);
  assert.equal(pahoa.length, 2);
  assert.match(pahoa[0], /rain catchment tank/);
  assert.match(pahoa[1], /cesspool/);
});

test('red and unavailable cells cannot be chosen and say why', () => {
  const s = state();
  const cells = gridCells(buildGrid(s));
  const red = cells.find((c) => c.status.status === 'red');
  const na = cellOf(s, 'yellow-pine', 'apartment');
  assert.equal(na.status.status, 'na');
  for (const c of [red, na]) {
    const r = chooseCheck(c);
    assert.equal(r.ok, false);
    assert.ok(r.reasons.length > 0 && r.reasons.every((x) => typeof x === 'string' && x.length > 5));
    assert.throws(() => applyChoice(state(), c, 1));
  }
  const green = cells.find((c) => c.status.status === 'green');
  assert.deepEqual(chooseCheck(green), { ok: true, reasons: [] });
});

test('confirm text matches 04 §6', () => {
  assert.equal(confirmText(byId['hilo'], homeType('apartment')), "You're choosing an apartment in Hilo. Next you'll fill out "
    + 'the paperwork: applications, a lease, insurance, and a letter. Ready?');
  assert.match(confirmText(byId['hilo'], homeType('build')), /^You're choosing to build a new house in Hilo\./);
  assert.match(confirmText(byId['hilo'], homeType('condo')), /^You're choosing a condo in Hilo\. .*mortgage/);
});

test('applyChoice: snapshot of cellCost, fresh paperwork, phase paperwork, valid state', () => {
  const s = state();
  s.paperwork.steps.old = { done: true };
  s.plan.expanded = { locationId: 'hilo', homeTypeId: 'shared' };
  const cell = gridCells(buildGrid(s)).find((c) => c.status.status === 'green' || c.status.status === 'cyan');
  applyChoice(s, cell, 1234);
  assert.equal(s.phase, 'paperwork');
  assert.equal(s.plan.expanded, null);
  assert.deepEqual(s.paperwork, { steps: {}, options: {}, letterIds: [], decisions: [], committed: false });
  assert.equal(s.choice.locationId, cell.locationId);
  assert.equal(s.choice.homeTypeId, cell.homeTypeId);
  assert.equal(s.choice.chosenAt, 1234);
  const snap = s.choice.snapshot;
  assert.equal(snap.upfrontCents, cell.cost.upfrontCents);
  assert.equal(snap.monthlyCents, cell.cost.monthlyCents);
  assert.equal(snap.breakdown.upfront.reduce((a, l) => a + l.cents, 0), cell.cost.upfrontCents);
  assert.equal(snap.breakdown.monthly.reduce((a, l) => a + l.cents, 0), cell.cost.monthlyCents);
  assert.notEqual(snap.breakdown.upfront, cell.cost.upfront, 'snapshot is a copy');
  assert.deepEqual(choiceSnapshot(cell), snap);
  assert.deepEqual(validateState(s), []);
  assert.doesNotThrow(() => JSON.stringify(s));
});
