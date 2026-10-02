// Yard and street props (08 §6). Each factory returns a merged Group (one mesh per material), base on y = 0,
// front facing +Z, sized in feet. The windmill rotor spins with `userData.idle(t)`; the lamp glows with `setNight(f)`.
import * as THREE from 'three';
import { m, merged, pivot } from './propKit.js';
import { mat } from './materials.js';

const H = Math.PI / 2;

/** A raised wooden garden bed, 8 × 4 ft, filled with soil. */
export function createGardenBed({ w = 8, d = 4 } = {}) {
  return merged((add) => {
    const wood = m('wood');
    add('box', m('soil'), { sx: w - 0.3, sz: d - 0.3, sy: 0.9 });
    for (const sz of [-1, 1]) add('box', wood, { z: sz * (d / 2 - 0.1), sx: w, sz: 0.2, sy: 1 });
    for (const sx of [-1, 1]) add('box', wood, { x: sx * (w / 2 - 0.1), sx: 0.2, sz: d - 0.4, sy: 1 });
  }, { name: 'garden-bed' });
}

/** A small chicken coop on legs with a gable roof, a ramp and a wire run. */
export function createCoop() {
  return merged((add) => {
    const wall = m('#c4553a'), trim = m('white'), roof = m('#5a5550'), wire = mat('#c9ccd0', { opacity: 0.35 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('box', m('woodDark'), { x: sx * 2.3, z: sz * 1.8, sx: 0.3, sz: 0.3, sy: 2 });
    add('box', wall, { y: 2, sx: 5, sz: 4, sy: 3 });
    add('prism', roof, { y: 5, sx: 3.1, sy: 1.8, sz: 4.6 });
    add('box', m('dark'), { x: -1, y: 2.4, z: 2.01, sx: 1.2, sz: 0.05, sy: 1.4 }); // pop door
    add('box', trim, { x: 1.2, y: 3.2, z: 2.01, sx: 1, sz: 0.05, sy: 0.9 }); // window frame
    add('cbox', m('wood'), { x: -1, y: 1.15, z: 3.1, pitch: 0.75, sx: 1, sy: 0.12, sz: 2.9 }); // ramp
    add('box', wire, { x: 5, sx: 5, sz: 4, sy: 3 }); // run
    add('box', trim, { x: 7.45, sx: 0.15, sz: 4, sy: 3.05 });
  }, { name: 'coop' });
}

/** A round corrugated-steel catchment tank with a cover (Hawaiʻi Island homes off county water). */
export function createCatchmentTank(gallons = 10000) {
  const height = gallons >= 5000 ? 8 : 6;
  const r = Math.sqrt((gallons * 0.1337) / (Math.PI * height)); // 1 gal = 0.1337 ft³
  return merged((add) => {
    const steel = m('#8fa6a0');
    add('cyl16', steel, { sx: r, sz: r, sy: height });
    for (let i = 1; i < 4; i++) add('cyl16', m('steel'), { y: (height * i) / 4, sx: r + 0.05, sz: r + 0.05, sy: 0.12 }); // bands
    add('cone16', m('#3d5a4a'), { y: height, sx: r + 0.2, sz: r + 0.2, sy: Math.max(1, r * 0.2) }); // cover
    add('cyl6', m('dark'), { x: r * 0.7, y: 0.4, z: r * 0.7, roll: -H, sx: 0.2, sz: 0.2, sy: 1.5 }); // outlet pipe
  }, { name: 'catchment' });
}

/** A ground-mounted solar array: one 350 W panel (3.3 × 5.4 ft) per 0.35 kW, in rows of up to 6. */
export function createSolarArray(kw = 4) {
  const n = Math.max(1, Math.round(kw / 0.35));
  const cols = Math.min(6, n), rows = Math.ceil(n / cols);
  return merged((add) => {
    const panel = mat('#1f3554', { rough: 0.35, metal: 0.3 }), frame = m('metal');
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = (c - (cols - 1) / 2) * 3.5, z = -r * 7;
      add('cbox', panel, { x, y: 2.6, z, pitch: 0.5, sx: 3.3, sy: 0.12, sz: 5.4 });
      add('box', frame, { x, z: z - 2.2, sx: 0.15, sz: 0.15, sy: 3.9 });
      add('box', frame, { x, z: z + 2.2, sx: 0.15, sz: 0.15, sy: 1.3 });
    }
    for (let r = 0; r < rows; r++) add('cbox', frame, { y: 2.6, z: -r * 7, sx: cols * 3.5, sy: 0.15, sz: 0.15 });
  }, { name: 'solar' });
}

/** A wooden post-and-rail fence along points [{x, z}] (or Vector3s), posts every ≤ 8 ft. */
export function createFence(points, { height = 4 } = {}) {
  return merged((add) => {
    const wood = m('wood'), post = m('woodDark');
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      add('box', post, { x: a.x, z: a.z, sx: 0.35, sz: 0.35, sy: height + 0.2 });
      const b = points[i + 1];
      if (!b) break;
      const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
      const n = Math.ceil(len / 8);
      for (let k = 1; k < n; k++) add('box', post, { x: a.x + (dx * k) / n, z: a.z + (dz * k) / n, sx: 0.3, sz: 0.3, sy: height });
      for (const y of [height * 0.35, height * 0.8]) add('cbox', wood, { x: a.x + dx / 2, y, z: a.z + dz / 2, yaw, sx: 0.15, sy: 0.4, sz: len });
    }
  }, { name: 'fence' });
}

