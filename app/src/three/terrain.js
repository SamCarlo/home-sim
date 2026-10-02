// Biome terrain, decorations, water and the landmark backdrop (08 §3). Browser only.
// Decorations are merged per material (01 §10). Leaves and ground use their own materials so setSeason can recolor them.
import * as THREE from 'three';
import { BIOME_PALETTE } from '../phases/plan/preview2d/palette.js';
import { createRng, hashString } from '../util/rng.js';
import { SCENE3D } from '../config.js';
import { mat, ownMat, createBatch } from './materials.js';
import { addLandmark } from './landmarks.js';

const SNOW = '#eef2f6';
const FALL = ['#d2692a', '#e3a634', '#b8432c'];

/** Per-biome terrain recipe (08 §3 table). veg: [kind, count]; extras: 'urban' | 'fence' | 'lava' | 'rocks' | 'peaks'. */
const RECIPES = {
  'tropical-wet': { ground: '#3f7d3a', veg: [['fern', 60], ['palm', 10], ['round', 10]] },
  'tropical-dry': { ground: '#a8996a', veg: [['palm', 8], ['shrub', 14]], extras: ['rocks'], rock: '#2f2d2b' },
  'tropical-upland': { ground: '#6e9a52', rolling: 14, veg: [['round', 10], ['pine', 6]], extras: ['fence'] },
  'tropical-urban': { ground: '#7f9a68', veg: [['palm', 8], ['round', 6]], extras: ['urban'] },
  'temperate-urban': { ground: '#7a8670', veg: [['deciduous', 12]], extras: ['urban'] },
  'temperate-rain': { ground: '#4f7a4c', veg: [['pine', 40], ['fern', 16]] },
  'subtropical-coastal': { ground: '#80a876', veg: [['palm', 16], ['round', 6]] },
  'subtropical-flat': { ground: '#8a9d5c', veg: [['oak', 16], ['palm', 4]] },
  desert: { ground: '#d2ac80', veg: [['cactus', 22], ['agave', 18]], extras: ['rocks'], rock: '#a87e5c' },
  'desert-mountain': { ground: '#bb9068', rolling: 10, veg: [['agave', 20], ['cactus', 12]], extras: ['rocks'], rock: '#8e6448' },
  plains: { ground: '#b2a86a', veg: [['oak', 3], ['shrub', 10]] },
  alpine: { ground: '#6f8f62', rolling: 18, veg: [['pine', 46]], extras: ['peaks', 'rocks'], rock: '#8a8780' },
  'continental-lake': { ground: '#66894f', veg: [['deciduous', 22], ['birch', 12], ['pine', 8]] },
  'continental-forest': { ground: '#62884a', veg: [['deciduous', 26], ['birch', 10], ['pine', 8]] },
  'humid-forest': { ground: '#557f42', rolling: 8, veg: [['deciduous', 30], ['pine', 8]] },
  maritime: { ground: '#64825a', veg: [['pine', 18], ['birch', 8]], extras: ['rocks'], rock: '#7c7c78' },
  'subarctic-coastal': { ground: '#6a8460', veg: [['pine', 22], ['birch', 6]], extras: ['rocks', 'peaks'], rock: '#6f6f6c' },
};

const SHORE_SAND = new Set(['tropical-dry', 'tropical-urban', 'subtropical-coastal']);

/** Seeded point in the decorated ring: outside the lot (|x|,|z| > lotHalf + 8), inside groundSize/2. */
function ringPoint(rng, avoidWater) {
  const half = SCENE3D.groundSize / 2 - 6, keep = SCENE3D.lotHalf + 8;
  for (let i = 0; i < 20; i++) {
    const x = rng.float(-half, half), z = rng.float(-half, half);
    if (Math.abs(x) < keep && Math.abs(z) < keep) continue;
    // keep the default camera's foreground (front and front-right of the lot) clear
    if ((z > keep - 10 && x > -keep * 1.6) || (x > keep - 10 && z > -keep * 0.4)) continue;
    if (avoidWater && x < -half * 0.45) continue;
    return { x, z };
  }
  return { x: half, z: -half };
}

