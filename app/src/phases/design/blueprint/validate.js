// Blueprint validation (07 §5, task 39; pure). Errors block Move in; warnings only inform. Task 39 covers the rules
// that need no doors or windows (required rooms, overlaps, setbacks, minimum sizes); task 40 adds reachability,
// bedroom windows, catchment and the budget.
import { BLUEPRINT } from '../../../config.js';
import { ROOM_TYPES, overlaps, roomArea, roomName } from './model.js';

const article = (label) => (/^[aeiou]/i.test(label) ? 'an' : 'a');

/**
 * Check a blueprint → `{errors, warnings}`, each `[{code, message, roomIds}]`. Messages are written for students.
 */
export function validateBlueprint(bp) {
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
  return { errors, warnings };
}

/** Room ids named by any error (the editor outlines them in red). */
export const problemRoomIds = (result) => new Set(result.errors.flatMap((e) => e.roomIds));
