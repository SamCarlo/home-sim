// Blueprint templates (07 §5, task 39; pure): Tiny, Cozy and Family starting plans. Each is at most 36 ft wide and
// 38 ft deep, so it fits inside the setbacks of the narrowest buildable lot (50 ft wide → 40 ft buildable), and it
// comes with the doors and windows the task 40 rules need (every room reachable, every bedroom with a window).
// Room sizes keep Σ area × multiplier well under the tier's budget so roof, walls, doors and yard still fit.
import { addRoom, buildArea, createBlueprint, snap, toggleOpening } from './model.js';

// Rooms are [type, x, y, w, h]; openings are [kind, x, y] points on a wall (template-local feet, y toward the back).
export const TEMPLATES = {
  tiny: {
    label: 'Tiny', blurb: 'About 440 sq ft: one bedroom, one bath.', w: 22, d: 20,
    rooms: [['living', 0, 0, 14, 10], ['kitchen', 14, 0, 8, 10], ['bedroom', 0, 10, 12, 10], ['bathroom', 12, 10, 6, 10],
      ['closet', 18, 10, 4, 10]],
    openings: [['door', 5, 0], ['door', 22, 5], ['door', 14, 5], ['door', 6, 10], ['door', 12, 15], ['door', 20, 10],
      ['window', 10, 0], ['window', 18, 0], ['window', 0, 15], ['window', 6, 20], ['window', 15, 20]],
  },
  cozy: {
    label: 'Cozy', blurb: 'About 810 sq ft: two bedrooms, one bath and a front lānai.', w: 28, d: 32,
    rooms: [['lanai', 0, 0, 14, 6], ['living', 0, 6, 20, 14], ['kitchen', 20, 6, 8, 14], ['bedroom', 0, 20, 10, 12],
      ['bathroom', 10, 20, 6, 12], ['bedroom', 16, 20, 12, 12]],
    openings: [['door', 7, 0], ['door', 7, 6], ['door', 28, 12], ['door', 20, 13], ['door', 5, 20], ['door', 13, 20],
      ['door', 18, 20], ['window', 17, 6], ['window', 24, 6], ['window', 0, 26], ['window', 5, 32], ['window', 28, 26],
      ['window', 22, 32], ['window', 13, 32]],
  },
  family: {
    label: 'Family', blurb: 'About 1,250 sq ft: three bedrooms, two baths, a hallway and a front lānai.', w: 36, d: 38,
    rooms: [['lanai', 0, 0, 16, 6], ['living', 0, 6, 16, 16], ['kitchen', 16, 6, 10, 16], ['bedroom', 26, 6, 10, 16],
      ['hallway', 0, 22, 36, 4], ['bedroom', 0, 26, 12, 12], ['bathroom', 12, 26, 6, 12], ['bedroom', 18, 26, 12, 12],
      ['bathroom', 30, 26, 6, 12]],
    openings: [['door', 8, 0], ['door', 8, 6], ['door', 21, 6], ['door', 16, 14], ['door', 8, 22], ['door', 21, 22],
      ['door', 31, 22], ['door', 6, 26], ['door', 15, 26], ['door', 24, 26], ['door', 33, 26],
      ['window', 0, 14], ['window', 36, 14], ['window', 31, 6], ['window', 0, 32], ['window', 6, 38], ['window', 24, 38],
      ['window', 15, 38], ['window', 33, 38]],
  },
};
export const TEMPLATE_IDS = Object.keys(TEMPLATES);

/**
 * Replace bp's rooms and openings with template `id`, centered across the build area at the front setback.
 * Keeps the lot, roof, exterior, yard and utilities. Returns null if the template doesn't fit the lot.
 */
export function applyTemplate(bp, id) {
  const t = TEMPLATES[id];
  const a = buildArea(bp);
  if (!t || a.x1 - a.x0 < t.w || a.y1 - a.y0 < t.d) return null;
  const ox = Math.max(a.x0, snap(a.x0 + (a.x1 - a.x0 - t.w) / 2));
  const oy = a.y0;
  let next = { ...bp, rooms: [], openings: [] };
  for (const [type, x, y, w, h] of t.rooms) next = addRoom(next, { type, x: ox + x, y: oy + y, w, h });
  for (const [kind, x, y] of t.openings) next = toggleOpening(next, { kind, x: ox + x, y: oy + y });
  return next;
}

/** A fresh blueprint for `lot` with template `id` placed (null if it doesn't fit). */
export const templateBlueprint = (id, lot, opts) => applyTemplate(createBlueprint(lot, opts), id);
