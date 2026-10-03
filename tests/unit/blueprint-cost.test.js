// Blueprint cost, reachability, bedroom windows, catchment, budget, yard and Move in (07 §5, task 40).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCATIONS, byId } from '../../app/src/data/locations/index.js';
import { addRoom, createBlueprint, lotOf, toggleOpening } from '../../app/src/phases/design/blueprint/model.js';
import { reachableRooms, validateBlueprint } from '../../app/src/phases/design/blueprint/validate.js';
import { TEMPLATE_IDS, templateBlueprint } from '../../app/src/phases/design/blueprint/templates.js';
import { blueprintCost, costIndex, wallLength } from '../../app/src/phases/design/blueprint/cost.js';
import { addYardItem, hasFence, moveYardItem, setFence } from '../../app/src/phases/design/blueprint/yard.js';
import { moveInBuild } from '../../app/src/phases/design/blueprint/moveIn.js';
import { designBudgetCents } from '../../app/src/finance/build.js';
import { cash } from '../../app/src/finance/ledger.js';
import { DESIGN } from '../../app/src/config.js';
import { seeds } from '../../app/src/dev/seeds.js';

const BUILDABLE = LOCATIONS.filter((l) => l.housing.build?.available);
const siteFor = (loc) => ({ catchmentGallons: loc.water === 'catchment' ? 10000 : 0 });

test('every template fits its tier budget and passes every rule in every buildable location', () => {
  for (const loc of BUILDABLE) {
    for (const id of TEMPLATE_IDS) {
      const bp = templateBlueprint(id, lotOf(loc), siteFor(loc));
      const budgetCents = designBudgetCents(loc, id);
      const r = validateBlueprint(bp, { location: loc, budgetCents, included: siteFor(loc) });
      assert.deepEqual(r.errors.map((e) => e.code), [], `${id} @ ${loc.id}`);
      assert.ok(r.cost.totalCents <= budgetCents, `${id} @ ${loc.id} costs ${r.cost.totalCents} > ${budgetCents}`);
    }
  }
});

test('cost breakdowns for each template in Pāhoa, Seattle and Clarksdale', () => {
  for (const locId of ['pahoa', 'seattle', 'clarksdale']) {
    const loc = byId[locId];
    for (const id of TEMPLATE_IDS) {
      const bp = templateBlueprint(id, lotOf(loc), siteFor(loc));
      const c = blueprintCost(bp, loc, { included: siteFor(loc) });
      const line = (k) => c.lines.find((l) => l.id === k)?.cents ?? 0;
      const fp = bp.rooms.reduce((t, r) => t + r.w * r.h, 0);
      const cps = loc.housing.build.buildCostPerSqftCents;
      // Rooms: Σ area × multiplier × local cost per sq ft.
      const rooms = c.lines.filter((l) => l.group === 'house').reduce((t, l) => t + l.cents, 0);
      const weighted = bp.rooms.reduce((t, r) => t + r.w * r.h * ({ kitchen: 1.6, bathroom: 1.8, lanai: 0.45, hallway: 0.9, closet: 0.8 }[r.type] ?? 1), 0);
      assert.ok(Math.abs(rooms - weighted * cps) <= c.lines.length, `${id} @ ${locId} rooms`);
      // Roof: footprint × 1.15 × metal 1.0 × $12 × index; walls: perimeter × 9 × board 1.0 × $8 × index.
      assert.ok(Math.abs(line('roof') - Math.round(fp * 1.15) * 1200 * costIndex(loc)) <= 1);
      assert.ok(Math.abs(line('walls') - wallLength(bp) * 9 * 800 * costIndex(loc)) <= 1);
      const ext = bp.openings.filter((o) => o.kind === 'door' && !o.roomB).length;
      assert.equal(line('doors-out'), ext * 90000);
      assert.equal(line('windows'), bp.openings.filter((o) => o.kind === 'window').length * 60000);
      assert.equal(line('solar-water'), locId === 'pahoa' || bp.solarWaterHeater ? 450000 : 0);
      assert.equal(line('catchment'), 0, 'the site-utilities tank is already paid');
      assert.equal(c.totalCents, c.lines.reduce((t, l) => t + l.cents, 0));
    }
  }
  // Materials and extras change the price.
  const loc = byId.seattle;
  const bp = templateBlueprint('cozy', lotOf(loc));
  const base = blueprintCost(bp, loc).totalCents;
  assert.ok(blueprintCost({ ...bp, roof: { ...bp.roof, material: 'tile' } }, loc).totalCents > base);
  assert.ok(blueprintCost({ ...bp, exterior: { ...bp.exterior, siding: 'vinyl' } }, loc).totalCents < base);
  assert.equal(blueprintCost({ ...bp, solarKw: 2 }, loc).totalCents - base, 600000);
  assert.equal(blueprintCost({ ...bp, solarKw: 5 }, loc, { included: { solarKw: 5 } }).totalCents, base);
  assert.equal(blueprintCost({ ...bp, catchmentGallons: 5000 }, loc).totalCents - base, 400000);
});

