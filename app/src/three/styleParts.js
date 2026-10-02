// Style-family building parts (08 §4, task 34): bases (posts, piers, foundations), porches / lānai / stoops, rails,
// fire escapes, chimneys and rooftop features. Browser only; re-exported by styles.js. Each `add*` writes into a propKit
// `merged((add) => …)` build in a local frame facing +Z (use `frame(add, {x, z, yaw})` to place it on another wall).
import * as THREE from 'three';
import { merged } from './propKit.js';
import { mat } from './materials.js';

/** Wrap `add` so parts land in a local frame at (x, y, z) turned by `yaw` (helpers build facing +Z, then get placed). */
export function frame(add, { x = 0, y = 0, z = 0, yaw = 0 } = {}) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return (g, material, o = {}) => {
    const lx = o.x ?? 0, lz = o.z ?? 0;
    add(g, material, { ...o, x: x + lx * c + lz * s, y: y + (o.y ?? 0), z: z - lx * s + lz * c, yaw: (o.yaw ?? 0) + yaw });
  };
}

/** A box (base on y = 0) whose UVs repeat every `tile` ft, for textured walls. */
export function texBox(w, h, d, tile = 6) {
  const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  const uv = g.attributes.uv;
  const size = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x −x +y −y +z −z
  for (let i = 0; i < uv.count; i++) {
    const [su, sv] = size[Math.floor(i / 4)];
    uv.setXY(i, (uv.getX(i) * su) / tile, (uv.getY(i) * sv) / tile);
  }
  return g;
}

/** Floor height each base kind lifts the house to (ft). */
export const BASE_HEIGHT = { posts: 3, piers: 2.5, lava: 1.4, sandstone: 2, raised: 5, slab: 0.6 };

/**
 * Add what a w × d house stands on: posts (plantation), piers (brick), lava-rock or sandstone foundations, or a slab.
 * Returns the floor height.
 */
export function addBase(add, kit, w, d, kind = kit.look.base) {
  const h = BASE_HEIGHT[kind] ?? 0.6;
  const { concrete, wood, brick, lava, sandstone } = kit.m;
  if (kind === 'posts' || kind === 'piers') {
    const nx = Math.max(2, Math.round(w / 8)), nz = Math.max(2, Math.round(d / 8));
    const part = kind === 'posts' ? wood : brick, size = kind === 'posts' ? 0.6 : 1.4;
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      if (i > 0 && i < nx && j > 0 && j < nz) continue; // perimeter only
      add('box', part, { x: -w / 2 + 0.6 + (i * (w - 1.2)) / nx, z: -d / 2 + 0.6 + (j * (d - 1.2)) / nz, sx: size, sz: size, sy: h });
    }
    add('box', wood, { y: h - 0.6, sx: w, sz: d, sy: 0.6 }); // floor framing
    add('box', kit.m.dark, { y: 0.1, sx: w - 1.5, sz: d - 1.5, sy: h - 0.7 }); // shadowed crawlspace
    return h;
  }
  const material = kind === 'lava' ? lava : kind === 'sandstone' ? sandstone : kind === 'raised' ? kit.m.wall : concrete;
  add(material.map ? texBox(w + 0.6, h, d + 0.6, 4) : 'box', material, material.map ? {} : { sx: w + 0.6, sz: d + 0.6, sy: h });
  return h;
}

/**
 * Add a rail from (x0, z0) to (x1, z1) whose foot is at y. kind: wood (white balusters), iron (thin black bars),
 * glass (panel + metal cap), pipe (two rails, deco).
 */
