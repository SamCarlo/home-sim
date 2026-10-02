// Apartment and condo building plans (07 §2, 08 §5, task 35). Pure: the seeded numbers behind a generated building
// (form, floors, footprint, unit grid, features), shared by three/buildingGen.js and the picker (task 36).
// Floors are numbered from 1 (ground); units are 0-based within a floor: unit = row * cols + col, row 0 faces the
// street (+Z), row 1 the back. Lengths in feet.
import { styleFamily } from '../../data/styleFamilies.js';
import { createRng, seedFor } from '../../util/rng.js';

/** Floor-to-floor heights (ft) and unit widths per form. */
export const BUILDING = {
  floorH: { walkup: 10, lowrise: 10, tower: 10, glass: 11, townhomes: 9.5 },
  groundH: 14,          // lobby / shop floor
  podiumH: 10,          // a parking deck level
  unitW: { walkup: [22, 26], lowrise: [24, 28], tower: [20, 24], glass: [22, 26], townhomes: [18, 22] },
  depth: { single: 34, double: 62, townhome: 36 },
};

const BRICKS = ['#9a4a38', '#8c3f30', '#a85a40', '#7e4634'];
const WALL_TEX = { brick: 'brick', wood: 'batten', concrete: 'stucco', panel: 'siding', log: 'log', stucco: 'stucco' };

/**
 * Pick the building form for a family's apartment or condo: walkup (≤ 8 floors), tower (concrete, 9+), glass (condo
 * tower), townhomes, or lowrise (condo low/mid-rise, `resort` around a pool).
 */
export function buildingForm(fam, kind, settlement, floors) {
  if (kind === 'condo') {
    const c = fam.condo;
    if (settlement === 'big-city' || floors > 8) return 'glass';
    if (c.townhomes || (floors <= 2 && !c.resort)) return 'townhomes';
    return 'lowrise';
  }
  return floors > 8 ? 'tower' : 'walkup';
}

/**
 * The plan for one building: `{style, variant, kind, form, settlement, seed, palette, floors, floorH, groundH, podium,
 * groundUse ('homes' | 'lobby' | 'shops' | 'parking'), firstFloor (lowest floor with homes), cols, rows, unitsPerFloor,
 * unitW, width, depth, wallTex, wallColor, features {balconies, exteriorStairs, fireEscapes, rooftop, crown, glassTint,
 * resort, deco}}`.
 */
export function planBuilding({ style, variant = null, seed = 0, kind = 'apartment', settlement = 'small-city' }) {
  const fam = styleFamily(style, variant);
  const rng = createRng(seedFor('building', style, variant ?? '', kind, settlement, seed));
  const traits = kind === 'condo' ? fam.condo : fam.apartment;
  const band = traits.floorsBySettlement[settlement] ?? [2, 3];
  const floors = rng.int(band[0], band[1]);
  const form = buildingForm(fam, kind, settlement, floors);
  const a = fam.apartment, c = fam.condo;
  const features = {
    balconies: form === 'glass' || form === 'tower' || form === 'lowrise' ? true : !!a.balconies,
    exteriorStairs: form === 'walkup' && !!a.exteriorStairs,
    fireEscapes: form === 'walkup' && !!a.fireEscapes,
    rooftop: form === 'walkup' ? a.rooftop : form === 'lowrise' ? (fam.look.roof === 'flat' ? 'flat' : a.rooftop) : 'flat',
    crown: form === 'glass' ? (c.crown ?? 'flat') : null,
    glassTint: c.glassTint ?? '#a6d8d8',
    resort: form === 'lowrise' && !!c.resort,
    deco: a.rooftop === 'deco',
  };
  // Units: 4–8 per floor. Single-loaded walkways (outdoor stairs) and townhomes keep one row.
  const singleRow = features.exteriorStairs || form === 'townhomes';
  let per = form === 'townhomes' ? rng.int(4, 6) : rng.int(4, 8);
  const rows = singleRow ? 1 : per >= 6 ? 2 : 1;
  const cols = Math.ceil(per / rows);
  per = cols * rows;
  const [u0, u1] = BUILDING.unitW[form];
  const unitW = Math.round(rng.float(u0, u1));
  const depth = form === 'townhomes' ? BUILDING.depth.townhome : rows === 2 ? BUILDING.depth.double : BUILDING.depth.single;
  const groundUse = form === 'townhomes' ? 'homes'
    : a.groundFloor === 'parking' && form === 'tower' ? 'parking'
    : a.groundFloor === 'shops' && form === 'walkup' && floors >= 4 ? 'shops'
    : form === 'tower' || form === 'glass' || floors >= 5 ? 'lobby' : 'homes';
  const podium = groundUse === 'parking' ? rng.int(2, 3) : 0;
  const material = form === 'glass' ? 'concrete' : form === 'tower' ? 'concrete' : a.material;
  const palette = rng.int(0, fam.palettes.length - 1);
  return {
    style, variant, kind, form, settlement, seed, palette, floors,
    floorH: BUILDING.floorH[form], groundH: groundUse === 'homes' ? BUILDING.floorH[form] : BUILDING.groundH,
    podium, groundUse, firstFloor: groundUse === 'homes' ? 1 : 2 + Math.max(0, podium - 1),
    cols, rows, unitsPerFloor: per, unitW, width: cols * unitW, depth,
    wallTex: WALL_TEX[material] ?? 'stucco',
    wallColor: material === 'brick' ? BRICKS[rng.int(0, BRICKS.length - 1)] : fam.palettes[palette].wall,
    features,
  };
}

/** Height (ft above the ground) of the bottom of floor `floor` (1-based). Podium decks and the lobby are taller/separate. */
export function floorBase(plan, floor) {
  if (floor <= 1) return 0;
  if (plan.podium) {
    if (floor <= plan.podium) return (floor - 1) * BUILDING.podiumH;
    return plan.podium * BUILDING.podiumH + (floor - plan.podium - 1) * plan.floorH;
  }
  return plan.groundH + (floor - 2) * plan.floorH;
}

/** Total wall height of the building body (ft). */
export function bodyHeight(plan) {
  return floorBase(plan, plan.floors + 1);
}

/** The floor (1-based) at height y, or 0 below ground / above the roof. */
export function floorAt(plan, y) {
  if (y < 0 || y >= bodyHeight(plan)) return 0;
  for (let f = plan.floors; f >= 1; f--) if (y >= floorBase(plan, f)) return f;
  return 0;
}

/** Column/row of unit index `unit` → `{col, row}`; null when out of range. */
export function unitCell(plan, unit) {
  if (!Number.isInteger(unit) || unit < 0 || unit >= plan.unitsPerFloor) return null;
  return { col: unit % plan.cols, row: Math.floor(unit / plan.cols) };
}

/** Unit index at local building coordinates (x across the front, z toward the street), or null. */
export function unitAt(plan, x, z) {
  const col = Math.floor((x + plan.width / 2) / plan.unitW);
  if (col < 0 || col >= plan.cols) return null;
  const row = plan.rows === 2 && z < 0 ? 1 : 0;
  return row * plan.cols + col;
}

/** Floors that hold homes, lowest first. Townhomes are whole units, so they count as one floor. */
export function homeFloors(plan) {
  if (plan.form === 'townhomes') return [1];
  const out = [];
  for (let f = plan.firstFloor; f <= plan.floors; f++) out.push(f);
  return out;
}
