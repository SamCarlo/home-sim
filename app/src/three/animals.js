// Animals (08 §6): chicken, cat, dog, goat. Each is a Group (feet on y = 0, facing +Z) with pivots for the parts that
// move and `userData.idle(t)` (t in seconds) for a small peck/bob/tail animation. Budget: ≤ 400 triangles each.
import * as THREE from 'three';
import { m, merged, pivot } from './propKit.js';

export const ANIMAL_KINDS = ['chicken', 'cat', 'dog', 'goat'];

const H = Math.PI / 2;

/** Four legs as one merged part: thin boxes at (±x, ±z), from y = 0 to y = h. */
function legs(add, material, x, z, h, r) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add('box', material, { x: sx * x, z: sz * z, sx: r, sz: r, sy: h });
}

/** Two dark eyes on a head of half-width w, at height y and depth z (relative to the head pivot). */
function eyes(add, w, y, z, s = 0.06) {
  for (const sx of [-1, 1]) add('cbox', m('black'), { x: sx * w, y, z, s });
}

const BUILD = {
  chicken(color = 'white') {
    const feather = m(color), red = m('red'), beak = m('orange');
    const body = merged((add) => {
      add('ball0', feather, { y: 0.75, sx: 0.42, sy: 0.38, sz: 0.5 });
      add('leaf', feather, { y: 0.85, z: -0.3, yaw: Math.PI, pitch: -0.9, sx: 0.22, sy: 0.08, sz: 0.25 }); // tail
      add('leaf', feather, { x: 0.36, y: 0.78, z: -0.05, yaw: Math.PI, pitch: -0.15, sx: 0.06, sy: 0.16, sz: 0.2 }); // wings
      add('leaf', feather, { x: -0.36, y: 0.78, z: -0.05, yaw: Math.PI, pitch: -0.15, sx: 0.06, sy: 0.16, sz: 0.2 });
      for (const sx of [-1, 1]) {
        add('cyl4', beak, { x: sx * 0.13, sx: 0.04, sz: 0.04, sy: 0.45 });
        add('cbox', beak, { x: sx * 0.13, y: 0.02, z: 0.06, sx: 0.1, sy: 0.03, sz: 0.2 });
      }
    }, { name: 'body' });
    const head = pivot('head', [0, 0.95, 0.3], merged((add) => {
      add('ball0', feather, { y: 0.2, z: 0.05, s: 0.19 });
      add('cone4', beak, { y: 0.2, z: 0.22, pitch: H, sx: 0.05, sz: 0.05, sy: 0.14 });
      add('cbox', red, { y: 0.4, z: 0.05, sx: 0.05, sy: 0.12, sz: 0.2 }); // comb
      add('ball0', red, { y: 0.08, z: 0.18, sx: 0.04, sy: 0.07, sz: 0.04 }); // wattle
      eyes(add, 0.15, 0.25, 0.12, 0.04);
    }, { name: 'head-mesh' }));
    const g = new THREE.Group();
    g.add(body, head);
    // Peck: two quick dips every few seconds, plus a slight body bob.
    g.userData.idle = (t) => {
      const p = (t % 3.2) / 3.2;
      head.rotation.x = p < 0.25 ? 1.1 * Math.abs(Math.sin(p * 8 * Math.PI)) : 0.12 * Math.sin(t * 2);
      body.position.y = 0.015 * Math.sin(t * 4);
    };
    return g;
  },

  cat(color = '#d98a3a') {
    const fur = m(color), pink = m('pink');
    const body = merged((add) => {
      add('ball0', fur, { y: 0.62, sx: 0.32, sy: 0.3, sz: 0.62 });
      legs(add, fur, 0.17, 0.38, 0.5, 0.1);
    }, { name: 'body' });
    const head = pivot('head', [0, 0.85, 0.55], merged((add) => {
      add('ball0', fur, { y: 0.08, z: 0.06, sx: 0.26, sy: 0.23, sz: 0.24 });
      for (const sx of [-1, 1]) {
        add('cone4', fur, { x: sx * 0.14, y: 0.22, z: 0.04, roll: -sx * 0.25, sx: 0.08, sz: 0.06, sy: 0.18 });
      }
      add('oct', pink, { y: 0.05, z: 0.3, s: 0.035 });
      eyes(add, 0.1, 0.13, 0.25, 0.045);
    }, { name: 'head-mesh' }));
    const tailTip = pivot('tail-tip', [0, 0, -0.45], merged((add) => add('cyl5:0.7', fur, { pitch: -H, sx: 0.05, sz: 0.05, sy: 0.4 }), { name: 'tail-tip-mesh' }));
    const tail = pivot('tail', [0, 0.72, -0.55], merged((add) => add('cyl5', fur, { pitch: -H, sx: 0.05, sz: 0.05, sy: 0.46 }), { name: 'tail-mesh' }), tailTip);
    tail.rotation.x = 0.9; // points back, raised
    const g = new THREE.Group();
    g.add(body, head, tail);
    g.userData.idle = (t) => {
      tail.rotation.y = 0.35 * Math.sin(t * 1.6);
      tailTip.rotation.x = 0.6 + 0.3 * Math.sin(t * 1.6 + 1);
      head.rotation.y = 0.25 * Math.sin(t * 0.5);
      body.scale.y = 1 + 0.025 * Math.sin(t * 2.2); // breathing
    };
    return g;
  },

  dog(color = '#8a5a32') {
    const fur = m(color), dark = m('woodDark');
    const body = merged((add) => {
      add('ball0', fur, { y: 1.15, sx: 0.48, sy: 0.45, sz: 0.95 });
      legs(add, fur, 0.26, 0.6, 0.95, 0.16);
      add('ball0', fur, { y: 1.45, z: 0.75, sx: 0.3, sy: 0.38, sz: 0.3 }); // chest/neck
    }, { name: 'body' });
    const head = pivot('head', [0, 1.75, 0.95], merged((add) => {
      add('ball0', fur, { y: 0.05, sx: 0.32, sy: 0.3, sz: 0.34 });
      add('cbox', fur, { y: -0.05, z: 0.38, sx: 0.26, sy: 0.22, sz: 0.4 }); // snout
      add('oct', m('black'), { y: 0.02, z: 0.6, s: 0.07 });
      for (const sx of [-1, 1]) add('cbox', dark, { x: sx * 0.3, y: -0.05, z: -0.02, roll: sx * 0.2, sx: 0.08, sy: 0.4, sz: 0.22 }); // floppy ears
      eyes(add, 0.15, 0.14, 0.27, 0.06);
    }, { name: 'head-mesh' }));
    const tail = pivot('tail', [0, 1.35, -0.9], merged((add) => add('cyl5:0.4', fur, { pitch: -H, sx: 0.08, sz: 0.08, sy: 0.75 }), { name: 'tail-mesh' }));
    tail.rotation.x = 0.8;
    const g = new THREE.Group();
    g.add(body, head, tail);
    g.userData.idle = (t) => {
      tail.rotation.y = 0.6 * Math.sin(t * 9); // wag
      head.rotation.x = 0.08 * Math.sin(t * 1.4);
      head.rotation.z = 0.12 * Math.sin(t * 0.7); // head tilt
      body.position.y = 0.02 * Math.sin(t * 3);
    };
    return g;
  },

  goat(color = '#e8e2d4') {
    const fur = m(color), horn = m('#6b6258'), hoof = m('dark');
    const body = merged((add) => {
      add('cbox', fur, { y: 1.75, sx: 0.85, sy: 0.8, sz: 1.9 });
      add('ball0', fur, { y: 1.75, z: 0.95, sx: 0.44, sy: 0.42, sz: 0.3 });
      add('ball0', fur, { y: 1.75, z: -0.95, sx: 0.44, sy: 0.42, sz: 0.3 });
      legs(add, fur, 0.3, 0.75, 1.5, 0.16);
      legs(add, hoof, 0.3, 0.75, 0.15, 0.18);
      add('leaf', fur, { y: 2.0, z: -1.1, yaw: Math.PI, pitch: -0.9, sx: 0.12, sy: 0.05, sz: 0.15 }); // tail
    }, { name: 'body' });
    const head = pivot('head', [0, 2.2, 1.0], merged((add) => {
      add('cbox', fur, { y: 0.35, z: 0.1, pitch: -0.5, sx: 0.32, sy: 0.75, sz: 0.3 }); // neck
      add('cbox', fur, { y: 0.75, z: 0.45, pitch: 0.5, sx: 0.36, sy: 0.4, sz: 0.65 }); // head + muzzle
      for (const sx of [-1, 1]) {
        add('cone4', horn, { x: sx * 0.12, y: 1.0, z: 0.3, pitch: -0.7, roll: -sx * 0.2, sx: 0.06, sz: 0.06, sy: 0.4 });
        add('cbox', fur, { x: sx * 0.3, y: 0.85, z: 0.35, roll: sx * 0.5, sx: 0.28, sy: 0.08, sz: 0.12 }); // ears
      }
      add('cone4', fur, { y: 0.6, z: 0.62, pitch: Math.PI, sx: 0.07, sz: 0.07, sy: 0.3 }); // beard
      eyes(add, 0.19, 0.85, 0.4, 0.06);
    }, { name: 'head-mesh' }));
    const g = new THREE.Group();
    g.add(body, head);
    // Graze: head dips to the ground, chews, comes back up.
    g.userData.idle = (t) => {
      const p = (t % 6) / 6;
      const dip = p < 0.5 ? Math.sin(p * 2 * Math.PI) : 0;
      head.rotation.x = 0.9 * Math.max(0, dip) + 0.04 * Math.sin(t * 7);
    };
    return g;
  },
};

/** An animal: one of ANIMAL_KINDS. opts.color overrides the coat/feather color. */
export function createAnimal(kind = 'chicken', { color } = {}) {
  if (!BUILD[kind]) throw new Error(`unknown animal ${kind}`);
  const g = BUILD[kind](color);
  g.name = `animal:${kind}`;
  g.userData.kind = kind;
  g.userData.idle(0);
  return g;
}
