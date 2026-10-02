// Reusable 3D props (08 §6): plants that wilt, trees with seasons, and (re-exported) animals and yard items.
// Every factory returns a THREE.Object3D built from shared cached materials; the base sits on y = 0, front faces +Z.
// Budgets (08 §5): a tree ≤ 300 triangles, an animal ≤ 400. Browser only, load with import().
import * as THREE from 'three';
import { PAL, m, merged, seasonKey } from './propKit.js';

export { triangleCount, instanceProp, seasonKey } from './propKit.js';
export { createAnimal, ANIMAL_KINDS } from './animals.js';
export {
  createGardenBed, createCoop, createCatchmentTank, createSolarArray, createFence, createCar, createBusStop,
  createMailbox, createWoodpile, createWindmill, createStreetLamp, createSlippers,
} from './yard.js';

// ---------------------------------------------------------------- plants

export const PLANT_KINDS = ['potted', 'vegetable', 'flower'];

/** Leaves (and petals) of a plant; droop 0 = healthy and upright, 1 = wilted. */
function plantTop(kind, droop) {
  const leaf = m(droop ? 'wilt' : 'leaf');
  const leafDark = m(droop ? 'wiltDark' : 'leafDark');
  return merged((add) => {
    if (kind === 'potted') {
      for (let i = 0; i < 7; i++) {
        add('leaf', i % 2 ? leaf : leafDark, { y: 0.7, yaw: i * 0.9, pitch: droop ? 0.55 : -0.75, sx: 0.16, sy: 0.04, sz: droop ? 0.42 : 0.5 });
      }
      add('leaf', leaf, { y: 0.7, pitch: droop ? 0.2 : -1.35, sx: 0.14, sy: 0.04, sz: droop ? 0.35 : 0.5 });
    } else if (kind === 'vegetable') {
      for (let i = 0; i < 8; i++) {
        add('leaf', i % 2 ? leaf : leafDark, { y: 0.12, yaw: i * 0.8, pitch: droop ? 0.15 : -0.55 - (i % 3) * 0.2, sx: 0.22, sy: 0.05, sz: droop ? 0.3 : 0.38 });
      }
    } else { // flower: stem, two leaves and a bloom that nods over when wilted
      add('cyl5', leafDark, { sx: 0.035, sz: 0.035, sy: 0.9 });
      add('leaf', leaf, { y: 0.35, yaw: 0.6, pitch: droop ? 0.6 : -0.4, sx: 0.1, sy: 0.03, sz: 0.22 });
      add('leaf', leaf, { y: 0.5, yaw: 3.6, pitch: droop ? 0.6 : -0.4, sx: 0.1, sy: 0.03, sz: 0.22 });
      const petal = m(droop ? 'petalDry' : 'pink');
      const head = droop ? { y: 0.82, z: 0.22, tilt: 1.9 } : { y: 1.0, z: 0, tilt: 0 };
      if (droop) add('cyl5', leafDark, { y: 0.9, pitch: 1.2, sx: 0.03, sz: 0.03, sy: 0.25 });
      for (let i = 0; i < 6; i++) {
        const yaw = i * (Math.PI / 3);
        add('leaf', petal, { y: head.y, z: head.z, yaw, pitch: head.tilt ? 0.9 : -0.25, sx: 0.07, sy: 0.02, sz: 0.11 });
      }
      add('ball0', m(droop ? 'wiltDark' : 'yellow'), { y: head.y, z: head.z, s: 0.07 });
    }
  }, { name: droop ? 'wilted' : 'healthy' });
}

/** A plant: 'potted' | 'vegetable' | 'flower'. Wilted = brown and drooping; switch with setPlantHealth. */
export function createPlant(kind = 'potted', { healthy = true } = {}) {
  const g = new THREE.Group();
  g.name = `plant:${kind}`;
  const base = merged((add) => {
    if (kind === 'potted') {
      add('cyl8:1.15', m('terracotta'), { sx: 0.32, sz: 0.32, sy: 0.6 });
      add('cyl8', m('soil'), { y: 0.6, sx: 0.33, sz: 0.33, sy: 0.08 });
    } else {
      add('ball0', m('soil'), { sx: 0.32, sz: 0.32, sy: 0.1 });
    }
  }, { name: 'base' });
  const up = plantTop(kind, 0);
  const down = plantTop(kind, 1);
  g.add(base, up, down);
  g.userData = { kind, healthyPart: up, wiltedPart: down };
  setPlantHealth(g, healthy);
  return g;
}