test('reachability: every room needs a door path from outside', () => {
  const loc = byId.seattle;
  let bp = templateBlueprint('tiny', lotOf(loc));
  assert.equal(reachableRooms(bp).size, bp.rooms.length);
  // Drop the bedroom → bathroom door: the bathroom (and only the bathroom) is cut off.
  const bath = bp.rooms.find((r) => r.type === 'bathroom');
  const bathDoors = bp.openings.filter((o) => o.kind === 'door' && (o.roomA === bath.id || o.roomB === bath.id));
  bp = { ...bp, openings: bp.openings.filter((o) => !bathDoors.includes(o)) };
  const r = validateBlueprint(bp, { location: loc });
  const err = r.errors.find((e) => e.code === 'unreachable');
  assert.deepEqual(err.roomIds, [bath.id]);
  assert.match(err.message, /Bathroom can't be reached/);
  // No outside door at all.
  const sealed = { ...bp, openings: bp.openings.filter((o) => o.roomB || o.kind === 'window') };
  assert.ok(validateBlueprint(sealed).errors.some((e) => e.code === 'no-entry'));
});

test('every bedroom needs a window; living without windows only warns', () => {
  let bp = createBlueprint({ widthFt: 60, depthFt: 100 });
  bp = addRoom(bp, { type: 'living', x: 10, y: 20, w: 14, h: 12 });
  bp = addRoom(bp, { type: 'bedroom', x: 24, y: 20, w: 10, h: 12 });
  bp = toggleOpening(bp, { kind: 'door', x: 15, y: 20 });
  bp = toggleOpening(bp, { kind: 'door', x: 24, y: 26 });
  let r = validateBlueprint(bp);
  assert.ok(r.errors.some((e) => e.code === 'bedroom-window' && e.roomIds[0] === 'r2'));
  assert.ok(r.warnings.some((w) => w.code === 'living-dark'));
  assert.ok(r.warnings.some((w) => w.code === 'one-exit'));
  assert.equal(r.cost, null, 'no location → no cost');
  bp = toggleOpening(bp, { kind: 'window', x: 34, y: 26 });
  r = validateBlueprint(bp);
  assert.ok(!r.errors.some((e) => e.code === 'bedroom-window'));
  assert.ok(!r.errors.some((e) => e.code === 'unreachable'));
});

test('catchment is required where there is no county water, and the budget blocks', () => {
  const loc = byId.pahoa;
  const bp = templateBlueprint('cozy', lotOf(loc));
  assert.ok(validateBlueprint(bp, { location: loc }).errors.some((e) => e.code === 'catchment'));
  const ok = { ...bp, catchmentGallons: 10000 };
  assert.ok(!validateBlueprint(ok, { location: loc, included: { catchmentGallons: 10000 } }).errors.some((e) => e.code === 'catchment'));
  const over = validateBlueprint(ok, { location: loc, budgetCents: 100000, included: { catchmentGallons: 10000 } });
  assert.match(over.errors.find((e) => e.code === 'budget').message, /more than your budget/);
});

test('yard: items land off the house, move, fence toggles, rooms on items are errors', () => {
  const loc = byId.seattle;
  let bp = templateBlueprint('cozy', lotOf(loc));
  bp = addYardItem(bp, 'coop');
  bp = addYardItem(bp, 'garden-bed');
  bp = addYardItem(bp, 'driveway');
  assert.deepEqual(bp.yard.map((y) => y.kind), ['coop', 'garden-bed', 'driveway']);
  assert.equal(bp.yard[2].y, 0, 'driveway starts at the street');
  assert.deepEqual(validateBlueprint(bp, { location: loc }).errors, []);
  const room = bp.rooms[1];
  assert.equal(moveYardItem(bp, 'y1', room.x, room.y), bp, 'cannot drop onto a room');
  bp = setFence(bp, true);
  assert.ok(hasFence(bp));
  const fence = blueprintCost(bp, loc).lines.find((l) => l.id === 'yard-fence');
  assert.equal(fence.cents, 2 * (50 + 100) * 2500);
  assert.ok(!hasFence(setFence(bp, false)));
  const onBed = { ...bp, rooms: [...bp.rooms, { ...bp.yard[1], id: 'r99', type: 'office' }] };
  assert.ok(validateBlueprint(onBed).errors.some((e) => e.code === 'yard-overlap'));
});

test('Move in writes home, plants and hens only for a valid plan', () => {
  const s = seeds['design-build-template'].build(Date.UTC(2026, 8, 1));
  let bp = s.home.blueprint;
  bp = addYardItem(addYardItem(addYardItem(bp, 'garden-bed'), 'fruit-tree'), 'coop');
  const bad = { ...bp, openings: [] };
  assert.equal(moveInBuild(structuredClone(s), bad).ok, false);
  const res = moveInBuild(s, bp);
  assert.deepEqual(res, { ok: true, errors: [] });
  assert.equal(s.phase, 'life');
  assert.equal(s.home.blueprint, bp);
  assert.equal(s.home.plants.length, 2);
  assert.equal(s.home.animals.filter((a) => a.kind === 'chicken').length, 3);
});

test('Move in adopts the optional pet from savings, and refuses when cash is short', () => {
  const s = seeds['design-build-template'].build(Date.UTC(2026, 8, 1));
  const bp = s.home.blueprint;
  const before = cash(s);
  const res = moveInBuild(s, bp, { pet: 'dog' });
  assert.equal(res.ok, true);
  assert.equal(cash(s), before - DESIGN.house.petCents.dog);
  const dog = s.home.animals.find((a) => a.kind === 'dog');
  assert.ok(dog && dog.name && dog.spot === 'yard');
  const poor = seeds['design-build-template'].build(Date.UTC(2026, 8, 1));
  poor.finances.checkingCents = 0;
  poor.finances.savingsCents = 100;
  const r2 = moveInBuild(poor, poor.home.blueprint, { pet: 'cat' });
  assert.equal(r2.ok, false);
  assert.ok(r2.shortfallCents > 0);
  assert.notEqual(poor.phase, 'life');
});
