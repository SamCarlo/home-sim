// A small "swatch" house per style family (08 §4, task 34) for the `?dev=styles` gallery. It exercises every styles.js
// helper the way the house generator (task 37) will: base → walls → roof → windows/door → porch → rooftop → extras →
// vegetation. Browser only. Front +Z, origin = house center at ground level.
import * as THREE from 'three';
import { merged } from './propKit.js';
import { mat, texturedMat } from './materials.js';
import { createTree, createCatchmentTank, createSlippers, createFence, createWoodpile, createWindmill, createCar } from './props.js';
import {
  styleKit, addWalls, addRoof, addWindow, addWindowRow, addDoor, addGarageDoor, frame, addBase, addPorch, addRail,
  addFireEscape, addChimney, addRooftop, texBox, BASE_HEIGHT,
} from './styles.js';

/** Swatch footprint per family: width, depth, stories, story height, porch depth/width, door offset. */
export const SWATCH = {
  'hawaii-plantation': { w: 30, d: 24, stories: 1, porchD: 8 },
  'hawaii-upcountry': { w: 28, d: 22, stories: 1, porchD: 6, porchW: 16 },
  'kona-coastal': { w: 34, d: 24, stories: 1, porchD: 9 },
  'honolulu-highrise': { w: 22, d: 26, stories: 2, storyH: 9.5 },
  'pnw-urban': { w: 26, d: 32, stories: 1, storyH: 10, porchD: 8 },
  'nyc-brownstone': { w: 20, d: 40, stories: 4, storyH: 11, doorX: -5 },
  'miami-deco': { w: 32, d: 26, stories: 1, storyH: 11, porchD: 8 },
  'texas-suburban': { w: 34, d: 30, stories: 2 },
  'desert-southwest': { w: 32, d: 26, stories: 1, storyH: 10 },
  'mountain-cabin': { w: 24, d: 30, stories: 1, storyH: 3, porchD: 7 },
  'new-england': { w: 30, d: 24, stories: 2, storyH: 8.5 },
  maritime: { w: 18, d: 24, stories: 2, doorX: -4 },
  appalachian: { w: 30, d: 26, stories: 2, porchD: 8 },
  'delta-south': { w: 14, d: 40, stories: 1, storyH: 11, porchD: 6, doorX: -3 },
  'midwest-lakeside': { w: 28, d: 28, stories: 2, porchD: 8 },
  'plains-ranch': { w: 46, d: 24, stories: 1, doorX: -8 },
};

/** Build the house body (walls, roof, openings, porch, roof features) into `add`; returns {top, ridge, floorY}. */
function addBody(add, kit, sw) {
  const { look } = kit;
  const { w, d, stories, storyH = 9, porchD = 8, porchW = w, doorX = 0 } = sw;
  const floorY = addBase(add, kit, w, d);
  const top = floorY + stories * storyH;
  addWalls(add, kit, w, stories * storyH, d, { y: floorY });
  const ridge = addRoof(add, kit, w, d, { y: top });
  const kind = look.window, store = kind === 'storefront';
  if (look.roof === 'aframe') {
    addWindow(add, kit, { x: 0, y: floorY + 8.2, z: d / 2, w: 9, h: 6.5, kind: 'storefront' });
  } else {
    for (let s = 0; s < stories; s++) {
      const count = store ? Math.max(2, Math.round(w / 10)) : Math.max(2, Math.round(w / 7.5));
      const slot = Math.min(count - 1, Math.max(0, Math.floor(((doorX + w / 2) / w) * count)));
      addWindowRow(add, kit, { count, length: w - 2, y: floorY + s * storyH + (store ? 0.8 : 2.8), z: d / 2,
        w: store ? 6.5 : 3, h: store ? 6.6 : 4.5, skip: s === 0 ? [slot] : [] });
    }
  }
  const side = frame(add, { x: w / 2, yaw: Math.PI / 2 });
  if (look.roof !== 'aframe') {
    for (let s = 0; s < stories; s++) {
      addWindowRow(side, kit, { count: Math.max(1, Math.round(d / 11)), length: d - 4, y: floorY + s * storyH + (store ? 0.8 : 2.8),
        w: store ? 6 : 3, h: store ? 6.6 : 4.5 });
    }
  }
  addDoor(add, kit, { x: doorX, y: floorY, z: d / 2, glass: store });
  const roofY = stories > 1 ? floorY + Math.min(storyH, 9.5) : top - 0.2;
  addPorch(add, kit, { w: porchW, d: porchD, z0: d / 2, x: 0, floorY, roofY, doorX, side: d, houseW: w });

  // Rooftop features: on a flat roof, or on the front slope of a pitched one.
  const flat = look.roof === 'flat';
  for (const r of look.rooftop) {
    if (r === 'water-tank') addRooftop(add, kit, r, { x: w / 4 - 1, y: top + 0.6, z: -d / 4 });
    else if (r === 'ac') addRooftop(add, kit, r, flat ? { x: -w / 4, y: top + 0.6, z: -d / 5 } : { x: w / 2 + 2.6, z: -d / 4, yaw: Math.PI / 2 });
    else if (r === 'solar') {
      const tilt = Math.atan(look.pitch || 0.35);
      addRooftop(add, kit, r, { x: -w / 6, y: top + look.pitch * (d / 4) + 0.2, z: d / 4 + 1.2, tilt, panels: 3 });
    }
  }
  return { top, ridge, floorY };
}

