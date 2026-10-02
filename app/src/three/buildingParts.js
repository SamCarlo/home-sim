// Apartment and condo building bodies (08 §5, task 35), one builder per form from phases/design/buildingPlan.js:
// walkup / lowrise (window rows, lānai walkways + outdoor stairs, balconies, fire escapes, cornices, pitched or flat
// roofs), tower (concrete, lānai balconies, optional parking podium), glass (condo tower with a crown) and townhomes.
// Browser only. Each builder writes into a propKit `merged((add) => …)` build: front +Z, origin = building center.
// Returns `{door: [x, z], outerW, outerD}` (where the entrance is and the footprint incl. podium / walkways).
import { mat } from './materials.js';
import {
  addRoof, addWindow, addDoor, addRail, addFireEscape, addRooftop, addSteps, frame, texBox, styleKit,
} from './styles.js';
import { floorBase, bodyHeight } from '../phases/design/buildingPlan.js';

const colX = (plan, c) => -plan.width / 2 + (c + 0.5) * plan.unitW;

/** Pitched roof shape for a building from the family's apartment rooftop and look. */
function roofShapeFor(plan, kit) {
  const r = plan.features.rooftop;
  if (r === 'hip') return 'hip';
  if (r === 'tile') return 'barrel';
  if (r === 'gable') return 'gable';
  if (plan.form === 'lowrise' && ['hip', 'barrel', 'gable'].includes(kit.look.roof)) return kit.look.roof;
  return 'flat';
}

/** Plain glowing window panels (cheap) along a wall frame facing +Z: `count` windows over `length` ft at sill y. */
function panelRow(at, kit, { count, length, y, h = 4.5, w = 3 }) {
  for (let i = 0; i < count; i++) at('box', kit.m.glow, { x: -length / 2 + (i + 0.5) * (length / count), y, z: 0.05, sx: w, sy: h, sz: 0.12 });
}

