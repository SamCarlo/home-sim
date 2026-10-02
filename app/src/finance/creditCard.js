// Credit card offer and month-to-month mechanics (05 §6, 09 §6). Pure; integer cents, APRs are annual decimals.
// The offer comes from the score tiers in config CREDIT.card. A cycle is one month: statement = carried balance +
// interest (only when last month's statement wasn't paid in full) + new charges; autopay pays the full statement or
// the minimum from what the payer has; paying less than the minimum is a missed payment with a late fee.
import { CREDIT } from '../config.js';
import { mulRate, assertCents } from './money.js';
import { cardPayoff } from './loans.js';

/** The card tier for a credit score (05 §6): first tier whose minScore ≤ score; under approveMinScore → the secured card. */
export function tierFor(score, cfg = CREDIT.card) {
  return score >= cfg.approveMinScore ? cfg.tiers.find((t) => score >= t.minScore) : cfg.tiers.at(-1);
}

/**
 * The card offer for this player (05 §6): {score, kind, secured, limitCents, apr, penaltyApr, depositCents,
 * annualFeeCents, graceDays, lateFeeCents, minPaymentFloorCents, minPaymentPct}. `score` defaults to the current one.
 */
export function offerFor(state, { score = state.finances.credit.score, cfg = CREDIT.card } = {}) {
  const tier = tierFor(score, cfg);
  const secured = tier.kind === 'secured';
  return { score, kind: tier.kind, secured, limitCents: tier.limitCents, apr: tier.apr, penaltyApr: cfg.penaltyApr,
    depositCents: secured ? cfg.securedDepositCents : 0, annualFeeCents: cfg.annualFeeCents, graceDays: cfg.graceDays,
    lateFeeCents: cfg.lateFeeCents, minPaymentFloorCents: cfg.minPaymentFloorCents, minPaymentPct: cfg.minPaymentPct };
}

/**
 * Minimum payment (05 §6): the greater of $25 or 1% of the balance + that month's interest, never more than the
 * statement. `balanceCents` is the statement before interest; 0 when nothing is owed.
 */
export function minimumPayment(balanceCents, interestCents = 0, cfg = CREDIT.card) {
  const statement = balanceCents + interestCents;
  if (statement <= 0) return 0;
  const rule = Math.max(cfg.minPaymentFloorCents, mulRate(balanceCents, cfg.minPaymentPct) + interestCents);
  return Math.min(statement, rule);
}

/**
 * One month on the card (09 §6). card = {balanceCents, apr, carriedLastMonth, autopay ('full' | 'minimum' | 'none'),
 * lateFeeCents?}; chargesCents = this month's new purchases; payFrom = cents the payer can spend on it (checking).
 * → {statementCents, interestCents, minimumCents, paidCents, carried, lateFeeCents, missed, balanceCents}, where
 * `carried` = the statement wasn't paid in full (next month charges interest) and balanceCents = what's owed after
 * the payment and any late fee. Pure: the card isn't changed (see applyCycle).
 */
export function cycle(card, { chargesCents = 0, payFrom = Infinity, autopay = card.autopay ?? 'full', cfg = CREDIT.card } = {}) {
  assertCents(card.balanceCents, 'balanceCents');
  assertCents(chargesCents, 'chargesCents');
  const carriedIn = Math.max(0, card.balanceCents);
  const interestCents = card.carriedLastMonth ? mulRate(carriedIn, card.apr / 12) : 0;
  const statementCents = card.balanceCents + interestCents + chargesCents;
  const minimumCents = minimumPayment(card.balanceCents + chargesCents, interestCents, cfg);
  const wanted = statementCents <= 0 ? 0 : autopay === 'full' ? statementCents : autopay === 'minimum' ? minimumCents : 0;
  const paidCents = Math.max(0, Math.min(wanted, Math.floor(payFrom)));
  const missed = paidCents < minimumCents;
  const lateFeeCents = missed ? (card.lateFeeCents ?? cfg.lateFeeCents) : 0;
  const carried = paidCents < statementCents;
  return { statementCents, interestCents, minimumCents, paidCents, carried, lateFeeCents, missed,
    balanceCents: statementCents - paidCents + lateFeeCents };
}

/** The card after a cycle: {...card, balanceCents, carriedLastMonth}. */
export function applyCycle(card, result) {
  return { ...card, balanceCents: result.balanceCents, carriedLastMonth: result.carried };
}

/**
 * The worked example (05 §6) for an offer: $1,000 paid at the minimum (never under $25) and, for contrast, at $100 a
 * month, with no new charges. → {balanceCents, apr, firstMinimumCents, minimum {months, interestCents},
 * fixed {paymentCents, months, interestCents}}. Same math as cycle() with autopay 'minimum'.
 */
export function payoffExample(offer, { balanceCents = 100000, fixedCents = 10000, cfg = CREDIT.card } = {}) {
  const rule = { floorCents: cfg.minPaymentFloorCents, pct: cfg.minPaymentPct };
  return { balanceCents, apr: offer.apr,
    firstMinimumCents: minimumPayment(balanceCents, mulRate(balanceCents, offer.apr / 12), cfg),
    minimum: cardPayoff({ balanceCents, apr: offer.apr, minRule: rule }),
    fixed: { paymentCents: fixedCents, ...cardPayoff({ balanceCents, apr: offer.apr, minRule: { floorCents: fixedCents, pct: 0 } }) } };
}

/** "6 years 2 months" / "11 months" for a month count. */
export function durationText(months) {
  if (!Number.isFinite(months)) return 'forever';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const part = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return [y ? part(y, 'year') : '', m ? part(m, 'month') : ''].filter(Boolean).join(' ') || '0 months';
}
