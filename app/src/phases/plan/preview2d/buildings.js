// The home in each 2D preview (04 §7 layer 4): home type × the place's style family (data/styleFamilies.js). Pure.
// apartment: walk-up, mid-rise or tower by settlement and family · condo: townhomes, low-rise or glass tower ·
// shared: the regional house with three figures on the porch or lānai · house: houses.js · build: an empty surveyed lot.
import { styleFamily } from '../../../data/styleFamilies.js';
import { createRng, seedFor, hashString } from '../../../util/rng.js';
import { people } from './backgrounds.js';
import { drawHouse } from './houses.js';
import {
  GROUND as G, INK, GLASS, GLASS_COOL, rect, poly, line, edge, gable, hip, ribs, gableTop, siding, win, door, railing,
  windowGrid,
} from './shapes.js';

const BRICKS = ['#9a4a3a', '#a8664a', '#7e3a30'];
const MATERIAL = { brick: ['h', 3, '#5a2a1a', 0.22], wood: ['h', 3.5, '#000', 0.16], log: ['h', 5, '#000', 0.3], panel: ['v', 14, '#000', 0.14] };

/** Roof or rooftop details over a flat-topped block [x, x + w] whose top is at y. */
function rooftop(kind, x, y, w, p) {
  switch (kind) {
    case 'gable': return gable(x, y, w, Math.min(30, w * 0.22), p.roof, 5);
    case 'hip': return hip(x, y, w, 14, p.roof, 6, 24) + ribs(x - 6, x + w + 6, y, (px) => y - 14 * Math.min(1, Math.min(px - x + 6, x + w + 6 - px) / 30));
    case 'tile': {
      let d = '';
      for (let tx = x; tx < x + w; tx += 4) d += `M${tx} ${y - 1}v-6`;
      return poly([[x - 5, y], [x + 10, y - 8], [x + w - 10, y - 8], [x + w + 5, y]], p.roof, edge()) + `<path d="${d}" stroke="#7a2a1a" stroke-width="1" opacity="0.35"/>`;
    }
    case 'water-tank':
      return rect(x - 2, y - 5, w + 4, 6, '#3a302c') + line(x + w - 30, y - 5, x + w - 30, y - 14, '#3a302c', 1.5) + line(x + w - 14, y - 5, x + w - 14, y - 14, '#3a302c', 1.5)
        + rect(x + w - 34, y - 32, 24, 18, '#8a6a4a', edge(0.8)) + siding(x + w - 34, y - 32, 24, 18, 'v', 3, '#000', 0.3) + poly([[x + w - 36, y - 32], [x + w - 22, y - 40], [x + w - 8, y - 32]], '#5a4a3a');
    case 'deco':
      return poly([[x + w / 2 - 22, y], [x + w / 2 - 22, y - 8], [x + w / 2 - 12, y - 8], [x + w / 2 - 12, y - 16], [x + w / 2 + 12, y - 16], [x + w / 2 + 12, y - 8], [x + w / 2 + 22, y - 8], [x + w / 2 + 22, y]], p.wall, edge())
        + rect(x - 2, y - 3, w + 4, 4, p.trim, edge(0.6)) + [0, 4, 8].map((d) => rect(x, y + 6 + d, 14, 1.6, p.accent)).join('');
    case 'flat': return rect(x - 1, y - 3, w + 2, 4, p.roof) + rect(x + w * 0.6, y - 10, w * 0.24, 8, '#a8a8a4', edge(0.6));
    default: return rect(x - 3, y - 6, w + 6, 6, p.roof, edge()) + rect(x - 1, y, w + 2, 2, p.trim); // parapet with cornice
  }
}