export function addRail(add, kit, x0, z0, x1, z1, y, { kind = kit.look.rails, h = 3 } = {}) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.1) return;
  const at = frame(add, { x: (x0 + x1) / 2, y, z: (z0 + z1) / 2, yaw: -Math.atan2(z1 - z0, x1 - x0) });
  const { trim, iron, glass, metal } = kit.m;
  if (kind === 'glass') {
    at('box', glass, { sx: len, sy: h - 0.3, sz: 0.1 });
    at('box', metal, { y: h - 0.3, sx: len, sy: 0.25, sz: 0.25 });
    return;
  }
  const top = kind === 'wood' ? trim : kind === 'pipe' ? metal : iron;
  at('box', top, { y: h - 0.25, sx: len, sy: 0.25, sz: kind === 'wood' ? 0.4 : 0.15 });
  if (kind === 'pipe') { at('box', top, { y: h / 2, sx: len, sy: 0.2, sz: 0.15 }); return; }
  const gap = kind === 'iron' ? 0.55 : 0.75;
  const n = Math.max(2, Math.round(len / gap));
  for (let i = 0; i <= n; i++) at('box', top, { x: -len / 2 + (i * len) / n, sx: kind === 'iron' ? 0.08 : 0.22, sz: kind === 'iron' ? 0.08 : 0.22, sy: h - 0.2 });
  if (kind === 'wood') at('box', top, { y: 0.2, sx: len, sy: 0.2, sz: 0.3 });
}