/** Show a plant healthy (green, upright) or wilted (brown, drooping). Works on anything createPlant made. */
export function setPlantHealth(obj, healthy) {
  const d = obj.userData;
  d.healthy = !!healthy;
  d.healthyPart.visible = d.healthy;
  d.wiltedPart.visible = !d.healthy;
  return obj;
}

// ---------------------------------------------------------------- trees

export const TREE_KINDS = ['palm', 'banana', 'ohia', 'monkeypod', 'pine', 'spruce', 'maple', 'birch', 'oak',
  'mango', 'citrus', 'apple', 'fig', 'cactus', 'agave'];
const DECIDUOUS = { maple: '#d9542b', birch: '#e8b923', oak: '#b5651d', apple: '#c9a227' }; // kind → fall crown
const CROWN = {
  palm: 'leaf', banana: '#6fae3c', ohia: '#4d6b3a', monkeypod: '#5a8f3c', pine: '#2f5d34', spruce: '#2a4f45',
  maple: '#4f8f3a', birch: '#7fae4a', oak: '#4a7a32', mango: 'leafDark', citrus: '#3f7d34', apple: '#5a9a3e',
  fig: '#5d8f3a', cactus: '#4f8a4a', agave: '#6f9a8a',
};
const crownColor = (kind, season) => (season === 'fall' && DECIDUOUS[kind]) || (season === 'spring' && DECIDUOUS[kind] ? PAL.leafLight : CROWN[kind]);

/** Branches: n limbs from height y fanning out with length len. */
function limbs(add, material, n, y, len, { pitch = -0.7, r = 0.35, yaw0 = 0.4 } = {}) {
  for (let i = 0; i < n; i++) add('cyl5:0.6', material, { y, yaw: yaw0 + i * (2 * Math.PI / n), pitch: Math.PI / 2 + pitch, sx: r, sz: r, sy: len });
}

