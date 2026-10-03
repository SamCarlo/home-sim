// Blueprint cost (07 §5, task 40; pure). Everything is integer cents. The local cost index is the location's build cost
// per sq ft ÷ $300. Solar and catchment already chosen in site utilities (05 §4) were paid there (in the site work or
// out of the design budget), so only the part above that is charged here.
import { BLUEPRINT } from '../../../config.js';
import { ROOM_TYPES, exteriorWalls, footprintArea, roomArea } from './model.js';

const C = BLUEPRINT.cost;

/** The location's cost index (cost per sq ft ÷ $300). */
export const costIndex = (location) => location.housing.build.buildCostPerSqftCents / C.indexBaseCents;

/** True when the house must have a solar water heater (new single-family homes in Hawaiʻi, 05 §4). */
export const needsSolarWaterHeater = (location) => location.region === 'hawaii';

/** True when the lot has no county water, so the plan needs a catchment tank (07 §5). */
export const needsCatchment = (location) => location.water === 'catchment';

/** Length of the outside walls in feet (lānai/porch sides are open, so they don't count). */
export function wallLength(bp) {
  const lanai = new Set(bp.rooms.filter((r) => r.type === 'lanai').map((r) => r.id));
  return exteriorWalls(bp).filter((s) => !lanai.has(s.roomId)).reduce((t, s) => t + Math.abs(s.x2 - s.x1) + Math.abs(s.y2 - s.y1), 0);
}

/** Perimeter of a fence yard item, in feet. */
const fenceFt = (it) => 2 * (it.w + it.h);

/**
 * Itemized cost → `{lines: [{id, group, label, detail, cents}], totalCents, byGroup {house, shell, openings, yard}}`.
 * opts.included `{solarKw, catchmentGallons}`: what site utilities already paid for.
 */
export function blueprintCost(bp, location, { included = {} } = {}) {
  const cps = location.housing.build.buildCostPerSqftCents;
  const idx = costIndex(location);
  const lines = [];
  const add = (id, group, label, detail, cents) => { if (cents > 0) lines.push({ id, group, label, detail, cents: Math.round(cents) }); };

  for (const type of Object.keys(ROOM_TYPES)) {
    const rooms = bp.rooms.filter((r) => r.type === type);
    if (!rooms.length) continue;
    const sq = rooms.reduce((t, r) => t + roomArea(r), 0);
    const mult = ROOM_TYPES[type].mult;
    add(`room-${type}`, 'house', `${ROOM_TYPES[type].label}${rooms.length > 1 ? ` × ${rooms.length}` : ''}`,
      `${sq.toLocaleString('en-US')} sq ft × ${mult} × $${(cps / 100).toFixed(0)}`, sq * mult * cps);
  }
  const fp = footprintArea(bp);
  if (fp) {
    const mat = bp.roof?.material ?? 'metal';
    const roofSq = Math.round(fp * C.roofOverhang);
    add('roof', 'shell', `Roof (${mat})`, `${roofSq.toLocaleString('en-US')} sq ft × ${C.roofFactor[mat] ?? 1}`,
      roofSq * (C.roofFactor[mat] ?? 1) * C.roofCentsPerSqft * idx);
    const siding = bp.exterior?.siding ?? 'board';
    const wallSq = wallLength(bp) * C.wallHeightFt;
    add('walls', 'shell', `Outside walls (${C.sidingLabel[siding] ?? siding})`, `${wallSq.toLocaleString('en-US')} sq ft × ${C.sidingFactor[siding] ?? 1}`,
      wallSq * (C.sidingFactor[siding] ?? 1) * C.wallCentsPerSqft * idx);
  }
  const extDoors = bp.openings.filter((o) => o.kind === 'door' && !o.roomB).length;
  const inDoors = bp.openings.filter((o) => o.kind === 'door' && o.roomB).length;
  const windows = bp.openings.filter((o) => o.kind === 'window').length;
  add('doors-out', 'openings', 'Outside doors', `${extDoors} × $${C.extDoorCents / 100}`, extDoors * C.extDoorCents);
  add('doors-in', 'openings', 'Inside doors', `${inDoors} × $${C.intDoorCents / 100}`, inDoors * C.intDoorCents);
  add('windows', 'openings', 'Windows', `${windows} × $${C.windowCents / 100}`, windows * C.windowCents);

  for (const [kind, y] of Object.entries(BLUEPRINT.yardKinds)) {
    const items = bp.yard.filter((it) => it.kind === kind);
    if (!items.length) continue;
    if (y.perFt) {
      const ft = items.reduce((t, it) => t + fenceFt(it), 0);
      add(`yard-${kind}`, 'yard', y.label, `${ft} ft × $${y.perFt / 100}`, ft * y.perFt);
    } else if (y.perSqft) {
      const sq = items.reduce((t, it) => t + it.w * it.h, 0);
      add(`yard-${kind}`, 'yard', items.length > 1 ? `${y.label} × ${items.length}` : y.label, `${sq} sq ft × $${y.perSqft / 100}`, sq * y.perSqft);
    } else {
      add(`yard-${kind}`, 'yard', items.length > 1 ? `${y.label} × ${items.length}` : y.label, `${items.length} × $${y.cents / 100}`, items.length * y.cents);
    }
  }
  const solarKw = Math.max(0, (bp.solarKw ?? 0) - (included.solarKw ?? 0));
  add('solar', 'yard', 'Solar panels', `${solarKw} kW × $${C.solarPerKwCents / 100}${included.solarKw ? ` (${included.solarKw} kW paid in site utilities)` : ''}`,
    solarKw * C.solarPerKwCents);
  const gal = Math.max(0, (bp.catchmentGallons ?? 0) - (included.catchmentGallons ?? 0));
  add('catchment', 'yard', 'Catchment tank', `${gal.toLocaleString('en-US')} gal${included.catchmentGallons ? ' more than site utilities' : ''}`,
    (gal / C.catchmentBaseGallons) * C.catchmentBaseCents);
  if (bp.solarWaterHeater || needsSolarWaterHeater(location)) {
    add('solar-water', 'yard', 'Solar water heater', needsSolarWaterHeater(location) ? 'Required in Hawaiʻi' : 'Optional', C.solarWaterHeaterCents);
  }
  const totalCents = lines.reduce((t, l) => t + l.cents, 0);
  const byGroup = { house: 0, shell: 0, openings: 0, yard: 0 };
  for (const l of lines) byGroup[l.group] += l.cents;
  return { lines, totalCents, byGroup };
}
