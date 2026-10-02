// Shared building blocks for props, animals, yard items and the character (08 §6–§7). Browser only.
// Parts are merged per material with `merged()`, so a prop costs a few draw calls; repeated props use `instanceProp()`.
import * as THREE from 'three';
import { createBatch, mat } from './materials.js';

/** Prop colors (soft low-poly palette). */
export const PAL = {
  leaf: '#4f8f3a', leafDark: '#2f6b2a', leafLight: '#7fbf4f', wilt: '#8a6a3a', wiltDark: '#6e5330', petalDry: '#b59a6a',
  bark: '#6b4a2f', barkLight: '#8a6a4a', birch: '#ece8df', soil: '#4a3526', terracotta: '#c8693f', wood: '#a0744a',
  woodDark: '#7a5534', metal: '#b9c2c8', steel: '#7d8790', dark: '#2b2f36', glass: '#33506b', white: '#f3f1ea',
  red: '#c8382e', yellow: '#f2c230', orange: '#f08a24', pink: '#e86fa0', purple: '#6b3a6e', black: '#1d1f22',
};

/** A cached flat-shaded material for a palette key or a CSS color. */
export const m = (c, opts) => mat(PAL[c] ?? c, opts);

const templates = new Map();
/** Shared template geometry (never rendered; `merged` clones it). Keys: ball0 ball1 dodec oct box leaf prism disc, cyl<seg>[:top], cone<seg>. */
export function geo(key) {
  let g = templates.get(key);
  if (g) return g;
  const [name, arg] = key.split(':');
  const seg = Number(name.replace(/\D/g, '')) || 6;
  if (name === 'ball0') g = new THREE.IcosahedronGeometry(1, 0);
  else if (name === 'ball1') g = new THREE.IcosahedronGeometry(1, 1);
  else if (name === 'dodec') g = new THREE.DodecahedronGeometry(1, 0);
  else if (name === 'oct') g = new THREE.OctahedronGeometry(1, 0);
  else if (name === 'box') g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // base at y = 0
  else if (name === 'cbox') g = new THREE.BoxGeometry(1, 1, 1); // centered
  else if (name === 'leaf') g = new THREE.OctahedronGeometry(1, 0).translate(0, 0, 1); // base at 0, tip at z = 2
  else if (name === 'prism') { // gable: base 2 wide on y = 0, ridge at y = 1, runs z −0.5..0.5
    const s = new THREE.Shape([new THREE.Vector2(-1, 0), new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)]);
    g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
  } else if (name.startsWith('cyl')) g = new THREE.CylinderGeometry(Number(arg ?? 1), 1, 1, seg).translate(0, 0.5, 0);
  else if (name.startsWith('cone')) g = new THREE.ConeGeometry(1, 1, seg).translate(0, 0.5, 0);
  else throw new Error(`unknown prop geometry ${key}`);
  templates.set(key, g);
  return g;
}

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const quat = new THREE.Quaternion();
const m4 = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();

/**
 * Build a merged group: `build(add)` calls `add(geoKey | geometry, material, {x,y,z, yaw,pitch,roll, s|sx,sy,sz})` per part.
 * Rotation order is roll → pitch → yaw, so a `leaf` pointing +Z is tilted by pitch (− = up) and then turned by yaw.
 */
export function merged(build, { name = 'prop', shadow = true } = {}) {
  const batch = createBatch();
  const add = (g, material, { x = 0, y = 0, z = 0, yaw = 0, pitch = 0, roll = 0, s = 1, sx = s, sy = s, sz = s } = {}) => {
    const src = typeof g === 'string' ? geo(g) : g;
    const part = src.index ? src.toNonIndexed() : src.clone();
    euler.set(pitch, yaw, roll);
    part.applyMatrix4(m4.compose(pos.set(x, y, z), quat.setFromEuler(euler), scl.set(sx, sy, sz)));
    batch.add(part, material);
    part.dispose();
  };
  build(add);
  return batch.build({ castShadow: shadow, name });
}

/** A pivot group at (x, y, z) holding `children`; animations rotate the pivot. */
export function pivot(name, [x, y, z], ...children) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  g.add(...children);
  return g;
}

/** Triangles drawn for obj (visible parts only; instanced meshes count every instance). */
export function triangleCount(obj) {
  let n = 0;
  obj.traverseVisible((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
    n += tris * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(n);
}

/**
 * Instancing helper (08 §6 "repeated vegetation uses instancing"): one InstancedMesh per visible mesh of `proto`,
 * placed at each transform `{x, y = 0, z, ry = 0, s = 1}`. Shares proto's geometry and materials.
 */
export function instanceProp(proto, transforms, { name = 'instanced' } = {}) {
  const group = new THREE.Group();
  group.name = name;
  proto.updateMatrixWorld(true);
  const inv = proto.matrixWorld.clone().invert();
  const placed = new THREE.Matrix4();
  const rel = new THREE.Matrix4();
  proto.traverseVisible((o) => {
    if (!o.isMesh) return;
    rel.multiplyMatrices(inv, o.matrixWorld);
    const im = new THREE.InstancedMesh(o.geometry, o.material, transforms.length);
    transforms.forEach(({ x = 0, y = 0, z = 0, ry = 0, s = 1 }, i) => {
      euler.set(0, ry, 0);
      placed.compose(pos.set(x, y, z), quat.setFromEuler(euler), scl.set(s, s, s));
      im.setMatrixAt(i, placed.multiply(rel));
    });
    im.castShadow = o.castShadow;
    im.computeBoundingSphere();
    group.add(im);
  });
  return group;
}

/** Normalize a season: 'spring' | 'summer' | 'fall' | 'winter', or `{snow, fall}` as returned by scene.setSeason. */
export function seasonKey(season) {
  if (typeof season === 'string') return season;
  if (season?.snow) return 'winter';
  if (season?.fall) return 'fall';
  return 'summer';
}
