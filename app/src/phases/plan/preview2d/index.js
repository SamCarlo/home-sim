// 2D preview picture for one plan cell (04 §7). Pure: returns a complete SVG string, deterministic for the same inputs.
// Layers back to front: sky → landmark → terrain → vegetation → home → foreground → caption chip.
// The home is a simple placeholder box for now; task 14 swaps in buildings.js (type × style family).
import { escapeHtml } from '../../../util/escape.js';
import { createRng, seedFor, hashString } from '../../../util/rng.js';
import { homeType } from '../../../data/homeTypes.js';
import { VIEW } from './palette.js';
import {
  sky, landmark, landmarkDescription, terrain, vegetation, mailbox, fence, car, busStop, catchmentTank, people,
} from './backgrounds.js';

const GROUND = 238; // where the home and foreground props stand

/** Placeholder home for each type, centered at x 240 (replaced by buildings.js in task 14). */
function placeholderHome(typeId, location) {
  const roof = (x, w, y, color = '#8a4a3a') => `<path d="M${x - 6} ${y}L${x + w / 2} ${y - 22}L${x + w + 6} ${y}Z" fill="${color}"/>`;
  const windows = (x0, y0, cols, rows, gap = 14) => {
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      s += `<rect x="${x0 + c * gap}" y="${y0 + r * 16}" width="8" height="9" fill="#fbe9b0"/>`;
    }
    return s;
  };
  if (typeId === 'build') {
    return `<rect x="180" y="${GROUND - 34}" width="120" height="34" fill="none" stroke="#4f86c8" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.8"/>`
      + `<path d="M180 ${GROUND - 34}L240 ${GROUND - 58}L300 ${GROUND - 34}" fill="none" stroke="#4f86c8" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.8"/>`
      + [[180, GROUND], [300, GROUND], [180, GROUND - 34], [300, GROUND - 34]].map(([x, y]) =>
        `<path d="M${x} ${y + 2}V${y - 10}" stroke="#a87a4a" stroke-width="2.5"/><path d="M${x} ${y - 10}h6v4h-6" fill="#f07a30"/>`).join('')
      + `<path d="M232 ${GROUND}V${GROUND - 20}M262 ${GROUND}V${GROUND - 20}" stroke="#6a5240" stroke-width="3"/>`
      + `<rect x="220" y="${GROUND - 44}" width="54" height="26" rx="3" fill="#fffaf0" stroke="#6a5240" stroke-width="1.5"/>`
      + `<text x="247" y="${GROUND - 34}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="8" font-weight="700" fill="#3a3a3a" text-anchor="middle">Your house</text>`
      + `<text x="247" y="${GROUND - 24}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="8" font-weight="700" fill="#3a3a3a" text-anchor="middle">here</text>`;
  }
  if (typeId === 'apartment' || typeId === 'condo') {
    const tall = location.settlement === 'big-city' ? 4 : location.settlement === 'mid-city' ? 3 : 2;
    const floors = typeId === 'condo' && location.settlement === 'big-city' ? 5 : tall;
    const ht = floors * 16 + 12;
    const color = typeId === 'condo' ? '#d8d2c4' : '#c88a6a';
    return `<rect x="196" y="${GROUND - ht}" width="88" height="${ht}" fill="${color}" stroke="#5a4a40" stroke-width="1.5"/>`
      + `<rect x="192" y="${GROUND - ht - 4}" width="96" height="5" fill="#6a5a50"/>`
      + windows(204, GROUND - ht + 8, 6, floors - 1)
      + `<rect x="232" y="${GROUND - 20}" width="16" height="20" fill="#5a4a40"/>`;
  }
  const w = typeId === 'shared' ? 104 : 92;
  const x = 240 - w / 2;
  return `<rect x="${x}" y="${GROUND - 40}" width="${w}" height="40" fill="#f2e6cc" stroke="#5a4a40" stroke-width="1.5"/>`
    + roof(x, w, GROUND - 40)
    + `<rect x="${x + 14}" y="${GROUND - 30}" width="16" height="12" fill="#fbe9b0" stroke="#5a4a40"/>`
    + `<rect x="${x + w - 30}" y="${GROUND - 30}" width="16" height="12" fill="#fbe9b0" stroke="#5a4a40"/>`
    + `<rect x="${x + w / 2 - 8}" y="${GROUND - 22}" width="16" height="22" fill="#6a4a3a"/>`
    + (typeId === 'shared' ? people(x + w / 2 - 30, GROUND, 3) : '');
}