/** Extras that belong to the body's merged build (chimneys, cornice, bands, garage, dormer, walls). */
function addExtras(add, kit, sw, { top, ridge, floorY }) {
  const { w, d, stories, storyH = 9, porchD = 8 } = sw;
  const { trim, accent, wall, concrete, metal } = kit.m;
  for (const x of kit.look.extras) {
    if (x === 'chimney-stone') addChimney(add, kit, kit.look.roof === 'aframe'
      ? { x: w / 2 - 5, z: -d / 4, y: floorY, top: top + ridge - 4, kind: 'stone' }
      : { x: -w / 2 - 1.4, z: 0, top: top + ridge + 2, kind: 'stone' });
    else if (x === 'chimney-brick') addChimney(add, kit, kit.key === 'new-england'
      ? { x: 0, z: 0, y: floorY, top: top + ridge + 2.5 } : { x: w / 2 + 1.4, z: -d / 4, top: top + ridge + 1 });
    else if (x === 'cornice') {
      add('box', trim, { y: top + 1.4, z: d / 2 + 0.7, sx: w + 1.4, sy: 1.3, sz: 1.4 });
      for (let i = 0; i < 6; i++) add('box', trim, { x: -w / 2 + 1 + (i * (w - 2)) / 5, y: top + 0.4, z: d / 2 + 0.5, sx: 0.5, sy: 1, sz: 1 });
      for (let s = 1; s < stories; s++) add('box', trim, { y: floorY + s * storyH - 0.3, z: d / 2 + 0.2, sx: w, sy: 0.3, sz: 0.4 }); // belt courses
    } else if (x === 'fire-escape') {
      addFireEscape(frame(add, { x: w / 2, yaw: Math.PI / 2 }), kit, { floors: stories, floorH: storyH, baseY: floorY, w: 12 });
    } else if (x === 'deco-bands') {
      add('box', accent, { y: top - 1.2, z: d / 2 + 0.05, sx: w + 0.1, sy: 0.6, sz: 0.2 });
      add('box', accent, { y: top - 2.4, z: d / 2 + 0.05, sx: w + 0.1, sy: 0.3, sz: 0.2 });
      add(texBox(10, 6, 1.2, 8), wall, { y: top, z: d / 2 - 0.4 }); // raised center parapet
      for (const fx of [-3, 0, 3]) add('box', accent, { x: fx, y: top + 1, z: d / 2 + 0.3, sx: 0.6, sy: 5.4, sz: 0.4 });
      add('box', trim, { y: floorY + 8.3, z: d / 2 + 0.8, sx: w - 4, sy: 0.25, sz: 1.6 }); // eyebrow ledge
    } else if (x === 'garage-2') {
      const gx = -w / 2 - 11, gz = d / 2 - 11 + 5;
      addWalls(add, kit, 22, 10, 22, { x: gx, y: floorY, z: gz });
      addRoof(add, kit, 22, 22, { x: gx, y: floorY + 10, z: gz });
      addGarageDoor(add, kit, { x: gx, y: floorY, z: gz + 11, w: 16 });
      add('box', concrete, { x: gx, z: gz + 11 + 9, sx: 18, sy: 0.15, sz: 18 }); // driveway
    } else if (x === 'ac-ground') addRooftop(add, kit, 'ac', { x: w / 2 + 2.6, z: -d / 4, yaw: Math.PI / 2 });
    else if (x === 'carport') {
      const cx = w / 2 + 6.5;
      for (const sz of [-1, 1]) for (const sx of [-1, 1]) add('box', metal, { x: cx + sx * 5.2, z: sz * 9, sx: 0.4, sz: 0.4, sy: 9 });
      add('box', trim, { x: cx, y: 9, sx: 12, sy: 0.6, sz: 20 });
      add('box', concrete, { x: cx, sx: 12, sy: 0.15, sz: 22 });
    } else if (x === 'upper-lanai') {
      const y = floorY + storyH;
      add('box', concrete, { y: y - 0.5, z: d / 2 + 2.5, sx: w - 2, sy: 0.5, sz: 5 });
      addRail(add, kit, -w / 2 + 1, d / 2 + 5, w / 2 - 1, d / 2 + 5, y);
    } else if (x === 'lava-wall' || x === 'block-wall') {
      const material = x === 'lava-wall' ? kit.m.lava : texturedMat('ashlar', '#dccab0');
      const h = x === 'lava-wall' ? 2.6 : 5, z = d / 2 + porchD + 6, half = w / 2 + 8;
      for (const s of [-1, 1]) add(texBox(half - 2.5, h, 1.6, 4), material, { x: s * (half + 2.5) / 2, z });
      if (x === 'block-wall') for (const s of [-1, 1]) add(texBox(1.6, h, z + d / 2 - 2, 4), material, { x: s * half, z: (z - d / 2) / 2 - 1 });
    } else if (x === 'gravel') add('box', texturedMat('stucco', '#cdb48e'), { z: d / 2 + 7, sx: w + 14, sy: 0.12, sz: 12 });
    else if (x === 'dormer') {
      const dz = d / 2 - 3.5, by = top - 0.5;
      addWalls(add, kit, 7, 6.5, 5, { y: by, z: dz });
      addRoof(add, kit, 7, 5, { y: by + 6.5, z: dz, shape: 'gable', ridge: 'z', pitch: 0.75, eave: 0.6 });
      addWindow(add, kit, { y: by + 2.5, z: dz + 2.5, w: 3.4, h: 3 });
    }
  }
}