const BUILD = {
  palm(t) {
    for (let i = 0; i < 4; i++) t.trunk('cyl5:0.85', { x: i * i * 0.18, y: i * 6.5, roll: -0.04 * i, sx: 0.9 - i * 0.1, sz: 0.9 - i * 0.1, sy: 6.8 });
    for (let i = 0; i < 8; i++) t.crown('leaf', { x: 2.9, y: 26, yaw: i * 0.785, pitch: 0.3 + (i % 2) * 0.25, sx: 1.3, sy: 0.12, sz: 4.6 });
    for (let i = 0; i < 4; i++) t.extra('ball0', '#7a5a2a', { x: 2.9 + Math.cos(i * 1.6) * 0.9, y: 25.2, z: Math.sin(i * 1.6) * 0.9, s: 0.65 });
  },
  banana(t) {
    t.trunk('cyl6:0.7', { sx: 0.8, sz: 0.8, sy: 8 });
    for (let i = 0; i < 7; i++) t.crown('leaf', { y: 7.6, yaw: i * 0.9, pitch: -0.55 + (i % 3) * 0.35, sx: 1.2, sy: 0.08, sz: 3.2 });
    t.extra('cone6', '#9fbf3a', { x: 1, y: 6.2, pitch: Math.PI, sx: 0.8, sz: 0.8, sy: 1.8 });
    t.extra('ball0', '#7a2f4a', { x: 1, y: 4.4, s: 0.5 });
  },
  ohia(t) {
    t.trunk('cyl5:0.7', { sx: 0.7, sz: 0.7, sy: 10, roll: 0.08 });
    limbs(t.trunkAdd, t.barkMat, 2, 8, 6, { pitch: -0.6 });
    [[0, 15, 0, 5], [-4, 13, 1, 3.6], [4, 13.5, -1, 3.8], [0.5, 12, 3.5, 3.2]].forEach(([x, y, z, s]) => t.crown('dodec', { x, y, z, s, sy: s * 0.8 }));
    for (let i = 0; i < 8; i++) t.extra('oct', '#d6263a', { x: Math.cos(i * 2.4) * 4.2, y: 13 + (i % 3) * 1.8, z: Math.sin(i * 2.4) * 3.6, s: 0.6 });
  },
  monkeypod(t) {
    t.trunk('cyl6:0.65', { sx: 1.4, sz: 1.4, sy: 8 });
    limbs(t.trunkAdd, t.barkMat, 4, 7, 9, { pitch: -0.75, r: 0.6 });
    t.crown('ball1', { y: 15, sx: 17, sz: 15, sy: 5 });
    t.crown('ball0', { x: 8, y: 14, sx: 6, sz: 6, sy: 3.4 });
    t.crown('ball0', { x: -8, y: 14.5, z: 2, sx: 6, sz: 6, sy: 3.4 });
  },
  pine(t) {
    t.trunk('cyl6:0.6', { sx: 0.8, sz: 0.8, sy: 6 });
    [[4, 6, 10], [12, 4.6, 9], [19, 3.2, 8]].forEach(([y, r, h]) => t.crown('cone8', { y, sx: r, sz: r, sy: h }));
  },
  spruce(t) {
    t.trunk('cyl6:0.6', { sx: 0.7, sz: 0.7, sy: 5 });
    [[3, 5, 9], [9, 4, 8], [15, 3, 7], [20, 2, 7]].forEach(([y, r, h]) => t.crown('cone8', { y, sx: r, sz: r, sy: h }));
  },
  maple(t) {
    t.trunk('cyl6:0.6', { sx: 1, sz: 1, sy: 11 });
    limbs(t.trunkAdd, t.barkMat, 3, 9, 6);
    t.crown('ball1', { y: 17, sx: 8, sz: 8, sy: 7 });
    [[-5, 14.5, 2], [5, 15, -2], [1, 14, 5]].forEach(([x, y, z]) => t.crown('ball0', { x, y, z, s: 4 }));
  },
  birch(t) {
    t.trunk('cyl6:0.7', { sx: 0.55, sz: 0.55, sy: 16 }, PAL.birch);
    for (let i = 0; i < 4; i++) t.extra('cbox', PAL.dark, { y: 3 + i * 3.1, yaw: i, sx: 1.12, sz: 0.25, sy: 0.25 });
    limbs(t.trunkAdd, t.trunkMat, 2, 11, 4, { pitch: -0.5, r: 0.25 });
    [[0, 18, 0, 3.6, 6], [-1.8, 14.5, 0.8, 3, 4], [1.8, 15, -0.6, 3, 4.4]].forEach(([x, y, z, r, h]) => t.crown('ball0', { x, y, z, sx: r, sz: r, sy: h }));
  },
  oak(t) {
    t.trunk('cyl8:0.7', { sx: 1.6, sz: 1.6, sy: 9 });
    limbs(t.trunkAdd, t.barkMat, 4, 8, 7, { pitch: -0.8, r: 0.6 });
    t.crown('ball1', { y: 16, sx: 10, sz: 10, sy: 7 });
    [[-7, 14, 0], [7, 14.5, 1], [0, 14, 7], [1, 15, -7]].forEach(([x, y, z]) => t.crown('ball0', { x, y, z, s: 4.4 }));
  },
  mango(t) {
    t.trunk('cyl6:0.65', { sx: 1.1, sz: 1.1, sy: 7 });
    limbs(t.trunkAdd, t.barkMat, 2, 6, 5);
    t.crown('ball1', { y: 13, sx: 9, sz: 9, sy: 7.5 });
    [[-6, 11, 2], [6, 11.5, -2]].forEach(([x, y, z]) => t.crown('ball0', { x, y, z, s: 4 }));
    for (let i = 0; i < 6; i++) t.extra('oct', PAL.orange, { x: Math.cos(i * 1.1) * 8, y: 8.5 + (i % 2), z: Math.sin(i * 1.1) * 7.6, sx: 0.45, sz: 0.45, sy: 0.6 });
  },
  citrus(t) {
    t.trunk('cyl6:0.7', { sx: 0.45, sz: 0.45, sy: 4 });
    t.crown('ball1', { y: 7.5, sx: 4.6, sz: 4.6, sy: 4.2 });
    for (let i = 0; i < 8; i++) t.extra('oct', i % 3 ? PAL.orange : PAL.yellow, { x: Math.cos(i * 0.8) * 4.3, y: 6 + (i % 3) * 1.4, z: Math.sin(i * 0.8) * 4.3, s: 0.38 });
  },
  apple(t) {
    t.trunk('cyl6:0.7', { sx: 0.6, sz: 0.6, sy: 6 });
    limbs(t.trunkAdd, t.barkMat, 2, 5, 4);
    t.crown('ball1', { y: 10, sx: 6, sz: 6, sy: 5 });
    [[-4, 8.5, 1], [4, 9, -1]].forEach(([x, y, z]) => t.crown('ball0', { x, y, z, s: 3 }));
    for (let i = 0; i < 8; i++) t.extra('oct', PAL.red, { x: Math.cos(i * 0.8) * 5.6, y: 8 + (i % 3) * 1.2, z: Math.sin(i * 0.8) * 5.6, s: 0.4 });
  },
  fig(t) {
    t.trunk('cyl6:0.6', { sx: 0.8, sz: 0.8, sy: 5 }, '#9a8f84');
    limbs(t.trunkAdd, t.trunkMat, 3, 4, 5, { pitch: -0.6, r: 0.4 });
    [[0, 10, 0, 4.4], [-4, 8, 1.5, 3.4], [4, 8.5, -1, 3.4], [0.5, 7.8, 4, 3]].forEach(([x, y, z, s]) => t.crown('dodec', { x, y, z, s }));
    for (let i = 0; i < 5; i++) t.extra('oct', PAL.purple, { x: Math.cos(i * 1.3) * 4.6, y: 7 + (i % 2) * 2, z: Math.sin(i * 1.3) * 4.4, s: 0.45 });
  },
  cactus(t) {
    t.crown('cyl8', { sx: 1.1, sz: 1.1, sy: 13 });
    t.crown('ball0', { y: 13, sx: 1.1, sz: 1.1, sy: 0.8 });
    [[-1, 5, 3.5], [1, 7, 3]].forEach(([dir, y, h]) => {
      t.crown('cyl6', { x: dir * 0.8, y, roll: -dir * Math.PI / 2, sx: 0.7, sz: 0.7, sy: 1.8 });
      t.crown('cyl6', { x: dir * 2.4, y: y - 0.6, sx: 0.7, sz: 0.7, sy: h + 0.6 });
      t.crown('ball0', { x: dir * 2.4, y: y + h, sx: 0.7, sz: 0.7, sy: 0.5 });
    });
  },
  agave(t) {
    for (let i = 0; i < 12; i++) t.crown('leaf', { y: 0.2, yaw: i * 2.4, pitch: -0.35 - (i % 3) * 0.35, sx: 0.55, sy: 0.18, sz: 1.6 + (i % 2) * 0.3 });
    t.extra('cone6', '#8a9a5a', { y: 0.5, sx: 0.25, sz: 0.25, sy: 2.4 });
  },
};

