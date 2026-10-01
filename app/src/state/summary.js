// Admin-table summary of a save (02 §5). Pure, defensive: works on partial states. The ledger comes later.
import { monthLabel } from '../util/dates.js';

const num = (v) => (Number.isFinite(v) ? v : 0);

/** Cash = checking + savings (02 §2). */
export function cashCents(state) {
  const f = state?.finances || {};
  return num(f.checkingCents) + num(f.savingsCents);
}

/** Net worth = cash + investments + home equity (price − loan balances) − card balance (02 §2). */
export function netWorthCents(state) {
  const f = state?.finances || {};
  const inv = Object.values(f.investments || {}).reduce((s, p) => s + num(p?.valueCents), 0);
  const loans = (f.loans || []).reduce((s, l) => s + num(l?.balanceCents), 0);
  const owns = ['house', 'build', 'condo'].includes(state?.choice?.homeTypeId);
  const price = owns ? num(state?.home?.purchasePriceCents ?? state?.choice?.snapshot?.priceCents) : 0;
  const equity = owns ? price - loans : -loans;
  return cashCents(state) + inv + equity - num(f.creditCard?.balanceCents);
}

/** The one-row summary written next to a save for the admin table. */
export function summarize(state) {
  const wb = Object.values(state?.life?.wellbeing || {}).filter(Number.isFinite);
  const monthIndex = num(state?.life?.monthIndex);
  return {
    username: state?.account?.username ?? '',
    classCode: state?.account?.classCode ?? '',
    phase: state?.phase ?? 'intake',
    monthIndex,
    monthLabel: monthLabel(monthIndex),
    cashCents: cashCents(state),
    netWorthCents: netWorthCents(state),
    creditScore: num(state?.finances?.credit?.score),
    wellbeingAvg: wb.length ? Math.round(wb.reduce((a, b) => a + b, 0) / wb.length) : 0,
    homeLabel: state?.home?.label ?? null,
    locationName: state?.home?.locationName ?? state?.choice?.locationName ?? state?.choice?.locationId ?? null,
    homeTypeId: state?.choice?.homeTypeId ?? null,
    updatedAt: num(state?.meta?.updatedAt),
  };
}
