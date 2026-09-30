// Display formatting at the UI edge. Money comes in as integer cents. Pure.

/**
 * Format cents as dollars: formatMoney(123456) → "$1,235"; with {cents:true} → "$1,234.56".
 * Negative values get a leading minus: "-$50". Whole-dollar mode rounds half away from zero.
 */
export function formatMoney(cents, { cents: showCents = false } = {}) {
  const n = Math.round(Number(cents) || 0);
  const neg = n < 0;
  const abs = Math.abs(n);
  let body;
  if (showCents) {
    const dollars = Math.floor(abs / 100);
    const rem = String(abs % 100).padStart(2, '0');
    body = `${groupThousands(dollars)}.${rem}`;
  } else {
    body = groupThousands(Math.round(abs / 100));
  }
  return `${neg ? '-' : ''}$${body}`;
}

/** Format a decimal rate as a percent: formatPct(0.065) → "6.5%"; digits = max decimals. */
export function formatPct(rate, digits = 1) {
  const v = (Number(rate) || 0) * 100;
  return `${Number(v.toFixed(digits))}%`;
}

/** Format hours: formatHours(25) → "25 h", formatHours(7.5) → "7.5 h". */
export function formatHours(hours, digits = 1) {
  return `${Number((Number(hours) || 0).toFixed(digits))} h`;
}

function groupThousands(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
