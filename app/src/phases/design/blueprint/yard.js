// Blueprint yard (07 §5, task 40; pure): garden beds, fruit trees, a coop, driveway, patio, rain garden and the
// perimeter fence, as `bp.yard` items `{id, kind, x, y, w, h, rotation}` in lot feet. Items stay inside the editing
// window and off the rooms and each other; the fence is one item covering the window's outline.
import { BLUEPRINT } from '../../../config.js';
import { editWindow, overlaps } from './model.js';

export const YARD_KINDS = BLUEPRINT.yardKinds;
export const PLACEABLE = Object.keys(YARD_KINDS).filter((k) => k !== 'fence');
const solid = (bp) => [...bp.rooms, ...bp.yard.filter((it) => it.kind !== 'fence')];

function nextId(list) {
  let n = 0;
  for (const it of list) { const m = /^y(\d+)$/.exec(it.id); if (m) n = Math.max(n, Number(m[1])); }
  return `y${n + 1}`;
}

/**
 * A free w × h spot for a yard item, the closest one to a target: the street in front of the house for a driveway,
 * just behind the house for everything else (the middle of the window on an empty lot).
 */
export function findYardSpot(bp, kind, w, h, skipId = null) {
  const win = editWindow(bp.lot);
  const g = BLUEPRINT.gridFt;
  const others = solid(bp).filter((o) => o.id !== skipId);
  const rs = bp.rooms;
  const cx = rs.length ? (Math.min(...rs.map((r) => r.x)) + Math.max(...rs.map((r) => r.x + r.w))) / 2 : (win.x0 + win.x1) / 2;
  const ty = kind === 'driveway' ? win.y0 : rs.length ? Math.max(...rs.map((r) => r.y + r.h)) + 4 : (win.y0 + win.y1) / 2;
  let best = null;
  for (let y = win.y0 + (kind === 'driveway' ? 0 : g); y + h <= win.y1 - g; y += g) {
    for (let x = win.x0 + g; x + w <= win.x1 - g; x += g) {
      const d = Math.hypot(x + w / 2 - cx, (y - ty) * (kind === 'driveway' ? 4 : 1));
      if ((!best || d < best.d) && !others.some((o) => overlaps(o, { x, y, w, h }))) best = { x, y, d };
    }
  }
  return best && { x: best.x, y: best.y };
}

/** Add a yard item of `kind` at a free spot (or at {x, y} if given). Unchanged if there's no room or no such kind. */
export function addYardItem(bp, kind, at = null) {
  const k = YARD_KINDS[kind];
  if (!k || kind === 'fence' || bp.yard.length >= BLUEPRINT.maxYard) return bp;
  const spot = at ?? findYardSpot(bp, kind, k.w, k.h);
  if (!spot) return bp;
  return { ...bp, yard: [...bp.yard, { id: nextId(bp.yard), kind, x: spot.x, y: spot.y, w: k.w, h: k.h, rotation: 0 }] };
}

/** Move yard item `id` to (x, y), clamped into the window. Refuses (unchanged) if it would land on a room or item. */
export function moveYardItem(bp, id, x, y) {
  const it = bp.yard.find((o) => o.id === id);
  if (!it) return bp;
  const win = editWindow(bp.lot);
  const nx = Math.min(Math.max(x, win.x0), win.x1 - it.w);
  const ny = Math.min(Math.max(y, win.y0), win.y1 - it.h);
  const moved = { ...it, x: nx, y: ny };
  if (solid(bp).some((o) => o.id !== id && overlaps(o, moved))) return bp;
  return { ...bp, yard: bp.yard.map((o) => (o.id === id ? moved : o)) };
}

/** Remove yard item `id`. */
export const removeYardItem = (bp, id) => ({ ...bp, yard: bp.yard.filter((o) => o.id !== id) });

/** True when the perimeter fence is on. */
export const hasFence = (bp) => bp.yard.some((o) => o.kind === 'fence');

/** Turn the perimeter fence on or off (it follows the editing window: the whole lot on small lots). */
export function setFence(bp, on) {
  const yard = bp.yard.filter((o) => o.kind !== 'fence');
  if (!on) return yard.length === bp.yard.length ? bp : { ...bp, yard };
  const win = editWindow(bp.lot);
  return { ...bp, yard: [...yard, { id: nextId(bp.yard), kind: 'fence', x: win.x0, y: win.y0, w: win.x1 - win.x0, h: win.y1 - win.y0, rotation: 0 }] };
}

/** Yard items a room sits on (validation flags them). */
export const coveredYard = (bp) => bp.yard.filter((it) => it.kind !== 'fence' && bp.rooms.some((r) => overlaps(r, it)));

/** Count of yard items of a kind. */
export const yardCount = (bp, kind) => bp.yard.filter((o) => o.kind === kind).length;
