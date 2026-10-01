// Plan table rules (04 §5) that don't need the DOM: cell labels, denied badges, hiding and keyboard moves. Pure.
import { formatMoney } from '../../finance/money.js';

/** "hilo|apartment": the key for one cell. */
export const cellKey = (locationId, homeTypeId) => `${locationId}|${homeTypeId}`;

/** Keys of cells whose latest paperwork attempt was denied (02 §2 plan.attempts, newest last). */
export function deniedKeys(attempts = []) {
  const latest = new Map();
  for (const a of attempts) latest.set(cellKey(a.locationId, a.homeTypeId), a.outcome);
  return new Set([...latest].filter(([, outcome]) => outcome === 'denied').map(([k]) => k));
}

/** Upfront line for a cell ("Upfront $12,400"), or null when the home isn't available. */
export const upfrontText = (cost) => (cost.available === false ? null : `Upfront ${formatMoney(cost.upfrontCents)}`);
/** Monthly line for a cell ("$1,850/mo"), or null when the home isn't available. */
export const monthlyText = (cost) => (cost.available === false ? null : `${formatMoney(cost.monthlyCents)}/mo`);

/** aria-label (04 §5): "Hilo, apartment: upfront $3,100, monthly $1,620, comfortable". */
export function cellAriaLabel(location, homeType, cell, { denied = false } = {}) {
  const where = `${location.name}, ${homeType.label}`;
  const extra = denied ? ', denied last time' : '';
  if (cell.cost.available === false) return `${where}: not available here${extra}`;
  return `${where}: upfront ${formatMoney(cell.cost.upfrontCents)}, monthly ${formatMoney(cell.cost.monthlyCents)}, `
    + `${cell.status.label.toLowerCase()}${extra}`;
}

/** With "Hide homes I can't afford" on, red and unavailable cells are hidden. */
export const isHiddenStatus = (status, hideUnaffordable) => hideUnaffordable && (status === 'red' || status === 'na');

/**
 * Keyboard move on a grid of rows × cols (04 §5). visible[r][c] says which cells can take focus; rows with no
 * visible cell are skipped. key: ArrowLeft/Right/Up/Down, Home, End. Returns the new {r, c} (unchanged at an edge),
 * or null when the key isn't a move.
 */
export function moveFocus(visible, { r, c }, key) {
  const rowHas = (i) => visible[i]?.some(Boolean);
  const inRow = (i, from, step) => {
    for (let j = from; j >= 0 && j < visible[i].length; j += step) if (visible[i][j]) return j;
    return -1;
  };
  // Nearest visible cell to column c in row i (same column first, then left, then right).
  const nearest = (i) => {
    for (let d = 0; d < visible[i].length; d++) {
      if (visible[i][c - d]) return c - d;
      if (visible[i][c + d]) return c + d;
    }
    return -1;
  };
  switch (key) {
    case 'ArrowRight': { const j = inRow(r, c + 1, 1); return j < 0 ? { r, c } : { r, c: j }; }
    case 'ArrowLeft': { const j = inRow(r, c - 1, -1); return j < 0 ? { r, c } : { r, c: j }; }
    case 'Home': { const j = inRow(r, 0, 1); return j < 0 ? { r, c } : { r, c: j }; }
    case 'End': { const j = inRow(r, visible[r].length - 1, -1); return j < 0 ? { r, c } : { r, c: j }; }
    case 'ArrowDown':
    case 'ArrowUp': {
      const step = key === 'ArrowDown' ? 1 : -1;
      for (let i = r + step; i >= 0 && i < visible.length; i += step) if (rowHas(i)) return { r: i, c: nearest(i) };
      return { r, c };
    }
    default: return null;
  }
}

/** First visible cell in reading order, or null. */
export function firstVisible(visible) {
  for (let r = 0; r < visible.length; r++) {
    const c = visible[r].indexOf(true);
    if (c >= 0) return { r, c };
  }
  return null;
}
