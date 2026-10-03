// Blueprint → 3D (08 §5, 07 §5, task 41). Browser only. `build()` turns a student's blueprint (feet, origin front-left,
// y toward the back) into a merged low-poly house: a slab per room, 9 ft × 0.5 ft walls (exterior segments plus each
// shared wall once), door and window panels, a roof per room at one shared eave height in the chosen style, material
// and color, the siding, and the yard (lawn, sidewalk, garden beds, fruit trees, coop, fence, driveway, patio, rain
// garden, solar, catchment). Returns the 08 §5 home contract. The street (the lot's front edge) sits at
// z = BLUEPRINT.view3d.streetZ like the generated houses, so blueprints share their framing and lot pad.
import * as THREE from 'three';
import { merged, instanceProp, m as pm } from './propKit.js';
import { mat, texturedMat } from './materials.js';
import { createTree, createGardenBed, createCoop, createCatchmentTank, createSolarArray, createFence, createCar, createPlant } from './props.js';
import { styleKit, addRoof, addWindow, addDoor, addGarageDoor, frame, texBox } from './styles.js';
import { lawnColor } from './houseYard.js';
import { exteriorWalls, sharedWalls, editWindow } from '../phases/design/blueprint/model.js';
import { fruitTreeKind } from '../phases/design/housePlan.js';
import { BLUEPRINT } from '../config.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DS = THREE.DoubleSide;
const SIDING_TEX = { board: 'siding', 'board-and-batten': 'batten', stucco: 'stucco', brick: 'brick', log: 'log', vinyl: 'siding' };
const ROOF_TEX = { metal: 'metal', shingle: 'shingle', tile: 'tile' };
/** Outward yaw per wall side (local +Z → outside). */
const YAW = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
const NORMAL = { front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0] };
const EPS = 0.01;

/** Which side of `room` a wall segment lies on. */
function sideOf(room, s) {
  if (Math.abs(s.y1 - s.y2) < EPS) return Math.abs(s.y1 - room.y) < EPS ? 'front' : 'back';
  return Math.abs(s.x1 - room.x) < EPS ? 'left' : 'right';
}

/** The kit for a blueprint: the family's look and palette with the student's siding, roof and trim choices. */
function blueprintKit(bp, style, styleVariant, palette) {
  const base = styleKit(style, { variant: styleVariant, palette: palette ?? 0 });
  const wallTex = SIDING_TEX[bp.exterior?.siding] ?? 'siding';
  const roofTex = ROOF_TEX[bp.roof?.material] ?? 'metal';
  const look = { ...base.look, wallTex, roofTex, window: base.look.window === 'storefront' ? 'grid' : base.look.window };
  const m = {
    ...base.m,
    wall: texturedMat(wallTex, bp.exterior?.color ?? base.palette.wall, { side: DS }),
    roof: texturedMat(roofTex, bp.roof?.color ?? base.palette.roof, { side: DS, rough: roofTex === 'metal' ? 0.6 : 0.9 }),
    trim: mat(bp.exterior?.trim ?? base.palette.trim),
  };
  return { ...base, look, m };
}

/**
 * Build a blueprint in 3D: `build(bp, {style, styleVariant?, palette?, biome?, season?, snow?, seed?})` → the 08 §5
 * contract `{object, bounds, door, exit, path, plantSpots, animalSpots, highlight, pick, setNight, dispose}` plus
 * `{kit, info {rooms, walls, openings, yard}}`. Works on any blueprint, including an empty or mid-edit one.
 */
