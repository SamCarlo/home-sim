// Detail panel rules (04 §6) that don't need the DOM: titles, water/sewer and hazard text, whether a home can be
// chosen, the confirm question, and the state change for choosing a home. Pure.
import { freshPaperwork } from '../../state/schema.js';

const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/** Panel title (04 §6): "Apartment in Hilo". */
export const detailTitle = (location, homeType) => `${homeType.title} in ${location.name}`;

const WATER = {
  municipal: 'Water comes from the city or county water system.',
  catchment: 'Water comes from a rain catchment tank. You filter it and keep the tank clean yourself.',
  well: 'Water comes from a private well. You pay for the pump and testing.',
  community: 'Water comes from a small community water system shared with neighbors.',
};
const SEWER = {
  municipal: 'Wastewater goes to the city sewer.',
  septic: 'Wastewater goes to a septic tank on the lot that needs pumping every few years.',
  cesspool: 'Wastewater goes to a cesspool on the lot. New rules mean many must be upgraded to septic.',
};

/** One sentence each for water and sewer (04 §6 "About this place"). */
export function utilityNotes(location) {
  return [WATER[location.water], SEWER[location.sewer]].filter(Boolean);
}

/** "extreme-heat" → "Extreme heat"; "vog" → "Vog". */
export const hazardLabel = (key) => key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, ' ');

/**
 * Can the student pick this cell? (04 §6) → { ok, reasons[] }. Red and unavailable cells can't be chosen and say why.
 */
export function chooseCheck(cell) {
  const { status, reasons = [] } = cell.status;
  if (status === 'na') return { ok: false, reasons: reasons.length ? reasons : ['This home type is not available here.'] };
  if (status === 'red') return { ok: false, reasons: ["You can't afford this home right now.", ...reasons] };
  return { ok: true, reasons: [] };
}

/** What the paperwork phase will ask for, by home type (04 §6 confirm text). */
const PAPERWORK = {
  apartment: 'applications, a lease, insurance, and a letter',
  shared: 'applications, a lease, insurance, and a letter',
  condo: 'a mortgage application, closing papers, insurance, and a letter',
  house: 'a mortgage application, closing papers, insurance, and a letter',
  build: 'a construction loan application, permits, insurance, and a letter',
};

/** Confirm question (04 §6): "You're choosing an apartment in Hilo. Next you'll fill out the paperwork: … Ready?" */
export function confirmText(location, homeType) {
  const what = homeType.label.toLowerCase();
  const choosing = homeType.id === 'build' ? `to build a new house in ${location.name}`
    : `${article(what)} ${what} in ${location.name}`;
  return `You're choosing ${choosing}. Next you'll fill out the paperwork: `
    + `${PAPERWORK[homeType.id] || PAPERWORK.apartment}. Ready?`;
}

const copyLines = (lines) => lines.map(({ key, label, cents, note }) => ({ key, label, cents, note }));

/** choice.snapshot (02 §2): the cell's numbers at the moment of choosing. */
export function choiceSnapshot(cell) {
  const { cost } = cell;
  return {
    upfrontCents: cost.upfrontCents,
    monthlyCents: cost.monthlyCents,
    breakdown: { upfront: copyLines(cost.upfront), monthly: copyLines(cost.monthly) },
    status: cell.status.status,
  };
}

/**
 * Apply "Choose this home" to a draft state (04 §6): choice with snapshot, a fresh paperwork attempt, phase
 * 'paperwork', panel closed. Throws if the cell can't be chosen. Use with store.update(…, {checkpoint: 'home-chosen'}).
 */
export function applyChoice(s, cell, now) {
  if (!chooseCheck(cell).ok) throw new Error(`Cell ${cell.locationId}|${cell.homeTypeId} can't be chosen`);
  s.choice = { locationId: cell.locationId, homeTypeId: cell.homeTypeId, snapshot: choiceSnapshot(cell), chosenAt: now };
  s.paperwork = freshPaperwork();
  s.plan.expanded = null;
  s.phase = 'paperwork';
  return s;
}
