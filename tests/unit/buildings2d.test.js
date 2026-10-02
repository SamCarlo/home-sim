// Style families (08 §4) and the 2D preview homes (04 §7 layer 4): complete data, every drawing clean and deterministic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLE_FAMILY_DATA, STYLE_FAMILY_LIST, styleFamily } from '../../app/src/data/styleFamilies.js';
import { STYLE_FAMILIES, STYLE_VARIANTS, HOME_TYPES, SETTLEMENTS } from '../../app/src/data/enums.js';
import { drawHouse, HOUSE_FAMILIES } from '../../app/src/phases/plan/preview2d/houses.js';
import { drawHome } from '../../app/src/phases/plan/preview2d/buildings.js';
import { renderPreviewSVG } from '../../app/src/phases/plan/preview2d/index.js';
import { LOCATIONS, byId } from '../../app/src/data/locations/index.js';

const BAD = /NaN|undefined|Infinity/;
const HEX = /^#[0-9a-f]{6}$/;

test('styleFamilies: all 16 families with 3–4 palettes, house, apartment floors, vegetation and props', () => {
  assert.deepEqual(STYLE_FAMILY_LIST.map((f) => f.key), STYLE_FAMILIES);
  for (const f of STYLE_FAMILY_LIST) {
    assert.ok(f.label && f.palettes.length >= 3 && f.palettes.length <= 4, f.key);
    for (const p of f.palettes) for (const k of ['wall', 'trim', 'roof', 'accent']) assert.match(p[k], HEX, `${f.key}.${k}`);
    for (const k of ['roof', 'pitch', 'porch', 'stilts', 'garage', 'stories', 'windowStyle']) assert.ok(k in f.house, `${f.key}.house.${k}`);
    for (const s of SETTLEMENTS) {
      const [lo, hi] = f.apartment.floorsBySettlement[s];
      assert.ok(Number.isInteger(lo) && lo >= 1 && hi >= lo, `${f.key} ${s}`);
    }
    for (const k of ['balconies', 'exteriorStairs', 'fireEscapes', 'rooftop']) assert.ok(k in f.apartment, `${f.key}.apartment.${k}`);
    assert.ok(f.vegetation.length > 0 && Array.isArray(f.props), f.key);
  }
  for (const [key, variants] of Object.entries(STYLE_VARIANTS)) {
    for (const v of variants) assert.equal(styleFamily(key, v).variant, v);
  }
  assert.equal(styleFamily('maritime', 'alaska').house.boat, true);
  assert.equal(styleFamily('maritime').house.row, true);
  assert.throws(() => styleFamily('nope'));
  assert.equal(Object.keys(STYLE_FAMILY_DATA).length, 16);
});

test('every family has a clean house drawing with a porch spot', () => {
  assert.deepEqual([...HOUSE_FAMILIES].sort(), [...STYLE_FAMILIES].sort());
  for (const key of STYLE_FAMILIES) {
    const f = styleFamily(key);
    for (const alt of [false, true]) {
      const h = drawHouse(key, f.palettes[0], { palettes: f.palettes, index: 0, alt });
      assert.ok(h.svg.length > 300, key);
      assert.doesNotMatch(h.svg, BAD, key);
      assert.ok(h.porch.every(Number.isFinite), key);
    }
  }
  for (const [key, v] of [['desert-southwest', 'hillside'], ['maritime', 'alaska']]) {
    const f = styleFamily(key, v);
    assert.doesNotMatch(drawHouse(key, f.palettes[0], { variant: v, palettes: f.palettes }).svg, BAD);
  }
});

test('all 100 cells draw a deterministic home; the five types differ in every place', () => {
  for (const location of LOCATIONS) {
    const seen = new Set();
    for (const homeTypeId of HOME_TYPES) {
      const a = drawHome({ location, homeTypeId });
      assert.equal(a, drawHome({ location, homeTypeId }), `${location.id}/${homeTypeId}`);
      assert.doesNotMatch(a, BAD, `${location.id}/${homeTypeId}`);
      seen.add(a);
      assert.equal(renderPreviewSVG({ location, homeTypeId }), renderPreviewSVG({ location, homeTypeId }));
    }
    assert.equal(seen.size, HOME_TYPES.length, location.id);
  }
});

test('type cues: build sign, shared figures, towers in big cities, catchment where water is catchment', () => {
  assert.match(drawHome({ location: byId.hilo, homeTypeId: 'build' }), /Your house/);
  const heads = (s) => (s.match(/r="3.5" fill="#8a5a40"/g) || []).length;
  assert.equal(heads(drawHome({ location: byId.hilo, homeTypeId: 'shared' })), 3);
  assert.equal(heads(drawHome({ location: byId.hilo, homeTypeId: 'house' })), 0);
  const tall = (s) => Math.min(...[...s.matchAll(/\sy="(-?[\d.]+)"/g)].map((m) => Number(m[1])));
  assert.ok(tall(drawHome({ location: byId.honolulu, homeTypeId: 'condo' })) < 110, 'Honolulu condo is a tower');
  assert.ok(tall(drawHome({ location: byId.waimea, homeTypeId: 'condo' })) > 150, 'Waimea condo is low');
  const tank = /<ellipse cx="[\d.]+" cy="[\d.]+" rx="16" ry="4" fill="#3f6a4a"\/>/;
  for (const t of ['apartment', 'shared', 'house', 'build']) assert.match(renderPreviewSVG({ location: byId.pahoa, homeTypeId: t }), tank, t);
  assert.doesNotMatch(renderPreviewSVG({ location: byId.hilo, homeTypeId: 'house' }), tank);
});
