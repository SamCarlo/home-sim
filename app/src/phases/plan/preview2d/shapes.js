// Small SVG drawing primitives for the preview homes (buildings.js, houses.js). Pure: each returns a fragment string.
// Coordinates are in the 480 × 270 preview viewBox; numbers are rounded to one decimal so output stays short and stable.

export const n1 = (v) => Math.round(v * 10) / 10;
export const INK = '#4a3c34';
export const GLASS = '#f6e3a8';
export const GLASS_COOL = '#bcd8e6';
export const GROUND = 238; // where the home and the foreground props stand

const extra = (more) => (more ? ` ${more}` : '');

/** Filled rectangle. */
export const rect = (x, y, w, h, fill, more = '') =>
  `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" fill="${fill}"${extra(more)}/>`;

/** Closed polygon from [[x, y], …]. */
export const poly = (pts, fill, more = '') =>
  `<path d="M${pts.map(([x, y]) => `${n1(x)} ${n1(y)}`).join('L')}Z" fill="${fill}"${extra(more)}/>`;

/** Stroked line. */
export const line = (x1, y1, x2, y2, stroke, w = 1, more = '') =>
  `<path d="M${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}" stroke="${stroke}" stroke-width="${w}"${extra(more)}/>`;

/** Outline stroke used on walls and roofs. */
export const edge = (w = 1) => `stroke="${INK}" stroke-width="${w}"`;

/** Gable roof over [x, x + w] at eave height y, with overhang o. */
export const gable = (x, y, w, rise, fill, o = 6) => poly([[x - o, y], [x + w / 2, y - rise], [x + w + o, y]], fill, edge());

/** Hip roof (front view: a trapezoid) over [x, x + w]. */
export const hip = (x, y, w, rise, fill, o = 6, inset = rise * 1.2) =>
  poly([[x - o, y], [x + inset, y - rise], [x + w - inset, y - rise], [x + w + o, y]], fill, edge());

/** Vertical metal-roof ribs between x0 and x1, from the eave y up to topAt(x). */
export function ribs(x0, x1, y, topAt, color = '#000', step = 6) {
  let d = '';
  for (let x = x0 + step / 2; x < x1; x += step) {
    const t = topAt(x);
    if (y - t > 2) d += `M${n1(x)} ${n1(y - 1)}V${n1(t + 1)}`;
  }
  return d ? `<path d="${d}" stroke="${color}" stroke-width="0.8" opacity="0.28"/>` : '';
}

/** Top edge of a gable for ribs(). */
export const gableTop = (x, y, w, rise, o = 6) => (px) => {
  const mid = x + w / 2;
  const half = w / 2 + o;
  return y - rise * Math.max(0, 1 - Math.abs(px - mid) / half);
};

/** Siding texture over a wall: 'h' lap/clapboard/log lines, 'v' board-and-batten. */
export function siding(x, y, w, h, dir = 'h', step = 4, color = '#000', opacity = 0.16) {
  let d = '';
  if (dir === 'h') for (let yy = y + step; yy < y + h; yy += step) d += `M${n1(x)} ${n1(yy)}H${n1(x + w)}`;
  else for (let xx = x + step; xx < x + w; xx += step) d += `M${n1(xx)} ${n1(y)}V${n1(y + h)}`;
  return d ? `<path d="${d}" stroke="${color}" stroke-width="0.8" opacity="${opacity}"/>` : '';
}

