// Blueprint model, validation, templates and editor tools (07 §5, task 39).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCATIONS } from '../../app/src/data/locations/index.js';
import { addRoom, adjacency, buildArea, createBlueprint, editWindow, exteriorWalls, findFreeSpot, footprintArea, lotOf,
  moveRoom, nextType, removeRoom, resizeRoom, roomName, setRoomType, sharedWalls, toggleOpening, wallsOf,
  weightedArea } from '../../app/src/phases/design/blueprint/model.js';
import { validateBlueprint } from '../../app/src/phases/design/blueprint/validate.js';
import { TEMPLATES, TEMPLATE_IDS, templateBlueprint } from '../../app/src/phases/design/blueprint/templates.js';
import { applyRoomAction, createHistory, drawRect, keyAction, moveRect, resizeRect } from '../../app/src/phases/design/blueprint/tools.js';
import { BUILD } from '../../app/src/config.js';

const LOT = { widthFt: 60, depthFt: 100 };
const two = () => addRoom(addRoom(createBlueprint(LOT), { type: 'living', x: 10, y: 20, w: 14, h: 12 }),
  { type: 'bedroom', x: 24, y: 20, w: 10, h: 12 });

test('add, move, resize, retype and remove return new blueprints', () => {
  const bp0 = createBlueprint(LOT);
  const bp = two();
  assert.equal(bp0.rooms.length, 0);
  assert.deepEqual(bp.rooms.map((r) => r.id), ['r1', 'r2']);
  const moved = moveRoom(bp, 'r1', 12, 22);
  assert.deepEqual([moved.rooms[0].x, moved.rooms[0].y, bp.rooms[0].x], [12, 22, 10]);
  const big = resizeRoom(bp, 'r2', { w: 12, h: 14 });
  assert.equal(footprintArea(big), 14 * 12 + 12 * 14);
  assert.equal(setRoomType(bp, 'r2', 'office').rooms[1].type, 'office');
  assert.equal(setRoomType(bp, 'r2', 'nope'), bp);
  assert.deepEqual(removeRoom(bp, 'r1').rooms.map((r) => r.id), ['r2']);
  assert.equal(addRoom(removeRoom(bp, 'r1'), { type: 'kitchen', x: 0, y: 0, w: 4, h: 4 }).rooms[1].id, 'r3');
  assert.equal(nextType('lanai'), 'bedroom');
  assert.equal(weightedArea(addRoom(createBlueprint(LOT), { type: 'kitchen', x: 10, y: 20, w: 10, h: 10 })), 160);
});

test('walls: shared, exterior and adjacency', () => {
  const bp = two();
  assert.equal(wallsOf(bp.rooms[0]).length, 4);
  assert.deepEqual(sharedWalls(bp.rooms[0], bp.rooms[1]), [{ side: 'right', x1: 24, y1: 20, x2: 24, y2: 32 }]);
  assert.deepEqual(sharedWalls(bp.rooms[1], bp.rooms[0]), [{ side: 'left', x1: 24, y1: 20, x2: 24, y2: 32 }]);
  const ext = exteriorWalls(bp);
  assert.equal(ext.length, 6);
  assert.ok(!ext.some((s) => s.x1 === 24 && s.x2 === 24));
  assert.deepEqual(adjacency(bp), { r1: ['r2'], r2: ['r1'] });
  // A partly shared wall splits the exterior wall around it.
  const l = addRoom(createBlueprint(LOT), { type: 'living', x: 10, y: 20, w: 20, h: 10 });
  const step = addRoom(l, { type: 'bedroom', x: 14, y: 30, w: 8, h: 8 });
  const back = exteriorWalls(step).filter((s) => s.roomId === 'r1' && s.side === 'back');
  assert.deepEqual(back.map((s) => [s.x1, s.x2]), [[10, 14], [22, 30]]);
});