/** A walk-up, mid-rise or condo low-rise. */
export function addWalkup(add, kit, plan, wall) {
  const { width: W, depth: D, floors, floorH, features: F } = plan;
  const H = bodyHeight(plan);
  const tile = kit.tile(plan.wallTex);
  const { trim, accent, concrete } = kit.m;
  add(texBox(W, H, D, tile), wall);
  const walk = F.exteriorStairs ? 5.2 : 0;
  const shops = plan.groundUse === 'shops';
  const right = frame(add, { x: W / 2, yaw: Math.PI / 2 });
  const back = frame(add, { z: -D / 2, yaw: Math.PI });
  const left = frame(add, { x: -W / 2, yaw: -Math.PI / 2 });
  for (let f = 1; f <= floors; f++) {
    const y = floorBase(plan, f), sill = y + 2.8;
    const ground = f === 1;
    if (ground && shops) {
      for (let c = 0; c < plan.cols; c++) {
        if (c === Math.floor(plan.cols / 2)) continue;
        addWindow(add, kit, { x: colX(plan, c), y: 1, z: D / 2, w: plan.unitW - 5, h: 8.5, kind: 'storefront' });
        add('cbox', accent, { x: colX(plan, c), y: 10.6, z: D / 2 + 2, pitch: 0.4, sx: plan.unitW - 3, sy: 0.25, sz: 4.4 });
      }
      add('box', accent, { y: 12, z: D / 2 + 0.1, sx: W, sy: 1.6, sz: 0.3 }); // sign band
    } else {
      for (let c = 0; c < plan.cols; c++) {
        const x = colX(plan, c), q = plan.unitW / 4;
        if (ground && c === Math.floor(plan.cols / 2) && !F.exteriorStairs) { addWindow(add, kit, { x: x + q * 1.4, y: sill, z: D / 2 }); continue; }
        if (F.exteriorStairs) { // each unit opens onto the walkway: door + jalousie window
          addDoor(add, kit, { x: x - q, y, z: D / 2 });
          addWindow(add, kit, { x: x + q * 0.9, y: sill, z: D / 2, w: 4 });
        } else for (const dx of [-q, q]) addWindow(add, kit, { x: x + dx, y: sill, z: D / 2 });
      }
    }
    addSideWindows(right, kit, D, sill, plan);
    panelRow(back, kit, { count: plan.cols * 2, length: W - 4, y: sill });
    panelRow(left, kit, { count: Math.max(2, Math.round(D / 12)), length: D - 6, y: sill });
    if (f > 1 && (F.balconies && !F.exteriorStairs)) addBalconies(add, kit, plan, y, D / 2, plan.form === 'lowrise' ? 6 : 4.5);
    if (f > 1 && !F.exteriorStairs && plan.features.rooftop !== 'hip') add('box', trim, { y: y - 0.35, z: D / 2 + 0.15, sx: W + 0.2, sy: 0.35, sz: 0.4 }); // belt course
    if (walk && f > 1) {
      add('box', concrete, { x: 3, y: y - 0.5, z: D / 2 + walk / 2, sx: W + 6, sy: 0.5, sz: walk });
      addRail(add, kit, -W / 2, D / 2 + walk - 0.2, W / 2 + 6, D / 2 + walk - 0.2, y, { kind: 'wood' });
    }
  }
  if (F.resort) addBalconies(add, kit, plan, 0.3, D / 2, 7, true);
  // Entrance.
  let door = [0, D / 2 + 3];
  if (!F.exteriorStairs) {
    const glass = shops || plan.groundUse === 'lobby' || plan.form === 'lowrise';
    addDoor(add, kit, { x: 0, y: 0, z: D / 2, w: glass ? 6 : 3.6, h: 7.5, glass });
    add('cbox', F.deco ? trim : accent, { y: 9.2, z: D / 2 + 2.4, sx: 9, sy: 0.4, sz: 4.8 }); // canopy
  }
  if (walk) door = addOutdoorStairs(add, kit, plan, H, walk);
  if (F.fireEscapes) {
    for (const c of [0, plan.cols - 1]) {
      addFireEscape(add, kit, { x: colX(plan, c), z: D / 2, floors, floorH, baseY: plan.groundH - floorH, w: Math.min(11, plan.unitW - 6) });
    }
  }
  if (F.deco) addDecoTop(add, kit, plan, H);
  // Roof.
  const shape = roofShapeFor(plan, kit);
  if (shape === 'flat') {
    addRoof(add, kit, W, D, { y: H, shape: 'flat', parapet: 2.5 });
    if (['water-tank', 'parapet'].includes(F.rooftop)) addCornice(add, kit, W, D, H);
    if (F.rooftop === 'water-tank') addRooftop(add, kit, 'water-tank', { x: W / 4, y: H + 0.6, z: -D / 6 });
    else addRooftop(add, kit, 'ac', { x: -W / 4, y: H + 0.6, z: -D / 5 });
  } else {
    const pitch = Math.min(kit.look.pitch || 0.35, shape === 'gable' ? 0.6 : 0.45);
    addRoof(add, kit, W + (walk ? 6 : 0), D + walk, { x: walk ? 3 : 0, y: H, z: walk / 2, shape, pitch, eave: Math.max(1.5, kit.look.eave), ridge: 'x' });
  }
  add('box', concrete, { y: 0, z: D / 2 + 1.6, sx: W, sy: 0.25, sz: 3.2 }); // front apron
  return { door, outerW: W + (walk ? 12 : 0), outerD: D + walk * 2 };
}

/** Windows on the +X side wall (frame facing +X). */
function addSideWindows(at, kit, D, sill, plan) {
  const n = Math.max(2, Math.round(D / 12));
  for (let i = 0; i < n; i++) addWindow(at, kit, { x: -(D - 6) / 2 + (i + 0.5) * ((D - 6) / n), y: sill, z: 0, w: plan.form === 'walkup' ? 3 : 4 });
}

/** One balcony / lānai per unit column on the front wall (z0) at floor height y; `ground` = patios at grade. */
function addBalconies(add, kit, plan, y, z0, depth, ground = false) {
  const { concrete } = kit.m;
  const bw = Math.min(plan.unitW - 6, 12);
  for (let c = 0; c < plan.cols; c++) {
    const x = colX(plan, c) + plan.unitW / 4;
    add('box', concrete, { x, y: y - 0.45, z: z0 + depth / 2, sx: bw, sy: 0.45, sz: depth });
    if (ground) continue;
    addRail(add, kit, x - bw / 2, z0 + depth, x + bw / 2, z0 + depth, y);
    for (const s of [-1, 1]) addRail(add, kit, x + (s * bw) / 2, z0, x + (s * bw) / 2, z0 + depth, y);
  }
}

