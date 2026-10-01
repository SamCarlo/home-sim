// Display formatting at the UI edge. Money comes in as integer cents. Pure.

/** Money text comes from finance/money.js (the single source); re-exported here for UI code. */
export { formatMoney } from '../finance/money.js';

/** Format a decimal rate as a percent: formatPct(0.065) → "6.5%"; digits = max decimals. */
export function formatPct(rate, digits = 1) {
  const v = (Number(rate) || 0) * 100;
  return `${Number(v.toFixed(digits))}%`;
}

/** Format hours: formatHours(25) → "25 h", formatHours(7.5) → "7.5 h". */
export function formatHours(hours, digits = 1) {
  return `${Number((Number(hours) || 0).toFixed(digits))} h`;
}