/** A run of posts (porch columns) from x0 to x1 at z, foot y, height h. craftsman = stone pier + tapered column. */
function addPosts(add, kit, x0, x1, z, y, h, { craftsman = false, step = 8 } = {}) {
  const n = Math.max(1, Math.round((x1 - x0) / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    if (craftsman) {
      add('box', kit.m.stone, { x, y, z, sx: 1.6, sz: 1.6, sy: 3 });
      add('cyl4:0.65', kit.m.trim, { x, y: y + 3, z, yaw: Math.PI / 4, sx: 0.85, sz: 0.85, sy: h - 3 });
    } else add('box', kit.m.trim, { x, y, z, sx: 0.55, sz: 0.55, sy: h });
  }
}

/** Steps from ground up to height `h`, centered at x, starting at the porch edge z and running toward +Z. */
export function addSteps(add, kit, { x = 0, z = 0, h, w = 4, material = kit.m.wood, run = 1 } = {}) {
  const n = Math.max(1, Math.round(h / 0.6));
  for (let i = 0; i < n; i++) add('box', material, { x, z: z + (n - i - 0.5) * run, sx: w, sz: run, sy: (h * (i + 1)) / n });
  return n * run;
}

/**
 * Add the front porch for a house whose front wall is the plane z = z0 (porch extends toward +Z by d), floor at floorY,
 * eave (porch roof) at roofY. kind: lanai | front | craftsman | wraparound | stoop | patio | none. w = porch width.
 * `side` (wraparound only) = the house depth, so the porch turns down the +X side.
 */
export function addPorch(add, kit, { kind = kit.look.porch, w, d = 8, z0, x = 0, floorY, roofY, doorX = x, side = 0, houseW = w } = {}) {
  const { wood, roof, trim, concrete, accent } = kit.m;
  const pitchDrop = Math.min(1.5, d * 0.15);
  const deck = (x0, x1, za, zb) => add('box', wood, { x: (x0 + x1) / 2, y: Math.max(0, floorY - 0.5), z: (za + zb) / 2, sx: x1 - x0, sz: zb - za, sy: Math.max(0.4, floorY > 0.5 ? 0.5 : floorY) });
  const support = (x0, x1, za, zb) => { if (floorY > 0.6) add('box', kit.m.dark, { x: (x0 + x1) / 2, z: (za + zb) / 2, sx: x1 - x0 - 0.4, sz: zb - za - 0.4, sy: floorY - 0.5 }); };
  const shedRoof = (x0, x1, za, zb) => {
    const len = Math.hypot(zb - za + 1, pitchDrop);
    add('cbox', roof, { x: (x0 + x1) / 2, y: roofY - pitchDrop / 2 + 0.2, z: (za + zb + 1) / 2, pitch: Math.atan2(pitchDrop, zb - za + 1), sx: x1 - x0 + 1.2, sy: 0.3, sz: len });
    add('box', trim, { x: (x0 + x1) / 2, y: roofY - pitchDrop - 0.5, z: zb + 0.6, sx: x1 - x0 + 1.2, sy: 0.5, sz: 0.3 });
  };
  if (kind === 'none') {
    if (floorY > 0.3) addSteps(add, kit, { x: doorX, z: z0, h: floorY, w: 4, material: concrete });
    return;
  }
  if (kind === 'stoop') { // a tall stoop with side walls and iron (or wood) rails up to the door
    const run = floorY > 2 ? 1.1 : 1;
    const len = addSteps(add, kit, { x: doorX, z: z0 + 2.5, h: floorY, w: 5, material: kit.look.wallTex === 'ashlar' ? kit.m.wall : concrete, run });
    add('box', kit.look.wallTex === 'ashlar' ? kit.m.wall : concrete, { x: doorX, z: z0 + 1.25, sx: 5, sz: 2.5, sy: floorY }); // landing
    for (const s of [-1, 1]) {
      const rx = doorX + s * 2.6;
      addRail(add, kit, rx, z0, rx, z0 + 2.5, floorY, { h: 3 });
      if (floorY > 1) {
        const at = frame(add, { x: rx, y: floorY / 2 + 1.5, z: z0 + 2.5 + len / 2, yaw: Math.PI / 2 });
        at('cbox', kit.m.iron, { roll: -Math.atan2(floorY, len), sx: Math.hypot(len, floorY), sy: 0.15, sz: 0.15 });
      }
    }
    return;
  }
  if (kind === 'patio') { // slab plus a striped accent awning over the door
    add('box', concrete, { x, z: z0 + d / 2, sx: w, sz: d, sy: 0.3 });
    add('cbox', accent, { x: doorX, y: 8.2 + floorY, z: z0 + 2, pitch: 0.35, sx: 7, sy: 0.25, sz: 4.2 });
    for (const s of [-1, 1]) add('box', kit.m.metal, { x: doorX + s * 3.3, z: z0 + 3.8, sx: 0.2, sz: 0.2, sy: 7.6 + floorY });
    return;
  }
  const x0 = x - w / 2, x1 = x + w / 2, zb = z0 + d;
  support(x0, x1, z0, zb);
  deck(x0, x1, z0, zb);
  const postH = roofY - floorY - pitchDrop;
  addPosts(add, kit, x0 + 0.4, x1 - 0.4, zb - 0.4, floorY, postH, { craftsman: kind === 'craftsman', step: kind === 'lanai' ? 7 : 8 });
  shedRoof(x0, x1, z0, zb);
  if (floorY > 0.8) {
    addRail(add, kit, x0 + 0.4, zb - 0.4, doorX - 2.2, zb - 0.4, floorY);
    addRail(add, kit, doorX + 2.2, zb - 0.4, x1 - 0.4, zb - 0.4, floorY);
    addSteps(add, kit, { x: doorX, z: zb, h: floorY, w: 4 });
  }
  if (kind === 'wraparound' && side) { // turn the corner down the +X side
    const sx0 = houseW / 2, sx1 = houseW / 2 + d, za = z0 - side + 2;
    support(sx0, sx1, za, z0);
    deck(sx0, sx1, za, z0);
    const at = frame(add, { x: sx0, y: 0, z: z0, yaw: Math.PI / 2 });
    addPosts(at, kit, 0.4, side - 2.4, d - 0.4, floorY, postH);
    const len = Math.hypot(d + 1, pitchDrop);
    at('cbox', roof, { x: (side - 2) / 2, y: roofY - pitchDrop / 2 + 0.2, z: (d + 1) / 2, pitch: Math.atan2(pitchDrop, d + 1), sx: side - 2 + 1.2, sy: 0.3, sz: len });
    if (floorY > 0.8) addRail(at, kit, 0.4, d - 0.4, side - 2.4, d - 0.4, floorY);
  }
}

/** A porch as its own merged group (see addPorch). */
export function makePorch(kit, opts) {
  return merged((add) => addPorch(add, kit, opts), { name: 'porch' });
}

/**
 * A fire escape on a +Z wall plane at z: a black iron platform with rails at each floor from `fromFloor` up, joined by
 * slanted stairs, plus the drop ladder below the first platform.
 */
export function addFireEscape(add, kit, { x = 0, z = 0, floors, floorH = 10, baseY = 0, w = 10, fromFloor = 1 } = {}) {
  const { iron } = kit.m;
  for (let f = fromFloor; f < floors; f++) {
    const y = baseY + f * floorH;
    add('box', iron, { x, y: y - 0.15, z: z + 1.75, sx: w, sy: 0.15, sz: 3.5 });
    addRail(add, kit, x - w / 2, z + 3.5, x + w / 2, z + 3.5, y, { kind: 'iron', h: 3 });
    for (const s of [-1, 1]) addRail(add, kit, x + s * w / 2, z + 0.1, x + s * w / 2, z + 3.5, y, { kind: 'iron', h: 3 });
    if (f + 1 < floors) {
      const run = w - 2, rise = floorH;
      add('cbox', iron, { x, y: y + rise / 2, z: z + 1.6, roll: Math.atan2(rise, run) * (f % 2 ? 1 : -1), sx: Math.hypot(run, rise), sy: 0.18, sz: 1.6 });
    }
  }
  add('box', iron, { x: x + w / 2 - 1.2, y: baseY + fromFloor * floorH - 6, z: z + 3.3, sx: 1.4, sy: 6, sz: 0.12 }); // drop ladder
}

/** A chimney (stone or brick) at (x, z) from the ground (or y) to height top. */
export function addChimney(add, kit, { x = 0, z = 0, y = 0, top, kind = 'brick', w = 3 } = {}) {
  const material = kind === 'stone' ? kit.m.stone : kit.m.brick;
  add(texBox(w, top - y, w * 0.8, 4), material, { x, y, z });
  add('box', kit.m.dark, { x, y: top, z, sx: w + 0.4, sy: 0.4, sz: w * 0.8 + 0.4 });
}

/** Rooftop features at (x, y = roof level, z): 'water-tank' (wooden tank on legs), 'ac' (two units), 'solar' (panels tilted by `tilt`). */
export function addRooftop(add, kit, kind, { x = 0, y = 0, z = 0, tilt = 0.35, panels = 6, yaw = 0 } = {}) {
  const at = frame(add, { x, y, z, yaw });
  if (kind === 'water-tank') {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) at('box', kit.m.iron, { x: sx * 2.6, z: sz * 2.6, sx: 0.35, sz: 0.35, sy: 6 });
    at('box', kit.m.iron, { y: 5.8, sx: 7, sy: 0.3, sz: 7 });
    at('cyl10', kit.m.wood, { y: 6.1, sx: 3.6, sz: 3.6, sy: 8 });
    for (const by of [8, 11]) at('cyl10', kit.m.iron, { y: 6.1 + by - 6, sx: 3.7, sz: 3.7, sy: 0.25 });
    at('cone10', kit.m.dark, { y: 14.1, sx: 3.9, sz: 3.9, sy: 2.6 });
  } else if (kind === 'ac') {
    for (const dx of [-2.2, 2.2]) {
      at('box', kit.m.metal, { x: dx, sx: 3.4, sy: 2.6, sz: 3.4 });
      at('cyl10', kit.m.dark, { x: dx, y: 2.6, sx: 1.3, sz: 1.3, sy: 0.12 });
    }
  } else if (kind === 'solar') {
    const panel = mat('#1f3554', { rough: 0.35, metal: 0.3 });
    const cols = Math.min(panels, 3), rows = Math.ceil(panels / cols);
    for (let i = 0; i < panels; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      at('cbox', panel, { x: (c - (cols - 1) / 2) * 3.5, y: 0.5 + r * 5.2 * Math.sin(tilt), z: -r * 5.2 * Math.cos(tilt), pitch: tilt, sx: 3.3, sy: 0.15, sz: 5.2 });
    }
  }
}