/** Switchback outdoor stairs at the +X end of the lānai walkways. Returns the door spot [x, z] at their foot. */
function addOutdoorStairs(add, kit, plan, H, walk) {
  const { width: W, depth: D, floors } = plan;
  const { concrete, trim } = kit.m;
  const sx = W / 2 + 3, zf = D / 2 + walk;
  for (let f = 1; f < floors; f++) {
    const y0 = floorBase(plan, f), y1 = floorBase(plan, f + 1), rise = y1 - y0, run = 12;
    const dir = f % 2 ? -1 : 1; // alternate the flight direction
    const zMid = zf - 1 - run / 2;
    add('cbox', concrete, { x: sx, y: y0 + rise / 2, z: zMid, pitch: dir * Math.atan2(rise, run), sx: 4.2, sy: 0.5, sz: Math.hypot(run, rise) });
    addRail(add, kit, sx + 2.2, zMid - run / 2, sx + 2.2, zMid + run / 2, y0 + rise / 2 - 1, { kind: 'wood' });
  }
  for (const z of [zf - 0.4, zf - 13]) add('box', trim, { x: sx + 2.2, z, sx: 0.6, sz: 0.6, sy: H });
  for (let c = 0; c <= plan.cols; c++) add('box', trim, { x: -W / 2 + c * plan.unitW, z: zf - 0.4, sx: 0.5, sz: 0.5, sy: H });
  return [sx, zf + 2];
}

/** Cornice along the front top and the +X side (brick walk-ups). */
function addCornice(add, kit, W, D, H) {
  const { trim } = kit.m;
  add('box', trim, { y: H + 1.2, z: D / 2 + 0.8, sx: W + 1.6, sy: 1.4, sz: 1.6 });
  add('box', trim, { x: W / 2 + 0.8, y: H + 1.2, sx: 1.6, sy: 1.4, sz: D + 1.6 });
  const n = Math.max(4, Math.round(W / 6));
  for (let i = 0; i <= n; i++) add('box', trim, { x: -W / 2 + (i * W) / n, y: H + 0.2, z: D / 2 + 0.6, sx: 0.6, sy: 1, sz: 1.2 });
}

/** Art deco top: accent bands, a raised center parapet with fins, eyebrow ledges over each floor. */
function addDecoTop(add, kit, plan, H) {
  const { width: W, depth: D, floors } = plan;
  const { accent, trim, wall } = kit.m;
  add('box', accent, { y: H - 1.4, z: D / 2 + 0.06, sx: W + 0.2, sy: 0.7, sz: 0.25 });
  add('box', accent, { y: H - 2.8, z: D / 2 + 0.06, sx: W + 0.2, sy: 0.35, sz: 0.25 });
  add(texBox(14, 9, 1.4, 8), wall, { y: H, z: D / 2 - 0.4 });
  for (const fx of [-4, 0, 4]) add('box', accent, { x: fx, y: H + 1, z: D / 2 + 0.4, sx: 0.8, sy: 8.4 + (fx ? 0 : 3), sz: 0.5 });
  for (let f = 1; f <= floors; f++) {
    const y = floorBase(plan, f) + 8.2;
    add('box', trim, { y, z: D / 2 + 0.9, sx: W - 2, sy: 0.25, sz: 1.8 });
  }
  add('box', accent, { x: W / 2 - 0.2, y: 0.5, z: D / 2 - 0.2, sx: 1.2, sy: H - 1, sz: 1.2 }); // corner pilaster
}

