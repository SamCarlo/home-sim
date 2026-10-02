// Credit-score model (02 §2 credit, 05 §4 hard inquiries, 09 §6 monthly changes). Mutates state.finances.credit
// in place (same convention as ledger.js) and returns what changed. Every change adds a history entry
// {month, delta, score, reasons}; the score stays within CREDIT.minScore–maxScore (300–850). Pure.
import { CREDIT } from '../config.js';

const clamp = (s, c = CREDIT) => Math.min(c.maxScore, Math.max(c.minScore, s));

/** A fresh credit record (02 §2), score from config. */
export function initialCredit(config = CREDIT) {
  return { score: config.startingScore, history: [], inquiries: [], onTimeStreak: 0, missedPayments: 0, lateHousingStreak: 0 };
}

/** The band for a score (CREDIT.bands): {minScore, maxScore, key, label, status}. */
export function creditBand(score, config = CREDIT) {
  const bands = config.bands;
  const i = bands.findIndex((b) => score >= b.minScore);
  const band = bands[i < 0 ? bands.length - 1 : i];
  return { ...band, minScore: Math.max(band.minScore, config.minScore), maxScore: i > 0 ? bands[i - 1].minScore - 1 : config.maxScore };
}

/** Card utilization: balance ÷ limit (0 with no card or a 0 limit). */
export function utilization(state) {
  const c = state.finances.creditCard;
  return c && c.limitCents > 0 ? Math.max(0, c.balanceCents) / c.limitCents : 0;
}

/**
 * Change the score by `delta` (clamped) and log it. Returns the history entry; its delta is the change after clamping.
 * Use for one-off events such as foreclosure (−CREDIT.foreclosureCost).
 */
export function adjustScore(state, delta, reasons, month, config = CREDIT) {
  const cr = state.finances.credit;
  const before = cr.score;
  cr.score = clamp(before + delta, config);
  const entry = { month, delta: cr.score - before, score: cr.score, reasons: [].concat(reasons) };
  cr.history.push(entry);
  return entry;
}

/** A hard inquiry (application, loan, card): −hardInquiryCost now, recovered by monthlyUpdate after 12 months. */
export function recordInquiry(state, kind, month, config = CREDIT) {
  state.finances.credit.inquiries.push({ kind, month, recovered: false });
  return adjustScore(state, -config.hardInquiryCost, [`Hard credit check (${kind}) −${config.hardInquiryCost}`], month, config);
}

/**
 * End-of-month credit update (09 §6):
 * - all payments on time: +3 (+1 when the score is above 750), onTimeStreak +1;
 * - card utilization > 30%: −10, > 60%: −25 (only the larger applies);
 * - each missed payment: −60 (missedPayments counts them, onTimeStreak resets);
 * - each hard inquiry older than 12 months: +5 back, once;
 * - housingMissed: lateHousingStreak +1; a month with everything on time resets it to 0.
 * Returns the history entry {month, delta, score, reasons}.
 */
export function monthlyUpdate(state, { allOnTime, missedCount = 0, utilization: util = 0, month, housingMissed = false },
  config = CREDIT) {
  const cr = state.finances.credit;
  let delta = 0;
  const reasons = [];
  const onTime = allOnTime && !missedCount;
  if (onTime) {
    const up = cr.score > 750 ? config.monthlyOnTimeAbove750 : config.monthlyOnTime;
    delta += up;
    reasons.push(`Every bill paid on time +${up}`);
    cr.onTimeStreak += 1;
    cr.lateHousingStreak = 0;
  }
  if (missedCount > 0) {
    const cost = missedCount * config.missedPaymentCost;
    delta -= cost;
    reasons.push(`${missedCount} missed payment${missedCount > 1 ? 's' : ''} −${cost}`);
    cr.missedPayments += missedCount;
    cr.onTimeStreak = 0;
  }
  if (housingMissed) cr.lateHousingStreak += 1;
  if (util > config.utilizationHighPct) {
    delta -= config.utilizationHighCost;
    reasons.push(`Card more than ${config.utilizationHighPct * 100}% used −${config.utilizationHighCost}`);
  } else if (util > config.utilizationWarnPct) {
    delta -= config.utilizationWarnCost;
    reasons.push(`Card more than ${config.utilizationWarnPct * 100}% used −${config.utilizationWarnCost}`);
  }
  for (const inq of cr.inquiries) {
    if (!inq.recovered && month - inq.month > config.inquiryRecoverMonths) {
      inq.recovered = true;
      delta += config.hardInquiryCost;
      reasons.push(`Old credit check (${inq.kind}) no longer counts +${config.hardInquiryCost}`);
    }
  }
  if (!reasons.length) reasons.push('No change');
  return adjustScore(state, delta, reasons, month, config);
}
