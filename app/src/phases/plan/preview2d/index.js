// 2D preview picture for one plan cell (04 §7). Pure: returns a complete SVG string, deterministic for the same inputs.
// Layers back to front: sky → landmark → terrain → vegetation → home → foreground → caption chip.
// The home comes from buildings.js (home type × the place's style family, data/styleFamilies.js).
import { escapeHtml } from '../../../util/escape.js';
import { createRng, seedFor, hashString } from '../../../util/rng.js';
import { homeType } from '../../../data/homeTypes.js';
import { VIEW } from './palette.js';
import { GROUND } from './shapes.js';
import { drawHome } from './buildings.js';
import {
  sky, landmark, landmarkDescription, terrain, vegetation, mailbox, fence, car, busStop, catchmentTank,
} from './backgrounds.js';

/** Foreground props: fence and mailbox for houses, car or bus stop by transit, catchment tank where water is catchment. */
function foreground(location, typeId) {
  let s = '';
  const detached = typeId === 'house' || typeId === 'shared' || typeId === 'build';
  if (detached) s += fence(150, 186, GROUND + 6) + mailbox(176, GROUND + 14);
  if (location.water === 'catchment') s += catchmentTank(typeId === 'build' || typeId === 'build-empty' ? 300 : 312, GROUND - 2);
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
    + (available ? drawHome({ location, homeTypeId, seed }) : '')
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
