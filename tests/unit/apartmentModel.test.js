// Apartment/condo picker rules (07 §2, task 36).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../../app/src/dev/seeds.js';
import {
  buildingOptions, unitTraits, lifestyleFor, unitLabel, addressLabel, plantsCost, moveIn, amenitiesFor,
} from '../../app/src/phases/design/apartmentModel.js';
import { planBuilding } from '../../app/src/phases/design/buildingPlan.js';
import { byId } from '../../app/src/data/locations/index.js';
import { DESIGN } from '../../app/src/config.js';

const hilo = () => buildSeed('design-apartment-hilo', 0);

test('three seeded buildings with distinct names, matching the 3D plan', () => {
  const s = hilo();
  const a = buildingOptions(s), b = buildingOptions(hilo());
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map((o) => o.name)).size, 3);
  assert.deepEqual(a.map((o) => [o.name, o.seed, o.amenities]), b.map((o) => [o.name, o.seed, o.amenities]));
  const loc = byId.hilo;
  for (const o of a) {
    const p = planBuilding({ style: loc.styleFamily, variant: loc.styleVariant, settlement: loc.settlement, kind: 'apartment', seed: o.seed });
    assert.equal(p.floors, o.plan.floors);
    assert.ok(o.plan.unitsPerFloor >= 4 && o.plan.unitsPerFloor <= 8);
    assert.ok(!o.amenities.includes('elevator'), 'walk-ups have no elevator');
  }
});

test('towers always have an elevator; traits follow floor and side', () => {
  const s = buildSeed('design-condo-miami', 0);
  const opts = buildingOptions(s);
  for (const o of opts) assert.ok(o.amenities.includes('elevator'));
  const o = opts[0];
  const low = unitTraits('miami', o, o.floors[0], 0);
  const top = unitTraits('miami', o, o.floors.at(-1), 0);
  assert.ok(low.noise >= top.noise, 'high floors are quieter');
  assert.equal(top.stairs, 0);
  const units = Array.from({ length: o.plan.unitsPerFloor }, (_, u) => u);
  for (const u of units) {
    assert.notEqual(unitTraits('miami', o, o.floors.at(-1), u).view, 'street', 'top floors see past the street');
    assert.ok(['street', 'courtyard'].includes(unitTraits('miami', o, o.floors[0], u).view), 'low floors have no long view');
  }
  const plan = { ...o.plan, form: 'walkup' };
  assert.equal(amenitiesFor({ ...plan, features: { ...plan.features, resort: true } }, 1).includes('pool'), true);
});

test('walk-up stairs, labels and lifestyle', () => {
  const s = hilo();
  const o = buildingOptions(s)[0];
  const t = unitTraits('hilo', o, 4, 1);
  assert.equal(t.stairs, 3);
  assert.equal(t.lotsOfStairs, true);
  assert.equal(unitLabel(o.plan, 4, 1), 'Unit 4B');
  assert.equal(addressLabel(o, 4, 1, byId.hilo), `Unit 4B · ${o.name} · Hilo`);
  const l = lifestyleFor({ view: 'ocean', noise: -1, sun: 'morning', stairs: 3 }, ['pool'], 2);
  assert.deepEqual(l, { noise: -1, view: 2, nature: 2, social: 1, stairs: 1, gym: 1 });
  assert.equal(lifestyleFor({ view: 'street', noise: 1, stairs: 0 }, [], 0).view, 0);
  assert.equal(plantsCost(5), DESIGN.maxPlants * DESIGN.plantCents);
});

test('moveIn writes the home, pays for plants and starts life', () => {
  const s = hilo();
  const before = s.finances.checkingCents + s.finances.savingsCents;
  const o = buildingOptions(s)[2];
  const r = moveIn(s, { index: 2, floor: o.floors[1], unit: 0, plants: 3 });
  assert.deepEqual(r, { ok: true, shortfallCents: 0 });
  assert.equal(s.phase, 'life');
  assert.equal(s.life.monthIndex, 0);
  assert.deepEqual(s.life.current, { stage: 'welcome' });
  assert.equal(s.home.building.name, o.name);
  assert.equal(s.home.building.floor, o.floors[1]);
  assert.equal(s.home.plants.length, 3);
  assert.equal(s.home.label, `Unit ${o.floors[1]}A, ${o.name}`);
  assert.equal(before - (s.finances.checkingCents + s.finances.savingsCents), 3 * DESIGN.plantCents);
  assert.ok(s.finances.transactions.some((t) => t.month === -1 && t.label === 'Potted plants (3)'));
});

test('moveIn refuses plants it cannot afford and leaves the state alone', () => {
  const s = hilo();
  s.finances.checkingCents = 0; s.finances.savingsCents = 1000;
  const r = moveIn(s, { index: 0, floor: 1, unit: 0, plants: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.shortfallCents, 1000);
  assert.equal(s.phase, 'design');
  assert.throws(() => moveIn(s, { index: 0, floor: 99, unit: 0 }));
});