/** Concrete tower with lānai balconies, a lobby or parking podium, mullions and a mechanical penthouse. */
export function addTower(add, kit, plan, wall, glass) {
  const { width: W, depth: D, floors, rows } = plan;
  const H = bodyHeight(plan);
  const { trim, concrete, dark, accent } = kit.m;
  const P = plan.podium ? floorBase(plan, plan.podium + 1) : 0;
  let outerW = W, outerD = D;
  if (P) {
    outerW = W + 20; outerD = D + 14;
    add('box', concrete, { sx: outerW, sy: P, sz: outerD });
    for (let l = 0; l < plan.podium; l++) {
      const y = l * 10 + 2.6;
      add('box', dark, { y, z: outerD / 2 + 0.05, sx: outerW - 6, sy: 4.4, sz: 0.1 });
      add('box', dark, { x: outerW / 2 + 0.05, y, sx: 0.1, sy: 4.4, sz: outerD - 6 });
    }
    add('box', mat('#5f8f4a'), { y: P, z: outerD / 2 - 3, sx: outerW - 2, sy: 1.2, sz: 4 }); // planter edge
  }
  add(texBox(W, H - P, D, kit.tile(plan.wallTex)), wall, { y: P });
  // Lobby: glass front at the base of the tower (or of the podium).
  add('box', glass, { y: 0.5, z: outerD / 2 + 0.06, sx: Math.min(30, outerW - 10), sy: 11, sz: 0.12 });
  add('cbox', accent, { y: 12.4, z: outerD / 2 + 4, sx: 16, sy: 0.6, sz: 8 });
  for (let f = Math.max(2, plan.podium + 1); f <= floors; f++) {
    const y = floorBase(plan, f);
    for (const s of [-1, 1]) {
      add('box', kit.m.glow, { y: y + 2.4, z: s * (D / 2 + 0.05), sx: W - 2, sy: 5.4, sz: 0.12 });
      add('box', kit.m.glow, { x: s * (W / 2 + 0.05), y: y + 2.4, sx: 0.12, sy: 5.4, sz: D - 2 });
    }
    for (let c = 0; c < plan.cols; c++) {
      const x = colX(plan, c);
      for (const s of rows === 2 ? [1, -1] : [1]) {
        add('box', concrete, { x, y: y - 0.45, z: s * (D / 2 + 3), sx: plan.unitW - 3, sy: 0.45, sz: 6 });
        add('box', glass, { x, y, z: s * (D / 2 + 5.9), sx: plan.unitW - 3, sy: 3.1, sz: 0.12 });
        add('box', trim, { x, y: y + 3.1, z: s * (D / 2 + 5.9), sx: plan.unitW - 3, sy: 0.22, sz: 0.3 });
      }
    }
  }
  for (let c = 1; c < plan.cols; c++) for (const s of [1, -1]) add('box', trim, { x: -W / 2 + c * plan.unitW, y: P, z: s * (D / 2 + 0.3), sx: 1.2, sy: H - P, sz: 0.6 });
  addRoof(add, kit, W, D, { y: H, shape: 'flat', parapet: 3 });
  add('box', concrete, { x: -W / 6, y: H, z: -D / 8, sx: W * 0.35, sy: 11, sz: D * 0.4 }); // mechanical penthouse
  addRooftop(add, kit, 'ac', { x: W / 4, y: H + 0.6, z: D / 6 });
  return { door: [0, outerD / 2 + 3], outerW, outerD };
}

