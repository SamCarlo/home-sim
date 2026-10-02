// Regional style families in 3D (08 §4, task 34). Browser only. `styleKit(key)` resolves a family's palette and `look`
// (data/styleFamilies.js) into materials; the add*/make* helpers build roofs, walls, windows and doors from it.
// Every `add*` helper writes parts into a propKit `merged((add) => …)` build, so a whole house costs one mesh per
// material; the matching `make*` wraps one helper in its own merged group. Front is +Z, base on y = 0, 1 unit = 1 ft.
// Porches, bases, rails, fire escapes and rooftop features live in styleParts.js (re-exported here).
import * as THREE from 'three';
import { styleFamily } from '../data/styleFamilies.js';
import { mat, ownMat, texturedMat } from './materials.js';
import { merged } from './propKit.js';
import { frame, texBox } from './styleParts.js';

export * from './styleParts.js';

/** Feet per texture repeat, per canvas texture kind. */
const TEX_TILE = { siding: 5, batten: 8, log: 5, stucco: 8, ashlar: 8, brick: 3.5, shingle: 6, metal: 6, tile: 6 };
const DS = THREE.DoubleSide;

/**
 * Resolve a family into a kit: `{key, family, look, palette, trees, m: {wall, roof, trim, accent, glow, dark, iron, wood,
 * concrete, glass, metal, stone, brick, lava, sandstone}, tile(kind), setNight(f)}`. `palette` indexes the family palettes.
 */
export function styleKit(key, { variant = null, palette = 0 } = {}) {
  const family = styleFamily(key, variant);
  const look = family.look;
  const p = family.palettes[((palette % family.palettes.length) + family.palettes.length) % family.palettes.length];
  const glow = ownMat('#2e4256', { emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 0, roughness: 0.35 });
  const tex = (kind, color, opts = {}) => (kind ? texturedMat(kind, color, opts) : mat(color, opts));
  const m = {
    wall: tex(look.wallTex, p.wall, { side: DS }),
    roof: tex(look.roofTex, p.roof, { side: DS, rough: look.roofTex === 'metal' ? 0.6 : 0.9 }),
    trim: mat(p.trim), accent: mat(p.accent), glow,
    dark: mat('#2a2c30'), iron: mat('#1f2124', { rough: 0.5, metal: 0.4 }), wood: mat('#a0744a'),
    concrete: mat('#c9c5bc'), glass: mat('#a6d8d8', { opacity: 0.45, rough: 0.2 }), metal: mat('#b9c2c8', { rough: 0.5, metal: 0.3 }),
    stone: texturedMat('ashlar', '#8a8478'), brick: texturedMat('brick', '#9a4a38'),
    lava: texturedMat('ashlar', '#3e3a36'), sandstone: texturedMat('ashlar', '#a0543e'),
  };
  return {
    key, family, look, palette: p, m, trees: look.trees,
    tile: (kind) => TEX_TILE[kind] ?? 6,
    /** Window glow 0..1 (pass sc.nightFactor). */
    setNight(f) { glow.emissiveIntensity = 1.4 * f; },
  };
}

