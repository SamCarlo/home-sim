// House listings and shared-room picker rules (07 §3–§4, task 38).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../../app/src/dev/seeds.js';
import {
  listings, customCost, afterCustom, normalizeCustom, moveInHouse, quirkModifiers, houseLifestyle,
} from '../../app/src/phases/design/houseModel.js';
import {
  sharedOptions, roommateEffects, agreementRules, sharedLifestyle, moveInShared,
} from '../../app/src/phases/design/sharedModel.js';
import { planHouse } from '../../app/src/phases/design/housePlan.js';
import { byId } from '../../app/src/data/locations/index.js';
import { validateState } from '../../app/src/state/schema.js';
import { DESIGN } from '../../app/src/config.js';

const katy = () => buildSeed('design-house-katy', 0);
const honolulu = () => buildSeed('design-shared-honolulu', 0);
const cashOf = (s) => s.finances.checkingCents + s.finances.savingsCents;

test('three listings: same price, distinct quirks, plan matches houseGen inputs, deterministic', () => {
  const a = listings(katy()), b = listings(katy());
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map((l) => l.quirk)).size, 3);
  assert.equal(new Set(a.map((l) => l.priceCents)).size, 1);
  assert.equal(a[0].priceCents, katy().home.purchasePriceCents);
  assert.deepEqual(a.map((l) => [l.address, l.quirk, l.sqft]), b.map((l) => [l.address, l.quirk, l.sqft]));
  const loc = byId.katy;
  for (const l of a) {
    const p = planHouse({ style: loc.styleFamily, seed: l.seed, variant: 'house', sqft: l.sqftTarget, bedrooms: l.bedrooms });
    assert.equal(p.sqft, l.sqft);
    assert.ok(l.yearBuilt >= DESIGN.house.suburbBuiltFrom, 'Katy houses are newer');
  }
});

test('customization costs and the never-below-$0 guard', () => {
  const c = normalizeCustom({ gardenBeds: 9, fruitTrees: 1, coop: true, pet: 'dog' });
  assert.equal(c.gardenBeds, 3);
  assert.equal(customCost(c), 3 * 12000 + 6000 + 40000 + 25000);
  const s = katy();
  s.finances.checkingCents = 0;
  s.finances.savingsCents = 50000;
  assert.equal(afterCustom(s, c).ok, false);
  const before = JSON.stringify(s.finances);
  const r = moveInHouse(s, { index: 0, ...c });
  assert.equal(r.ok, false);
  assert.equal(r.shortfallCents, customCost(c) - 50000);
  assert.equal(JSON.stringify(s.finances), before, 'nothing charged when short');
  assert.equal(s.phase, 'design');
  assert.ok(afterCustom(s, { gardenBeds: 1, fruitTrees: 0, coop: false, pet: 'none' }).low);
});

test('moveInHouse writes the home, plants, animals and quirk effects', () => {
  const s = katy();
  const cash0 = cashOf(s);
  const r = moveInHouse(s, { index: 1, palette: 2, gardenBeds: 2, fruitTrees: 2, coop: true, pet: 'cat' });
  assert.equal(r.ok, true);
  assert.equal(cashOf(s), cash0 - (2 * 12000 + 2 * 6000 + 40000 + 15000));
  assert.equal(s.phase, 'life');
  assert.equal(s.life.current.stage, 'welcome');
  assert.equal(s.home.house.listingIndex, 1);
  assert.equal(s.home.house.palette, 2);
  assert.equal(s.home.plants.length, 4);
  assert.deepEqual(s.home.animals.map((a) => a.kind), ['cat', 'chicken', 'chicken', 'chicken']);
  assert.ok(s.finances.transactions.every((t) => t.category !== 'lifestyle' || t.month === -1));
  assert.deepEqual(validateState(s), []);
});

test('quirks: old roof, solar, busy street, mountain view', () => {
  assert.equal(quirkModifiers('old-roof').roofLeakMultiplier, 3);
  assert.equal(quirkModifiers('solar').electricFactor, 0.5);
  const none = normalizeCustom({});
  assert.equal(houseLifestyle({ quirk: 'busy-street' }, none, byId.katy).noise, 1);
  assert.equal(houseLifestyle({ quirk: 'solar' }, none, byId.katy).noise, 0);
  assert.equal(houseLifestyle({ quirk: 'busy-street' }, none, byId['yellow-pine']).noise, 0);
  assert.equal(houseLifestyle({ quirk: 'mountain-view' }, none, byId.katy).view, 2);
});

test('shared houses: 2–3 rooms, two distinct roommates aged 19–35 with one of each trait pair', () => {
  const opts = sharedOptions(honolulu());
  assert.equal(opts.length, 3);
  const names = opts.flatMap((o) => o.roommates.map((m) => m.name));
  assert.equal(new Set(names).size, names.length);
  for (const o of opts) {
    assert.ok(o.rooms.length >= 2 && o.rooms.length <= 3);
    assert.ok(o.beds - o.roommates.length >= o.rooms.length, 'enough bedrooms for the open rooms');
    for (const m of o.roommates) {
      assert.ok(m.age >= 19 && m.age <= 35);
      assert.ok(['tidy', 'messy'].includes(m.traits[0]) && ['early bird', 'night owl'].includes(m.traits[1]) && ['social', 'quiet'].includes(m.traits[2]));
    }
  }
});

test('roommate effects and the agreement softening', () => {
  const owls = [{ traits: ['messy', 'night owl', 'social', 'gaming'] }, { traits: ['messy', 'night owl', 'social', 'surfing'] }];
  assert.deepEqual(roommateEffects(owls), { social: 2, noise: 1, choresHours: 1, softened: [] });
  const soft = roommateEffects(owls, { quietHours: true, choreSystem: true });
  assert.equal(soft.noise, 0.5);
  assert.equal(soft.choresHours, 0.5);
  const tidy = [{ traits: ['tidy', 'early bird', 'quiet', 'reading'] }, { traits: ['tidy', 'early bird', 'quiet', 'baking'] }];
  assert.deepEqual(roommateEffects(tidy), { social: 0, noise: 0, choresHours: -1, softened: [] });
  assert.deepEqual(agreementRules(honolulu()), { quietHours: true, choreSystem: true });
  const l = sharedLifestyle({ noise: 1, view: 'garden' }, { social: 1, noise: 1, choresHours: 0 }, 1);
  assert.deepEqual(l, { noise: 2, view: 1, nature: 2, social: 1, choresHours: 0 });
});

test('moveInShared writes home.shared and charges the plants', () => {
  const s = honolulu();
  const cash0 = cashOf(s);
  const o = sharedOptions(s)[2];
  assert.throws(() => moveInShared(s, { index: 2, roomId: 'nope' }));
  const r = moveInShared(s, { index: 2, roomId: o.rooms[0].id, plants: 3 });
  assert.equal(r.ok, true);
  assert.equal(cashOf(s), cash0 - 3 * DESIGN.plantCents);
  assert.equal(s.phase, 'life');
  assert.equal(s.home.shared.houseIndex, 2);
  assert.equal(s.home.shared.roomId, o.rooms[0].id);
  assert.equal(s.home.shared.roommates.length, 2);
  assert.equal(s.home.shared.room.side, undefined);
  assert.equal(s.home.plants.length, 3);
  assert.deepEqual(validateState(s), []);
});