/** Recolor or bare a tree for a season (deciduous kinds go bare in winter; fruit hides out of season). */
export function setTreeSeason(tree, season) {
  const s = seasonKey(season);
  const { kind, crown, extra } = tree.userData;
  tree.userData.season = s;
  const bare = s === 'winter' && !!DECIDUOUS[kind];
  crown.visible = !bare;
  crown.children.forEach((mesh) => { mesh.material = m(crownColor(kind, s)); });
  if (extra && DECIDUOUS[kind]) extra.visible = kind === 'birch' || s === 'summer' || s === 'fall';
  return tree;
}

/** A tree: one of TREE_KINDS. opts.season: 'spring' | 'summer' | 'fall' | 'winter' or scene.season. */
export function createTree(kind = 'maple', { season = 'summer' } = {}) {
  if (!BUILD[kind]) throw new Error(`unknown tree ${kind}`);
  const parts = { trunk: [], crown: [], extra: [] };
  const barkMat = m('bark');
  const t = {
    barkMat, trunkMat: barkMat,
    trunk(g, tr, color) { if (color) t.trunkMat = m(color); parts.trunk.push([g, color ? t.trunkMat : barkMat, tr]); },
    trunkAdd: (g, material, tr) => parts.trunk.push([g, material, tr]),
    crown: (g, tr) => parts.crown.push([g, null, tr]),
    extra: (g, color, tr) => parts.extra.push([g, m(color), tr]),
  };
  BUILD[kind](t);
  const crownMat = m(crownColor(kind, seasonKey(season)));
  const group = new THREE.Group();
  group.name = `tree:${kind}`;
  const build = (list, name, material) => merged((add) => list.forEach(([g, mm, tr]) => add(g, material ?? mm, tr)), { name });
  const trunk = parts.trunk.length ? build(parts.trunk, 'trunk') : new THREE.Group();
  const crown = build(parts.crown, 'crown', crownMat);
  const extra = parts.extra.length ? build(parts.extra, 'extra') : null;
  group.add(trunk, crown);
  if (extra) group.add(extra);
  group.userData = { kind, crown, extra };
  return setTreeSeason(group, season);
}
