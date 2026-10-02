// 07 §2 / 08 §5 / task 35: seeded apartment and condo building plans.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCATIONS, byId } from '../../app/src/data/locations/index.js';
import { styleFamily } from '../../app/src/data/styleFamilies.js';
import {
  planBuilding, floorBase, floorAt, bodyHeight, unitCell, unitAt, homeFloors,
} from '../../app/src/phases/design/buildingPlan.js';

const planFor = (id, kind, seed = 0) => {
  const l = byId[id];
  return planBuilding({ style: l.styleFamily, variant: l.styleVariant, settlement: l.settlement, kind, seed });
};

test('deterministic per seed, varies across seeds', () => {
  assert.deepEqual(planFor('hilo', 'apartment', 3), planFor('hilo', 'apartment', 3));
  const sigs = new Set([0, 1, 2, 3, 4, 5].map((s) => JSON.stringify(planFor('brooklyn', 'apartment', s))));
  assert.ok(sigs.size > 1);
});

test('every location and kind: floors in the family range, 4–8 units, consistent footprint', () => {
  for (const l of LOCATIONS) {
    const fam = styleFamily(l.styleFamily, l.styleVariant);
    for (const kind of ['apartment', 'condo']) {
      for (let s = 0; s < 4; s++) {
        const p = planFor(l.id, kind, s);
        const [lo, hi] = (kind === 'condo' ? fam.condo : fam.apartment).floorsBySettlement[l.settlement];
        assert.ok(p.floors >= lo && p.floors <= hi, `${l.id} ${kind} floors ${p.floors}`);
        assert.ok(p.unitsPerFloor >= 4 && p.unitsPerFloor <= 8, `${l.id} units ${p.unitsPerFloor}`);
        assert.equal(p.width, p.cols * p.unitW);
        assert.ok(p.firstFloor >= 1 && p.firstFloor <= p.floors, `${l.id} firstFloor`);
      }
    }
  }
});

test('towns get their signature buildings', () => {
  for (let s = 0; s < 3; s++) {
    const hnl = planFor('honolulu', 'apartment', s);
    assert.equal(hnl.form, 'tower');
    assert.ok(hnl.floors >= 12 && hnl.features.balconies);
    assert.equal(hnl.groundUse, 'parking');
    const bk = planFor('brooklyn', 'apartment', s);
    assert.equal(bk.form, 'walkup');
    assert.ok(bk.features.fireEscapes && bk.wallTex === 'brick');
    const hilo = planFor('hilo', 'apartment', s);
    assert.ok(hilo.form === 'walkup' && hilo.features.exteriorStairs && hilo.rows === 1);
    assert.ok(hilo.floors >= 2 && hilo.floors <= 4);
    assert.ok(planFor('miami', 'apartment', s).features.deco);
    assert.equal(planFor('miami', 'condo', s).form, 'glass');
    assert.deepEqual(homeFloors(planFor('katy', 'condo', s)), [1]);
  }
});

test('floor heights, floorAt and unit lookups agree', () => {
  const p = planFor('honolulu', 'apartment', 1);
  assert.equal(floorBase(p, 1), 0);
  for (let f = 1; f <= p.floors; f++) {
    assert.equal(floorAt(p, floorBase(p, f) + 0.5), f);
    assert.ok(floorBase(p, f + 1) > floorBase(p, f));
  }
  assert.equal(floorAt(p, bodyHeight(p) + 1), 0);
  assert.deepEqual(homeFloors(p)[0], p.firstFloor);
  for (let u = 0; u < p.unitsPerFloor; u++) {
    const { col, row } = unitCell(p, u);
    const x = -p.width / 2 + (col + 0.5) * p.unitW, z = row === 0 ? p.depth / 4 : -p.depth / 4;
    assert.equal(unitAt(p, x, z), u);
  }
  assert.equal(unitCell(p, p.unitsPerFloor), null);
  assert.equal(unitAt(p, p.width, 0), null);
});
