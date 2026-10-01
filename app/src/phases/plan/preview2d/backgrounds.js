// Background layers for the 2D preview pictures (04 §7): sky, landmark, terrain, vegetation and foreground props.
// Pure: every function returns an SVG fragment string for the 480 × 270 viewBox. Randomness comes in as a seeded rng
// (util/rng.js createRng), so the same place always gets the same scenery.
import { VIEW, paletteFor } from './palette.js';
import { landmark, landmarkDescription, LANDMARK_KEYS } from './landmarks.js';

export { landmark, landmarkDescription, LANDMARK_KEYS };

const { w: W, h: HT, horizon: H } = VIEW;
const n1 = (v) => Math.round(v * 10) / 10;

/** Sky gradient, low sun and clouds or haze for a biome. `uid` keeps gradient ids unique when many SVGs share a page. */
export function sky(biome, uid = 'p') {
  const p = paletteFor(biome);
  let s = `<defs><linearGradient id="${uid}-sky" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="${p.skyTop}"/><stop offset="1" stop-color="${p.skyBottom}"/></linearGradient>`
    + `<radialGradient id="${uid}-sun"><stop offset="0" stop-color="${p.sun}"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="${W}" height="${HT}" fill="url(#${uid}-sky)"/>`
    + `<circle cx="420" cy="58" r="46" fill="url(#${uid}-sun)" opacity="0.8"/><circle cx="420" cy="58" r="13" fill="${p.sun}"/>`;
  const clouds = [[70, 40, 1], [250, 28, 0.8], [360, 70, 0.7], [170, 62, 0.6]].slice(0, p.clouds);
  for (const [x, y, k] of clouds) {
    s += `<g fill="#ffffff" opacity="${0.55 + 0.1 * k}"><ellipse cx="${x}" cy="${y}" rx="${n1(30 * k)}" ry="${n1(9 * k)}"/>`
      + `<ellipse cx="${n1(x - 12 * k)}" cy="${n1(y - 5 * k)}" rx="${n1(14 * k)}" ry="${n1(9 * k)}"/>`
      + `<ellipse cx="${n1(x + 10 * k)}" cy="${n1(y - 7 * k)}" rx="${n1(16 * k)}" ry="${n1(10 * k)}"/></g>`;
  }
  if (p.haze) s += `<rect x="0" y="${H - 60}" width="${W}" height="60" fill="#ffd8a0" opacity="0.25"/>`;
  return s;
}

/** Ground bands from the horizon down: far, mid, near, with gently wavy edges. */
export function terrain(biome, rng) {
  const [far, mid, near] = paletteFor(biome).ground;
  const wave = (y, amp) => {
    let d = `M0 ${y}`;
    for (let x = 0; x < W; x += 80) d += `Q${x + 40} ${n1(y + rng.float(-amp, amp))} ${x + 80} ${y}`;
    return `${d}V${HT}H0Z`;
  };
  return `<path d="${wave(H - 1, 1.5)}" fill="${far}"/>`
    + `<path d="${wave(H + 22, 5)}" fill="${mid}"/>`
    + `<path d="${wave(H + 52, 3)}" fill="${near}"/>`;
}

