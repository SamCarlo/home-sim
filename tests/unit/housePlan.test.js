// 07 §3–§4 / 08 §5 / task 37: seeded house plans.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planHouse, fruitTreeKind, isHawaii, HOUSE, HOUSE_SHAPE, FENCES } from '../../app/src/phases/design/housePlan.js';
import { STYLE_FAMILY_LIST } from '../../app/src/data/styleFamilies.js';

test('every family plans a house and a shared house inside the lot', () => {
  for (const f of STYLE_FAMILY_LIST) {
    assert.ok(HOUSE_SHAPE[f.key], `${f.key} has a shape`);
    assert.ok(FENCES[f.key], `${f.key} has a fence`);
    for (const variant of ['house', 'shared']) {
      for (let seed = 0; seed < 6; seed++) {
        const p = planHouse({ style: f.key, seed, variant });
        assert.ok(p.beds >= 2 && p.beds <= 7, `${f.key} beds ${p.beds}`);
        assert.ok(p.baths >= 1);
        assert.ok(p.sqft > 300);
        assert.ok(p.palette >= 0 && p.palette < f.palettes.length);
        assert.ok(p.footprint.backZ >= -HOUSE.lotEdge - 1, `${f.key} back ${p.footprint.backZ}`);
        assert.ok(p.footprint.frontZ < p.streetZ, 'house sits behind the sidewalk');
        for (const s of [...p.spots.beds, ...p.spots.trees, p.spots.coop, p.spots.pet]) {
          assert.ok(Math.abs(s.x) <= HOUSE.lotEdge && Math.abs(s.z) <= HOUSE.lotEdge, `${f.key} spot in lot`);
        }
        assert.equal(p.spots.beds.length, 3);
        assert.equal(p.spots.trees.length, 2);
        if (variant === 'shared') assert.ok(p.bikes >= 2);
        else assert.equal(p.bikes, 0);
      }
    }
  }
});

test('plans are deterministic and vary by seed', () => {
  const a = planHouse({ style: 'hawaii-plantation', seed: 3 });
  assert.deepEqual(planHouse({ style: 'hawaii-plantation', seed: 3 }), a);
  const sizes = new Set([0, 1, 2, 3, 4, 5].map((s) => { const p = planHouse({ style: 'hawaii-plantation', seed: s }); return `${p.main.w}x${p.main.d}:${p.wings.length}`; }));
  assert.ok(sizes.size > 1);
});

test('shared houses are bigger with more bedrooms; wings avoid the garage side', () => {
  for (let seed = 0; seed < 8; seed++) {
    const h = planHouse({ style: 'hawaii-plantation', seed, variant: 'house' });
    const s = planHouse({ style: 'hawaii-plantation', seed, variant: 'shared' });
    assert.ok(s.sqft > h.sqft * 0.9 && s.wings.length >= 1);
    const t = planHouse({ style: 'texas-suburban', seed, variant: 'shared' });
    assert.ok(t.wings.every((w) => w.side === 'back'), 'garage left, AC right → back wing');
    assert.equal(t.garage, 'garage-2');
  }
  assert.ok(planHouse({ style: 'texas-suburban', seed: 1, variant: 'shared', bedrooms: 3 }).beds === 4);
});

test('row houses, targets, fruit trees and Hawaiʻi', () => {
  const b = planHouse({ style: 'nyc-brownstone', seed: 2 });
  assert.equal(b.row, true);
  assert.equal(b.garage, 'none');
  assert.equal(b.driveX, null);
  assert.equal(b.wings.length, 0);
  const small = planHouse({ style: 'plains-ranch', seed: 0, sqft: 900 });
  const big = planHouse({ style: 'plains-ranch', seed: 0, sqft: 2600 });
  assert.ok(big.sqft > small.sqft);
  assert.ok(['mango', 'citrus'].includes(fruitTreeKind('tropical-wet', 1)));
  assert.equal(fruitTreeKind('desert'), 'fig');
  assert.equal(fruitTreeKind('alpine'), 'apple');
  assert.equal(fruitTreeKind('subtropical-flat'), 'citrus');
  assert.ok(isHawaii('kona-coastal') && !isHawaii('maritime'));
  assert.equal(planHouse({ style: 'hawaii-plantation', seed: 0 }).hawaii, true);
  assert.equal(planHouse({ style: 'maritime', styleVariant: 'alaska', seed: 0 }).row, false);
});