/** A compact car about 15 ft long, nose toward +Z. */
export function createCar(color = '#3b6fb6') {
  return merged((add) => {
    const paint = mat(color, { rough: 0.45, metal: 0.2 }), glass = m('glass'), tire = m('black');
    add('box', paint, { y: 0.8, sx: 6, sz: 15, sy: 1.7 });
    add('cbox', glass, { y: 3.05, z: -1.2, sx: 5.3, sy: 1.1, sz: 7 }); // cabin windows
    add('box', paint, { y: 3.6, z: -1.2, sx: 5.4, sz: 7.2, sy: 0.25 }); // roof
    add('cbox', glass, { y: 3.0, z: 2.75, pitch: 0.9, sx: 5.2, sy: 0.1, sz: 1.6 }); // windshield
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) add('cyl10', tire, { x: sx > 0 ? 3.05 : -2.35, y: 1.1, z: sz * 4.6, roll: H, sx: 1.1, sz: 1.1, sy: 0.7 });
      add('cbox', m('yellow'), { x: sx * 2.1, y: 1.6, z: 7.51, sx: 1, sy: 0.4, sz: 0.05 }); // headlights
      add('cbox', m('red'), { x: sx * 2.2, y: 1.7, z: -7.51, sx: 0.9, sy: 0.35, sz: 0.05 }); // tail lights
    }
  }, { name: 'car' });
}

