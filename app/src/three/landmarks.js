// Low-poly landmark backdrops, one per place, keyed like 04 §7 (08 §3). Browser only.
// Everything sits behind the lot (−Z) and is merged per material by the caller's batch, so a landmark costs a few
// draw calls whatever its part count. Far silhouettes live around z = −700, near props (towers) around z = −260.
import * as THREE from 'three';
import { mat } from './materials.js';

const G = {
  cone: (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg, 1),
  cyl: (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg, 1),
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  ball: (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail),
  dome: (r) => new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
};

// Built per scene (the material cache is emptied on dispose).
let C;
const colors = () => ({
  lava: mat('#4a4642'), shield: mat('#5d6b4f'), shieldDry: mat('#7b7258'), snow: mat('#f2f4f7'), plume: mat('#c9c6c0'),
  green: mat('#5f8a4c'), greenDark: mat('#3f6a3c'), ridge: mat('#6f8494'), ridgeFar: mat('#8fa2b2'), pine: mat('#2f5040'),
  ochre: mat('#b07a52'), ochreDark: mat('#8e5e3f'), tower: mat('#d9d6cf'), glass: mat('#8fb4cf', { rough: 0.4 }),
  glassWarm: mat('#c9d8e0', { rough: 0.4 }), brick: mat('#8a5a48'), white: mat('#f4f1ea'), red: mat('#b8443a'),
  gold: mat('#d4a93a', { rough: 0.4, metal: 0.5 }), steel: mat('#7d8288'), wood: mat('#7a5f45'), sand: mat('#d1bb8a'),
  rust: mat('#7f4e36'), lake: mat('#4b86ad', { rough: 0.3 }),
});

/** A ridge of overlapping cones from x0 to x1 at depth z. */
function ridge(b, m, { x0, x1, z, h, r, n, seed = 1, seg = 6 }) {
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const wob = Math.sin((i + 1) * 12.9898 * seed) * 0.5 + 0.5; // deterministic 0..1
    const hh = h * (0.65 + 0.35 * wob);
    b.add(G.cone(r * (0.8 + 0.4 * wob), hh, seg), m, { x: x0 + (x1 - x0) * f, y: hh / 2 - 2, z: z - wob * 40, ry: wob * 3 });
  }
}

/** A skyline of boxes between x0 and x1. */
function skyline(b, mats, { x0, x1, z, hMin, hMax, n }) {
  for (let i = 0; i < n; i++) {
    const wob = Math.sin((i + 3) * 78.233) * 0.5 + 0.5;
    const w = 22 + wob * 26, hh = hMin + (hMax - hMin) * ((Math.sin(i * 4.7) * 0.5 + 0.5) * 0.7 + wob * 0.3);
    b.add(G.box(w, hh, w * 0.8), mats[i % mats.length], { x: x0 + (x1 - x0) * (i / (n - 1)), y: hh / 2, z: z - wob * 60 });
  }
}

/** A flattened volcano/shield: wide low cone, optional snow cap. */
function shield(b, m, { x = 0, z = -760, r = 520, h = 170, cap = null }) {
  b.add(G.cone(r, h, 9), m, { x, y: h / 2 - 4, z, sz: 0.35 }); // squashed in depth so it stays a backdrop
  if (cap) b.add(G.cone(r * 0.18, h * 0.18, 9), cap, { x, y: h - h * 0.09 + 0.5, z, sz: 0.35 });
}