/** An apartment building: walk-up (≤ 4 floors), mid-rise (5–8) or tower (9+). */
export function apartment(fam, p, floors) {
  const a = fam.apartment;
  if (floors > 8) return tower(p, floors, { glass: false, balconies: a.balconies, podium: a.groundFloor === 'parking' });
  const walkup = floors <= 4;
  const fh = walkup ? 18 : 15;
  const w = walkup ? 112 : 104;
  const x = 240 - w / 2, top = G - floors * fh - 4;
  const wall = a.material === 'brick' ? BRICKS[Math.abs(hashString(p.wall)) % BRICKS.length] : p.wall;
  let s = rect(x, top, w, G - top, wall, edge());
  const m = MATERIAL[a.material];
  if (m) s += siding(x, top, w, G - top, ...m);
  const cols = walkup ? 5 : 6, gx = (w - 16) / cols;
  const shops = a.groundFloor === 'shops';
  s += windowGrid(x + 8 + gx / 2 - 5, top + 6, cols, floors - (shops ? 1 : 0) - (walkup ? 1 : 0), gx, fh, 10, fh - 7, p.trim);
  if (shops) {
    s += rect(x, G - fh - 2, w, fh + 2, p.accent) + rect(x + 6, G - fh + 4, 38, fh - 4, GLASS_COOL, edge(0.6)) + rect(x + w - 44, G - fh + 4, 38, fh - 4, GLASS_COOL, edge(0.6));
    s += poly([[x + 4, G - fh + 4], [x + 46, G - fh + 4], [x + 48, G - fh - 1], [x + 2, G - fh - 1]], p.trim) + door(x + w / 2 - 7, G, 14, fh - 2, INK, p.trim);
  } else if (walkup) {
    s += windowGrid(x + 8 + gx / 2 - 5, G - fh + 2, 2, 1, gx, fh, 10, fh - 7, p.trim) + windowGrid(x + 8 + gx * 3.5 - 5, G - fh + 2, 2, 1, gx, fh, 10, fh - 7, p.trim);
    s += door(x + w / 2 - 7, G, 14, fh - 2, p.accent, p.trim);
  } else {
    s += windowGrid(x + 8 + gx / 2 - 5, G - fh + 2, 2, 1, gx, fh, 10, fh - 7, p.trim) + door(x + w / 2 - 8, G, 16, fh - 2, p.accent, p.trim);
  }
  if (a.balconies && !a.exteriorStairs) {
    for (let f = 1; f < floors - (shops ? 1 : 0); f++) {
      const y = top + 6 + (f - 1) * fh + fh - 4;
      s += railing(x + 6, x + 6 + gx * 1.6, y, 4, p.trim, 3) + railing(x + w - 6 - gx * 1.6, x + w - 6, y, 4, p.trim, 3);
    }
  }
  if (a.exteriorStairs) { // lānai walkways on every upper floor and an open stair on the right
    for (let f = 1; f < floors; f++) s += rect(x - 2, G - f * fh - 1, w + 4, 2, p.trim) + railing(x - 2, x + w + 2, G - f * fh - 1, 6, p.trim, 5);
    for (let f = 0; f < floors - 1; f++) s += line(x + w + 2, G - f * fh, x + w + 14, G - (f + 1) * fh, p.trim, 2) + line(x + w + 14, G - (f + 1) * fh, x + w + 2, G - (f + 1) * fh, p.trim, 2);
  }
  if (a.fireEscapes) {
    for (const fx of [x + 8 + gx - 8, x + 8 + gx * 4 - 8]) {
      for (let f = 1; f < floors; f++) {
        const y = G - f * fh;
        s += rect(fx, y, gx + 6, 1.8, '#1f1f22') + railing(fx, fx + gx + 6, y, 5, '#1f1f22', 3);
        if (f < floors - 1) s += line(fx + 4, y, fx + gx, y - fh, '#1f1f22', 1.3);
      }
    }
  }
  return s + rooftop(a.rooftop, x, top, w, p);
}

