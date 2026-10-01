// Affordability colors for a table cell (04 §4). Pure, integer math only; the first matching rule wins.
import { AFFORD } from '../config.js';
import { formatMoney } from './money.js';

/** The five statuses in legend order, with their icon and short label (04 §4–§5). */
export const STATUSES = [
  { status: 'cyan', icon: '◎', label: 'Well below your means' },
  { status: 'green', icon: '✓', label: 'Comfortable' },
  { status: 'yellow', icon: '⚠', label: 'Stretch' },
  { status: 'red', icon: '✕', label: "Can't afford" },
  { status: 'na', icon: '—', label: 'Not available here' },
];
const BY_STATUS = Object.fromEntries(STATUSES.map((s) => [s.status, s]));
const result = (status, reasons) => ({ ...BY_STATUS[status], reasons });

/**
 * classify({upfrontCents, monthlyCents, available, naReason?}, {cashCents, incomeCents}) → {status, label, icon, reasons[]}.
 * na → red (upfront > cash or monthly > income) → yellow (monthly × 3 > income) → cyan (monthly × 5 ≤ income) → green.
 */
export function classify(cost, { cashCents, incomeCents }) {
  if (cost.available === false) return result('na', [cost.naReason || 'Not available here.']);
  const { upfrontCents: up, monthlyCents: mo } = cost;
  const { stretchDivisor: third, wellBelowDivisor: fifth } = AFFORD;
  if (up > cashCents || mo > incomeCents) {
    const reasons = [];
    if (up > cashCents) reasons.push(`Upfront ${formatMoney(up)} is more than your ${formatMoney(cashCents)} in savings.`);
    if (mo > incomeCents) reasons.push(`Monthly ${formatMoney(mo)} is more than your ${formatMoney(incomeCents)} income.`);
    return result('red', reasons);
  }
  if (mo * third > incomeCents) {
    return result('yellow', [`Housing would take more than ⅓ of your income (${formatMoney(Math.round(incomeCents / third))}).`]);
  }
  if (mo * fifth <= incomeCents) {
    return result('cyan', [`Housing would take ⅕ of your income or less (${formatMoney(Math.round(incomeCents / fifth))}).`]);
  }
  return result('green', [`Housing takes between ⅕ and ⅓ of your income (${formatMoney(Math.round(incomeCents / fifth))}`
    + `–${formatMoney(Math.round(incomeCents / third))}).`]);
}
