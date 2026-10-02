// Admin-table summary of a save (02 §5). Pure, defensive: works on partial states.
import { monthLabel } from '../util/dates.js';
import { cash as cashCents, netWorth as netWorthCents } from '../finance/ledgerTotals.js';

const num = (v) => (Number.isFinite(v) ? v : 0);

/** Cash and net worth (02 §2) are defined once, in the ledger. */
export { cash as cashCents, netWorth as netWorthCents } from '../finance/ledgerTotals.js';

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
