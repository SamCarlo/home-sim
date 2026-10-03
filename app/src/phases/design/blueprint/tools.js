// Blueprint editor tools (07 §5, task 39; pure, DOM-free). The geometry behind select / move / resize / draw and the
// keyboard map. Points and rects are lot feet (y toward the back); every result is snapped to the 2 ft grid and kept
// inside the build area `{x0, y0, x1, y1}` (model.buildArea). Handles are named by screen direction with the street
// at the bottom: n = back edge, s = front edge, e = right, w = left.
import { BLUEPRINT } from '../../../config.js';
import { moveRoom, nextType, removeRoom, resizeRoom, setRoomType, snap } from './model.js';

export const HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const G = BLUEPRINT.gridFt;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** Move a w × h rect from `start` by (dx, dy) feet, snapped and kept inside `area`. */
export function moveRect(start, dx, dy, area) {
  return {
    x: clamp(snap(start.x + dx), area.x0, area.x1 - start.w),
    y: clamp(snap(start.y + dy), area.y0, area.y1 - start.h),
    w: start.w, h: start.h,
  };
}

/** Resize `start` by dragging `handle` to lot point (px, py); the opposite edges stay put; sizes stay ≥ 2 ft. */
export function resizeRect(start, handle, px, py, area) {
  let x0 = start.x; let y0 = start.y; let x1 = start.x + start.w; let y1 = start.y + start.h;
  if (handle.includes('e')) x1 = clamp(snap(px), x0 + G, area.x1);
  if (handle.includes('w')) x0 = clamp(snap(px), area.x0, x1 - G);
  if (handle.includes('n')) y1 = clamp(snap(py), y0 + G, area.y1);
  if (handle.includes('s')) y0 = clamp(snap(py), area.y0, y1 - G);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The rect dragged out from p0 to p1 (any direction), snapped and clipped to `area`; w or h may be 0. */
export function drawRect(p0, p1, area) {
  const xs = [p0.x, p1.x].map((v) => clamp(snap(v), area.x0, area.x1)).sort((a, b) => a - b);
  const ys = [p0.y, p1.y].map((v) => clamp(snap(v), area.y0, area.y1)).sort((a, b) => a - b);
  return { x: xs[0], y: ys[0], w: xs[1] - xs[0], h: ys[1] - ys[0] };
}

/** True when a drawn rect is big enough to become a room (both sides ≥ 2 ft). */
export const drawable = (r) => r.w >= G && r.h >= G;

const ARROWS = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

/**
 * Map a keydown `{key, shiftKey, ctrlKey, metaKey}` to an editor action, or null:
 * `{kind: 'move', dx, dy}` | `{kind: 'resize', dw, dh}` | delete | cycle | undo | redo | deselect | zoom-in | zoom-out | fit.
 */
export function keyAction({ key, shiftKey = false, ctrlKey = false, metaKey = false }) {
  const mod = ctrlKey || metaKey;
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (mod && k === 'z') return { kind: shiftKey ? 'redo' : 'undo' };
  if (mod && k === 'y') return { kind: 'redo' };
  if (mod) return null;
  if (ARROWS[key]) {
    const [ax, ay] = ARROWS[key];
    return shiftKey ? { kind: 'resize', dw: ax * G, dh: ay * G } : { kind: 'move', dx: ax * G, dy: ay * G };
  }
  if (key === 'Delete' || key === 'Backspace') return { kind: 'delete' };
  if (k === 't') return { kind: 'cycle' };
  if (key === 'Escape') return { kind: 'deselect' };
  if (key === '+' || key === '=') return { kind: 'zoom-in' };
  if (key === '-' || key === '_') return { kind: 'zoom-out' };
  if (key === '0') return { kind: 'fit' };
  return null;
}

/** Apply a room action from keyAction to room `id` → the new blueprint (unchanged when nothing moves). */
export function applyRoomAction(bp, id, action, area) {
  const r = bp.rooms.find((room) => room.id === id);
  if (!r) return bp;
  if (action.kind === 'move') {
    const m = moveRect(r, action.dx, action.dy, area);
    return m.x === r.x && m.y === r.y ? bp : moveRoom(bp, id, m.x, m.y);
  }
  if (action.kind === 'resize') {
    const w = clamp(r.w + action.dw, G, area.x1 - r.x);
    const h = clamp(r.h + action.dh, G, area.y1 - r.y);
    return w === r.w && h === r.h ? bp : resizeRoom(bp, id, { w, h });
  }
  if (action.kind === 'delete') return removeRoom(bp, id);
  if (action.kind === 'cycle') return setRoomType(bp, id, nextType(r.type));
  return bp;
}

/** Zoom a view box `{x, y, w, h}` by `factor` (> 1 zooms in) around point (cx, cy), within [minW, maxW] width. */
export function zoomView(view, factor, cx, cy, { minW = 20, maxW = 400 } = {}) {
  const w = clamp(view.w / factor, minW, maxW);
  const k = w / view.w;
  return { x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k, w, h: view.h * k };
}

/** A capped undo history: `push(snapshot)`, `undo(current)`, `redo(current)` → snapshot | null. */
export function createHistory(limit = BLUEPRINT.undoSteps) {
  const past = [];
  let future = [];
  return {
    push(snapshot) { past.push(snapshot); if (past.length > limit) past.shift(); future = []; },
    undo(current) { if (!past.length) return null; future.push(current); return past.pop(); },
    redo(current) { if (!future.length) return null; past.push(current); return future.pop(); },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    get depth() { return past.length; },
  };
}
