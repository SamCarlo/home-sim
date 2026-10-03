// Blueprint canvas drawing (07 §5, task 39; pure: returns SVG markup strings). SVG units are feet; the street is at the
// bottom, so lot point (x, y) draws at (x, D − y) where D is the lot depth. Room names are generated, never typed,
// and still go through escapeHtml.
import { escapeHtml } from '../../../util/escape.js';
import { buildArea, editWindow, roomArea, roomName } from './model.js';

export const ROOM_COLORS = {
  bedroom: ['#cfe3f5', '#5d86ad'], living: ['#f6e3b4', '#a88732'], dining: ['#f3d2ae', '#a8703a'],
  office: ['#ddd4f1', '#7a68a8'], hallway: ['#e7e7e2', '#8a8a80'], closet: ['#dcd6cc', '#857a68'],
  laundry: ['#cdeef0', '#3f9198'], kitchen: ['#f6c9c0', '#b0574a'], bathroom: ['#c0e6d6', '#3b8a6c'],
  garage: ['#d6dade', '#6e7781'], lanai: ['#e2ecc9', '#6f8b3a'],
};
const PAPER = '#f7f5ee';
const n = (v) => Math.round(v * 100) / 100;

/** The view box that frames the build window plus the street, `{x, y, w, h}` in SVG units. */
export function fitView(bp) {
  const win = editWindow(bp.lot);
  const D = bp.lot.depthFt;
  const pad = Math.max(6, (win.x1 - win.x0) * 0.06);
  return { x: win.x0 - pad, y: D - win.y1 - pad * 1.6, w: win.x1 - win.x0 + pad * 2, h: win.y1 - win.y0 + pad * 3.2 + 12 };
}

/** A closer view around the rooms (at least 64 ft across, street included when the house is near it), or fitView. */
export function roomsView(bp) {
  if (!bp.rooms.length) return fitView(bp);
  const D = bp.lot.depthFt;
  const x0 = Math.min(...bp.rooms.map((r) => r.x)); const x1 = Math.max(...bp.rooms.map((r) => r.x + r.w));
  const y0 = Math.min(...bp.rooms.map((r) => r.y)); const y1 = Math.max(...bp.rooms.map((r) => r.y + r.h));
  const lo = Math.min(y0, 0) - 14; const hi = y1 + 14;
  const w = Math.max(64, x1 - x0 + 28, (hi - lo) * 1.4);
  const h = Math.max(hi - lo, w / 1.4);
  return { x: (x0 + x1) / 2 - w / 2, y: D - lo - h, w, h };
}

function grid(area, D) {
  let minor = ''; let major = '';
  for (let x = area.x0; x <= area.x1; x += 2) (x % 10 ? (minor += `M${x} ${D - area.y1}V${D - area.y0}`) : (major += `M${x} ${D - area.y1}V${D - area.y0}`));
  for (let y = area.y0; y <= area.y1; y += 2) (y % 10 ? (minor += `M${area.x0} ${D - y}H${area.x1}`) : (major += `M${area.x0} ${D - y}H${area.x1}`));
  return `<path class="bp-grid" d="${minor}" stroke="#d9dfe6" stroke-width="1" vector-effect="non-scaling-stroke"/>`
    + `<path class="bp-grid-major" d="${major}" stroke="#b9c3cd" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
}

/** The lot: grass, hatched setbacks (and anything outside the build window), the grid, the street and labels. */
export function lotMarkup(bp) {
  const { lot } = bp;
  const D = lot.depthFt;
  const W = lot.widthFt;
  const a = buildArea(bp);
  const win = editWindow(lot);
  const { front, side, rear } = lot.setbacks;
  const fs = Math.max(1.4, (win.x1 - win.x0) / 55);
  const label = (x, y, text, extra = '') => `<text x="${n(x)}" y="${n(y)}" font-size="${n(fs)}" ${extra}>${escapeHtml(text)}</text>`;
  return `<defs><pattern id="bp-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`
    + `<rect width="3" height="3" fill="#e9e4d6"/><path d="M0 0V3" stroke="#d3c9b0" stroke-width="1.2"/></pattern></defs>`
    + `<rect x="${win.x0 - 200}" y="${D - win.y0}" width="${win.x1 - win.x0 + 400}" height="12" fill="#9aa1a8"/>`
    + `<path d="M${win.x0 - 200} ${D + 6}H${win.x1 + 200}" stroke="#f5f2e6" stroke-width="0.4" stroke-dasharray="3 3"/>`
    + `<rect class="bp-lot" x="0" y="0" width="${W}" height="${D}" fill="url(#bp-hatch)" stroke="#7c8a6a" stroke-width="2" vector-effect="non-scaling-stroke"/>`
    + `<rect class="bp-area" x="${a.x0}" y="${D - a.y1}" width="${a.x1 - a.x0}" height="${a.y1 - a.y0}" fill="${PAPER}"/>`
    + grid(a, D)
    + `<rect x="${a.x0}" y="${D - a.y1}" width="${a.x1 - a.x0}" height="${a.y1 - a.y0}" fill="none" stroke="#8796a5" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`
    + label((win.x0 + win.x1) / 2, D + 4 + fs / 2, 'Street', 'text-anchor="middle" fill="#fff" font-weight="600"')
    + label((a.x0 + a.x1) / 2, D - front / 2 + fs / 3, `${front} ft front setback`, 'text-anchor="middle" fill="#7a6f55"')
    + (rear < win.y1 ? label((a.x0 + a.x1) / 2, D - lot.depthFt + rear / 2 + fs / 3, `${rear} ft rear setback`, 'text-anchor="middle" fill="#7a6f55"') : '')
    + (win.x0 === 0 ? label(side / 2, D - (a.y0 + a.y1) / 2, `${side} ft side setback`,
      `text-anchor="middle" fill="#7a6f55" transform="rotate(-90 ${n(side / 2)} ${n(D - (a.y0 + a.y1) / 2)})"`) : '')
    + (win.y1 < lot.depthFt ? label((a.x0 + a.x1) / 2, D - win.y1 - fs * 0.8, `Your lot continues ${lot.depthFt - win.y1} ft back`, 'text-anchor="middle" fill="#7a6f55"') : '');
}

