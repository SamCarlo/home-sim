// Loan and credit-card math (04 §3, 05 §4 FHA, 05 §6 card example, 09 §6 amortization). Integer cents; rates are
// annual decimals. Every monthly amount is rounded to whole cents, half away from zero (finance/money.js). Pure.
import { FINANCE, CREDIT } from '../config.js';
import { assertCents, mulRate } from './money.js';

/**
 * Monthly principal & interest for a fixed-rate loan, in cents: pmt(30000000, 0.065, 360) → 189620.
 * A 0% rate is principal ÷ months (rounded up so the loan is paid off in time).
 */
export function pmt(principalCents, annualRate, months) {
  assertCents(principalCents, 'principalCents');
  if (!(Number.isInteger(months) && months > 0)) throw new RangeError(`months must be a positive integer, got ${months}`);
  if (principalCents <= 0) return 0;
  const r = annualRate / 12;
  if (!r) return Math.ceil(principalCents / months);
  const f = (1 + r) ** months;
  return Math.round((principalCents * r * f) / (f - 1));
}

/**
 * Month-by-month schedule: [{month (1-based), paymentCents, interestCents, principalCents, balanceCents}].
 * interest = balance × rate ÷ 12 (rounded); the last row absorbs rounding so the principal sums to the loan and the
 * final balance is exactly 0.
 */
export function amortizationSchedule(principalCents, annualRate, months) {
  const payment = pmt(principalCents, annualRate, months);
  const rows = [];
  let balance = principalCents;
  for (let month = 1; month <= months && balance > 0; month++) {
    const interestCents = mulRate(balance, annualRate / 12);
    let principal = payment - interestCents;
    if (month === months || principal > balance) principal = balance;
    balance -= principal;
    rows.push({ month, paymentCents: interestCents + principal, interestCents, principalCents: principal, balanceCents: balance });
  }
  return rows;
}

/** Total interest paid over the full schedule, in cents. */
export function totalInterest(principalCents, annualRate, months) {
  return amortizationSchedule(principalCents, annualRate, months).reduce((t, row) => t + row.interestCents, 0);
}

/** Monthly PMI (or FHA MIP) in cents: loan × annual rate ÷ 12. pmiMonthly(27000000, 0.006) → 13500. */
export function pmiMonthly(loanCents, annualPmiRate = FINANCE.pmiAnnualPct) {
  return mulRate(loanCents, annualPmiRate / 12);
}

/**
 * Simplified FHA loan (05 §4): 3.5% minimum down, 1.75% upfront MIP financed into the loan, 0.55%/yr MIP on the loan.
 * Returns {downCents, baseLoanCents, upfrontMipCents, loanCents, monthlyMipCents, monthlyPICents, annualRate, months}.
 */
export function fhaLoan({ priceCents, downPct = FINANCE.fha.minDownPct, annualRate = FINANCE.mortgageRate,
  months = FINANCE.mortgageTermMonths }) {
  assertCents(priceCents, 'priceCents');
  const pct = Math.max(downPct, FINANCE.fha.minDownPct);
  const downCents = mulRate(priceCents, pct);
  const baseLoanCents = priceCents - downCents;
  const upfrontMipCents = mulRate(baseLoanCents, FINANCE.fha.upfrontMipPct);
  const loanCents = baseLoanCents + upfrontMipCents;
  return {
    downCents, baseLoanCents, upfrontMipCents, loanCents,
    monthlyMipCents: pmiMonthly(loanCents, FINANCE.fha.annualMipPct),
    monthlyPICents: pmt(loanCents, annualRate, months),
    annualRate, months,
  };
}

/**
 * Construction interest reserve (04 §3): loan × average share drawn (50%) × rate ÷ 12 × months to build, in cents.
 */
export function constructionInterestReserve({ loanCents, rate = FINANCE.build.rate, months,
  avgDrawnPct = FINANCE.build.avgDrawnPct }) {
  return mulRate(loanCents, (avgDrawnPct * rate * months) / 12);
}

/** The card minimum payment rule (05 §6, 09 §6): the greater of $25 or 1% of the balance plus that month's interest. */
export const DEFAULT_MIN_RULE = { floorCents: CREDIT.card.minPaymentFloorCents, pct: CREDIT.card.minPaymentPct };

/**
 * Pay a card balance down with minimum payments only and no new charges (05 §6 worked example).
 * minRule = {floorCents, pct} (defaults to DEFAULT_MIN_RULE); each month interest = balance × APR ÷ 12, then the
 * payment is max(floor, balance × pct + interest), capped at what's owed. Returns {months, interestCents};
 * months is Infinity if the minimum never covers the interest (or it would take over 100 years).
 */
export function cardPayoff({ balanceCents, apr, minRule = DEFAULT_MIN_RULE }) {
  assertCents(balanceCents, 'balanceCents');
  const { floorCents = DEFAULT_MIN_RULE.floorCents, pct = DEFAULT_MIN_RULE.pct } = minRule;
  let balance = balanceCents;
  let months = 0;
  let interestCents = 0;
  while (balance > 0) {
    if (months >= 1200) return { months: Infinity, interestCents };
    const interest = mulRate(balance, apr / 12);
    const minimum = Math.max(floorCents, mulRate(balance, pct) + interest);
    const payment = Math.min(minimum, balance + interest);
    if (payment <= interest && payment < balance + interest) return { months: Infinity, interestCents };
    balance = balance + interest - payment;
    interestCents += interest;
    months++;
  }
  return { months, interestCents };
}
