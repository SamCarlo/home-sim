// 08 §4 / task 34: every style family carries valid 3D `look` parameters, and variants merge theirs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLE_FAMILY_LIST, styleFamily } from '../../app/src/data/styleFamilies.js';

const ROOFS = ['hip', 'gable', 'shed', 'flat', 'barrel', 'aframe', 'saltbox'];
const WINDOWS = ['jalousie', 'sash', 'grid', 'storefront'];
const PORCHES = ['lanai', 'front', 'craftsman', 'stoop', 'wraparound', 'patio', 'none'];
const BASES = ['posts', 'piers', 'slab', 'sandstone', 'lava', 'raised'];
const TEX = [null, 'siding', 'brick', 'shingle', 'metal', 'batten', 'log', 'stucco', 'ashlar', 'tile'];
// props.js TREE_KINDS (three/ can't load in Node).
const TREES = ['palm', 'banana', 'ohia', 'monkeypod', 'pine', 'spruce', 'maple', 'birch', 'oak', 'mango', 'citrus', 'apple', 'fig', 'cactus', 'agave'];

test('every family has a valid look', () => {
  assert.equal(STYLE_FAMILY_LIST.length, 16);
  for (const f of STYLE_FAMILY_LIST) {
    const l = f.look;
    assert.ok(l, f.key);
    assert.ok(ROOFS.includes(l.roof), `${f.key} roof`);
    assert.ok(WINDOWS.includes(l.window), `${f.key} window`);
    assert.ok(PORCHES.includes(l.porch), `${f.key} porch`);
    assert.ok(BASES.includes(l.base), `${f.key} base`);
    assert.ok(TEX.includes(l.wallTex) && TEX.includes(l.roofTex), `${f.key} textures`);
    assert.ok(['wood', 'iron', 'glass', 'pipe'].includes(l.rails), `${f.key} rails`);
    assert.ok(l.trees.length && l.trees.every((t) => TREES.includes(t)), `${f.key} trees`);
    assert.ok(l.roof === 'flat' ? l.pitch === 0 : l.pitch > 0, `${f.key} pitch`);
  }
});

test('no two families share roof + wall texture + porch + window', () => {
  const sig = STYLE_FAMILY_LIST.map((f) => [f.look.roof, f.look.ridge, f.look.wallTex, f.look.porch, f.look.window, f.look.windowExtra, f.look.base].join('|'));
  assert.equal(new Set(sig).size, sig.length);
});

test('variants merge their look over the base', () => {
  assert.equal(styleFamily('maritime', 'alaska').look.wallTex, 'metal');
  assert.equal(styleFamily('maritime', 'alaska').look.window, 'sash');
  assert.equal(styleFamily('desert-southwest', 'hillside').look.roof, 'shed');
  assert.equal(styleFamily('desert-southwest').look.roof, 'barrel');
});