/** A tower: concrete with window bands (apartments) or glass with white slab edges (condos); lānai balconies, podium. */
function tower(p, floors, { glass, balconies, podium, tint = GLASS_COOL, crown = 'flat' }) {
  const w = glass ? { setback: 64, fin: 66, slant: 68 }[crown] || 72 : 78, x = 240 - w / 2;
  const fh = Math.min(9, 168 / floors), top = G - floors * fh - 6;
  let s = rect(x, top, w, G - top, glass ? tint : p.wall, edge());
  if (glass) s += rect(x + w * 0.62, top, w * 0.38, G - top, '#ffffff', 'opacity="0.18"');
  for (let f = 0; f < floors; f++) {
    const y = top + 6 + f * fh;
    if (glass) s += rect(x, y, w, 1.4, '#ffffff', 'opacity="0.85"');
    else s += rect(x + 4, y + fh * 0.25, w - 8, fh * 0.5, f % 3 === 1 ? GLASS : GLASS_COOL);
    if (balconies && f > (podium ? 3 : 0)) s += rect(x - 4, y + fh - 1.6, 10, 1.6, '#ffffff') + rect(x + w - 6, y + fh - 1.6, 10, 1.6, '#ffffff');
  }
  if (podium) s += rect(x - 14, G - 30, w + 28, 30, '#c8c4bc', edge()) + [0, 1].map((r) => rect(x - 10, G - 26 + r * 12, w + 20, 6, '#5a5a58')).join('');
  else s += rect(x + w / 2 - 10, G - 16, 20, 16, GLASS, edge(0.8));
  s += rect(x - 2, top - 3, w + 4, 4, glass ? '#ffffff' : p.roof);
  switch (glass ? crown : 'flat') {
    case 'slant': return s + poly([[x - 2, top - 3], [x + w + 2, top - 22], [x + w + 2, top - 3]], tint, edge());
    case 'setback': return s + rect(x + 10, top - 18, w - 20, 15, tint, edge()) + rect(x + 22, top - 30, w - 44, 12, tint, edge()) + line(240, top - 30, 240, top - 46, '#8a8a8a', 1.5);
    case 'curve': return s + `<path d="M${x - 2} ${top - 3}Q${x + w / 2} ${top - 26} ${x + w + 2} ${top - 3}Z" fill="#ffffff" ${edge()}/>`;
    case 'fin': return s + rect(x + w - 10, top - 30, 10, G - top + 30 - 20, '#f2efe8', edge()) + rect(x + 6, top - 9, w * 0.4, 6, '#a8a8a4', edge(0.6));
    default: return s + rect(x + 10, top - 10, w * 0.35, 7, '#a8a8a4', edge(0.6)) + (glass ? line(x + w * 0.7, top - 3, x + w * 0.7, top - 18, '#8a8a8a', 1.5) : '');
  }
}

/** Three attached townhomes, each with its own roof peak, door and (for garage families) a garage. */
function townhomes(fam, p, floors, palettes) {
  const fh = 20, h = floors * fh, top = G - h;
  let s = '';
  for (let i = 0; i < 3; i++) {
    const x = 174 + i * 44, w = 44;
    const wall = i === 1 ? p.wall : palettes[(palettes.indexOf(p) + 1) % palettes.length].wall;
    s += rect(x, top, w, h, wall, edge());
    const m = MATERIAL[fam.apartment.material];
    if (m) s += siding(x, top, w, h, ...m);
    s += fam.house.roof === 'hip' ? hip(x, top, w, 12, p.roof, 2, 14) : gable(x, top, w, 16, p.roof, 2) + ribs(x - 2, x + w + 2, top, gableTop(x, top, w, 16, 2));
    for (let f = 0; f < floors - 1; f++) s += win(x + 7, top + 5 + f * fh, 12, 11, p.trim) + win(x + 25, top + 5 + f * fh, 12, 11, p.trim);
    s += fam.house.garage ? rect(x + 18, G - 15, 22, 15, '#f2efe8', edge(0.6)) + siding(x + 18, G - 15, 22, 15, 'h', 3.5, INK, 0.3) + door(x + 4, G, 10, 16, p.accent, p.trim)
      : door(x + 6, G, 11, 16, p.accent, p.trim) + win(x + 25, G - 15, 12, 10, p.trim);
  }
  return s;
}

/** A condo: glass tower in big cities, attached townhomes, or a low-rise with a balcony on every unit. */
export function condo(fam, p, floors, settlement, palettes) {
  const c = fam.condo;
  if (settlement === 'big-city' || floors > 8) return tower(p, floors, { glass: true, balconies: true, podium: false, tint: c.glassTint, crown: c.crown });
  if (c.townhomes || (floors <= 2 && !c.resort)) return townhomes(fam, p, floors, palettes);
  const fh = 17, w = 120, x = 180, top = G - floors * fh - 4;
  let s = rect(x, top, w, G - top, p.wall, edge());
  for (let f = 0; f < floors; f++) {
    const y = top + 4 + f * fh;
    for (let u = 0; u < 4; u++) s += rect(x + 8 + u * 28, y + 3, 18, fh - 4, GLASS_COOL, `stroke="${p.trim}" stroke-width="1.2"`);
    if (f < floors - 1 || c.resort) s += rect(x - 3, y + fh - 3, w + 6, 2, p.trim) + railing(x - 3, x + w + 3, y + fh - 3, 5, p.trim, 4);
  }
  s += c.resort ? rect(x + 30, G - 3, 60, 6, '#5ab8d0', edge(0.6)) : door(x + w / 2 - 8, G, 16, fh - 3, p.accent, p.trim);
  const roofKind = fam.house.roof === 'tile' ? 'tile' : fam.house.roof === 'hip' ? 'hip' : fam.apartment.rooftop === 'gable' ? 'gable' : 'parapet';
  return s + rooftop(roofKind, x, top, w, p);
}

