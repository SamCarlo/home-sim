// Investments (10 §1–§5, task 48). Pure: the unlock check, maxInvest, buy, sell, the typical-year range from μ and σ,
// and the value-weighted totals the money strip and the invest block show (tweened along the month's market path while
// "Live this month" plays). Buys come out of savings first, then checking; sells go to savings. Both post 'transfer'
// transactions, so they never count as income or spending in the month totals.
import { INVEST } from '../config.js';
import { charge, post, TRANSFER } from '../finance/ledger.js';
import { portfolio } from './market.js';

/** z for the 10th/90th percentile of a standard normal. */
const Z90 = 1.2815515655446004;
const keys = () => INVEST.portfolios.map((p) => p.key);
const num = (v) => (Number.isFinite(v) ? v : 0);

/** Checking + savings in cents. */
export function cashCents(state) {
  return num(state.finances?.checkingCents) + num(state.finances?.savingsCents);
}

/**
 * 10 §1: at the start of a plan stage, unlock investing once checking + savings reach `INVEST.unlockCents`. It stays
 * unlocked afterwards. Mutates a store draft; returns `life.investUnlocked`.
 */
export function checkUnlock(s) {
  if (!s.life.investUnlocked && cashCents(s) >= INVEST.unlockCents) s.life.investUnlocked = true;
  return !!s.life.investUnlocked;
}

/** 10 §3: checking + savings − the $2,000 reserve, never below 0. */
export function maxInvest(state) {
  return Math.max(0, cashCents(state) - INVEST.reserveCents);
}

/** Every portfolio with its holding: `[{key, name, blurb, mu, sigma, valueCents, basisCents}]` in config order. */
export function holdings(state) {
  return INVEST.portfolios.map((p) => {
    const h = state.finances?.investments?.[p.key] ?? {};
    return { ...p, valueCents: num(h.valueCents), basisCents: num(h.basisCents) };
  });
}

/** Sum of every portfolio's current value. */
export function totalInvested(state) {
  return holdings(state).reduce((t, h) => t + h.valueCents, 0);
}

/** True before the student has ever bought anything (the intro card shows then). */
export function neverInvested(state) {
  return !state.finances?.transactions?.some((t) => t.category === TRANSFER && /^Invested in /.test(t.label))
    && holdings(state).every((h) => h.valueCents === 0 && h.basisCents === 0);
}

/**
 * Parse typed dollars ("1,500", "$1500", "1500.00") → whole-dollar cents, or null when it isn't a positive whole
 * number of dollars.
 */
export function parseDollars(text) {
  const t = String(text ?? '').trim().replace(/[$,\s]/g, '');
  if (!/^\d+(\.0{1,2})?$/.test(t)) return null;
  const d = Number(t.split('.')[0]);
  return d > 0 && Number.isSafeInteger(d * 100) ? d * 100 : null;
}

/** Check a buy before doing it → `{ok, cents, error}`. `text` is what the student typed. */
export function validateBuy(state, key, text) {
  if (!portfolio(key)) return { ok: false, error: 'Pick a portfolio first.' };
  const raw = String(text ?? '').trim();
  if (!raw) return { ok: false, error: 'Type how many dollars to invest.' };
  const cents = parseDollars(raw);
  if (cents === null) return { ok: false, error: 'Use a whole number of dollars greater than $0, like 500.' };
  const max = maxInvest(state);
  if (cents > max) {
    return { ok: false, error: max > 0
      ? `That's more than you can invest. The most is ${fmt(max)}, so $2,000 stays in the bank.`
      : 'You need more than $2,000 in the bank before you can invest.' };
  }
  return { ok: true, cents };
}

/** Check a sell → `{ok, cents, error}`. `text` "all" (or the exact value) sells everything. */
export function validateSell(state, key, text) {
  const h = holdings(state).find((x) => x.key === key);
  if (!h || h.valueCents <= 0) return { ok: false, error: 'Pick a portfolio you own.' };
  const raw = String(text ?? '').trim().toLowerCase();
  if (raw === 'all') return { ok: true, cents: h.valueCents };
  if (!raw) return { ok: false, error: 'Type how many dollars to sell.' };
  const cents = parseDollars(raw);
  if (cents === null) return { ok: false, error: 'Use a whole number of dollars greater than $0, or press Sell all.' };
  if (cents > h.valueCents) return { ok: false, error: `You only have ${fmt(h.valueCents)} in ${h.name.toLowerCase()}.` };
  return { ok: true, cents };
}