const BUILDERS = {
  'kilauea-plume'(b) {
    shield(b, C.shield, { r: 600, h: 120, z: -780 });
    [[0, 125, 28], [12, 150, 34], [-6, 175, 38], [22, 198, 42], [44, 218, 44]].forEach(([dx, y, r], i) =>
      b.add(G.ball(r, 1), C.plume, { x: 120 + dx, y, z: -760 + i * 4 }));
    b.add(G.cyl(30, 46, 30, 7), C.lava, { x: 120, y: 112, z: -760 });
  },
  maunakea(b, ctx) { shield(b, C.shield, { r: 640, h: 230, z: -820, cap: ctx.winter ? C.snow : null }); },
  hualalai(b) {
    shield(b, C.shieldDry, { r: 520, h: 190, x: 80, z: -760 });
    ridge(b, C.lava, { x0: -300, x1: 300, z: -560, h: 26, r: 120, n: 5, seed: 3 });
  },
  'kohala-hills'(b) {
    for (let i = 0; i < 6; i++) b.add(G.ball(120 + (i % 3) * 30, 1), i % 2 ? C.green : C.greenDark,
      { x: -420 + i * 170, y: -40, z: -680 - (i % 2) * 60, sy: 0.55 });
  },
  leahi(b) {
    b.add(G.cyl(170, 300, 120, 9), C.shieldDry, { x: 60, y: 58, z: -700 });
    b.add(G.cyl(120, 150, 12, 9), C.ochreDark, { x: 60, y: 122, z: -700 });
    skyline(b, [C.white, C.glassWarm], { x0: -380, x1: -120, z: -520, hMin: 60, hMax: 160, n: 6 });
  },
  'needle-rainier'(b) {
    shield(b, C.ridgeFar, { r: 420, h: 330, x: 160, z: -900, cap: C.snow });
    b.add(G.cyl(2.5, 5, 120, 6), C.white, { x: -110, y: 60, z: -320 });
    b.add(G.cyl(22, 10, 8, 10), C.white, { x: -110, y: 122, z: -320 });
    b.add(G.cone(3, 28, 6), C.white, { x: -110, y: 140, z: -320 });
    skyline(b, [C.glass, C.tower], { x0: -260, x1: -40, z: -420, hMin: 50, hMax: 150, n: 6 });
  },
  'manhattan-skyline'(b) {
    skyline(b, [C.glass, C.tower, C.brick, C.glassWarm], { x0: -420, x1: 420, z: -620, hMin: 80, hMax: 300, n: 16 });
    b.add(G.cone(6, 70, 6), C.steel, { x: 40, y: 330, z: -640 });
  },
  'biscayne-skyline'(b) {
    skyline(b, [C.white, C.glass, C.glassWarm], { x0: -380, x1: 380, z: -560, hMin: 70, hMax: 230, n: 13 });
  },
  'water-tower'(b) {
    for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) b.add(G.cyl(1.2, 1.2, 70, 5), C.steel, { x: 140 + dx, y: 35, z: -260 + dz });
    b.add(G.ball(22, 2), C.white, { x: 140, y: 82, z: -260, sy: 0.8 });
    b.add(G.cone(12, 10, 10), C.steel, { x: 140, y: 101, z: -260 });
  },
  'strip-mountains'(b) {
    ridge(b, C.ochre, { x0: -700, x1: 700, z: -880, h: 260, r: 230, n: 7, seed: 2 });
    skyline(b, [C.glassWarm, C.gold, C.white], { x0: -200, x1: 200, z: -560, hMin: 70, hMax: 190, n: 7 });
  },
  'lookout-mountain'(b) {
    b.add(G.cyl(340, 520, 160, 8), C.greenDark, { x: 60, y: 76, z: -760, sz: 0.5 });
    ridge(b, C.green, { x0: -600, x1: -200, z: -700, h: 90, r: 160, n: 4, seed: 5 });
  },
  'harbour-lighthouse'(b) {
    b.add(G.ball(70, 1), C.green, { x: 150, y: -30, z: -300, sy: 0.6 });
    b.add(G.cyl(5, 8, 46, 8), C.white, { x: 150, y: 32, z: -300 });
    b.add(G.cyl(6, 6, 6, 8), C.red, { x: 150, y: 58, z: -300 });
    b.add(G.cone(7, 8, 8), C.red, { x: 150, y: 65, z: -300 });
    skyline(b, [C.brick, C.white], { x0: -400, x1: -150, z: -640, hMin: 30, hMax: 90, n: 6 });
  },
  'pine-ridges'(b) {
    ridge(b, C.ridgeFar, { x0: -800, x1: 800, z: -980, h: 380, r: 260, n: 7, seed: 4 });
    ridge(b, C.pine, { x0: -700, x1: 700, z: -720, h: 200, r: 200, n: 8, seed: 7 });
  },
  'ore-dock'(b) {
    b.add(G.box(1600, 0.6, 520), C.lake, { y: 0.3, z: -440 }); // Lake Superior under the dock
    b.add(G.box(420, 30, 36), C.rust, { x: -40, y: 46, z: -360 });
    for (let i = 0; i < 9; i++) b.add(G.box(6, 40, 6), C.rust, { x: -240 + i * 50, y: 16, z: -360 });
    ridge(b, C.pine, { x0: -600, x1: 600, z: -820, h: 90, r: 180, n: 6, seed: 8 });
  },
  'gold-dome'(b) {
    b.add(G.box(150, 40, 60), C.white, { x: 0, y: 20, z: -320 });
    b.add(G.cyl(22, 22, 20, 12), C.white, { x: 0, y: 50, z: -320 });
    b.add(G.dome(22), C.gold, { x: 0, y: 60, z: -320 });
    ridge(b, C.greenDark, { x0: -600, x1: 600, z: -800, h: 150, r: 220, n: 6, seed: 9 });
  },
  'allegheny-ridges'(b) {
    for (let i = 0; i < 3; i++) b.add(G.ball(300, 1), [C.greenDark, C.green, C.ridge][i],
      { x: -200 + i * 220, y: -60 + i * 20, z: -640 - i * 160, sx: 2.6, sy: 0.5 });
  },
  'delta-crossroads'(b) {
    for (let i = 0; i < 8; i++) {
      b.add(G.cyl(0.8, 1, 32, 5), C.wood, { x: -320 + i * 90, y: 16, z: -300 });
      b.add(G.box(10, 1, 1), C.wood, { x: -320 + i * 90, y: 30, z: -300 });
    }
    b.add(G.cyl(0.8, 0.8, 22, 5), C.wood, { x: 70, y: 11, z: -150 });
    b.add(G.box(16, 3, 1), C.white, { x: 70, y: 21, z: -150, ry: 0.5 });
    b.add(G.box(16, 3, 1), C.white, { x: 70, y: 17, z: -150, ry: -0.6 });
  },
  'mule-mountains'(b) {
    ridge(b, C.ochreDark, { x0: -650, x1: 650, z: -760, h: 230, r: 170, n: 9, seed: 6, seg: 5 });
    ridge(b, C.ochre, { x0: -500, x1: 500, z: -560, h: 110, r: 120, n: 6, seed: 11, seg: 5 });
  },
  'sandhills-windmill'(b) {
    for (let i = 0; i < 5; i++) b.add(G.ball(200, 1), C.sand, { x: -600 + i * 300, y: -110, z: -700, sx: 1.6, sy: 0.6 });
    b.add(G.cyl(1.2, 7, 44, 4), C.steel, { x: 120, y: 22, z: -220 });
    for (let i = 0; i < 6; i++) b.add(G.box(1.5, 12, 0.4), C.steel, { x: 120, y: 46, z: -217, rz: (i * Math.PI) / 3 });
    b.add(G.box(1, 3, 10), C.steel, { x: 120, y: 46, z: -224 });
  },
  'kachemak-spit'(b) {
    ridge(b, C.ridgeFar, { x0: -800, x1: 800, z: -980, h: 300, r: 220, n: 8, seed: 12 });
    ridge(b, C.snow, { x0: -760, x1: 760, z: -985, h: 120, r: 90, n: 8, seed: 12 });
    b.add(G.box(500, 4, 26), C.sand, { x: 100, y: 1, z: -420, ry: 0.25 });
  },
};

/** Landmark keys that have a builder (all 20 from enums.LANDMARKS). */
export const LANDMARK_KEYS = Object.keys(BUILDERS);

/** Add the landmark's parts to a merge batch. ctx: { winter } (Maunakea snow cap at build time). Unknown keys add nothing. */
export function addLandmark(batch, key, ctx = {}) {
  C = colors();
  BUILDERS[key]?.(batch, ctx);
}