/** A window with a trim frame and a cross mullion. kind: 'plain' | 'jalousie' | 'tall' | 'picture' | 'arched' | 'round'. */
export function win(x, y, w, h, trim = '#ffffff', kind = 'plain', glass = GLASS) {
  if (kind === 'round') {
    const r = w / 2;
    return `<circle cx="${n1(x + r)}" cy="${n1(y + r)}" r="${n1(r)}" fill="${glass}" stroke="${trim}" stroke-width="2"/>`;
  }
  if (kind === 'arched') {
    const r = w / 2;
    return `<path d="M${n1(x)} ${n1(y + h)}V${n1(y + r)}a${n1(r)} ${n1(r)} 0 0 1 ${n1(w)} 0V${n1(y + h)}Z" fill="${glass}" stroke="${trim}" stroke-width="1.6"/>`
      + line(x + r, y + 1, x + r, y + h, trim, 1);
  }
  let s = rect(x, y, w, h, glass, `stroke="${trim}" stroke-width="1.6"`);
  if (kind === 'jalousie') {
    let d = '';
    for (let yy = y + 2.5; yy < y + h - 0.5; yy += 2.5) d += `M${n1(x + 1)} ${n1(yy)}H${n1(x + w - 1)}`;
    s += `<path d="${d}" stroke="${INK}" stroke-width="0.6" opacity="0.5"/>`;
  } else if (kind === 'picture') {
    s += line(x + w / 3, y, x + w / 3, y + h, trim, 1) + line(x + (2 * w) / 3, y, x + (2 * w) / 3, y + h, trim, 1);
  } else {
    s += line(x + w / 2, y, x + w / 2, y + h, trim, 1) + line(x, y + h / 2, x + w, y + h / 2, trim, 1);
  }
  return s;
}

/** Shutters on both sides of a window. */
export const shutters = (x, y, w, h, color) => rect(x - 4, y, 3.5, h, color) + rect(x + w + 0.5, y, 3.5, h, color);

/** A door with a knob, bottom at y. */
export const door = (x, y, w, h, color, trim = '#ffffff') =>
  rect(x, y - h, w, h, color, `stroke="${trim}" stroke-width="1.2"`) + `<circle cx="${n1(x + w - 3)}" cy="${n1(y - h / 2)}" r="1" fill="#e8d080"/>`;

/** Porch railing from x0 to x1: a top rail at y - h and balusters down to y. */
export function railing(x0, x1, y, h, color = '#ffffff', step = 4) {
  let d = `M${n1(x0)} ${n1(y - h)}H${n1(x1)}`;
  for (let x = x0; x <= x1 + 0.1; x += step) d += `M${n1(x)} ${n1(y)}V${n1(y - h)}`;
  return `<path d="${d}" stroke="${color}" stroke-width="1.2"/>`;
}

/** Posts (porch columns) evenly spaced from x0 to x1, from y up to top. */
export function posts(x0, x1, y, top, n, color = '#ffffff', w = 2.5) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? x0 : x0 + ((x1 - x0) * i) / (n - 1);
    s += rect(x - w / 2, top, w, y - top, color);
  }
  return s;
}

/** Steps: n treads rising from (x, y) to the left/right edge of a porch floor at y - h. */
export function steps(x, y, w, h, n = 3, color = '#c8bca8') {
  let s = '';
  const sh = h / n;
  for (let i = 0; i < n; i++) s += rect(x + i * 1.5, y - sh * (i + 1), w - i * 3, sh, color, 'stroke="#8a7a6a" stroke-width="0.5"');
  return s;
}

/** A grid of windows: cols × rows starting at (x, y) with gaps gx, gy. */
export function windowGrid(x, y, cols, rows, gx, gy, w, h, trim, kind = 'plain', glass = GLASS) {
  let s = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += win(x + c * gx, y + r * gy, w, h, trim, kind, glass);
  return s;
}

/** Stone texture: small rounded stones over a rectangle (chimneys, lava-rock walls). Deterministic, no rng. */
export function stones(x, y, w, h, fill, dark, r = 2.4) {
  let s = rect(x, y, w, h, fill);
  let row = 0;
  for (let yy = y + r; yy < y + h; yy += r * 1.7, row++) {
    for (let xx = x + r + (row % 2) * r; xx < x + w - r / 2; xx += r * 2.2) {
      s += `<ellipse cx="${n1(xx)}" cy="${n1(yy)}" rx="${n1(r)}" ry="${n1(r * 0.75)}" fill="${dark}" opacity="0.55"/>`;
    }
  }
  return s;
}