/** One plant at (x, base y) with scale k. Kinds: palm banana ohia fern pine maple birch cactus agave grass oak citytree shrub. */
export function plant(kind, x, y, k, p) {
  const [dark, light] = p.leaf;
  const t = p.trunk;
  const X = (v) => n1(x + v * k);
  const Y = (v) => n1(y + v * k);
  switch (kind) {
    case 'palm': {
      let s = `<path d="M${X(0)} ${Y(0)}Q${X(4)} ${Y(-24)} ${X(8)} ${Y(-48)}" stroke="${t}" stroke-width="${n1(3.5 * k)}" fill="none"/>`;
      for (const [dx, dy] of [[-20, -38], [-14, -56], [6, -62], [26, -52], [30, -36]]) {
        s += `<path d="M${X(8)} ${Y(-48)}Q${X((8 + dx) / 1.6)} ${Y(-56)} ${X(dx)} ${Y(dy)}" stroke="${dark}" stroke-width="${n1(3 * k)}" fill="none" stroke-linecap="round"/>`;
      }
      return s;
    }
    case 'banana':
      return `<path d="M${X(0)} ${Y(0)}V${Y(-26)}" stroke="#7f9a50" stroke-width="${n1(4 * k)}"/>`
        + `<path d="M${X(0)} ${Y(-26)}c${n1(-6 * k)} ${n1(-4 * k)} ${n1(-18 * k)} ${n1(-2 * k)} ${n1(-22 * k)} ${n1(6 * k)}c${n1(8 * k)} 0 ${n1(16 * k)} ${n1(-2 * k)} ${n1(22 * k)} ${n1(-6 * k)}z`
        + `M${X(0)} ${Y(-26)}c${n1(6 * k)} ${n1(-4 * k)} ${n1(18 * k)} ${n1(-2 * k)} ${n1(22 * k)} ${n1(6 * k)}c${n1(-8 * k)} 0 ${n1(-16 * k)} ${n1(-2 * k)} ${n1(-22 * k)} ${n1(-6 * k)}z`
        + `M${X(0)} ${Y(-26)}c${n1(-4 * k)} ${n1(-8 * k)} ${n1(-2 * k)} ${n1(-18 * k)} ${n1(4 * k)} ${n1(-22 * k)}c0 ${n1(8 * k)} 0 ${n1(14 * k)} ${n1(-4 * k)} ${n1(22 * k)}z" fill="${light}"/>`;
    case 'ohia':
      return `<path d="M${X(0)} ${Y(0)}V${Y(-22)}" stroke="${t}" stroke-width="${n1(3 * k)}"/>`
        + `<ellipse cx="${X(0)}" cy="${Y(-30)}" rx="${n1(15 * k)}" ry="${n1(11 * k)}" fill="${dark}"/>`
        + [[-8, -34], [3, -38], [9, -28], [-4, -26], [-11, -28]].map(([dx, dy]) =>
          `<circle cx="${X(dx)}" cy="${Y(dy)}" r="${n1(2.2 * k)}" fill="#d8323a"/>`).join('');
    case 'fern':
      return [-50, -25, 0, 25, 50].map((a) =>
        `<path d="M${X(0)} ${Y(0)}q${n1(a * 0.2 * k)} ${n1(-10 * k)} ${n1(a * 0.32 * k)} ${n1(-14 * k)}" stroke="${light}" stroke-width="${n1(3 * k)}" fill="none" stroke-linecap="round"/>`).join('');
    case 'pine':
      return `<path d="M${X(0)} ${Y(0)}V${Y(-8)}" stroke="${t}" stroke-width="${n1(3 * k)}"/>`
        + `<path d="M${X(0)} ${Y(-56)}L${X(10)} ${Y(-34)}H${X(5)}L${X(14)} ${Y(-18)}H${X(7)}L${X(16)} ${Y(-6)}H${X(-16)}L${X(-7)} ${Y(-18)}H${X(-14)}L${X(-5)} ${Y(-34)}H${X(-10)}Z" fill="${dark}"/>`;
    case 'maple':
      return `<path d="M${X(0)} ${Y(0)}V${Y(-20)}" stroke="${t}" stroke-width="${n1(3.5 * k)}"/>`
        + `<circle cx="${X(-7)}" cy="${Y(-28)}" r="${n1(10 * k)}" fill="#c8602e"/><circle cx="${X(7)}" cy="${Y(-30)}" r="${n1(11 * k)}" fill="#e08a34"/>`
        + `<circle cx="${X(0)}" cy="${Y(-40)}" r="${n1(10 * k)}" fill="#d2702e"/>`;
    case 'birch':
      return `<path d="M${X(0)} ${Y(0)}V${Y(-34)}" stroke="#f2efe8" stroke-width="${n1(3 * k)}"/>`
        + `<path d="M${X(-1)} ${Y(-8)}h${n1(2 * k)}M${X(-1)} ${Y(-18)}h${n1(2 * k)}" stroke="#3a3a3a" stroke-width="${n1(1 * k)}"/>`
        + `<ellipse cx="${X(0)}" cy="${Y(-38)}" rx="${n1(8 * k)}" ry="${n1(14 * k)}" fill="#e8c444" opacity="0.92"/>`;
    case 'cactus':
      return `<path d="M${X(0)} ${Y(0)}V${Y(-34)}M${X(0)} ${Y(-14)}H${X(-8)}V${Y(-24)}M${X(0)} ${Y(-18)}H${X(8)}V${Y(-28)}" stroke="${dark}" stroke-width="${n1(5 * k)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'agave':
      return [-60, -30, -10, 10, 30, 60].map((a) =>
        `<path d="M${X(0)} ${Y(0)}L${X(a * 0.22)} ${Y(-14 + Math.abs(a) * 0.08)}" stroke="${light}" stroke-width="${n1(3 * k)}" stroke-linecap="round"/>`).join('');
    case 'grass':
      return [-6, -3, 0, 3, 6].map((dx) =>
        `<path d="M${X(dx)} ${Y(0)}q${n1(dx * 0.4 * k)} ${n1(-6 * k)} ${n1(dx * 0.8 * k)} ${n1(-12 * k)}" stroke="${light}" stroke-width="${n1(1.6 * k)}" fill="none"/>`).join('');
    case 'oak':
      return `<path d="M${X(0)} ${Y(0)}V${Y(-18)}" stroke="${t}" stroke-width="${n1(4 * k)}"/>`
        + `<ellipse cx="${X(0)}" cy="${Y(-28)}" rx="${n1(18 * k)}" ry="${n1(13 * k)}" fill="${dark}"/>`
        + `<ellipse cx="${X(-5)}" cy="${Y(-32)}" rx="${n1(9 * k)}" ry="${n1(6 * k)}" fill="${light}" opacity="0.5"/>`;
    case 'citytree':
      return `<path d="M${X(0)} ${Y(0)}V${Y(-16)}" stroke="${t}" stroke-width="${n1(3 * k)}"/>`
        + `<circle cx="${X(0)}" cy="${Y(-24)}" r="${n1(10 * k)}" fill="${dark}"/><circle cx="${X(-3)}" cy="${Y(-27)}" r="${n1(4 * k)}" fill="${light}" opacity="0.6"/>`;
    default: // shrub
      return `<ellipse cx="${X(0)}" cy="${Y(-5)}" rx="${n1(10 * k)}" ry="${n1(6 * k)}" fill="${dark}"/>`;
  }
}

/** Biome vegetation scattered on both sides, leaving the middle (where the home stands) clear. */
export function vegetation(biome, rng) {
  const p = paletteFor(biome);
  const items = [];
  for (const [x0, x1] of [[6, 160], [320, 474]]) {
    const count = rng.int(4, 6);
    for (let i = 0; i < count; i++) {
      const y = rng.float(H + 10, H + 50);
      items.push({ kind: rng.pick(p.veg), x: rng.float(x0, x1), y, k: 0.55 + ((y - H) / 50) * 0.5 });
    }
  }
  items.sort((a, b) => a.y - b.y);
  return items.map((it) => plant(it.kind, it.x, it.y, it.k, p)).join('');
}

/** A mailbox on a post at (x, ground y). */
export function mailbox(x, y) {
  return `<path d="M${x} ${y}V${y - 18}" stroke="#6a5240" stroke-width="3"/>`
    + `<path d="M${x - 8} ${y - 18}V${y - 25}a5 5 0 0 1 5 -5h6a5 5 0 0 1 5 5V${y - 18}Z" fill="#3f6fa0"/>`
    + `<path d="M${x + 6} ${y - 27}v-6h5v3h-5" fill="#d23c34" stroke="#d23c34" stroke-width="1"/>`;
}

/** A picket fence from x0 to x1 standing on y. */
export function fence(x0, x1, y, color = '#f4efe6') {
  let s = `<path d="M${x0} ${y - 9}H${x1}M${x0} ${y - 4}H${x1}" stroke="${color}" stroke-width="2"/>`;
  for (let x = x0; x <= x1; x += 8) s += `<path d="M${x} ${y}V${y - 13}l2 -3l2 3V${y}Z" fill="${color}"/>`;
  return s;
}

/** A small car facing right at (x, ground y). */
export function car(x, y, color = '#d2553c') {
  return `<path d="M${x} ${y - 6}V${y - 14}L${x + 10} ${y - 15}L${x + 16} ${y - 23}H${x + 34}L${x + 42} ${y - 15}L${x + 50} ${y - 13}V${y - 6}Z" fill="${color}"/>`
    + `<path d="M${x + 18} ${y - 21}H${x + 27}V${y - 15}H${x + 13}ZM${x + 29} ${y - 21}H${x + 33}L${x + 38} ${y - 15}H${x + 29}Z" fill="#cfe4f0"/>`
    + `<circle cx="${x + 12}" cy="${y - 5}" r="5" fill="#2a2a2e"/><circle cx="${x + 39}" cy="${y - 5}" r="5" fill="#2a2a2e"/>`
    + `<circle cx="${x + 12}" cy="${y - 5}" r="2" fill="#bdbdbd"/><circle cx="${x + 39}" cy="${y - 5}" r="2" fill="#bdbdbd"/>`;
}

/** A bus stop: a pole with a round sign and a small shelter, at (x, ground y). */
export function busStop(x, y) {
  return `<path d="M${x} ${y}V${y - 34}" stroke="#5a6470" stroke-width="2.5"/>`
    + `<circle cx="${x}" cy="${y - 38}" r="7" fill="#2f7ac0"/>`
    + `<text x="${x}" y="${y - 35}" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="#fff" text-anchor="middle">B</text>`
    + `<path d="M${x + 6} ${y}V${y - 24}H${x + 34}V${y}" fill="#cfe4f0" fill-opacity="0.5" stroke="#5a6470" stroke-width="1.5"/>`
    + `<path d="M${x + 4} ${y - 25}H${x + 36}" stroke="#5a6470" stroke-width="3"/><path d="M${x + 10} ${y - 8}H${x + 30}" stroke="#7a5a40" stroke-width="2.5"/>`;
}

/** A round green rain catchment tank at (x, ground y). */
export function catchmentTank(x, y) {
  return `<rect x="${x}" y="${y - 26}" width="32" height="26" rx="2" fill="#4f7a5a"/>`
    + `<ellipse cx="${x + 16}" cy="${y - 26}" rx="16" ry="4" fill="#3f6a4a"/>`
    + `<path d="M${x} ${y - 17}H${x + 32}M${x} ${y - 8}H${x + 32}" stroke="#3f6a4a" stroke-width="1"/>`
    + `<path d="M${x + 32} ${y - 22}h8v-12" stroke="#8a8a8a" stroke-width="2" fill="none"/>`;
}

/** `n` simple standing people starting at x, feet on y. */
export function people(x, y, n = 1, colors = ['#d2553c', '#3f7ac0', '#e0b030', '#5aa05a']) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const px = x + i * 12;
    const tall = i % 2 ? 0 : 3;
    s += `<circle cx="${px}" cy="${y - 22 - tall}" r="3.5" fill="#8a5a40"/>`
      + `<path d="M${px - 4} ${y - 9}V${y - 15 - tall}a4 4 0 0 1 8 0V${y - 9}Z" fill="${colors[i % colors.length]}"/>`
      + `<path d="M${px - 2} ${y - 9}V${y}M${px + 2} ${y - 9}V${y}" stroke="#3a3a44" stroke-width="2"/>`;
  }
  return s;
}