test('doors and windows toggle on the right walls and follow their rooms', () => {
  let bp = two();
  bp = toggleOpening(bp, { kind: 'door', x: 24, y: 26 });
  assert.equal(bp.openings.length, 1);
  assert.deepEqual([bp.openings[0].roomB, bp.openings[0].y1, bp.openings[0].y2], ['r2', 24.5, 27.5]);
  assert.equal(toggleOpening(bp, { kind: 'window', x: 24, y: 22 }), bp, 'no windows on shared walls');
  bp = toggleOpening(bp, { kind: 'window', x: 34, y: 26 });
  assert.equal(bp.openings.at(-1).roomB, null);
  assert.equal(toggleOpening(bp, { kind: 'door', x: 24, y: 25 }).openings.length, 1, 'toggling again removes it');
  assert.equal(toggleOpening(bp, { kind: 'door', x: 50, y: 50 }), bp, 'not on a wall');
  const moved = moveRoom(bp, 'r2', 26, 20);
  assert.equal(moved.openings.length, 0, 'the shared door and the moved wall\'s window both go');
  assert.equal(moveRoom(bp, 'r1', 10, 22).openings.length, 2, 'a 2 ft slide keeps both: the door still sits on the shared wall');
  assert.equal(removeRoom(bp, 'r2').openings.length, 0);
});

// Task 39's rules only (task 40's door/window rules are tested in blueprint-cost.test.js).
const core = (v) => ({ errors: v.errors.filter((e) => !['no-entry', 'unreachable', 'bedroom-window'].includes(e.code)),
  warnings: v.warnings.filter((w) => w.code === 'small') });

test('validation: required rooms, overlaps, setbacks, small rooms', () => {
  const empty = validateBlueprint(createBlueprint(LOT));
  assert.deepEqual(empty.errors.map((e) => e.code), ['missing-bedroom', 'missing-bathroom', 'missing-kitchen', 'missing-living']);
  let bp = two();
  bp = addRoom(bp, { type: 'kitchen', x: 10, y: 32, w: 8, h: 8 });
  bp = addRoom(bp, { type: 'bathroom', x: 18, y: 32, w: 6, h: 8 });
  assert.deepEqual(core(validateBlueprint(bp)), { errors: [], warnings: [] });
  const over = core(validateBlueprint(moveRoom(bp, 'r2', 22, 20)));
  assert.deepEqual(over.errors.map((e) => [e.code, e.roomIds]), [['overlap', ['r1', 'r2']]]);
  const set = core(validateBlueprint(moveRoom(bp, 'r1', 2, 20)));
  assert.deepEqual(set.errors.map((e) => e.code), ['overlap', 'setback'].filter((c) => c === 'setback'));
  assert.equal(validateBlueprint(moveRoom(bp, 'r1', 10, 14)).errors[0].code, 'setback', 'front setback is 15 ft');
  assert.equal(validateBlueprint(resizeRoom(bp, 'r2', { y: 80, h: 12 })).errors[0].code, 'setback', 'rear setback is 10 ft');
  const small = core(validateBlueprint(resizeRoom(bp, 'r2', { w: 6 })));
  assert.deepEqual(small.warnings.map((w) => w.code), ['small']);
  assert.match(small.warnings[0].message, /Bedroom is small.*70 sq ft and 7 ft wide/);
});

test('templates fit and validate on every buildable lot', () => {
  const buildable = LOCATIONS.filter((l) => l.housing.build.available);
  assert.ok(buildable.length >= 15);
  for (const loc of buildable) {
    for (const id of TEMPLATE_IDS) {
      const bp = templateBlueprint(id, lotOf(loc));
      assert.ok(bp, `${id} fits ${loc.id}`);
      const v = validateBlueprint(bp);
      assert.deepEqual({ errors: v.errors, warnings: v.warnings }, { errors: [], warnings: [] }, `${id} @ ${loc.id}`);
      assert.equal(bp.openings.length, TEMPLATES[id].openings.length, `${id} @ ${loc.id}: every door and window placed`);
      const a = buildArea(bp);
      assert.ok(bp.rooms.every((r) => r.x >= a.x0 && r.y >= a.y0 && r.x + r.w <= a.x1 && r.y + r.h <= a.y1));
    }
  }
  // Budget headroom for roof, walls, doors and yard (07 §5): weighted area stays ≤ 85% of the tier's budget sq ft.
  for (const id of TEMPLATE_IDS) {
    const tier = BUILD.tiers.find((t) => t.id === id);
    assert.ok(weightedArea(templateBlueprint(id, LOT)) <= tier.sqft * BUILD.designBudgetFactor * 0.85, id);
  }
  const beds = (id) => templateBlueprint(id, LOT).rooms.filter((r) => r.type === 'bedroom').length;
  assert.deepEqual(TEMPLATE_IDS.map(beds), [1, 2, 3]);
});