/** Foreground props: fence and mailbox for houses, car or bus stop by transit, catchment tank where water is catchment. */
function foreground(location, typeId) {
  let s = '';
  const detached = typeId === 'house' || typeId === 'shared' || typeId === 'build';
  if (detached) s += fence(150, 186, GROUND + 6) + mailbox(176, GROUND + 14);
  if (location.water === 'catchment' && typeId !== 'apartment' && typeId !== 'condo') s += catchmentTank(296, GROUND - 2);
  const mode = location.living?.transport?.mode;
  const transit = mode === 'transit' || mode === 'mixed' || (location.metrics?.transit ?? 0) >= 4;
  s += transit ? busStop(338, GROUND + 18) : car(344, GROUND + 18);
  return s;
}

/** Caption chip text, e.g. "Hilo · Apartment". */
export function captionText(location, typeId) {
  return `${location.name} · ${homeType(typeId).title}`;
}

/**
 * Complete preview SVG for one cell: `<svg viewBox="0 0 480 270">` with <title> and <desc>.
 * Unavailable cells get a muted scene and a "Not available here" sign. Text goes through escapeHtml.
 */
export function renderPreviewSVG({ location, homeTypeId, seed = 0 }) {
  const type = homeType(homeTypeId);
  const available = location.housing?.[homeTypeId]?.available !== false;
  const uid = `pv${hashString(`${location.id}|${homeTypeId}|${seed}`).toString(36)}`;
  const rng = createRng(seedFor('preview2d', location.id, seed)); // per place, so all five types share the scenery
  const caption = captionText(location, homeTypeId);
  const desc = `${type.title} in ${location.fullName || location.name}, with ${landmarkDescription(location.landmark)} behind`
    + (available ? '.' : '. Not available here.');
  const chipW = Math.round(caption.length * 6.6 + 20);

  const scene = sky(location.biome, uid) + landmark(location.landmark) + terrain(location.biome, rng)
    + vegetation(location.biome, rng)
    + (available ? placeholderHome(homeTypeId, location) : '')
    + foreground(location, available ? homeTypeId : 'build-empty');
  const body = available ? scene
    : `<g filter="url(#${uid}-mute)">${scene}</g><rect width="${VIEW.w}" height="${VIEW.h}" fill="#f4f1ea" opacity="0.35"/>`
      + `<path d="M240 ${GROUND}V${GROUND - 34}" stroke="#6a5240" stroke-width="4"/>`
      + `<rect x="178" y="${GROUND - 66}" width="124" height="34" rx="4" fill="#fffaf0" stroke="#6a5240" stroke-width="2"/>`
      + `<text x="240" y="${GROUND - 44}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="13" font-weight="700" fill="#3a3a3a" text-anchor="middle">Not available here</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" role="img" aria-labelledby="${uid}-t ${uid}-d">`
    + `<title id="${uid}-t">${escapeHtml(caption)}</title><desc id="${uid}-d">${escapeHtml(desc)}</desc>`
    + (available ? '' : `<defs><filter id="${uid}-mute"><feColorMatrix type="saturate" values="0.2"/></filter></defs>`)
    + body
    + `<g><rect x="10" y="240" width="${chipW}" height="22" rx="11" fill="#1f2a30" opacity="0.78"/>`
    + `<text x="20" y="255" font-family="IBM Plex Sans, Arial, sans-serif" font-size="12" font-weight="600" fill="#ffffff">${escapeHtml(caption)}</text></g>`
    + '</svg>';
}