/** Smooth seeded height for rolling ground outside the lot. */
function rollHeight(x, z, amp) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  const fade = THREE.MathUtils.smoothstep(d, SCENE3D.lotHalf + 20, SCENE3D.lotHalf + 120);
  return fade * amp * (Math.sin(x * 0.021) * Math.cos(z * 0.017) + 0.5 * Math.sin((x + z) * 0.043));
}

/**
 * Build the terrain group. opts: { biome, landmark, seasons, coastal, monthIndex, seed }.
 * Returns { group, setSeason(monthIndex) → {snow, fall, month}, heightAt(x, z) }.
 */
export function createTerrain({ biome, landmark, seasons = {}, coastal = false, monthIndex = 0, seed = 0 }) {
  const recipe = RECIPES[biome] ?? RECIPES['tropical-wet'];
  const pal = BIOME_PALETTE[biome] ?? BIOME_PALETTE['tropical-wet'];
  const rng = createRng(hashString(`${biome}:${landmark}:${seed}`));
  const group = new THREE.Group();
  group.name = 'terrain';
  const amp = recipe.rolling ?? 0;
  const heightAt = (x, z) => (amp ? rollHeight(x, z, amp) : 0);
  const water = coastal || biome === 'maritime' || biome === 'subarctic-coastal';

  // Ground: one big plane, gently rolling outside the lot where the biome rolls.
  const groundMat = ownMat(recipe.ground);
  const segs = amp ? 60 : 1;
  const gGeo = new THREE.PlaneGeometry(SCENE3D.farGround, SCENE3D.farGround, segs, segs).rotateX(-Math.PI / 2);
  if (amp) {
    const p = gGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    gGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(gGeo, groundMat);
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  // The empty lot: a slightly lighter pad the home generators build on.
  const lotColor = `#${new THREE.Color(recipe.ground).lerp(new THREE.Color('#e8e0c0'), 0.18).getHexString()}`;
  const lotMat = ownMat(lotColor);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(SCENE3D.lotHalf * 2, SCENE3D.lotHalf * 2).rotateX(-Math.PI / 2), lotMat);
  lot.position.y = 0.04;
  lot.receiveShadow = true;
  lot.name = 'lot';
  group.add(lot);

  const st = createBatch();   // static, casts shadows
  const flat = createBatch(); // flat overlays, receive only
  const far = createBatch();  // landmark + peaks, no shadows
  const leaves = [ownMat(pal.leaf[0]), ownMat(pal.leaf[1]), ownMat(FALL[0])];
  leaves.forEach((m, i) => { m.userData.base = i < 2 ? pal.leaf[i] : pal.leaf[0]; m.userData.fall = FALL[i]; });
  const trunk = mat(pal.trunk);
  const darkLeaf = mat(pal.leaf[0]);

  const VEG = {
    pine(x, z, s, y) {
      st.add(new THREE.CylinderGeometry(0.6, 0.9, 6, 5), trunk, { x, y: y + 3 * s, z, s });
      st.add(new THREE.ConeGeometry(6, 18, 6), darkLeaf, { x, y: y + 14 * s, z, s, ry: x });
      st.add(new THREE.ConeGeometry(4.4, 12, 6), darkLeaf, { x, y: y + 22 * s, z, s, ry: z });
    },
    deciduous(x, z, s, y) {
      st.add(new THREE.CylinderGeometry(0.7, 1, 10, 5), trunk, { x, y: y + 5 * s, z, s });
      st.add(new THREE.IcosahedronGeometry(7, 0), leaves[Math.floor(Math.abs(x * 7 + z) % 3)], { x, y: y + 15 * s, z, s, ry: x });
    },
    birch(x, z, s, y) {
      st.add(new THREE.CylinderGeometry(0.5, 0.6, 14, 5), mat('#e9e4da'), { x, y: y + 7 * s, z, s });
      st.add(new THREE.IcosahedronGeometry(5, 0), leaves[1], { x, y: y + 16 * s, z, s, sy: s * 1.4 });
    },
    oak(x, z, s, y) {
      st.add(new THREE.CylinderGeometry(1, 1.4, 8, 6), trunk, { x, y: y + 4 * s, z, s });
      st.add(new THREE.DodecahedronGeometry(9, 0), darkLeaf, { x, y: y + 13 * s, z, s, sy: s * 0.75 });
    },
    round(x, z, s, y) {
      st.add(new THREE.CylinderGeometry(0.7, 1, 7, 5), trunk, { x, y: y + 3.5 * s, z, s });
      st.add(new THREE.IcosahedronGeometry(6, 0), mat(pal.leaf[1]), { x, y: y + 10 * s, z, s });
    },
    palm(x, z, s, y) {
      st.add(new THREE.CylinderGeometry(0.5, 0.9, 22, 5), trunk, { x, y: y + 11 * s, z, s, rz: 0.08 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        st.add(new THREE.BoxGeometry(11, 0.3, 2.2), mat(pal.leaf[1]),
          { x: x + Math.cos(a) * 5 * s, y: y + 22 * s, z: z + Math.sin(a) * 5 * s, ry: -a, rz: -0.35, s });
      }
    },
    fern(x, z, s, y) { st.add(new THREE.ConeGeometry(3.2, 4, 5), mat(pal.leaf[1]), { x, y: y + 2 * s, z, s, ry: x }); },
    shrub(x, z, s, y) { st.add(new THREE.IcosahedronGeometry(2.6, 0), darkLeaf, { x, y: y + 1.6 * s, z, s, sy: s * 0.7 }); },
    cactus(x, z, s, y) {
      const c = mat('#5f8a4f');
      st.add(new THREE.CylinderGeometry(1, 1.1, 12, 6), c, { x, y: y + 6 * s, z, s });
      st.add(new THREE.CylinderGeometry(0.7, 0.7, 5, 6), c, { x: x + 2 * s, y: y + 7 * s, z, s, rz: -0.9 });
      st.add(new THREE.CylinderGeometry(0.7, 0.7, 4, 6), c, { x: x + 3.2 * s, y: y + 9.5 * s, z, s });
    },
    agave(x, z, s, y) {
      for (let i = 0; i < 5; i++) {
        st.add(new THREE.ConeGeometry(0.6, 4.5, 4), mat('#7f9f78'), { x, y: y + 1.8 * s, z, s, rx: 0.6, ry: (i / 5) * Math.PI * 2 });
      }
    },
  };

  for (const [kind, count] of recipe.veg) {
    for (let i = 0; i < count; i++) {
      const { x, z } = ringPoint(rng, water);
      VEG[kind](x, z, rng.float(0.8, 1.25), heightAt(x, z) - 0.2);
    }
  }

  const extras = new Set(recipe.extras ?? []);
  if (landmark === 'kilauea-plume') extras.add('lava');
  if (extras.has('rocks')) {
    const rock = mat(recipe.rock ?? '#5a5855');
    for (let i = 0; i < 18; i++) {
      const { x, z } = ringPoint(rng, false);
      const s = rng.float(1, 3.4);
      st.add(new THREE.DodecahedronGeometry(2, 0), rock, { x, y: heightAt(x, z) + s * 0.6, z, s, sy: s * 0.6, ry: x });
    }
  }
  if (extras.has('lava')) { // Pāhoa: black lava patches on the green
    const lava = mat('#26231f', { rough: 1 });
    for (let i = 0; i < 9; i++) {
      const { x, z } = ringPoint(rng, false);
      flat.add(new THREE.CircleGeometry(rng.float(10, 22), 7).rotateX(-Math.PI / 2), lava,
        { x, y: 0.08, z, sx: rng.float(0.8, 1.6), ry: rng.float(0, 3) });
    }
  }
  if (extras.has('fence')) { // ranch fence around the lot
    const wood = mat('#8a6a4a'), r = SCENE3D.lotHalf + 30;
    for (let i = -r; i <= r; i += 12) {
      for (const [x, z] of [[i, -r], [i, r], [-r, i], [r, i]]) st.add(new THREE.BoxGeometry(0.6, 4.5, 0.6), wood, { x, y: 2.25, z });
    }
    for (const h of [2, 3.8]) {
      for (const [x, z, ry] of [[0, -r, 0], [0, r, 0], [-r, 0, Math.PI / 2], [r, 0, Math.PI / 2]]) {
        st.add(new THREE.BoxGeometry(r * 2, 0.35, 0.25), wood, { x, y: h, z, ry });
      }
    }
  }
  if (extras.has('urban')) { // asphalt and sidewalk grid
    const asphalt = mat('#4b4d52', { rough: 1 }), walk = mat('#b9b6ae', { rough: 1 }), paint = mat('#e9e2c4');
    const road = (x, z, w, d) => flat.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), asphalt, { x, y: 0.06, z });
    const side = (x, z, w, d) => flat.add(new THREE.BoxGeometry(w, 0.5, d), walk, { x, y: 0.25, z });
    const L = SCENE3D.groundSize, edge = SCENE3D.lotHalf + 22;
    for (const z of [edge, -edge - 120]) { road(0, z, L * 2, 28); side(0, z - 18, L * 2, 8); side(0, z + 18, L * 2, 8); }
    for (const x of [-edge - 10, edge + 10]) { road(x, 0, 28, L * 2); side(x - 18, 0, 8, L * 2); side(x + 18, 0, 8, L * 2); }
    for (let i = -L; i < L; i += 24) flat.add(new THREE.PlaneGeometry(10, 0.7).rotateX(-Math.PI / 2), paint, { x: i, y: 0.09, z: edge });
  }
  if (extras.has('peaks')) { // distant mountains around the back half
    const rockFar = mat('#7d8a96');
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + i * 0.1), d = 850, h = rng.float(180, 320);
      far.add(new THREE.ConeGeometry(rng.float(150, 230), h, 6), rockFar, { x: Math.cos(a) * d, y: h / 2 - 5, z: Math.sin(a) * d });
      far.add(new THREE.ConeGeometry(h * 0.16, h * 0.18, 6), mat(SNOW), { x: Math.cos(a) * d, y: h - h * 0.09, z: Math.sin(a) * d });
    }
  }
  if (water) { // water along the west (−X) edge, a shore strip, out to the horizon
    const wx = -SCENE3D.groundSize / 2 + 40;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, SCENE3D.farGround).rotateX(-Math.PI / 2),
      mat('#4a8fc0', { rough: 0.55 }));
    sea.position.set(wx - 700, 0.35, 0);
    sea.receiveShadow = true;
    sea.name = 'water';
    group.add(sea);
    const shore = mat(SHORE_SAND.has(biome) ? '#d8c79a' : '#77736c', { rough: 1 });
    flat.add(new THREE.PlaneGeometry(22, SCENE3D.farGround).rotateX(-Math.PI / 2), shore, { x: wx + 8, y: 0.12, z: 0 });
  }

  const winter = (seasons.snowMonths ?? []).length > 0 || landmark === 'maunakea';
  addLandmark(far, landmark, { winter: landmark === 'maunakea' ? [11, 0, 1].includes(monthIndex % 12) : winter });

  group.add(st.build({ castShadow: true, receiveShadow: true, name: 'decor' }));
  group.add(flat.build({ receiveShadow: true, name: 'overlay' }));
  const backdrop = far.build({ name: 'backdrop' });
  const { xz, y } = SCENE3D.backdrop, [vx, , vz] = SCENE3D.viewDir;
  backdrop.scale.set(xz, y, xz);
  backdrop.rotation.y = Math.atan2(vx, vz); // centered behind the lot in the default view
  group.add(backdrop);
  const leafMeshes = [];
  group.traverse((o) => { if (o.isMesh && leaves.includes(o.material)) leafMeshes.push(o); });

  /** Snow (white ground, bare deciduous trees) and fall color by month (08 §3). */
  function setSeason(mi) {
    const month = ((mi % 12) + 12) % 12;
    const snow = (seasons.snowMonths ?? []).includes(month);
    const fall = !snow && (seasons.fallColorMonths ?? []).includes(month);
    groundMat.color.set(snow ? SNOW : recipe.ground);
    lotMat.color.set(snow ? '#f6f8fa' : lotColor);
    leaves.forEach((m) => m.color.set(fall ? m.userData.fall : m.userData.base));
    leafMeshes.forEach((m) => { m.visible = !snow; });
    return { snow, fall, month };
  }

  return { group, setSeason, heightAt };
}