test('big lots edit inside a 120 ft window; names number repeated types', () => {
  assert.deepEqual(editWindow({ widthFt: 150, depthFt: 290 }), { x0: 16, y0: 0, x1: 136, y1: 120 });
  assert.deepEqual(buildArea(createBlueprint({ widthFt: 150, depthFt: 290 })), { x0: 16, y0: 16, x1: 136, y1: 120 });
  assert.deepEqual(buildArea(createBlueprint({ widthFt: 50, depthFt: 100 })), { x0: 6, y0: 16, x1: 44, y1: 90 });
  const bp = templateBlueprint('cozy', LOT);
  assert.deepEqual(bp.rooms.filter((r) => r.type === 'bedroom').map((r) => roomName(bp, r)), ['Bedroom 1', 'Bedroom 2']);
  assert.equal(roomName(bp, bp.rooms.find((r) => r.type === 'kitchen')), 'Kitchen');
  assert.deepEqual(findFreeSpot(createBlueprint(LOT), 10, 10), { x: 6, y: 16 });
});

test('tools: snapping, clamping, keys and history', () => {
  const area = { x0: 6, y0: 16, x1: 54, y1: 90 };
  const r = { x: 10, y: 20, w: 10, h: 10 };
  assert.deepEqual(moveRect(r, 3.1, -0.9, area), { x: 14, y: 20, w: 10, h: 10 });
  assert.deepEqual(moveRect(r, -40, 200, area), { x: 6, y: 80, w: 10, h: 10 });
  assert.deepEqual(resizeRect(r, 'ne', 25.2, 33.9, area), { x: 10, y: 20, w: 16, h: 14 });
  assert.deepEqual(resizeRect(r, 'sw', 30, 40, area), { x: 18, y: 28, w: 2, h: 2 });
  assert.deepEqual(drawRect({ x: 30.3, y: 40 }, { x: 19.6, y: 33.1 }, area), { x: 20, y: 34, w: 10, h: 6 });
  assert.deepEqual(keyAction({ key: 'ArrowUp' }), { kind: 'move', dx: 0, dy: 2 });
  assert.deepEqual(keyAction({ key: 'ArrowLeft', shiftKey: true }), { kind: 'resize', dw: -2, dh: 0 });
  assert.deepEqual(keyAction({ key: 'Z', ctrlKey: true, shiftKey: true }), { kind: 'redo' });
  assert.deepEqual(keyAction({ key: 't' }), { kind: 'cycle' });
  assert.equal(keyAction({ key: 'q' }), null);
  const bp = two();
  assert.equal(applyRoomAction(bp, 'r1', { kind: 'move', dx: 0, dy: 2 }, area).rooms[0].y, 22);
  assert.equal(applyRoomAction(bp, 'r1', { kind: 'resize', dw: 2, dh: 0 }, area).rooms[0].w, 16);
  assert.equal(applyRoomAction(bp, 'r1', { kind: 'cycle' }, area).rooms[0].type, 'dining');
  assert.equal(applyRoomAction(bp, 'r1', { kind: 'delete' }, area).rooms.length, 1);
  const hist = createHistory(50);
  for (let i = 0; i < 60; i++) hist.push(i);
  assert.equal(hist.depth, 50);
  assert.equal(hist.undo(60), 59);
  assert.equal(hist.redo(59), 60);
  assert.equal(hist.canRedo, false);
  hist.undo(60); hist.push(99);
  assert.equal(hist.canRedo, false, 'a new change clears redo');
});