export function build(bp, { style, styleVariant = null, palette = 0, biome = null, season = 'summer', snow = false, seed = 0 } = {}) {
  const C = BLUEPRINT.view3d;
  const kit = blueprintKit(bp, style, styleVariant, palette);
  const W = bp.lot.widthFt;
  const X = (x) => x - W / 2;
  const Z = (y) => C.streetZ - y;
  const win = editWindow(bp.lot);
  const floorY = C.slabFt, eaveY = C.slabFt + C.wallFt, T = C.wallThickFt;
  const rooms = bp.rooms;
  const byId = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const open = (r) => r.type === 'lanai';
  const fp = rooms.length
    ? { minX: X(Math.min(...rooms.map((r) => r.x))), maxX: X(Math.max(...rooms.map((r) => r.x + r.w))),
      frontZ: Z(Math.min(...rooms.map((r) => r.y))), backZ: Z(Math.max(...rooms.map((r) => r.y + r.h))) }
    : { minX: X(win.x0 + (win.x1 - win.x0) / 2) - 10, maxX: X(win.x0 + (win.x1 - win.x0) / 2) + 10, frontZ: Z(16), backZ: Z(36) };
  const info = { rooms: rooms.length, walls: 0, openings: bp.openings.length, yard: bp.yard.length };
  const extDoors = [];

  // A wall segment as a 0.5 ft box centered on the line (local length along X, facing +Z at yaw 0).
  const wallBox = (add, s, side) => {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (len < EPS) return;
    const vertical = side === 'left' || side === 'right';
    const at = frame(add, { x: X((s.x1 + s.x2) / 2), z: Z((s.y1 + s.y2) / 2), yaw: vertical ? Math.PI / 2 : 0 });
    at(texBox(len + T, C.wallFt, T, kit.tile(kit.look.wallTex)), kit.m.wall, { y: floorY });
    info.walls++;
  };
  const yardItems = (kind) => bp.yard.filter((it) => it.kind === kind);
  const center = (it) => ({ x: X(it.x + it.w / 2), z: Z(it.y + it.h / 2) });

  const body = merged((add) => {
    // Lawn over the editing window and a sidewalk along the street.
    const lawnW = win.x1 - win.x0, lawnD = win.y1 - win.y0;
    add('box', mat(lawnColor(biome, snow)), { x: X(win.x0 + lawnW / 2), y: -0.05, z: Z(lawnD / 2), sx: lawnW, sy: 0.08, sz: lawnD });
    add('box', kit.m.concrete, { x: X(win.x0 + lawnW / 2), z: C.streetZ + 2.5, sx: Math.max(lawnW, 120), sy: 0.12, sz: 5 });

    // Floors: a slab per room (lānai get a wood deck), with posts on the lānai's open corners.
    for (const r of rooms) {
      add('box', open(r) ? kit.m.wood : kit.m.concrete, { x: X(r.x + r.w / 2), z: Z(r.y + r.h / 2), sx: r.w, sy: floorY, sz: r.h });
      if (open(r)) {
        for (const [px, py] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
          add('cbox', kit.m.trim, { x: X(px) + (px === r.x ? 0.3 : -0.3), y: floorY + C.wallFt / 2, z: Z(py) + (py === r.y ? -0.3 : 0.3), sx: 0.5, sy: C.wallFt, sz: 0.5 });
        }
      }
    }
    // Walls: exterior segments (not on lānai), then each shared wall once.
    for (const s of exteriorWalls(bp)) if (!open(byId[s.roomId])) wallBox(add, s, s.side);
    rooms.forEach((a, i) => rooms.slice(i + 1).forEach((b) => {
      if (open(a) && open(b)) return;
      for (const s of sharedWalls(a, b)) wallBox(add, s, s.side);
    }));

    // Openings: exterior doors and windows face out; interior doors are a panel through the wall.
    for (const o of bp.openings) {
      const a = byId[o.roomA];
      if (!a) continue;
      const cx = (o.x1 + o.x2) / 2, cy = (o.y1 + o.y2) / 2;
      const len = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
      const w = Math.min(o.widthFt ?? len, len);
      const side = sideOf(a, o);
      if (o.roomB) {
        const vertical = side === 'left' || side === 'right';
        add('cbox', kit.m.wood, { x: X(cx), y: floorY + C.doorFt / 2, z: Z(cy), yaw: vertical ? Math.PI / 2 : 0, sx: w, sy: C.doorFt, sz: T + 0.2 });
        continue;
      }
      if (open(a)) continue; // an open lānai edge needs no panel
      const [nx, ny] = NORMAL[side];
      const at = frame(add, { x: X(cx) + nx * (T / 2), z: Z(cy) - ny * (T / 2), yaw: YAW[side] });
      if (o.kind === 'door') {
        addDoor(at, kit, { y: floorY, w, h: C.doorFt });
        extDoors.push({ side, pos: V(X(cx) + nx * 2, floorY, Z(cy) - ny * 2), out: V(nx, 0, -ny) });
      } else {
        addWindow(at, kit, { y: floorY + C.sillFt, w, h: C.windowFt });
      }
    }
    // Garages get a garage door on their front wall.
    for (const r of rooms.filter((q) => q.type === 'garage')) {
      const front = exteriorWalls(bp).find((s) => s.roomId === r.id && s.side === 'front');
      if (!front) continue;
      const len = front.x2 - front.x1;
      if (len < 9) continue;
      addGarageDoor(frame(add, { x: X((front.x1 + front.x2) / 2), z: Z(front.y1) + T / 2 }), kit, { y: floorY, w: Math.min(16, len - 3) });
    }

    // Roofs: one per room at the shared eave height.
    const shape = bp.roof?.style ?? 'gable';
    for (const r of rooms) {
      addRoof(add, kit, r.w, r.h, { x: X(r.x + r.w / 2), z: Z(r.y + r.h / 2), y: eaveY, shape, pitch: C.pitch[shape] ?? 0,
        eave: C.eaveFt, ridge: r.w >= r.h ? 'x' : 'z', parapet: shape === 'flat' ? 1.2 : 0 });
    }

    // Flat yard items.
    for (const it of yardItems('driveway')) { const c = center(it); add('box', kit.m.concrete, { x: c.x, z: c.z, sx: it.w, sy: 0.15, sz: it.h }); }
    for (const it of yardItems('patio')) { const c = center(it); add('box', kit.m.stone, { x: c.x, z: c.z, sx: it.w, sy: 0.25, sz: it.h }); }
    for (const it of yardItems('rain-garden')) {
      const c = center(it);
      add('box', pm('soil'), { x: c.x, z: c.z, sx: it.w, sy: 0.2, sz: it.h });
      for (const [dx, dz] of [[-0.25, -0.25], [0.25, 0], [-0.1, 0.3]]) add('ball0', pm('#4f8a3c'), { x: c.x + dx * it.w, y: 0.6, z: c.z + dz * it.h, s: 1.1 });
    }
  }, { name: 'blueprint-house' });

  const object = new THREE.Group();
  object.name = 'blueprint';
  object.add(body);
  const place = (obj, x, z, ry = 0) => { obj.position.set(x, 0, z); obj.rotation.y = ry; object.add(obj); return obj; };
  const many = (proto, spots, name) => { if (spots.length) object.add(instanceProp(proto, spots, { name })); };

  // Yard props.
  const beds = yardItems('garden-bed').map((it) => ({ ...center(it), ry: it.w < it.h ? Math.PI / 2 : 0 }));
  many(createGardenBed(), beds, 'garden-beds');
  if (beds.length) many(createPlant('vegetable'), beds.map((b) => ({ ...b, y: 0.9 })), 'bed-plants');
  const trees = yardItems('fruit-tree').map(center);
  many(createTree(fruitTreeKind(biome, seed), { season }), trees, 'fruit-trees');
  const coops = yardItems('coop').map((it) => ({ ...center(it), ry: it.w > it.h ? Math.PI / 2 : 0 }));
  for (const c of coops) place(createCoop(), c.x, c.z, c.ry);
  for (const it of yardItems('fence')) {
    const pts = [[it.x, it.y], [it.x, it.y + it.h], [it.x + it.w, it.y + it.h], [it.x + it.w, it.y]].map(([x, y]) => ({ x: X(x), z: Z(y) + (y === it.y ? -0.5 : 0) }));
    object.add(createFence(pts));
  }
  const drives = yardItems('driveway');
  let carAt = null;
  if (drives.length) {
    const d = drives[0], c = center(d);
    carAt = { x: c.x, z: Z(d.y) - 9 };
    place(createCar('#3b6fb6'), carAt.x, carAt.z);
  }
  const midZ = (fp.frontZ + fp.backZ) / 2;
  if (bp.solarKw > 0) place(createSolarArray(bp.solarKw), (fp.minX + fp.maxX) / 2, fp.backZ - 8);
  if (bp.catchmentGallons > 0) {
    const tank = createCatchmentTank(bp.catchmentGallons);
    const r = Math.sqrt((bp.catchmentGallons * 0.1337) / (Math.PI * (bp.catchmentGallons >= 5000 ? 8 : 6)));
    place(tank, fp.minX - r - 3, midZ);
  }

  // The contract: front-most exterior door → the street (or the car).
  const best = extDoors.sort((a, b) => (b.side === 'front') - (a.side === 'front') || b.pos.z - a.pos.z)[0];
  const door = best ? best.pos.clone() : V((fp.minX + fp.maxX) / 2, floorY, fp.frontZ + 2);
  const step = best ? door.clone().addScaledVector(best.out, 3).setY(0) : door.clone().setY(0);
  const path = [door.clone(), step];
  if (best && best.side === 'back') {
    const sx = step.x < (fp.minX + fp.maxX) / 2 ? fp.minX - 4 : fp.maxX + 4;
    path.push(V(sx, 0, step.z));
  }
  const last = path.at(-1);
  let exit;
  if (carAt) {
    exit = V(carAt.x - 4.5, 0, carAt.z);
    path.push(V(last.x, 0, carAt.z), exit.clone());
  } else {
    exit = V(last.x, 0, C.streetZ + 3);
    path.push(exit.clone());
  }
  const plantSpots = beds.length ? beds.map((b) => V(b.x, 1, b.z)) : [V(door.x + 2, floorY, door.z + 1)];
  const animalSpots = [...coops.map((c) => V(c.x, 0, c.z + 5)), V(door.x - 3, 0, door.z + 4), V(fp.maxX + 5, 0, midZ)];

  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body);
  const bounds = new THREE.Box3(V(fp.minX - 8, 0, fp.backZ - 8), V(fp.maxX + 8, Math.max(box.max.y, eaveY), C.streetZ + 6));
  for (const it of bp.yard) {
    if (it.kind === 'fence') continue;
    const c = center(it);
    bounds.expandByPoint(V(c.x, 0, c.z));
  }
  return {
    object, kit, bounds, door, exit, path, plantSpots, animalSpots, info,
    /** Built houses have no floors or units to pick. */
    highlight() {},
    pick() { return null; },
    /** Window glow 0..1 (pass sc.nightFactor). */
    setNight(f) { kit.setNight(f); },
    dispose() {
      object.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      kit.m.glow.dispose();
      object.removeFromParent();
    },
  };
}