/** A bus stop: shelter with a roof, back panel and bench, plus a sign pole. */
export function createBusStop() {
  return merged((add) => {
    const frame = m('steel'), glass = mat('#9fc3d6', { opacity: 0.45, rough: 0.2 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('box', frame, { x: sx * 4.5, z: sz * 1.8, sx: 0.25, sz: 0.25, sy: 8 });
    add('box', m('#2f6b5a'), { y: 8, sx: 10, sz: 4.6, sy: 0.35 });
    add('box', glass, { y: 1, z: -1.8, sx: 9, sz: 0.1, sy: 6.5 });
    add('box', m('wood'), { y: 1.6, z: -1, sx: 7, sz: 1.2, sy: 0.25 });
    for (const sx of [-1, 1]) add('box', frame, { x: sx * 3, z: -1, sx: 0.2, sz: 0.8, sy: 1.6 });
    add('box', frame, { x: 6.5, z: 1.5, sx: 0.2, sz: 0.2, sy: 9 });
    add('cbox', m('#2f6b5a'), { x: 6.5, y: 8.4, z: 1.5, sx: 0.1, sy: 1.2, sz: 1.8 });
    add('cbox', m('white'), { x: 6.56, y: 8.4, z: 1.5, sx: 0.02, sy: 0.4, sz: 1.2 });
  }, { name: 'bus-stop' });
}

/** A roadside mailbox on a post, red flag up. */
export function createMailbox() {
  return merged((add) => {
    add('box', m('wood'), { sx: 0.35, sz: 0.35, sy: 3.4 });
    add('box', m('steel'), { y: 3.4, sx: 0.7, sz: 1.6, sy: 0.6 });
    add('cyl10:1', m('steel'), { y: 4.0, z: -0.8, pitch: H, sx: 0.35, sz: 0.2, sy: 1.6 });
    add('box', m('red'), { x: 0.4, y: 3.5, z: -0.3, sx: 0.06, sz: 0.12, sy: 0.8 });
    add('box', m('red'), { x: 0.4, y: 4.1, z: -0.3, sx: 0.06, sz: 0.45, sy: 0.25 });
  }, { name: 'mailbox' });
}

/** A stacked woodpile (three rows of split logs). */
export function createWoodpile() {
  return merged((add) => {
    const bark = m('bark'), end = m('#c9a06a');
    for (let r = 0; r < 3; r++) {
      const n = 5 - r;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 0.85, y = 0.4 + r * 0.72;
        add('cyl6', bark, { x, y, z: -1.6, pitch: H, sx: 0.4, sz: 0.4, sy: 3.2 });
        add('cyl6', end, { x, y, z: 1.6, pitch: H, sx: 0.34, sz: 0.34, sy: 0.02 });
      }
    }
  }, { name: 'woodpile' });
}

/** A farm windmill: lattice tower, tail vane and a rotor that turns with userData.idle(t). */
export function createWindmill() {
  const H2 = 24;
  const tower = merged((add) => {
    const steel = m('steel');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const lean = 0.09;
      add('cyl4', steel, { x: sx * 2.2, z: sz * 2.2, roll: sx * lean, pitch: -sz * lean, sx: 0.12, sz: 0.12, sy: H2 + 0.3 });
    }
    for (let k = 1; k <= 4; k++) {
      const y = (k * H2) / 5, w = 4.4 * (1 - (0.82 * y) / H2);
      for (const sz of [-1, 1]) add('cbox', steel, { y, z: (sz * w) / 2, sx: w, sy: 0.12, sz: 0.12 });
      for (const sx of [-1, 1]) add('cbox', steel, { x: (sx * w) / 2, y, sx: 0.12, sy: 0.12, sz: w });
    }
    add('box', m('dark'), { y: H2, z: -0.5, sx: 0.8, sz: 2.2, sy: 0.8 });
    add('cbox', m('dark'), { y: H2 + 0.4, z: -3, sx: 0.08, sy: 0.15, sz: 4 });
    add('cbox', m('white'), { y: H2 + 0.6, z: -5.2, sx: 0.06, sy: 2, sz: 2.4 }); // vane
  }, { name: 'tower' });
  const rotor = pivot('rotor', [0, H2 + 0.4, 0.8], merged((add) => {
    for (let i = 0; i < 9; i++) add('cbox', m('white'), { roll: (i * Math.PI) / 9, pitch: 0.25, sx: 0.55, sy: 7, sz: 0.06 });
    add('cyl8', m('dark'), { pitch: H, sx: 0.5, sz: 0.5, sy: 0.4 });
  }, { name: 'rotor-mesh' }));
  // Blades: each centered box spans ±3.5 ft through the hub, so 9 boxes make an 18-blade wheel.
  const g = new THREE.Group();
  g.name = 'windmill';
  g.add(tower, rotor);
  g.userData.idle = (t) => { rotor.rotation.z = t * 1.2; };
  return g;
}

/** A street lamp with an arm; setNight(f) brightens the bulb. */
export function createStreetLamp() {
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff4cf', emissive: '#ffd27a', emissiveIntensity: 0.2, flatShading: true });
  const g = merged((add) => {
    const pole = m('#4a5058');
    add('cyl8:0.6', pole, { sx: 0.35, sz: 0.35, sy: 16 });
    add('cyl6', pole, { y: 15.6, pitch: H, sx: 0.12, sz: 0.12, sy: 4 });
    add('cyl8:0.4', pole, { y: 15.3, z: 4, sx: 0.8, sz: 0.8, sy: 0.6 });
    add('cyl8', bulbMat, { y: 15.1, z: 4, sx: 0.6, sz: 0.6, sy: 0.2 });
  }, { name: 'street-lamp' });
  g.userData.setNight = (f) => { bulbMat.emissiveIntensity = 0.2 + 2.3 * f; };
  return g;
}

/** A pair of slippers (rubber slippahs) left by the door: a small Hawaiʻi touch. */
export function createSlippers(color = '#2f7fb6') {
  return merged((add) => {
    const sole = m(color), strap = m('white');
    for (const sx of [-1, 1]) {
      const x = sx * 0.22, yaw = sx * 0.12;
      add('cyl10', sole, { x, z: 0, yaw, sx: 0.15, sz: 0.42, sy: 0.07 });
      add('cbox', strap, { x: x + sx * 0.04, y: 0.1, z: 0.0, yaw: yaw + 0.5, sx: 0.03, sy: 0.04, sz: 0.3 });
      add('cbox', strap, { x: x - sx * 0.04, y: 0.1, z: 0.0, yaw: yaw - 0.5, sx: 0.03, sy: 0.04, sz: 0.3 });
    }
  }, { name: 'slippers' });
}