/** Non-indexed geometry from convex polygons ([[x,y,z], …] each), with per-face planar UVs every `tile` ft. */
export function polyGeo(polys, tile = 6) {
  const pos = [], uvs = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), n = new THREE.Vector3();
  for (const poly of polys) {
    a.fromArray(poly[0]); b.fromArray(poly[1]); c.fromArray(poly[2]);
    u.subVectors(b, a).normalize();
    n.crossVectors(u, c.clone().sub(a)).normalize();
    v.crossVectors(n, u);
    const uvOf = (p) => { const d = new THREE.Vector3().fromArray(p).sub(a); return [d.dot(u) / tile, d.dot(v) / tile]; };
    for (let i = 1; i < poly.length - 1; i++) {
      for (const p of [poly[0], poly[i], poly[i + 1]]) { pos.push(...p); uvs.push(...uvOf(p)); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/** Textured wall block w × h × d at (x, y, z) (base on y). */
export function addWalls(add, kit, w, h, d, { x = 0, y = 0, z = 0, material = kit.m.wall } = {}) {
  add(texBox(w, h, d, kit.tile(kit.look.wallTex)), material, { x, y, z });
}

/** Roof shape for a kit: look.roof, with the A-frame and barrel as gable/hip variants. */
const roofShape = (kit, o) => o.shape ?? kit.look.roof;

/**
 * Add a roof over a w × d wall box whose top is at y (default 0). Options: shape (hip | gable | shed | flat | barrel |
 * aframe | saltbox), pitch (rise/run), eave (ft), ridge ('x' | 'z'), gables (fill the gable ends with wall material).
 * Returns the ridge height above y.
 */
export function addRoof(add, kit, w, d, { x = 0, y = 0, z = 0, shape, pitch, eave, ridge, gables = true, parapet = 2 } = {}) {
  const look = kit.look;
  shape = roofShape(kit, { shape });
  pitch = pitch ?? look.pitch;
  eave = eave ?? look.eave;
  ridge = ridge ?? look.ridge;
  if (shape === 'hip' || shape === 'barrel') ridge = w >= d ? 'x' : 'z';
  const at = frame(add, { x, y, z, yaw: ridge === 'z' ? Math.PI / 2 : 0 });
  const [W, D] = ridge === 'z' ? [d, w] : [w, d]; // local: ridge along X
  const tile = kit.tile(look.roofTex);
  const { roof, trim } = kit.m;
  if (shape === 'flat' || pitch === 0) {
    at(texBox(W + 0.4, 0.6, D + 0.4, tile), roof, {});
    if (parapet) {
      for (const s of [-1, 1]) {
        at(texBox(W + 0.6, parapet, 0.6, kit.tile(look.wallTex)), kit.m.wall, { z: s * (D / 2), y: 0 });
        at(texBox(0.6, parapet, D, kit.tile(look.wallTex)), kit.m.wall, { x: s * (W / 2), y: 0 });
      }
      at('box', trim, { y: parapet, sx: W + 1, sy: 0.35, sz: 0.9, z: D / 2 });
    }
    return parapet;
  }
  const a = W / 2 + eave, hd = D / 2;
  if (shape === 'shed') {
    const hb = pitch * D, y0 = -pitch * eave, yb = hb + pitch * eave;
    at(polyGeo([[[-a, y0, hd + eave], [a, y0, hd + eave], [a, yb, -hd - eave], [-a, yb, -hd - eave]]], tile), roof);
    if (gables) {
      const fills = [[[W / 2, 0, hd], [W / 2, 0, -hd], [W / 2, hb, -hd]], [[-W / 2, 0, -hd], [-W / 2, 0, hd], [-W / 2, hb, -hd]],
        [[W / 2, 0, -hd], [-W / 2, 0, -hd], [-W / 2, hb, -hd], [W / 2, hb, -hd]]];
      at(polyGeo(fills, kit.tile(look.wallTex)), kit.m.wall);
    }
    at('box', trim, { y: y0 - 0.5, z: hd + eave, sx: 2 * a, sy: 0.5, sz: 0.3 });
    return hb;
  }
  // Gable family (gable, aframe, saltbox) and hip (barrel = hip with tile): ridge at zr, height hr.
  const zr = shape === 'saltbox' ? D * 0.2 : 0;
  const hr = pitch * (hd - zr);
  const pf = hr / (hd - zr), pb = hr / (hd + zr); // front and back slopes
  const yf = -pf * eave, yk = -pb * eave, zf = hd + eave, zk = -hd - eave;
  const hip = shape === 'hip' || shape === 'barrel';
  const r = hip ? Math.max(0, W / 2 - hd) : a; // ridge half-length
  const faces = [
    [[-a, yf, zf], [a, yf, zf], [r, hr, zr], [-r, hr, zr]],
    [[a, yk, zk], [-a, yk, zk], [-r, hr, zr], [r, hr, zr]],
  ];
  if (hip) {
    faces.push([[a, yf, zf], [a, yk, zk], [r, hr, zr]], [[-a, yk, zk], [-a, yf, zf], [-r, hr, zr]]);
  }
  at(polyGeo(faces, tile), roof);
  if (!hip && gables) {
    at(polyGeo([[[W / 2, 0, hd], [W / 2, 0, -hd], [W / 2, hr, zr]], [[-W / 2, 0, -hd], [-W / 2, 0, hd], [-W / 2, hr, zr]]],
      kit.tile(look.wallTex)), kit.m.wall);
  }
  // Fascia along the eaves (and the hip ends), ridge cap.
  at('box', trim, { y: yf - 0.45, z: zf, sx: 2 * a + 0.3, sy: 0.45, sz: 0.3 });
  at('box', trim, { y: yk - 0.45, z: zk, sx: 2 * a + 0.3, sy: 0.45, sz: 0.3 });
  if (hip) for (const s of [-1, 1]) at('box', trim, { x: s * a, y: yf - 0.45, sx: 0.3, sy: 0.45, sz: 2 * (hd + eave) });
  if (r > 0) at('cbox', look.roofTex === 'tile' ? roof : trim, { y: hr + 0.1, z: zr, sx: 2 * r + 0.4, sy: 0.35, sz: 0.6 });
  return hr;
}

/** A roof as its own merged group (see addRoof). */
export function makeRoof(kit, w, d, opts = {}) {
  return merged((add) => addRoof(add, kit, w, d, opts), { name: 'roof' });
}

let archGeo = null;
/** Half-disc (radius 1, flat side on y = 0) facing +Z, 0.12 thick. */
function arch() {
  if (!archGeo) {
    const s = new THREE.Shape();
    s.absarc(0, 0, 1, 0, Math.PI, false);
    s.lineTo(1, 0);
    archGeo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false, curveSegments: 6 });
  }
  return archGeo;
}

/**
 * Add one window on a wall plane facing +Z at (x, y = sill height, z). kind: jalousie | sash | grid | storefront;
 * extra: shutters | arched | tall (defaults from the kit's look). Glass uses the kit's glow material.
 */
export function addWindow(add, kit, { x = 0, y = 3, z = 0, w = 3, h = 4.5, kind, extra } = {}) {
  kind = kind ?? kit.look.window;
  extra = extra === undefined ? kit.look.windowExtra : extra;
  const { trim, glow, accent, metal, dark } = kit.m;
  if (kind === 'storefront') {
    add('box', glow, { x, y, z: z + 0.04, sx: w, sy: h, sz: 0.1 });
    for (const dx of [-w / 2, 0, w / 2]) add('box', dark, { x: x + dx, y, z: z + 0.1, sx: 0.25, sy: h, sz: 0.2 });
    for (const dy of [0, h]) add('box', dark, { x, y: y + dy - 0.12, z: z + 0.1, sx: w + 0.25, sy: 0.25, sz: 0.2 });
    return;
  }
  if (extra === 'tall') h *= 1.35;
  add('box', glow, { x, y, z: z + 0.04, sx: w, sy: h, sz: 0.1 });
  const f = 0.3;
  for (const s of [-1, 1]) add('box', trim, { x: x + s * (w / 2 + f / 2), y: y - f, z: z + 0.1, sx: f, sy: h + 2 * f, sz: 0.2 });
  add('box', trim, { x, y: y + h, z: z + 0.1, sx: w + 2 * f, sy: f, sz: 0.2 });
  add('box', trim, { x, y: y - 0.3, z: z + 0.25, sx: w + 0.8, sy: 0.3, sz: 0.5 }); // sill
  if (kind === 'jalousie') {
    const n = Math.round(h / 0.55);
    for (let i = 0; i < n; i++) add('cbox', metal, { x, y: y + (i + 0.5) * (h / n), z: z + 0.2, pitch: -0.5, sx: w - 0.1, sy: 0.06, sz: 0.45 });
  } else if (kind === 'sash') {
    add('box', trim, { x, y: y + h / 2 - 0.1, z: z + 0.12, sx: w, sy: 0.22, sz: 0.15 });
    add('box', trim, { x, y, z: z + 0.12, sx: 0.12, sy: h, sz: 0.12 });
  } else if (kind === 'grid') {
    for (const fy of [1 / 3, 2 / 3]) add('box', trim, { x, y: y + h * fy, z: z + 0.12, sx: w, sy: 0.12, sz: 0.12 });
    add('box', trim, { x, y, z: z + 0.12, sx: 0.12, sy: h, sz: 0.12 });
  }
  if (extra === 'shutters') for (const s of [-1, 1]) add('box', accent, { x: x + s * (w * 0.75 + f), y, z: z + 0.08, sx: w * 0.45, sy: h, sz: 0.12 });
  if (extra === 'arched') {
    add(arch(), glow, { x, y: y + h, z: z + 0.02, sx: w / 2, sy: w / 2.4 });
    add(arch(), trim, { x, y: y + h + 0.02, z: z + 0.08, sx: w / 2 + f, sy: w / 2.4 + f, sz: 0.5 });
    add(arch(), glow, { x, y: y + h + 0.02, z: z + 0.14, sx: w / 2, sy: w / 2.4, sz: 0.5 });
  }
  if (extra === 'tall') add('box', trim, { x, y: y + h + f, z: z + 0.2, sx: w + 1, sy: 0.5, sz: 0.45 }); // hood
}

/** Add `count` windows evenly along a wall `length` ft long, centered at x (see addWindow); `skip` = slot indices left empty. */
export function addWindowRow(add, kit, { count, length, x = 0, skip = [], ...o }) {
  const step = length / count;
  for (let i = 0; i < count; i++) if (!skip.includes(i)) addWindow(add, kit, { ...o, x: x - length / 2 + step * (i + 0.5) });
}

/** A window row as its own merged group (see addWindowRow). */
export function makeWindowRow(kit, opts) {
  return merged((add) => addWindowRow(add, kit, opts), { name: 'windows' });
}

/** Add a front door (accent panel, trim frame, small step) on a +Z wall at (x, y = threshold, z). */
export function addDoor(add, kit, { x = 0, y = 0, z = 0, w = 3, h = 7, glass = false } = {}) {
  const { trim, accent, glow } = kit.m;
  add('box', glass ? glow : accent, { x, y, z: z + 0.05, sx: w, sy: h, sz: 0.12 });
  for (const s of [-1, 1]) add('box', trim, { x: x + s * (w / 2 + 0.2), y, z: z + 0.1, sx: 0.4, sy: h + 0.4, sz: 0.2 });
  add('box', trim, { x, y: y + h, z: z + 0.1, sx: w + 0.8, sy: 0.4, sz: 0.2 });
  if (!glass) add('box', glow, { x, y: y + h - 1.6, z: z + 0.12, sx: w * 0.6, sy: 1, sz: 0.06 });
}

/** A panel garage door (w wide) on a +Z wall at (x, z). */
export function addGarageDoor(add, kit, { x = 0, y = 0, z = 0, w = 16, h = 7.5 } = {}) {
  const { trim } = kit.m;
  add('box', trim, { x, y, z: z + 0.05, sx: w, sy: h, sz: 0.12 });
  for (let i = 1; i < 4; i++) add('box', kit.m.dark, { x, y: y + (h * i) / 4, z: z + 0.12, sx: w - 0.4, sy: 0.08, sz: 0.06 });
  add('box', trim, { x, y: y + h, z: z + 0.1, sx: w + 0.8, sy: 0.5, sz: 0.25 });
}
