// Procedural houses (08 §5, 07 §3–§4, task 37). Browser only. `generate()` turns a seeded plan
// (phases/design/housePlan.js) into a merged low-poly house in the family's style: the main block (the styles gallery
// swatch body, styleSwatch.js), wings with their own roofs, the yard (houseYard.js) and yard props, and returns the
// 08 §5 home contract. Origin = lot center, street along +Z.
import * as THREE from 'three';
import { merged, instanceProp } from './propKit.js';
import {
  createTree, createGardenBed, createCoop, createCatchmentTank, createSlippers, createWoodpile, createWindmill,
  createCar, createMailbox,
} from './props.js';
import { styleKit, addWalls, addRoof, addWindowRow, addBase, frame, BASE_HEIGHT } from './styles.js';
import { addBody, addExtras, makeBarn } from './styleSwatch.js';
import { addYard, createBike, createGrainBin } from './houseYard.js';
import { planHouse, fruitTreeKind, HOUSE } from '../phases/design/housePlan.js';
import { createRng, seedFor } from '../util/rng.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CAR_COLORS = ['#3b6fb6', '#c8382e', '#e8e4da', '#5a6068', '#2f6b4a', '#d8a030'];
const BIKE_COLORS = ['#c8382e', '#2f7fb6', '#2f9a5a', '#f2c230'];
/** Extras the swatch body draws that the house replaces with its own yard (walls become fences) or skips. */
const SKIP_EXTRAS = ['lava-wall', 'block-wall', 'fire-escape'];

/** A wing: base, walls, its own roof, windows on the front and the outward faces. */
function addWing(add, kit, wg) {
  const look = kit.look;
  const floorY = addBase(add, kit, wg.w, wg.d);
  const h = wg.stories * wg.storyH;
  addWalls(add, kit, wg.w, h, wg.d, { y: floorY });
  const shape = look.roof === 'aframe' || look.roof === 'saltbox' ? 'gable' : look.roof;
  addRoof(add, kit, wg.w, wg.d, { y: floorY + h, shape, ridge: wg.side === 'back' ? 'z' : 'x',
    pitch: look.roof === 'aframe' ? 0.7 : undefined });
  const store = look.window === 'storefront';
  const win = { w: store ? 5.5 : 3, h: store ? 6.6 : 4.5 };
  const row = (at, len) => {
    for (let s = 0; s < wg.stories; s++) {
      addWindowRow(at, kit, { count: Math.max(1, Math.round(len / (store ? 10 : 8))), length: len - 3,
        y: floorY + s * wg.storyH + (store ? 0.8 : 2.8), ...win });
    }
  };
  if (wg.side !== 'back') row(frame(add, { z: wg.d / 2 }), wg.w);
  const out = wg.side === 'left' ? -1 : wg.side === 'right' ? 1 : wg.x < 0 ? -1 : 1;
  row(frame(add, { x: out * wg.w / 2, yaw: out * Math.PI / 2 }), wg.d);
  if (wg.side === 'back') row(frame(add, { z: -wg.d / 2, yaw: Math.PI }), wg.w);
}

/** Where the front path starts: the bottom of the porch, lānai, stoop or entry steps. */
function porchReach(look, main, floorY) {
  if (look.porch === 'stoop') return 2.5 + floorY * 1.9 + 1;
  if (look.porch === 'patio') return main.porchD;
  if (look.porch === 'none') return floorY * 1.6 + 1.5;
  return main.porchD + floorY * 1.6 + 1;
}

/**
 * Generate a house: `{style, seed, variant: 'house'|'shared', palette?, extras?: {gardenBeds 0–3, fruitTrees 0–2, coop},
 * styleVariant?, biome?, season?, snow?, sqft?, bedrooms?}` → the 08 §5 contract `{object, bounds, door, exit, path,
 * plantSpots, animalSpots, highlight, pick, setNight, dispose}` plus `{plan, kit, info}`.
 */
