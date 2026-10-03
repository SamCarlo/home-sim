// Blueprint model (07 §5, task 39; pure). Feet, origin at the lot's front-left corner, x to the right, y toward the
// back. Rooms are axis-aligned rectangles; openings sit on a shared or exterior wall. Every edit helper returns a NEW
// blueprint (the editor keeps the old ones for undo) and drops openings that no longer sit on a wall.
import { BLUEPRINT, BUILD } from '../../../config.js';

export const ROOM_TYPES = BLUEPRINT.roomTypes;
export const ROOM_TYPE_IDS = Object.keys(ROOM_TYPES);
const EPS = 1e-6;

/** A blank blueprint for a lot `{widthFt, depthFt}` (07 §5 defaults; site utilities can pre-fill solar/catchment). */
export function createBlueprint({ widthFt, depthFt }, { setbacks = BUILD.setbacksFt, solarKw = 0, catchmentGallons = 0 } = {}) {
  return {
    version: 1,
    lot: { widthFt, depthFt, setbacks: { ...setbacks } },
    rooms: [], openings: [],
    roof: { style: 'gable', material: 'metal', color: '#6b7581' },
    exterior: { siding: 'board', color: '#e9e2d0', trim: '#ffffff' },
    yard: [], solarKw, catchmentGallons, solarWaterHeater: true,
  };
}

/** The lot of a location's build record. */
export const lotOf = (location) => ({ widthFt: location.housing.build.lotWidthFt, depthFt: location.housing.build.lotDepthFt });

/** Snap a value to the grid (2 ft). */
export const snap = (v, grid = BLUEPRINT.gridFt) => Math.round(v / grid) * grid;

/**
 * The 120 × 120 ft editing window of a big lot (07 §5): centered across the width, starting at the street.
 * → `{x0, y0, x1, y1}` in lot feet. Small lots return the whole lot.
 */
export function editWindow(lot, size = BLUEPRINT.windowFt) {
  const w = Math.min(lot.widthFt, size);
  const x0 = snap((lot.widthFt - w) / 2);
  return { x0, y0: 0, x1: x0 + w, y1: Math.min(lot.depthFt, size) };
}

/** Where rooms may go: inside the setbacks and the editing window, shrunk onto the 2 ft grid → `{x0, y0, x1, y1}`. */
export function buildArea(bp) {
  const { lot } = bp;
  const win = editWindow(lot);
  const g = BLUEPRINT.gridFt;
  const up = (v) => Math.ceil(v / g - EPS) * g;
  const down = (v) => Math.floor(v / g + EPS) * g;
  return {
    x0: up(Math.max(win.x0, lot.setbacks.side)), y0: up(Math.max(win.y0, lot.setbacks.front)),
    x1: down(Math.min(win.x1, lot.widthFt - lot.setbacks.side)), y1: down(Math.min(win.y1, lot.depthFt - lot.setbacks.rear)),
  };
}

/** Room area in sq ft. */
export const roomArea = (r) => r.w * r.h;
/** Total floor area (rooms never overlap in a valid plan). */
export const footprintArea = (bp) => bp.rooms.reduce((t, r) => t + roomArea(r), 0);
/** Σ area × the room type's cost multiplier (07 §5); cost.js multiplies by the local cost per sq ft. */
export const weightedArea = (bp) => bp.rooms.reduce((t, r) => t + roomArea(r) * (ROOM_TYPES[r.type]?.mult ?? 1), 0);

/** True when two rectangles overlap with positive area. */
export const overlaps = (a, b) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

/** True when rect r lies inside area `{x0, y0, x1, y1}`. */
export const inside = (r, a) => r.x >= a.x0 - EPS && r.y >= a.y0 - EPS && r.x + r.w <= a.x1 + EPS && r.y + r.h <= a.y1 + EPS;

