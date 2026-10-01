// Money helpers (01 §4). Money is an integer number of cents; rates are decimals (0.065). Pure.
// Rounding rule everywhere: half away from zero to whole cents (Math.round on the positive magnitude).

/** Round a number to whole cents, half away from zero, after trimming float noise (1005 × 0.1 → 101, not 100). */
function roundHalfAway(x) {
  const abs = Math.abs(x);
  const r = Math.round(Number(abs.toFixed(6)));
  return x < 0 ? -r : r; // never -0 from a positive input
}

/**
 * Parse money typed by a student (or a number of dollars) into cents.
 * Accepts 3200, 3200.5, "3200", "3,200", "$3,200.50", " -$45 ", "$-45"; extra decimals round half away from zero.
 * Returns null when it can't parse (empty, letters, bad comma grouping, NaN, Infinity, more than a safe integer).
 */
export function dollarsToCents(input) {
  let s;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    s = String(input);
    if (/e/i.test(s)) return Number.isSafeInteger(roundHalfAway(input * 100)) ? roundHalfAway(input * 100) : null;
  } else if (typeof input === 'string') {
    s = input.trim();
  } else {
    return null;
  }
  const m = /^(-)?\s*\$?\s*(-)?\s*(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d*))?$/.exec(s);
  if (!m || (m[1] && m[2])) return null;
  const whole = m[3] ? m[3].replace(/,/g, '') : '';
  const frac = m[4] ?? '';
  if (!whole && !frac) return null;
  let cents = Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2));
  if (frac.length > 2 && Number(frac[2]) >= 5) cents += 1;
  if (!Number.isSafeInteger(cents)) return null;
  return (m[1] || m[2]) && cents !== 0 ? -cents : cents;
}

/** Throw a TypeError unless `value` is a safe integer number of cents; returns the value. */
export function assertCents(value, label = 'amount') {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be integer cents, got ${String(value)}`);
  return value;
}

/** cents × rate, rounded half away from zero to whole cents: mulRate(1005, 0.1) → 101, mulRate(-150, 0.5) → -75. */
export function mulRate(cents, rate) {
  assertCents(cents, 'cents');
  if (!Number.isFinite(rate)) throw new TypeError(`rate must be a finite number, got ${String(rate)}`);
  return roundHalfAway(cents * rate);
}

/** Sum integer cents: sumCents([1, 2]) or sumCents(1, 2). Throws on non-integers. */
export function sumCents(...values) {
  const list = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
  let total = 0;
  for (const v of list) total += assertCents(v);
  return assertCents(total, 'sum');
}

/** part ÷ whole as a decimal ratio (pctOf(25000, 100000) → 0.25). A zero whole gives 0. */
export function pctOf(partCents, wholeCents) {
  if (!wholeCents) return 0;
  return partCents / wholeCents;
}

/** Clamp cents into [min, max]; either bound may be omitted (null/undefined). */
export function clampCents(cents, min = null, max = null) {
  assertCents(cents);
  let v = cents;
  if (min != null && v < min) v = min;
  if (max != null && v > max) v = max;
  return v;
}

/**
 * Format cents as dollars, the single source for money text: formatMoney(123456) → "$1,235";
 * formatMoney(123456, {showCents: true}) → "$1,234.56" (`{cents: true}` is an alias). Negatives get a leading
 * minus ("-$50"). Whole-dollar mode rounds half away from zero. Bad input formats as "$0".
 */
export function formatMoney(cents, { showCents, cents: centsAlias = false } = {}) {
  const withCents = showCents ?? centsAlias;
  const n = Math.round(Number(cents) || 0);
  const abs = Math.abs(n);
  let body;
  if (withCents) {
    body = `${groupThousands(Math.floor(abs / 100))}.${String(abs % 100).padStart(2, '0')}`;
  } else {
    body = groupThousands(Math.round(abs / 100));
  }
  return `${n < 0 && body !== '0' ? '-' : ''}$${body}`;
}

function groupThousands(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
