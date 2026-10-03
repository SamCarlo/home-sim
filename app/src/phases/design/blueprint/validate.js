// Blueprint validation (07 §5, tasks 39–40; pure). Errors block Move in; warnings only inform. Task 39: required rooms,
// overlaps, setbacks, minimum sizes. Task 40: reachability through doors, bedroom windows, catchment and the budget
// (these need opts.location / opts.budgetCents).
import { BLUEPRINT } from '../../../config.js';
import { ROOM_TYPES, overlaps, roomArea, roomName } from './model.js';
import { blueprintCost, needsCatchment } from './cost.js';
import { formatMoney } from '../../../finance/money.js';
import { YARD_KINDS, coveredYard } from './yard.js';

/** Room ids reachable from outside: BFS over rooms joined by doors, starting at rooms with an outside door. */
export function reachableRooms(bp) {
  const seen = new Set(bp.openings.filter((o) => o.kind === 'door' && !o.roomB).map((o) => o.roomA));
  const queue = [...seen];
  while (queue.length) {
    const id = queue.shift();
    for (const o of bp.openings) {
      if (o.kind !== 'door' || !o.roomB) continue;
      const other = o.roomA === id ? o.roomB : o.roomB === id ? o.roomA : null;
      if (other && !seen.has(other)) { seen.add(other); queue.push(other); }
    }
  }
  return seen;
}

const windowsOf = (bp, id) => bp.openings.filter((o) => o.kind === 'window' && o.roomA === id).length;

const article = (label) => (/^[aeiou]/i.test(label) ? 'an' : 'a');

/**
 * Check a blueprint → `{errors, warnings, cost}`, each `[{code, message, roomIds}]`. Messages are written for students.
 * opts: `{location, budgetCents, included}`; without a location the catchment and cost rules are skipped (cost null).
 */
export function validateBlueprint(bp, { location = null, budgetCents = null, included = {} } = {}) {
  const errors = [];
  const warnings = [];
  for (const type of BLUEPRINT.required) {
    if (!bp.rooms.some((r) => r.type === type)) {
      const label = ROOM_TYPES[type].label.toLowerCase();
      errors.push({ code: `missing-${type}`, message: `Add ${article(label)} ${label}. Every home needs one.`, roomIds: [] });
    }
  }
  bp.rooms.forEach((a, i) => bp.rooms.slice(i + 1).forEach((b) => {
    if (overlaps(a, b)) {
      errors.push({ code: 'overlap', message: `${roomName(bp, a)} and ${roomName(bp, b)} overlap. Move one of them.`, roomIds: [a.id, b.id] });
    }
  }));
  const { lot } = bp;
  const { front, side, rear } = lot.setbacks;
  for (const r of bp.rooms) {
    const out = r.x < side || r.y < front || r.x + r.w > lot.widthFt - side || r.y + r.h > lot.depthFt - rear;
    if (out) {
      errors.push({ code: 'setback', message: `${roomName(bp, r)} is inside a setback (the shaded strip). Keep rooms `
        + `${front} ft from the street, ${side} ft from the sides and ${rear} ft from the back.`, roomIds: [r.id] });
    }
  }
  for (const r of bp.rooms) {
    const t = ROOM_TYPES[r.type];
    const narrow = t.minWidthFt && Math.min(r.w, r.h) < t.minWidthFt;
    if (roomArea(r) < t.minSqft || narrow) {
      const need = [t.minSqft ? `${t.minSqft} sq ft` : null, t.minWidthFt ? `${t.minWidthFt} ft wide` : null].filter(Boolean).join(' and ');
      warnings.push({ code: 'small', message: `${roomName(bp, r)} is small. A ${t.label.toLowerCase()} is usually at least ${need}.`, roomIds: [r.id] });
    }
  }
  if (bp.rooms.length) {
    const outside = bp.openings.filter((o) => o.kind === 'door' && !o.roomB);
    if (!outside.length) {
      errors.push({ code: 'no-entry', message: 'Add a door to the outside. Use the Door tool on an outside wall.', roomIds: [] });
    } else {
      const reach = reachableRooms(bp);
      const lost = bp.rooms.filter((r) => !reach.has(r.id));
      if (lost.length) {
        errors.push({ code: 'unreachable', message: `${lost.map((r) => roomName(bp, r)).join(', ')} can't be reached. `
          + 'Add doors so you can walk there from the front door.', roomIds: lost.map((r) => r.id) });
      }
      if (outside.length === 1) {
        warnings.push({ code: 'one-exit', message: 'Your house has only one outside door. A second one is safer in a fire.', roomIds: [] });
      }
    }
  }
  for (const r of bp.rooms.filter((x) => x.type === 'bedroom')) {
    if (!windowsOf(bp, r.id)) {
      errors.push({ code: 'bedroom-window', message: `${roomName(bp, r)} needs a window on an outside wall. `
        + 'Fire code says every bedroom needs a way out.', roomIds: [r.id] });
    }
  }
  for (const r of bp.rooms.filter((x) => x.type === 'living')) {
    if (!windowsOf(bp, r.id)) warnings.push({ code: 'living-dark', message: `${roomName(bp, r)} has no windows. It will be dark.`, roomIds: [r.id] });
  }
  const kitchenBath = bp.openings.some((o) => o.kind === 'door' && o.roomB && [o.roomA, o.roomB].map((id) => bp.rooms.find((r) => r.id === id)?.type).sort().join() === 'bathroom,kitchen');
  if (kitchenBath) warnings.push({ code: 'bath-kitchen', message: 'A bathroom opens straight into the kitchen. Most codes and cooks prefer a hall in between.', roomIds: [] });
  for (const it of coveredYard(bp)) {
    errors.push({ code: 'yard-overlap', message: `A room sits on the ${YARD_KINDS[it.kind].label.toLowerCase()}. Move one of them.`,
      roomIds: bp.rooms.filter((r) => overlaps(r, it)).map((r) => r.id) });
  }
  let cost = null;
  if (location) {
    if (needsCatchment(location) && !(bp.catchmentGallons > 0)) {
      errors.push({ code: 'catchment', message: 'There is no county water here. Add a catchment tank in the Yard panel.', roomIds: [] });
    }
    cost = blueprintCost(bp, location, { included });
    if (budgetCents != null && cost.totalCents > budgetCents) {
      errors.push({ code: 'budget', message: `The plan costs ${formatMoney(cost.totalCents - budgetCents)} more than your budget. `
        + 'Make rooms smaller, pick cheaper materials or drop yard extras.', roomIds: [] });
    }
  }
  return { errors, warnings, cost };
}

/** Room ids named by any error (the editor outlines them in red). */
export const problemRoomIds = (result) => new Set(result.errors.flatMap((e) => e.roomIds));