/** The room containing lot point (x, y), topmost (last drawn) first, or null. */
export function roomAt(bp, x, y) {
  for (let i = bp.rooms.length - 1; i >= 0; i--) {
    const r = bp.rooms[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

/** "Bedroom 2": the type label, numbered when the plan has more than one room of that type. */
export function roomName(bp, room) {
  const same = bp.rooms.filter((r) => r.type === room.type);
  const label = ROOM_TYPES[room.type]?.label ?? room.type;
  return same.length > 1 ? `${label} ${same.indexOf(room) + 1}` : label;
}

function nextId(list, prefix) {
  let n = 0;
  for (const it of list) { const m = new RegExp(`^${prefix}(\\d+)$`).exec(it.id); if (m) n = Math.max(n, Number(m[1])); }
  return `${prefix}${n + 1}`;
}

const withRooms = (bp, rooms) => pruneOpenings({ ...bp, rooms });

/** Add a room `{type, x, y, w, h}`; the new room (with its id) is the last one. Refuses past `maxRooms`. */
export function addRoom(bp, { type, x, y, w, h }) {
  if (bp.rooms.length >= BLUEPRINT.maxRooms || !ROOM_TYPES[type]) return bp;
  return withRooms(bp, [...bp.rooms, { id: nextId(bp.rooms, 'r'), type, x, y, w, h }]);
}

/** Move room `id` so its front-left corner is at (x, y). */
export const moveRoom = (bp, id, x, y) => withRooms(bp, bp.rooms.map((r) => (r.id === id ? { ...r, x, y } : r)));

/** Set room `id`'s rectangle `{x, y, w, h}` (any subset). */
export const resizeRoom = (bp, id, rect) => withRooms(bp, bp.rooms.map((r) => (r.id === id ? { ...r, ...rect } : r)));

/** Change room `id`'s type. */
export const setRoomType = (bp, id, type) => (ROOM_TYPES[type] ? { ...bp, rooms: bp.rooms.map((r) => (r.id === id ? { ...r, type } : r)) } : bp);

/** Remove room `id` and its openings. */
export const removeRoom = (bp, id) => withRooms(bp, bp.rooms.filter((r) => r.id !== id));

/** The next room type in ROOM_TYPE_IDS order (the editor's T key). */
export const nextType = (type) => ROOM_TYPE_IDS[(ROOM_TYPE_IDS.indexOf(type) + 1) % ROOM_TYPE_IDS.length];

/** The four walls of a room: `[{side: 'front'|'back'|'left'|'right', x1, y1, x2, y2}]` (front faces the street). */
export function wallsOf(r) {
  return [
    { side: 'front', x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y },
    { side: 'back', x1: r.x, y1: r.y + r.h, x2: r.x + r.w, y2: r.y + r.h },
    { side: 'left', x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.h },
    { side: 'right', x1: r.x + r.w, y1: r.y, x2: r.x + r.w, y2: r.y + r.h },
  ];
}

/** Wall segments rooms a and b share, each `{side (a's), x1, y1, x2, y2}` with positive length. */
export function sharedWalls(a, b) {
  const out = [];
  const span = (lo1, hi1, lo2, hi2) => [Math.max(lo1, lo2), Math.min(hi1, hi2)];
  const near = (p, q) => Math.abs(p - q) < EPS;
  const vert = (side, x) => { const [lo, hi] = span(a.y, a.y + a.h, b.y, b.y + b.h); if (hi - lo > EPS) out.push({ side, x1: x, y1: lo, x2: x, y2: hi }); };
  const horiz = (side, y) => { const [lo, hi] = span(a.x, a.x + a.w, b.x, b.x + b.w); if (hi - lo > EPS) out.push({ side, x1: lo, y1: y, x2: hi, y2: y }); };
  if (near(a.x + a.w, b.x)) vert('right', b.x);
  if (near(a.x, b.x + b.w)) vert('left', a.x);
  if (near(a.y + a.h, b.y)) horiz('back', b.y);
  if (near(a.y, b.y + b.h)) horiz('front', a.y);
  return out;
}

const isVertical = (seg) => seg.x1 === seg.x2;
const along = (seg) => (isVertical(seg) ? [seg.y1, seg.y2] : [seg.x1, seg.x2]);
const segFrom = (wall, lo, hi) => (isVertical(wall)
  ? { ...wall, y1: lo, y2: hi } : { ...wall, x1: lo, x2: hi });

/** Exterior wall segments (walls not shared with another room): `[{roomId, side, x1, y1, x2, y2}]`. */
export function exteriorWalls(bp) {
  const out = [];
  for (const r of bp.rooms) {
    for (const wall of wallsOf(r)) {
      let parts = [along(wall)];
      for (const o of bp.rooms) {
        if (o === r) continue;
        for (const s of sharedWalls(r, o)) {
          if (s.side !== wall.side) continue;
          const [c0, c1] = along(s);
          parts = parts.flatMap(([p0, p1]) => [[p0, Math.min(p1, c0)], [Math.max(p0, c1), p1]]).filter(([p0, p1]) => p1 - p0 > EPS);
        }
      }
      for (const [lo, hi] of parts) out.push({ roomId: r.id, ...segFrom(wall, lo, hi) });
    }
  }
  return out;
}

/** Rooms that share a wall: `{[roomId]: [neighbourId, …]}`. */
export function adjacency(bp) {
  const adj = Object.fromEntries(bp.rooms.map((r) => [r.id, []]));
  bp.rooms.forEach((a, i) => bp.rooms.slice(i + 1).forEach((b) => {
    if (sharedWalls(a, b).length) { adj[a.id].push(b.id); adj[b.id].push(a.id); }
  }));
  return adj;
}

/** Every wall segment an opening of `kind` may sit on: `[{roomA, roomB|null, x1, y1, x2, y2}]`. */
export function openingSegments(bp, kind) {
  const segs = exteriorWalls(bp).map((s) => ({ roomA: s.roomId, roomB: null, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }));
  if (kind === 'door') {
    bp.rooms.forEach((a, i) => bp.rooms.slice(i + 1).forEach((b) => {
      for (const s of sharedWalls(a, b)) segs.push({ roomA: a.id, roomB: b.id, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 });
    }));
  }
  return segs;
}

const onLine = (seg, o) => (isVertical(seg)
  ? o.x1 === o.x2 && Math.abs(o.x1 - seg.x1) < EPS && Math.min(o.y1, o.y2) >= seg.y1 - EPS && Math.max(o.y1, o.y2) <= seg.y2 + EPS
  : o.y1 === o.y2 && Math.abs(o.y1 - seg.y1) < EPS && Math.min(o.x1, o.x2) >= seg.x1 - EPS && Math.max(o.x1, o.x2) <= seg.x2 + EPS);

const sameRooms = (seg, o) => (seg.roomA === o.roomA && seg.roomB === o.roomB) || (seg.roomA === o.roomB && seg.roomB === o.roomA);

/** Drop openings whose wall moved away or is no longer shared/exterior as recorded. */
export function pruneOpenings(bp) {
  const segs = { door: openingSegments(bp, 'door'), window: null };
  segs.window = segs.door.filter((s) => s.roomB === null);
  const openings = bp.openings.filter((o) => segs[o.kind].some((s) => sameRooms(s, o) && onLine(s, o)));
  return openings.length === bp.openings.length ? bp : { ...bp, openings };
}

/**
 * Toggle a door or window at lot point (x, y) (07 §5): removes an opening of that kind covering the point, otherwise
 * adds one centered there (clamped into the wall segment). Doors go on shared or exterior walls, windows on exterior
 * walls only. Returns the blueprint unchanged when the point isn't on a usable wall or the opening would overlap another.
 */
export function toggleOpening(bp, { kind, x, y, widthFt }) {
  const tol = 0.75;
  const segs = openingSegments(bp, kind).filter((s) => (isVertical(s)
    ? Math.abs(x - s.x1) <= tol && y >= s.y1 - EPS && y <= s.y2 + EPS
    : Math.abs(y - s.y1) <= tol && x >= s.x1 - EPS && x <= s.x2 + EPS));
  if (!segs.length) return bp;
  const seg = segs.find((s) => s.roomB) ?? segs[0];
  const t = isVertical(seg) ? y : x;
  const hit = bp.openings.find((o) => o.kind === kind && onLine(seg, o) && t >= Math.min(...along(o)) - EPS && t <= Math.max(...along(o)) + EPS);
  if (hit) return { ...bp, openings: bp.openings.filter((o) => o !== hit) };
  if (bp.openings.length >= BLUEPRINT.maxOpenings) return bp;
  const [lo, hi] = along(seg);
  const width = Math.min(widthFt ?? (kind === 'door' ? BLUEPRINT.doorFt : BLUEPRINT.windowOpeningFt), hi - lo >= 4 ? 4 : 3);
  if (hi - lo < width - EPS) return bp;
  const c0 = Math.min(Math.max(t - width / 2, lo), hi - width);
  const span = [c0, c0 + width];
  const clash = bp.openings.some((o) => onLine(seg, o) && Math.max(...along(o)) > span[0] + EPS && Math.min(...along(o)) < span[1] - EPS);
  if (clash) return bp;
  const pos = isVertical(seg) ? { x1: seg.x1, y1: span[0], x2: seg.x1, y2: span[1] } : { x1: span[0], y1: seg.y1, x2: span[1], y2: seg.y1 };
  return { ...bp, openings: [...bp.openings, { id: nextId(bp.openings, 'o'), kind, roomA: seg.roomA, roomB: seg.roomB, ...pos, widthFt: width }] };
}

/** A free spot for a new w × h room inside the build area (scanning from the front-left), or null. */
export function findFreeSpot(bp, w, h) {
  const a = buildArea(bp);
  const g = BLUEPRINT.gridFt;
  for (let y = Math.ceil(a.y0 / g) * g; y + h <= a.y1; y += g) {
    for (let x = Math.ceil(a.x0 / g) * g; x + w <= a.x1; x += g) {
      const r = { x, y, w, h };
      if (!bp.rooms.some((o) => overlaps(o, r))) return { x, y };
    }
  }
  return null;
}