/** A small red barn (gable roof, white trim cross doors), front +Z. */
function makeBarn(kit) {
  return merged((add) => {
    const red = mat('#a8322a');
    add('box', red, { sx: 20, sy: 12, sz: 24 });
    add('prism', kit.m.dark, { y: 12, sx: 11, sy: 7, sz: 25 });
    add('box', kit.m.trim, { y: 0, z: 12.05, sx: 9, sy: 9, sz: 0.1 });
    add('box', red, { y: 0.5, z: 12.12, sx: 8, sy: 8, sz: 0.1 });
    for (const s of [-1, 1]) add('cbox', kit.m.trim, { y: 4.5, z: 12.2, roll: s * 0.785, sx: 11, sy: 0.4, sz: 0.1 });
  }, { name: 'barn' });
}

/**
 * Build the swatch house for a family → `{object, kit, size {w, d}, door}`. Options: variant, palette, season (for the
 * trees), seed (picks tree kinds). `object` holds the merged house plus separate prop objects.
 */
export function createSwatchHouse(key, { variant = null, palette = 0, season = 'summer' } = {}) {
  const kit = styleKit(key, { variant, palette });
  const sw = SWATCH[key] ?? { w: 28, d: 24, stories: 1 };
  const group = new THREE.Group();
  group.name = `swatch:${key}`;
  const row = kit.look.extras.includes('row');
  const neighbour = row ? styleKit(key, { variant, palette: palette + 1 }) : null;
  group.add(merged((add) => {
    const info = addBody(add, kit, sw);
    addExtras(add, kit, sw, info);
    if (neighbour) addBody(frame(add, { x: sw.w }), neighbour, { ...sw, doorX: 4 });
  }, { name: 'house' }));
  if (neighbour) group.position.x = -sw.w / 2; // keep the pair centered

  const { w, d } = sw;
  const place = (obj, x, z, ry = 0) => { obj.position.set(x, 0, z); obj.rotation.y = ry; group.add(obj); return obj; };
  const floorY = BASE_HEIGHT[kit.look.base] ?? 0.6;
  for (const x of kit.look.extras) {
    if (x === 'catchment') place(createCatchmentTank(10000), -w / 2 - 8, -d / 4);
    else if (x === 'slippers') place(createSlippers(), (sw.doorX ?? 0) + 1.6, d / 2 + 1.4).position.y = floorY;
    else if (x === 'ranch-fence') place(createFence([{ x: -w / 2 - 6, z: d / 2 + 12 }, { x: -3, z: d / 2 + 12 }]), 0, 0);
    else if (x === 'woodpile') place(createWoodpile(), w / 2 + 4, 0, Math.PI / 2);
    else if (x === 'windmill') place(createWindmill(), w / 2 + 12, -d / 2 - 4);
    else if (x === 'barn') place(makeBarn(kit), -w / 2 - 16, -d / 2 - 10, 0.3);
    else if (x === 'carport') place(createCar(kit.palette.accent), w / 2 + 6.5, 0);
  }
  const [t1, t2 = t1] = kit.trees;
  place(createTree(t1, { season }), -w / 2 - 7, d / 2 + 8);
  place(createTree(t2, { season }), w / 2 + 8, d / 2 + 10);
  return { object: group, kit, size: { w: row ? w * 2 : w, d }, door: new THREE.Vector3(sw.doorX ?? 0, 0, d / 2 + 2) };
}