/** Glass condo tower: dark core, a glazed band per floor between white slab edges, balconies and a family crown. */
export function addGlassTower(add, kit, plan, glass) {
  const { width: W, depth: D, floors, floorH } = plan;
  const H = bodyHeight(plan);
  const { trim, dark, accent, concrete } = kit.m;
  const crown = plan.features.crown;
  const curve = crown === 'curve';
  add('box', dark, { sx: W - 1, sy: H, sz: D - 1 });
  add('box', glass, { y: 0.4, sx: W - 0.6, sy: plan.groundH - 1, sz: D - 0.6 }); // tall lobby
  for (let f = 2; f <= floors + 1; f++) {
    const y = floorBase(plan, f);
    add('box', trim, { y: y - 0.6, sx: W + 0.8, sy: 0.9, sz: D + 0.8 });
    if (curve) add('cyl12', trim, { x: W / 2, y: y - 0.6, sx: D / 2 + 0.4, sz: D / 2 + 0.4, sy: 0.9 });
    if (f > floors) break;
    add('box', glass, { y: y + 0.3, sx: W, sy: floorH - 0.9, sz: D });
    if (curve) add('cyl12', glass, { x: W / 2, y: y + 0.3, sx: D / 2, sz: D / 2, sy: floorH - 0.9 });
    for (let c = 0; c < plan.cols; c += 1) {
      if ((c + f) % 2) continue; // staggered balconies give the facade its rhythm
      const x = colX(plan, c);
      add('box', trim, { x, y: y - 0.4, z: D / 2 + 2.5, sx: plan.unitW - 4, sy: 0.4, sz: 5 });
      add('box', glass, { x, y, z: D / 2 + 4.9, sx: plan.unitW - 4, sy: 3.2, sz: 0.12 });
    }
  }
  add('cbox', accent, { y: plan.groundH - 1, z: D / 2 + 4, sx: 18, sy: 0.6, sz: 8 });
  if (crown === 'slant') addRoof(add, kit, W, D, { y: H, shape: 'shed', pitch: 0.35, eave: 0.5, gables: true });
  else if (crown === 'setback') {
    add('box', glass, { y: H, sx: W * 0.7, sy: 14, sz: D * 0.7 });
    add('box', trim, { y: H + 14, sx: W * 0.7 + 0.8, sy: 1, sz: D * 0.7 + 0.8 });
    add('box', glass, { y: H + 15, sx: W * 0.42, sy: 10, sz: D * 0.42 });
    add('cyl6', kit.m.metal, { y: H + 25, sx: 0.6, sz: 0.6, sy: 24 }); // spire
  } else if (crown === 'curve') {
    add('box', accent, { x: W / 2 - 2, y: H, sx: 2, sy: 22, sz: D * 0.6 });
    add('box', trim, { y: H, sx: W, sy: 3, sz: D });
  } else if (crown === 'fin') {
    add('box', accent, { y: H - 30, z: D / 2 + 1, sx: 4, sy: 56, sz: 2.4 });
    add('box', trim, { y: H, sx: W, sy: 3, sz: D });
  } else {
    addRoof(add, kit, W, D, { y: H, shape: 'flat', parapet: 3 });
    addRooftop(add, kit, 'ac', { x: -W / 4, y: H + 0.6, z: 0 });
  }
  add('box', concrete, { z: D / 2 + 1.6, sx: W, sy: 0.25, sz: 3.2 });
  return { door: [0, D / 2 + 3], outerW: W + (curve ? D / 2 : 0), outerD: D + 10 };
}

/** A row of townhomes, alternating palettes, each with its own roof, door, stoop and windows. */
export function addTownhomes(add, kit, plan) {
  const { width: W, depth: D, floors, floorH, unitW, cols } = plan;
  const H = floors * floorH, base = 0.8;
  const kits = [0, 1, 2].map((i) => (i ? styleKit(plan.style, { variant: plan.variant, palette: plan.palette + i }) : kit));
  const look = kit.look.roof;
  const shape = look === 'flat' ? 'flat' : look === 'hip' ? 'hip' : look === 'barrel' ? 'barrel' : 'gable';
  for (let c = 0; c < cols; c++) {
    const k = kits[c % 3], x = colX(plan, c);
    add('box', kit.m.concrete, { x, sx: unitW, sy: base, sz: D });
    add(texBox(unitW, H, D, k.tile(k.look.wallTex)), k.m.wall, { x, y: base });
    addRoof(add, k, unitW, D, { x, y: base + H, shape, pitch: Math.min(0.7, k.look.pitch || 0.5), eave: 1, ridge: 'z' });
    addDoor(add, k, { x: x - unitW / 4, y: base, z: D / 2 });
    addSteps(add, k, { x: x - unitW / 4, z: D / 2, h: base, w: 4, material: kit.m.concrete });
    for (let s = 0; s < floors; s++) {
      const y = base + s * floorH + 2.6;
      if (s === 0) addWindow(add, k, { x: x + unitW / 5, y, z: D / 2 });
      else for (const dx of [-unitW / 4, unitW / 5]) addWindow(add, k, { x: x + dx, y, z: D / 2 });
    }
  }
  const right = frame(add, { x: W / 2, yaw: Math.PI / 2 });
  for (let s = 0; s < floors; s++) panelRow(right, kit, { count: 2, length: D - 10, y: base + s * floorH + 2.6 });
  return { door: [colX(plan, 0) - unitW / 4, D / 2 + 3], outerW: W, outerD: D, kits };
}
