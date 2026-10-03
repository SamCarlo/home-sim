// Wellbeing (09 §8, task 44). Pure: the month's deltas per domain, each with a reason string for the summary, then
// mean reversion: add the deltas, pull `LIFE.wellbeing.pullPct` toward 50, clamp 0–100 and round. Numbers: config WELLBEING.
import { LIFE, WELLBEING as W } from '../config.js';

export const DOMAINS = ['physical', 'purpose', 'financial', 'social', 'mental'];
const pct = (x) => `${Math.round(x * 100)}%`;

/** Apply deltas to a wellbeing record → a new record (sum, pull toward 50, clamp, round). */
export function applyWellbeing(before, deltas, cfg = LIFE.wellbeing) {
  const out = {};
  for (const d of DOMAINS) {
    const v = (before?.[d] ?? cfg.start) + deltas.filter((x) => x.domain === d).reduce((s, x) => s + x.delta, 0);
    const pulled = v + (cfg.pullToward - v) * cfg.pullPct;
    out[d] = Math.round(Math.min(cfg.max, Math.max(cfg.min, pulled)));
  }
  return out;
}

/**
 * The month's deltas (09 §8) → `[{domain, delta, reason}]`. ctx = {choices, budget (timeBudget), location, home,
 * money {incomeCents, expenseCents, savingsCents, carried, missedCount, wentWithout}, events, care {needed, kept, lost},
 * investment {pctByKey}, before (wellbeing)}.
 */
export function wellbeingDeltas(ctx) {
  const { choices = {}, budget, location, home = {}, money = {}, events = [], care = {}, investment = {} } = ctx;
  const out = [];
  const add = (domain, delta, reason) => { if (delta) out.push({ domain, delta, reason }); };
  const m = location?.metrics ?? {}, life = home.lifestyle ?? {};

  // Physical
  const ex = choices.exercise ?? 0;
  add('physical', W.exercise[ex] ?? 0, ex ? `Exercise ${ex} h a week` : 'No exercise this month');
  if (Math.max(m.gymAccess ?? 0, m.natureAccess ?? 0) >= W.gymOrNatureAccess && ex >= W.gymMinExercise) {
    add('physical', W.gymBonus, 'A gym or trails close by made exercise easy');
  }
  const commute = budget?.segments?.find((s) => s.key === 'commute')?.hours ?? 0;
  if (commute >= W.longCommuteHours) add('physical', W.longCommute, `A long commute (${Math.round(commute)} h a week)`);
  const xw = W.extraWork[choices.extraWork];
  if (xw?.physical) add('physical', xw.physical, `${choices.extraWork} extra work hours wore you out`);
  if (budget?.rating?.physicalDelta) add('physical', budget.rating.physicalDelta, `${budget.rating.label}: ${budget.rating.note}`);
  if (care.gardenAlive) add('physical', W.gardenAlive, 'Working in your garden kept you moving');
  if ((life.stairs ?? 0) > 0) add('physical', W.walkUp, 'Walk-up stairs every day');

  // Purpose
  const dp = choices.deepPractice ?? 0;
  add('purpose', W.deepPractice[dp] ?? 0, dp ? `Deep practice ${dp} h a week` : 'No time for deep practice');
  if (care.needed && care.kept) add('purpose', W.careKept, 'You cared for your plants and animals');
  if (care.lost) add('purpose', W.careLostPurpose, 'You lost a plant or animal you cared for');
  if (xw?.purpose) add('purpose', xw.purpose, 'Extra work left little time for what matters to you');

  // Financial
  const inc = money.incomeCents ?? 0, exp = money.expenseCents ?? 0;
  const share = inc > 0 ? (inc - exp) / inc : (exp > 0 ? -1 : 0);
  const saved = W.saved.find((r) => (r.min !== undefined ? share >= r.min : share > r.above));
  const over = W.overspent.find((r) => share < r.below);
  if (saved) add('financial', saved.delta, `You saved ${pct(share)} of your income`);
  else if (over) add('financial', over.delta, `You spent ${pct(-share)} more than you earned`);
  if (exp > 0 && (money.savingsCents ?? 0) >= W.emergencyFundMonths * exp) {
    add('financial', W.emergencyFund, `Savings cover ${W.emergencyFundMonths}+ months of expenses`);
  }
  if (money.carried) add('financial', W.carriedCard, 'You carried a credit card balance');
  if (money.wentWithout) add('financial', W.wentWithout, 'You couldn’t afford everything you needed');
  if (money.missedCount) add('financial', W.missedPayment * money.missedCount, `${money.missedCount} missed payment${money.missedCount > 1 ? 's' : ''}`);
  const ip = investment.pctByKey ?? {};
  const totalPct = investment.pct;
  if (Number.isFinite(totalPct) && totalPct > W.investUpPct) add('financial', W.investUp, `Investments grew ${(totalPct * 100).toFixed(1)}%`);
  if (Number.isFinite(ip.high) && ip.high < W.highRiskDropPct) add('financial', W.highRiskDrop, `High-risk fund dropped ${(-ip.high * 100).toFixed(1)}%`);

  // Social
  const so = choices.social ?? 0;
  add('social', W.social[so] ?? 0, `Social time ${so} h a week`);
  if (home.kind === 'shared') add('social', W.sharedLiving, 'Living with roommates');
  if (life.social) add('social', life.social, life.social > 0 ? 'Your roommates are fun to be around' : 'Friction with your roommates');
  if (W.ruralSettlements.includes(location?.settlement)) add('social', W.rural, 'Rural life: friends live far apart');
  if (xw?.social) add('social', xw.social, `${choices.extraWork} extra work hours cut into time with friends`);

  // Mental
  if (budget?.rating?.mentalDelta) add('mental', budget.rating.mentalDelta, `${budget.rating.label}: ${budget.rating.note}`);
  if ((m.noise ?? 0) + (life.noise ?? 0) >= W.noisyAt) add('mental', W.noisy, 'A noisy home');
  if ((m.natureAccess ?? 0) >= W.natureAt || (life.view ?? 0) > 0) add('mental', W.nature, 'Nature close by or a view from home');
  if ((home.animals ?? []).some((a) => a.present !== false)) add('mental', W.pets, 'Animals at home');
  if (care.lost) add('mental', W.careLostMental, 'Losing a plant or animal hurt');
  add('mental', W.deepPracticeMental[dp] ?? 0, 'Deep practice calmed your mind');

  // Events
  for (const e of events) for (const [d, v] of Object.entries(e.wellbeing ?? {})) add(d, v, e.label);

  // Money stress uses this month's financial result
  const fin = applyWellbeing(ctx.before, out).financial;
  if (fin < W.moneyStressBelow) add('mental', W.moneyStress, 'Money stress');
  return out;
}