/** The empty lot: survey stakes, a faint blueprint outline of the family's house shape and a "Your house here" sign. */
export function buildLot(fam) {
  const flat = fam.house.roof === 'flat' || fam.house.roof === 'shed';
  const ink = 'fill="none" stroke="#4f86c8" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.85"';
  let s = poly([[176, G + 4], [304, G + 4], [296, G - 4], [184, G - 4]], '#c8a878', 'opacity="0.45"');
  s += `<rect x="184" y="${G - 40}" width="112" height="38" ${ink}/>`;
  s += flat ? `<path d="M180 ${G - 40}H300" ${ink}/>` : `<path d="M178 ${G - 40}L240 ${G - 70}L302 ${G - 40}" ${ink}/>`;
  s += `<path d="M200 ${G - 2}V${G - 24}H218V${G - 2}M258 ${G - 30}h18v12h-18z" ${ink}/>`;
  s += [[184, G], [296, G], [178, G + 8], [302, G + 8]].map(([x, y]) =>
    `<path d="M${x} ${y + 2}V${y - 12}" stroke="#a87a4a" stroke-width="2.5"/><path d="M${x} ${y - 12}h7v4h-7" fill="#f07a30"/>`).join('');
  s += `<path d="M232 ${G}V${G - 20}M262 ${G}V${G - 20}" stroke="#6a5240" stroke-width="3"/>`
    + `<rect x="220" y="${G - 46}" width="54" height="28" rx="3" fill="#fffaf0" stroke="#6a5240" stroke-width="1.5"/>`
    + `<text x="247" y="${G - 35}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="8" font-weight="700" fill="#3a3a3a" text-anchor="middle">Your house</text>`
    + `<text x="247" y="${G - 25}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="8" font-weight="700" fill="#3a3a3a" text-anchor="middle">here</text>`;
  return s;
}

/** Pick a deterministic number of floors from a [min, max] band. */
const floorsFrom = (band, rng) => rng.int(band[0], band[1]);

/**
 * The home SVG fragment for one available cell: `drawHome({ location, homeTypeId, seed })`. Deterministic: the palette
 * comes from a hash of the place id, the floor count from a seeded rng per place. `shared` uses the next palette so it differs from `house`.
 */
export function drawHome({ location, homeTypeId, seed = 0 }) {
  const fam = styleFamily(location.styleFamily, location.styleVariant ?? null);
  const rng = createRng(seedFor('home2d', location.id, seed));
  const base = (hashString(location.id) + seed) % fam.palettes.length; // neighbors in one family get different palettes
  const pick = (i) => fam.palettes[i % fam.palettes.length];
  const settlement = location.settlement;
  switch (homeTypeId) {
    case 'apartment': {
      const band = fam.apartment.floorsBySettlement[settlement] || [2, 3];
      return apartment(fam, pick(base + 2), floorsFrom(band, rng));
    }
    case 'condo': {
      const band = fam.condo.floorsBySettlement[settlement] || [2, 3];
      const n = floorsFrom(band, rng);
      return condo(fam, pick(base + 3), n, settlement, fam.palettes);
    }
    case 'build': return buildLot(fam);
    case 'shared': {
      const p = pick(base + 1);
      const h = drawHouse(fam.key, p, { variant: fam.variant, palettes: fam.palettes, index: (base + 1) % fam.palettes.length, alt: false });
      return h.svg + people(h.porch[0] + 4, h.porch[1], 3);
    }
    default: {
      const h = drawHouse(fam.key, pick(base), { variant: fam.variant, palettes: fam.palettes, index: base, alt: true });
      return h.svg;
    }
  }
}