function fmt(c) {
  return `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/**
 * Buy `cents` of portfolio `key` (10 §3): savings first, then checking; adds to valueCents and basisCents.
 * Refuses (changing nothing) when the amount isn't a positive whole-dollar amount ≤ maxInvest. Mutates a draft →
 * `{ok, error?}`.
 */
export function buy(s, key, cents, { month = s.life.monthIndex, day = 1 } = {}) {
  const v = validateBuy(s, key, Number.isInteger(cents) && cents % 100 === 0 ? String(cents / 100) : 'x');
  if (!v.ok) return v;
  const p = portfolio(key);
  const r = charge(s, 'savings', cents, { month, day, label: `Invested in ${p.name.toLowerCase()}`, category: TRANSFER });
  if (!r.ok) return { ok: false, error: 'Not enough money in the bank.' };
  const h = s.finances.investments[key];
  h.valueCents += cents;
  h.basisCents += cents;
  return { ok: true };
}

/**
 * Sell `cents` of portfolio `key` (10 §3): proceeds go to savings; basis drops in proportion. Refuses more than the
 * current value. Mutates a draft → `{ok, error?}`.
 */
export function sell(s, key, cents, { month = s.life.monthIndex, day = 1 } = {}) {
  const h = s.finances.investments?.[key];
  if (!portfolio(key) || !h || h.valueCents <= 0) return { ok: false, error: 'Pick a portfolio you own.' };
  if (!Number.isInteger(cents) || cents <= 0) return { ok: false, error: 'Sell a positive amount.' };
  if (cents > h.valueCents) return { ok: false, error: 'You can’t sell more than it’s worth.' };
  const basisOut = cents === h.valueCents ? h.basisCents : Math.round(h.basisCents * (cents / h.valueCents));
  h.valueCents -= cents;
  h.basisCents -= basisOut;
  post(s, { month, day, label: `Sold ${portfolio(key).name.toLowerCase()} investments`, amountCents: cents, account: 'savings',
    category: TRANSFER });
  return { ok: true };
}

/**
 * 10 §2: "In a typical year, $1,000 could end up between $A and $B" — the 10th–90th percentile of a one-year lognormal
 * with the portfolio's μ and σ (log return ~ N(μ − σ²/2, σ)). → `{lowCents, highCents}` rounded to whole dollars.
 */
export function typicalYearRange({ mu, sigma }, amountCents = 100000) {
  const m = mu - (sigma * sigma) / 2;
  const at = (z) => Math.round((amountCents * Math.exp(m + z * sigma)) / 100) * 100;
  return { lowCents: at(-Z90), highCents: at(Z90) };
}

/** The path multiplier at a fractional position (0 … days), linearly tweened between days. */
export function pathAt(path, pos) {
  const p = Math.max(0, Math.min(path.length - 1, pos));
  const i = Math.floor(p), f = p - i;
  return i + 1 < path.length ? path[i] + (path[i + 1] - path[i]) * f : path[i];
}

/**
 * The value-weighted figures at a point in the month (10 §5): `pos` = days elapsed (0 … plan.days, fractional while the
 * animation tweens). Holdings are their start-of-month values (buying and selling is off mid-month). →
 * `{startCents, valueCents, pct, byKey {key: {startCents, valueCents, pct}}}`.
 */
export function valueAt(state, market, pos) {
  const out = { startCents: 0, valueCents: 0, pct: 0, byKey: {} };
  for (const key of keys()) {
    const start = num(state.finances?.investments?.[key]?.valueCents);
    if (start <= 0) continue;
    const path = market?.[key];
    const value = path ? Math.round(start * pathAt(path, pos)) : start;
    out.byKey[key] = { startCents: start, valueCents: value, pct: (value - start) / start };
    out.startCents += start; out.valueCents += value;
  }
  out.pct = out.startCents ? (out.valueCents - out.startCents) / out.startCents : 0;
  return out;
}

/** The total investment value for each day of the month (index 0 = the start): the live sparkline. */
export function monthSeries(state, market, days) {
  return Array.from({ length: days + 1 }, (_, d) => valueAt(state, market, d).valueCents);
}

/**
 * The sparkline outside the animation: the first invested month's start value, each month-end total from `life.history`
 * (and the summary's month), then today's total when it differs (a buy or sell since).
 */
export function historySeries(state) {
  const results = [...(state.life?.history ?? []).map((e) => e.result), state.life?.current?.result];
  const out = [];
  for (const r of results) {
    const inv = r?.investment;
    if (!inv || !(inv.startCents > 0)) continue;
    if (!out.length) out.push(inv.startCents);
    out.push(inv.endCents);
  }
  const now = totalInvested(state);
  if (out.at(-1) !== now) out.push(now);
  return out;
}

/** The latest finished month's investment result `{startCents, endCents, pct}` with something held, or null. */
export function lastMonthGrowth(state) {
  const r = state.life?.current?.result?.investment ?? state.life?.history?.at(-1)?.result?.investment;
  return r && r.startCents > 0 ? r : null;
}

/** SVG polyline points for an auto-scaled sparkline of `values` in a w × h box. */
export function sparkLine(values, w, h, pad = 2) {
  if (!values.length) return '';
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const step = values.length > 1 ? (w - 2 * pad) / (values.length - 1) : 0;
  return values.map((v, i) => `${(pad + i * step).toFixed(1)},${(pad + (h - 2 * pad) * (hi === lo ? 0.5 : 1 - (v - lo) / span)).toFixed(1)}`).join(' ');
}