/**
 * Rooms, openings, the selection and the drawing rectangle.
 * opts: `{sel, preview {id, rect}, draft rect, problems Set, handlePx (feet per 9 px)}`.
 */
export function roomsMarkup(bp, { sel = null, preview = null, draft = null, problems = new Set(), handleFt = 1 } = {}) {
  const D = bp.lot.depthFt;
  let out = '';
  for (const room of bp.rooms) {
    const r = preview?.id === room.id ? { ...room, ...preview.rect } : room;
    const [fill, line] = ROOM_COLORS[r.type] ?? ['#eee', '#888'];
    const name = roomName(bp, room);
    const area = `${roomArea(r)} sq ft`;
    const fs = Math.max(0.55, Math.min(1.7, r.w / (Math.max(name.length, area.length) * 0.6), r.h / 3.4));
    const cx = r.x + r.w / 2; const cy = D - r.y - r.h / 2;
    const bad = problems.has(room.id);
    const cls = `bp-room${room.id === sel ? ' is-sel' : ''}${bad ? ' is-bad' : ''}`;
    out += `<g class="${cls}" data-id="${escapeHtml(room.id)}" data-type="${escapeHtml(room.type)}">`
      + `<rect x="${r.x}" y="${D - r.y - r.h}" width="${r.w}" height="${r.h}" fill="${fill}" fill-opacity="0.92" stroke="${bad ? '#c0392b' : line}" stroke-width="${bad ? 3 : 2}" vector-effect="non-scaling-stroke"/>`
      + `<text x="${n(cx)}" y="${n(cy - fs * 0.15)}" font-size="${n(fs)}" text-anchor="middle" font-weight="600" fill="#1f2a33">${escapeHtml(name)}</text>`
      + `<text x="${n(cx)}" y="${n(cy + fs * 1.05)}" font-size="${n(fs * 0.85)}" text-anchor="middle" fill="#3d4753">${escapeHtml(area)}</text></g>`;
  }
  for (const o of bp.openings) {
    const color = o.kind === 'door' ? (o.roomB ? '#8a5a2b' : '#c0571c') : '#2f86c9';
    out += `<path class="bp-opening bp-${o.kind}" d="M${o.x1} ${D - o.y1}L${o.x2} ${D - o.y2}" stroke="${color}" stroke-width="${o.kind === 'door' ? 5 : 4}" stroke-linecap="butt" vector-effect="non-scaling-stroke"/>`;
  }
  const selRoom = bp.rooms.find((r) => r.id === sel);
  if (selRoom) {
    const r = preview?.id === sel ? { ...selRoom, ...preview.rect } : selRoom;
    const hs = handleFt;
    const pts = { sw: [r.x, r.y], s: [r.x + r.w / 2, r.y], se: [r.x + r.w, r.y], e: [r.x + r.w, r.y + r.h / 2],
      ne: [r.x + r.w, r.y + r.h], n: [r.x + r.w / 2, r.y + r.h], nw: [r.x, r.y + r.h], w: [r.x, r.y + r.h / 2] };
    out += `<rect class="bp-sel-outline" x="${r.x}" y="${D - r.y - r.h}" width="${r.w}" height="${r.h}" fill="none" stroke="#1f6fd1" stroke-width="2.5" stroke-dasharray="5 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    for (const [hname, [hx, hy]] of Object.entries(pts)) {
      out += `<rect class="bp-handle bp-handle-${hname}" data-handle="${hname}" x="${n(hx - hs / 2)}" y="${n(D - hy - hs / 2)}" width="${n(hs)}" height="${n(hs)}" fill="#fff" stroke="#1f6fd1" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    }
    out += `<text class="bp-dims" x="${n(r.x + r.w / 2)}" y="${n(D - r.y - r.h - hs * 1.1)}" font-size="${n(hs * 1.5)}" text-anchor="middle" fill="#1f6fd1" font-weight="600">${r.w} × ${r.h} ft</text>`;
  }
  if (draft) {
    out += `<rect class="bp-draft" x="${draft.x}" y="${D - draft.y - draft.h}" width="${draft.w}" height="${draft.h}" fill="rgba(31,111,209,.12)" stroke="#1f6fd1" stroke-width="2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`;
    if (draft.w && draft.h) out += `<text x="${n(draft.x + draft.w / 2)}" y="${n(D - draft.y - draft.h / 2)}" font-size="${n(handleFt * 1.6)}" text-anchor="middle" fill="#1f6fd1" font-weight="600">${draft.w} × ${draft.h} ft</text>`;
  }
  return out;
}
