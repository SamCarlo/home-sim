// 2D preview pictures (04 §7): well-formed, deterministic, no NaN/undefined, every landmark draws.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPreviewSVG, captionText } from '../../app/src/phases/plan/preview2d/index.js';
import { landmark, LANDMARK_KEYS, sky, terrain, vegetation, landmarkDescription } from '../../app/src/phases/plan/preview2d/backgrounds.js';
import { BIOME_PALETTE } from '../../app/src/phases/plan/preview2d/palette.js';
import { LANDMARKS, BIOMES, HOME_TYPES } from '../../app/src/data/enums.js';
import { LOCATIONS, byId } from '../../app/src/data/locations/index.js';
import { createRng } from '../../app/src/util/rng.js';

const BAD = /NaN|undefined|Infinity/;

test('every landmark key draws a non-empty fragment and has a description', () => {
  assert.deepEqual([...LANDMARK_KEYS].sort(), [...LANDMARKS].sort());
  for (const key of LANDMARKS) {
    const s = landmark(key);
    assert.ok(s.length > 100, key);
    assert.doesNotMatch(s, BAD, key);
    assert.ok(landmarkDescription(key).length > 5, key);
  }
  assert.equal(landmark('nope'), '');
});

test('every biome has a palette; sky, terrain and vegetation are clean', () => {
  for (const b of BIOMES) {
    assert.ok(BIOME_PALETTE[b], b);
    const s = sky(b, 'x') + terrain(b, createRng(1)) + vegetation(b, createRng(2));
    assert.doesNotMatch(s, BAD, b);
  }
});

test('all 100 cells render a well-formed, clean SVG with title, desc and caption', () => {
  for (const location of LOCATIONS) {
    for (const homeTypeId of HOME_TYPES) {
      const svg = renderPreviewSVG({ location, homeTypeId });
      assert.ok(svg.startsWith('<svg'), `${location.id}/${homeTypeId}`);
      assert.match(svg, /viewBox="0 0 480 270"/);
      assert.match(svg, /<title id="[^"]+">[^<]+<\/title>/);
      assert.match(svg, /<desc id="[^"]+">[^<]+<\/desc>/);
      assert.ok(svg.endsWith('</svg>'));
      assert.doesNotMatch(svg, BAD, `${location.id}/${homeTypeId}`);
    }
  }
});

test('deterministic for the same inputs; the seed changes the scenery', () => {
  const a = renderPreviewSVG({ location: byId.hilo, homeTypeId: 'apartment' });
  assert.equal(a, renderPreviewSVG({ location: byId.hilo, homeTypeId: 'apartment' }));
  assert.notEqual(a, renderPreviewSVG({ location: byId.hilo, homeTypeId: 'apartment', seed: 7 }));
});

test('caption chip text, escaping and the unavailable sign', () => {
  assert.equal(captionText(byId.hilo, 'apartment'), 'Hilo · Apartment');
  const evil = { ...byId.hilo, name: '<b>"x"&', fullName: '<script>' };
  const svg = renderPreviewSVG({ location: evil, homeTypeId: 'house' });
  assert.doesNotMatch(svg, /<b>|<script>/);
  assert.match(svg, /&lt;b&gt;&quot;x&quot;&amp;/);
  const na = renderPreviewSVG({ location: byId.pahoa, homeTypeId: 'condo' });
  assert.match(na, /Not available here/);
  assert.doesNotMatch(renderPreviewSVG({ location: byId.pahoa, homeTypeId: 'house' }), /Not available here<\/text>/);
});

test('catchment tank appears only where water is catchment', () => {
  assert.equal(byId.pahoa.water, 'catchment');
  assert.match(renderPreviewSVG({ location: byId.pahoa, homeTypeId: 'house' }), /#4f7a5a/);
  assert.doesNotMatch(renderPreviewSVG({ location: byId.hilo, homeTypeId: 'house' }), /#4f7a5a/);
});
