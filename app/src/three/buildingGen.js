// Procedural apartment and condo buildings (08 §5, 07 §2, task 35). Browser only. `generate()` turns a seeded plan
// (phases/design/buildingPlan.js) into a merged low-poly building in the family's style and returns the home contract
// plus `plan`, `floorBands` and `units` metadata for the picker. Floors are 1-based, units 0-based (row 0 = street side).
import * as THREE from 'three';
import { merged } from './propKit.js';
import { mat, ownMat, texturedMat } from './materials.js';
import { createTree } from './props.js';
import { styleKit } from './styles.js';
import { addWalkup, addTower, addGlassTower, addTownhomes } from './buildingParts.js';
import {
  planBuilding, floorBase, bodyHeight, floorAt, unitAt, unitCell, homeFloors,
} from '../phases/design/buildingPlan.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Generate a building: `{style, seed, kind: 'apartment'|'condo', settlement, variant?, unit?: {floor, unit}, season?}`
 * → the 08 §5 contract `{object, bounds, door, exit, path, plantSpots, animalSpots, highlight(floor, unit), pick(raycaster),
 * setNight(f), dispose()}` plus `{plan, kit, floorBands, units, setUnit(floor, unit), info}`.
 */
export function generate({ style, seed = 0, kind = 'apartment', settlement = 'small-city', variant = null, unit = null, season = 'summer' }) {
  const plan = planBuilding({ style, variant, seed, kind, settlement });
  const kit = styleKit(style, { variant, palette: plan.palette });
  const wall = texturedMat(plan.wallTex, plan.wallColor, { side: THREE.DoubleSide });
  const glass = ownMat(plan.features.glassTint, { emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 0, roughness: 0.25, metalness: 0.35 });
  let shape;
  const body = merged((add) => {
    if (plan.form === 'tower') shape = addTower(add, kit, plan, wall, glass);
    else if (plan.form === 'glass') shape = addGlassTower(add, kit, plan, glass);
    else if (plan.form === 'townhomes') shape = addTownhomes(add, kit, plan);
    else shape = addWalkup(add, kit, plan, wall);
    const { outerW, outerD } = shape;
    add('box', kit.m.concrete, { z: outerD / 2 + 21, sx: outerW + 40, sy: 0.18, sz: 6 }); // sidewalk
    if (plan.features.resort) {
      add('box', kit.m.concrete, { x: -plan.width / 4 - 4, z: outerD / 2 + 11, sx: plan.width / 2 + 6, sy: 0.25, sz: 14 });
      add('box', mat('#4fb8d8', { rough: 0.2, metal: 0.1 }), { x: -plan.width / 4 - 4, y: 0.05, z: outerD / 2 + 11, sx: plan.width / 2 - 2, sy: 0.3, sz: 9 });
    }
  }, { name: 'building' });
  const kits = shape.kits ?? [kit];

  const object = new THREE.Group();
  object.name = `building:${style}:${kind}:${seed}`;
  object.add(body);
  const { outerW, outerD } = shape;
  const [t1, t2 = t1] = kit.trees;
  for (const [k, x, z] of [[t1, -outerW / 2 - 9, outerD / 2 + 10], [t2, outerW / 2 + 10, outerD / 2 + 9]]) {
    const tree = createTree(k, { season });
    tree.position.set(x, 0, z);
    object.add(tree);
  }

  // Highlight: one translucent glowing box, moved over a floor band or a unit.
  // Sky blue contrasts with every family palette (warm walls, brick, pastel, glass); the outline keeps it readable far off.
  const hlMat = new THREE.MeshStandardMaterial({ color: '#4cc9ff', emissive: new THREE.Color('#1aa0ff'), emissiveIntensity: 0.8,
    transparent: true, opacity: 0.62, depthWrite: false });
  const hlGeo = new THREE.BoxGeometry(1, 1, 1);
  const hl = new THREE.Mesh(hlGeo, hlMat);
  const hlEdges = new THREE.LineSegments(new THREE.EdgesGeometry(hlGeo), new THREE.LineBasicMaterial({ color: '#ffffff' }));
  hl.add(hlEdges);
  hl.name = 'highlight';
  hl.visible = false;
  hl.renderOrder = 2;
  object.add(hl);

  const H = bodyHeight(plan);
  const whole = plan.form === 'townhomes';
  const floorBands = [];
  for (let f = 1; f <= plan.floors; f++) floorBands.push({ floor: f, y0: floorBase(plan, f), y1: floorBase(plan, f + 1), homes: f >= plan.firstFloor });
  const units = { cols: plan.cols, rows: plan.rows, perFloor: plan.unitsPerFloor, unitW: plan.unitW, floors: homeFloors(plan) };

  /** Where a unit's balcony / lānai (or townhome front yard) is: [x, y, z]. */
  const unitSpot = (floor, u) => {
    const cell = unitCell(plan, u) ?? { col: 0, row: 0 };
    const x = -plan.width / 2 + (cell.col + 0.5) * plan.unitW + (plan.form === 'walkup' || plan.form === 'lowrise' ? plan.unitW / 4 : 0);
    const y = whole ? 0 : floorBase(plan, floor);
    const out = plan.features.exteriorStairs ? 2.6 : plan.features.balconies && floor > 1 ? 2.4 : 2;
    const z = cell.row === 1 ? -plan.depth / 2 - out : plan.depth / 2 + (whole ? 4 : out);
    return [x, y, z];
  };
  const doorV = V(shape.door[0], 0, shape.door[1]);
  const exit = V(outerW / 2 + 14, 0, outerD / 2 + 21);
  const handle = {
    object, plan, kit, floorBands, units,
    bounds: null,
    door: doorV,
    exit,
    path: [doorV.clone(), V(doorV.x, 0, outerD / 2 + 21), exit.clone()],
    plantSpots: [],
    animalSpots: [],
    info: null,
    /** Point plantSpots / animalSpots at a unit's balcony (in place, so held references update). */
    setUnit(floor, u) {
      const [x, y, z] = unitSpot(floor, u);
      const side = z < 0 ? -1 : 1;
      handle.plantSpots.length = 0;
      handle.plantSpots.push(V(x - 2.5, y, z), V(x + 2.5, y, z));
      handle.animalSpots.length = 0;
      handle.animalSpots.push(V(x, y, z - side * 0.8));
      handle.unit = { floor, unit: u };
    },
    /** Glow floor band `floor` (unit null) or one unit; highlight(null) clears. */
    highlight(floor, u = null) {
      if (!floor || floor < 1 || floor > plan.floors) { hl.visible = false; return; }
      const b = floorBands[floor - 1];
      const cell = u === null || u === undefined ? null : unitCell(plan, u);
      const walk = plan.features.exteriorStairs ? 5.2 : 0;
      const y0 = whole ? 0.8 : b.y0, y1 = whole ? H + 0.8 : b.y1;
      if (cell) {
        const d = plan.depth / plan.rows;
        hl.position.set(-plan.width / 2 + (cell.col + 0.5) * plan.unitW, (y0 + y1) / 2,
          plan.rows === 2 ? (cell.row ? -1 : 1) * (d / 2 + 0.4) : walk / 2);
        hl.scale.set(plan.unitW - 0.8, y1 - y0 - 0.4, d + 0.8 + walk);
      } else {
        hl.position.set(0, (y0 + y1) / 2, walk / 2);
        hl.scale.set(plan.width + 1.2, y1 - y0 - 0.3, plan.depth + 1.2 + walk);
      }
      hl.visible = true;
    },
    /** The home {floor, unit} under a raycaster, or null (roof, lobby, podium, trees). */
    pick(raycaster) {
      const hit = raycaster.intersectObject(body, true)[0];
      if (!hit) return null;
      const p = object.worldToLocal(hit.point.clone());
      const floor = whole ? 1 : floorAt(plan, p.y - 0.01);
      if (!floor || floor < plan.firstFloor) return null;
      if (whole && p.y > H + 1) return null;
      const x = Math.max(-plan.width / 2 + 0.01, Math.min(plan.width / 2 - 0.01, p.x));
      const u = unitAt(plan, x, p.z);
      return u === null ? null : { floor, unit: u };
    },
    /** Window glow 0..1 (pass sc.nightFactor). */
    setNight(f) {
      for (const k of kits) k.setNight(f);
      glass.emissiveIntensity = 0.9 * f;
    },
    dispose() {
      object.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      hlMat.dispose();
      hlEdges.geometry.dispose();
      hlEdges.material.dispose();
      glass.dispose();
      for (const k of kits) k.m.glow.dispose();
      object.removeFromParent();
    },
  };
  const first = unit ?? { floor: units.floors[0], unit: 0 };
  handle.setUnit(first.floor, first.unit);
  object.updateMatrixWorld(true);
  handle.bounds = new THREE.Box3().setFromObject(body);
  return handle;
}

