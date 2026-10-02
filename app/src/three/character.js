// The player's little character (08 §7): a low-poly figure 5.6 ft tall (1 unit = 1 ft) with a sine walk cycle.
// createCharacter(colors) → { object, walkTo(points, ms) → Promise, setVisible(bool), update(dt), walking }.
// Drive it from the scene loop: sc.start((dt) => ch.update(dt)). Browser only, load with import().
import * as THREE from 'three';
import { m, merged, pivot } from './propKit.js';
import { createRng } from '../util/rng.js';
import { CHARACTER3D } from '../config.js';

const SKINS = ['#f1c9a5', '#e0ac85', '#c68a5e', '#a86b43', '#7f4f2e', '#5c3a22'];
const HAIRS = ['#1d1612', '#3b2618', '#6a4426', '#a8763e', '#2a2a2a', '#8c3b22'];
const SHIRTS = ['#d9534f', '#3b7dd8', '#2f9e6b', '#f0ad4e', '#8e5cc2', '#17a2b8', '#e86fa0', '#f3f1ea'];
const PANTS = ['#2b3a55', '#3d3d3d', '#6b4f36', '#4a5a3a', '#1f2a44'];

/** Seeded default colors for a player: {shirt, pants, skin, hair}. */
export function characterColors(seed) {
  const rng = createRng(seed);
  return { skin: rng.pick(SKINS), hair: rng.pick(HAIRS), shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS) };
}

const toVec = (p) => new THREE.Vector3(p.x, p.y ?? 0, p.z);

/** Smallest signed angle from a to b. */
function angleTo(a, b) {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Build the character. Missing colors come from characterColors(0). */
export function createCharacter(colors = {}) {
  const c = { ...characterColors(0), ...colors };
  const shirt = m(c.shirt), pants = m(c.pants), skin = m(c.skin), hair = m(c.hair), shoe = m('dark');

  const torso = merged((add) => {
    add('box', pants, { y: 2.6, sx: 0.95, sz: 0.5, sy: 0.55 }); // hips
    add('box', shirt, { y: 3.05, sx: 1.1, sz: 0.6, sy: 1.6 }); // chest
    add('box', shirt, { y: 4.5, sx: 1.35, sz: 0.6, sy: 0.25 }); // shoulders
    add('box', skin, { y: 4.7, sx: 0.28, sz: 0.28, sy: 0.25 }); // neck
  }, { name: 'torso' });
  const head = merged((add) => {
    add('ball1', skin, { y: 5.15, sx: 0.4, sy: 0.44, sz: 0.4 });
    add('ball0', hair, { y: 5.38, z: -0.1, sx: 0.43, sy: 0.33, sz: 0.42 });
    for (const sx of [-1, 1]) add('cbox', m('black'), { x: sx * 0.15, y: 5.17, z: 0.38, sx: 0.07, sy: 0.08, sz: 0.04 });
  }, { name: 'head' });

  const limb = (name, at, build) => pivot(name, at, merged(build, { name: `${name}-mesh` }));
  const arm = (sx) => limb(sx < 0 ? 'arm-l' : 'arm-r', [sx * 0.68, 4.6, 0], (add) => {
    add('box', shirt, { y: -0.9, sx: 0.3, sz: 0.32, sy: 0.95 }); // sleeve
    add('box', skin, { y: -1.75, sx: 0.24, sz: 0.26, sy: 0.9 }); // forearm
    add('cbox', skin, { y: -1.85, sx: 0.26, sy: 0.25, sz: 0.28 }); // hand
  });
  const leg = (sx) => limb(sx < 0 ? 'leg-l' : 'leg-r', [sx * 0.25, 2.75, 0], (add) => {
    add('box', pants, { y: -2.6, sx: 0.4, sz: 0.42, sy: 2.6 });
    add('box', shoe, { y: -2.75, z: 0.12, sx: 0.42, sz: 0.72, sy: 0.22 });
  });
  const limbs = { armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) };
  const body = new THREE.Group();
  body.name = 'body';
  body.add(torso, head, ...Object.values(limbs));
  const object = new THREE.Group();
  object.name = 'character';
  object.add(body);

  const { walkSpeed, stride, swing } = CHARACTER3D;
  let phase = 0; // walk cycle angle
  let amp = 0; // swing amplitude 0..1 (eases in and out)
  let route = null; // {pts, lens, total, speed, done, resolve}

  function pose() {
    const s = Math.sin(phase) * swing * amp;
    limbs.legL.rotation.x = s;
    limbs.legR.rotation.x = -s;
    limbs.armL.rotation.x = -s * 0.8;
    limbs.armR.rotation.x = s * 0.8;
    body.position.y = Math.abs(Math.cos(phase)) * 0.09 * amp;
  }

  function finish(arrived) {
    if (!route) return;
    const { resolve } = route;
    route = null;
    resolve(arrived);
  }

  const api = {
    object,
    colors: c,
    get walking() { return !!route; },
    /**
     * Walk from the current position through points ({x, y?, z} or Vector3) in ms milliseconds (default: walking
     * speed). Resolves true on arrival, false if a newer walkTo or setVisible(false) interrupts it.
     */
    walkTo(points, ms) {
      finish(false);
      const pts = [object.position.clone(), ...points.map(toVec)];
      const lens = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) { lens.push(pts[i].distanceTo(pts[i - 1])); total += lens[i - 1]; }
      if (total < 1e-6) { if (pts.length > 1) object.position.copy(pts.at(-1)); return Promise.resolve(true); }
      const speed = ms > 0 ? total / (ms / 1000) : walkSpeed;
      return new Promise((resolve) => { route = { pts, lens, total, speed, done: 0, resolve }; });
    },
    setVisible(v) {
      object.visible = !!v;
      if (!v) finish(false);
    },
    /** Advance the walk by dt seconds (call every frame). */
    update(dt) {
      if (route) {
        route.done = Math.min(route.total, route.done + route.speed * dt);
        let d = route.done, i = 0;
        while (i < route.lens.length - 1 && d > route.lens[i]) { d -= route.lens[i]; i++; }
        const a = route.pts[i], b = route.pts[i + 1];
        object.position.lerpVectors(a, b, route.lens[i] ? Math.min(1, d / route.lens[i]) : 1);
        if (route.lens[i] > 1e-6) {
          const heading = Math.atan2(b.x - a.x, b.z - a.z);
          object.rotation.y += angleTo(object.rotation.y, heading) * Math.min(1, dt * 10);
        }
        phase += ((route.speed * dt) / stride) * Math.PI;
        amp = Math.min(1, amp + dt * 4);
        if (route.done >= route.total) finish(true);
      } else if (amp > 0) {
        amp = Math.max(0, amp - dt * 4);
        if (!amp) phase = 0;
      }
      pose();
    },
  };
  return api;
}
