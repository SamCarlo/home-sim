// Plan table rules (04 §5): aria-labels, denied badges, hiding, roving-tabindex moves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cellKey, deniedKeys, cellAriaLabel, upfrontText, monthlyText, isHiddenStatus, moveFocus, firstVisible,
} from '../../app/src/phases/plan/tableModel.js';
import { buildGrid } from '../../app/src/finance/grid.js';
import { HOME_TYPES_BY_ID } from '../../app/src/data/homeTypes.js';
import { byId } from '../../app/src/data/locations/index.js';
import { buildSeed } from '../../app/src/dev/seeds.js';

test('aria-label follows the 04 §5 pattern', () => {
  const cell = { cost: { available: true, upfrontCents: 310000, monthlyCents: 162000 }, status: { label: 'Comfortable' } };
  assert.equal(cellAriaLabel(byId.hilo, HOME_TYPES_BY_ID.apartment, cell),
    'Hilo, apartment: upfront $3,100, monthly $1,620, comfortable');
  assert.equal(cellAriaLabel(byId.hilo, HOME_TYPES_BY_ID.apartment, cell, { denied: true }),
    'Hilo, apartment: upfront $3,100, monthly $1,620, comfortable, denied last time');
  assert.equal(cellAriaLabel(byId.pahoa, HOME_TYPES_BY_ID.condo, { cost: { available: false }, status: { label: 'x' } }),
    'Pāhoa, condo: not available here');
  assert.equal(upfrontText(cell.cost), 'Upfront $3,100');
  assert.equal(monthlyText(cell.cost), '$1,620/mo');
  assert.equal(upfrontText({ available: false }), null);
});

test('deniedKeys uses each cell\'s latest attempt', () => {
  const keys = deniedKeys([
    { locationId: 'hilo', homeTypeId: 'apartment', outcome: 'denied' },
    { locationId: 'hilo', homeTypeId: 'shared', outcome: 'denied' },
    { locationId: 'hilo', homeTypeId: 'shared', outcome: 'approved' },
  ]);
  assert.deepEqual([...keys], [cellKey('hilo', 'apartment')]);
  assert.equal(deniedKeys().size, 0);
});

test('hiding removes red and n/a only when the toggle is on', () => {
  for (const s of ['red', 'na']) { assert.equal(isHiddenStatus(s, true), true); assert.equal(isHiddenStatus(s, false), false); }
  for (const s of ['yellow', 'green', 'cyan']) assert.equal(isHiddenStatus(s, true), false);
});

test('moveFocus: arrows, Home/End, edges and skipped cells', () => {
  const T = true, F = false;
  const v = [[T, T, F, T, T], [F, F, F, F, F], [T, F, T, F, F]];
  assert.deepEqual(moveFocus(v, { r: 0, c: 1 }, 'ArrowRight'), { r: 0, c: 3 }); // skips hidden
  assert.deepEqual(moveFocus(v, { r: 0, c: 4 }, 'ArrowRight'), { r: 0, c: 4 }); // edge stays
  assert.deepEqual(moveFocus(v, { r: 0, c: 0 }, 'ArrowLeft'), { r: 0, c: 0 });
  assert.deepEqual(moveFocus(v, { r: 0, c: 3 }, 'ArrowDown'), { r: 2, c: 2 }); // skips empty row, nearest column
  assert.deepEqual(moveFocus(v, { r: 2, c: 0 }, 'ArrowUp'), { r: 0, c: 0 });
  assert.deepEqual(moveFocus(v, { r: 2, c: 2 }, 'ArrowDown'), { r: 2, c: 2 });
  assert.deepEqual(moveFocus(v, { r: 0, c: 3 }, 'Home'), { r: 0, c: 0 });
  assert.deepEqual(moveFocus(v, { r: 2, c: 0 }, 'End'), { r: 2, c: 2 });
  assert.equal(moveFocus(v, { r: 0, c: 0 }, 'Enter'), null);
  assert.deepEqual(firstVisible([[F, F], [F, T]]), { r: 1, c: 1 });
  assert.equal(firstVisible([[F]]), null);
});

test('plan seeds give the color mixes 04 §8 asks for', () => {
  const count = (name) => {
    const grid = buildGrid(buildSeed(name));
    const n = {};
    for (const g of grid.groups) for (const r of g.rows) for (const c of r.cells) n[c.status.status] = (n[c.status.status] || 0) + 1;
    return n;
  };
  const tight = count('plan-tight');
  assert.ok(tight.red + tight.yellow >= 80, `tight should be mostly red/yellow: ${JSON.stringify(tight)}`);
  const rich = count('plan-rich');
  assert.ok(rich.cyan >= 30, `rich should have lots of cyan: ${JSON.stringify(rich)}`);
  const s = buildSeed('plan-after-denial');
  assert.equal(s.finances.savingsCents, 900000 - 5000);
  assert.ok(deniedKeys(s.plan.attempts).has('hilo|apartment'));
});
