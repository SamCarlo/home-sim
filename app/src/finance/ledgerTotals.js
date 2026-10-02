// Ledger totals (02 §2 cash and net worth, §6 compaction). Defensive on partial states (the admin summary uses them).
// Pure, integer cents.

const num = (v) => (Number.isFinite(v) ? v : 0);
/** How many lived months of raw transactions compactHistory keeps (02 §6). Month −1 (paperwork) is always kept. */
export const KEEP_MONTHS = 24;
const TRANSFER = 'transfer';

/** Cash = checking + savings (02 §2). */
export function cash(state) {
  const f = state?.finances || {};
  return num(f.checkingCents) + num(f.savingsCents);
}

/**
 * Net worth (02 §2) = cash + investments + home equity − card balance. Equity = purchase price − loan balances, no
 * appreciation; the price is home.purchasePriceCents, else choice.snapshot.priceCents, else the loans' priceCents.
 * Without an owned home, loan balances still count against you.
 */
export function netWorth(state) {
  const f = state?.finances || {};
  const inv = Object.values(f.investments || {}).reduce((s, p) => s + num(p?.valueCents), 0);
  const loans = f.loans || [];
  const owed = loans.reduce((s, l) => s + num(l?.balanceCents), 0);
  const owns = ['house', 'build', 'condo'].includes(state?.choice?.homeTypeId);
  let price = 0;
  if (owns) {
    price = num(state?.home?.purchasePriceCents ?? state?.choice?.snapshot?.priceCents);
    if (!price && state?.home) price = loans.filter((l) => !l?.closedReason).reduce((s, l) => s + num(l?.priceCents), 0);
  }
  return cash(state) + inv + price - owed - num(f.creditCard?.balanceCents);
}

/** Income/expense/category/account totals of a list of transactions (transfers are left out of income and expense). */
export function monthTotalsOf(month, txns) {
  const t = { month, incomeCents: 0, expenseCents: 0, byCategory: {}, byAccount: {} };
  for (const x of txns) {
    t.byAccount[x.account] = (t.byAccount[x.account] ?? 0) + x.amountCents;
    if (x.category === TRANSFER) continue;
    t.byCategory[x.category] = (t.byCategory[x.category] ?? 0) + x.amountCents;
    if (x.amountCents > 0) t.incomeCents += x.amountCents;
    else t.expenseCents -= x.amountCents;
  }
  return t;
}

/** Per-account sum of every transaction ever posted (raw + compacted). accountValue − this is constant. */
export function ledgerSums(state) {
  const f = state.finances;
  const sums = { checking: 0, savings: 0, card: 0 };
  for (const x of f.transactions) sums[x.account] += x.amountCents;
  for (const m of f.monthTotals) for (const [a, c] of Object.entries(m.byAccount ?? {})) sums[a] = (sums[a] ?? 0) + c;
  return sums;
}

function merge(into, add) {
  into.incomeCents += add.incomeCents;
  into.expenseCents += add.expenseCents;
  for (const key of ['byCategory', 'byAccount']) {
    into[key] ??= {};
    for (const [k, c] of Object.entries(add[key])) into[key][k] = (into[key][k] ?? 0) + c;
  }
}

/**
 * Keep raw transactions for month −1 and the last `keep` lived months (counted back from `currentMonth`, default the
 * newest transaction's month); fold older months into monthTotals (sorted by month). Returns the months folded.
 */
export function compactHistory(state, { currentMonth, keep = KEEP_MONTHS } = {}) {
  const f = state.finances;
  const latest = currentMonth ?? f.transactions.reduce((m, x) => Math.max(m, x.month), -1);
  const cutoff = latest - keep + 1;                      // months < cutoff (and ≥ 0) get folded
  const old = new Map();
  const kept = [];
  for (const x of f.transactions) {
    if (x.month >= 0 && x.month < cutoff) {
      if (!old.has(x.month)) old.set(x.month, []);
      old.get(x.month).push(x);
    } else kept.push(x);
  }
  if (!old.size) return [];
  for (const [month, txns] of old) {
    const totals = monthTotalsOf(month, txns);
    const existing = f.monthTotals.find((m) => m.month === month);
    if (existing) merge(existing, totals);
    else f.monthTotals.push(totals);
  }
  f.monthTotals.sort((a, b) => a.month - b.month);
  f.transactions = kept;
  return [...old.keys()].sort((a, b) => a - b);
}