export function generate({
  style, seed = 0, variant = 'house', palette = null, extras = {}, styleVariant = null, biome = null, season = 'summer',
  snow = false, sqft = null, bedrooms = null,
}) {
  const plan = planHouse({ style, styleVariant, seed, variant, palette, sqft, bedrooms });
  const kit = styleKit(style, { variant: styleVariant, palette: plan.palette });
  const bodyKit = { ...kit, look: { ...kit.look, extras: kit.look.extras.filter((x) => !SKIP_EXTRAS.includes(x)) } };
  const kits = [kit];
  const { main, houseZ, footprint, streetZ, driveX } = plan;
  const floorY = BASE_HEIGHT[kit.look.base] ?? 0.6;
  const frontZ = houseZ + main.d / 2;
  const pathFromZ = frontZ + porchReach(kit.look, main, floorY);
  const driveFromZ = plan.garage === 'garage-2' ? frontZ + 5 : plan.garage === 'carport' ? houseZ + 11 : houseZ;
  let yard;
  const body = merged((add) => {
    const at = frame(add, { z: houseZ });
    const info = addBody(at, bodyKit, main);
    addExtras(at, bodyKit, main, info);
    for (const wg of plan.wings) addWing(frame(at, { x: wg.x, z: wg.z }), kit, wg);
    if (plan.row) {
      for (const s of [-1, 1]) { // neighbours in the row, in other palettes
        const nk = styleKit(style, { variant: styleVariant, palette: plan.palette + (s < 0 ? 1 : 2) });
        kits.push(nk);
        addBody(frame(at, { x: s * main.w }), { ...nk, look: bodyKit.look }, main);
      }
    }
    yard = addYard(add, kit, plan, { biome, snow, pathFromZ, driveFromZ });
  }, { name: 'house' });

  const object = new THREE.Group();
  object.name = `house:${style}:${variant}:${seed}`;
  object.add(body);
  const rng = createRng(seedFor('house-props', style, variant, seed));
  const E = HOUSE.lotEdge;
  const place = (obj, x, z, { ry = 0, y = 0 } = {}) => { obj.position.set(x, y, z); obj.rotation.y = ry; object.add(obj); return obj; };

  // Street trees and shade trees from the family's list.
  const [t1, t2 = t1] = kit.trees;
  if (plan.row) place(createTree(t1, { season }), -main.w * 1.5 + 3, streetZ + 4);
  else {
    const away = driveX !== null && driveX > 0 ? -1 : 1; // the front tree goes on the side without the driveway
    place(createTree(t1, { season }), Math.max(-E, Math.min(E, away * (yard.lotW - 8))), streetZ - 9);
    place(createTree(t2, { season }), Math.max(-E, Math.min(E, -away * (yard.lotW - 6))), footprint.backZ - 4);
  }

  // Customization (07 §3): garden beds, fruit trees, a coop. The spots exist either way for later tasks.
  const sp = plan.spots;
  // Repeated props are instanced: every mesh is drawn twice (shadow pass), so draw calls add up fast.
  const many = (proto, spots, name) => { if (spots.length) object.add(instanceProp(proto, spots, { name })); };
  many(createGardenBed(), sp.beds.slice(0, Math.min(3, extras.gardenBeds ?? 0)), 'garden-beds');
  many(createTree(fruitTreeKind(biome, seed), { season }), sp.trees.slice(0, Math.min(2, extras.fruitTrees ?? 0)), 'fruit-trees');
  if (extras.coop) place(createCoop(), sp.coop.x, sp.coop.z, { ry: -Math.PI / 2 });

  // Everyday yard props.
  const sgn = driveX !== null && driveX < 0 ? -1 : 1;
  const mailX = driveX !== null ? driveX - sgn * 7.5 : main.doorX + 4;
  if (!plan.row) place(createMailbox(), mailX, streetZ + 0.6, { ry: Math.PI });
  let carAt = null;
  if (driveX !== null) {
    const cz = plan.garage === 'garage-2' ? frontZ + 14 : plan.garage === 'carport' ? houseZ : frontZ + 3;
    carAt = { x: driveX, z: cz };
    place(createCar(rng.pick(CAR_COLORS)), driveX, cz);
  }
  if (plan.hawaii) place(createSlippers(), main.doorX + 1.6, frontZ + 1.4, { y: floorY });
  many(createBike(rng.pick(BIKE_COLORS)), Array.from({ length: plan.bikes }, (_, i) => ({ x: main.doorX + 4 + i * 1.8, z: pathFromZ + 2.5, ry: -0.25 })), 'bikes');
  const x = kit.look.extras;
  if (x.includes('catchment')) place(createCatchmentTank(10000), Math.max(-E + 6, footprint.minX - 7), houseZ - main.d / 4);
  if (x.includes('woodpile')) place(createWoodpile(), footprint.maxX + 4, houseZ, { ry: Math.PI / 2 });
  if (x.includes('windmill')) place(createWindmill(), Math.min(E - 4, footprint.maxX + 16), Math.max(-E + 4, footprint.backZ - 22));
  if (x.includes('barn')) place(makeBarn(kit), Math.max(-E + 12, footprint.minX - 16), Math.max(-E + 12, footprint.backZ - 20), { ry: 0.3 });
  if (kit.family.house.grainBin) { // beside the barn
    const bx = Math.max(-E + 12, footprint.minX - 16) + 23, bz = Math.max(-E + 12, footprint.backZ - 20) - 4;
    place(createGrainBin(), bx, bz);
  }

  // The contract.
  const door = V(main.doorX, floorY, frontZ + 1.5);
  const steps = V(main.doorX, 0, pathFromZ + 1);
  const path = [door.clone(), steps];
  let exit;
  if (carAt) {
    exit = V(carAt.x - sgn * 4.5, 0, carAt.z);
    path.push(V(main.doorX, 0, Math.max(pathFromZ + 1, Math.min(streetZ - 3, carAt.z))), exit.clone());
  } else {
    exit = V(E, 0, streetZ + 3);
    path.push(V(main.doorX, 0, streetZ + 3), exit.clone());
  }
  const ground = (p, y = 0) => V(p.x, y, p.z);
  const plantSpots = [...sp.beds.map((b) => ground(b, 1)), ground(sp.porch, floorY)];
  const animalSpots = [ground(sp.pet), ground(sp.porch, floorY), ground(sp.coop)];
  object.updateMatrixWorld(true);
  // Frame the house and the yard near it, not the whole lawn and sidewalk.
  const top = new THREE.Box3().setFromObject(body).max.y;
  const bounds = new THREE.Box3(V(footprint.minX - 8, 0, Math.max(-E, footprint.backZ - 8)), V(footprint.maxX + 8, top, streetZ + 6));
  return {
    object, plan, kit,
    bounds,
    door, exit, path, plantSpots, animalSpots,
    info: { beds: plan.beds, baths: plan.baths, sqft: plan.sqft, wings: plan.wings.length },
    /** Houses have no floors or units to pick. */
    highlight() {},
    pick() { return null; },
    /** Window glow 0..1 (pass sc.nightFactor). */
    setNight(f) { for (const k of kits) k.setNight(f); },
    dispose() {
      object.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      for (const k of kits) k.m.glow.dispose();
      object.removeFromParent();
    },
  };
}
