// The investment block (10 §1–§5, task 48). Shown in the plan, live and summary stages once `life.investUnlocked`:
// an intro card the first time, three portfolio cards (blurb + typical-year range), an amount input checked against the
// $2,000 reserve, a sell form, and the totals (total investments, average growth rate, a sparkline, per-portfolio detail).
// In the live stage the forms are disabled and `tick(v)` moves the totals along the month's market path. The DOM is built
// once per stage; `update(state)` only refreshes numbers, so typing and focus survive store changes.
import { h } from '../../ui/dom.js';
import { formatMoney, formatPct } from '../../util/format.js';
import { INVEST } from '../../config.js';
import { wordsToKnow } from '../../ui/term.js';
import {
  holdings, totalInvested, maxInvest, neverInvested, validateBuy, validateSell, typicalYearRange, historySeries,
  lastMonthGrowth, sparkLine,
} from '../../life/investments.js';

const SVG = 'http://www.w3.org/2000/svg';
const SPARK_W = 140, SPARK_H = 34;
const signedPct = (p) => `${p >= 0 ? '+' : '−'}${formatPct(Math.abs(p), 2)}`;

function svg(tag, attrs) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * renderInvestPanel({state, mode: 'plan'|'live'|'summary', onBuy(key, cents), onSell(key, cents)}) →
 * `{el, update(state), tick({valueCents, pct, byKey}, series)}`, or null while investing is still locked.
 */
export function renderInvestPanel({ state, mode = 'plan', onBuy, onSell }) {
  if (!state.life?.investUnlocked) return null;
  const live = mode === 'live';
  let sel = null, cur = state;

  // ── Totals ──
  const total = h('strong', { class: 'inv-num', dataset: { inv: 'total' } });
  const pct = h('strong', { class: 'inv-num', dataset: { inv: 'pct' } });
  const pctLabel = h('span', { class: 'inv-k' });
  const line = svg('polyline', { class: 'inv-spark-line', fill: 'none', points: '' });
  const spark = svg('svg', { class: 'inv-spark', width: SPARK_W, height: SPARK_H, viewBox: `0 0 ${SPARK_W} ${SPARK_H}`,
    'aria-hidden': 'true' });
  spark.append(line);
  const byKeyList = h('ul', { class: 'inv-bykey', role: 'list' });
  const stats = h('div', { class: 'inv-stats' },
    h('div', { class: 'inv-stat' }, h('span', { class: 'inv-k' }, 'Total investments'), total),
    h('div', { class: 'inv-stat' }, pctLabel, pct),
    spark,
    h('details', { class: 'inv-detail' }, h('summary', null, 'By portfolio'), byKeyList));

  // ── Invest form ──
  const cards = INVEST.portfolios.map((p) => {
    const r = typicalYearRange(p);
    const own = h('span', { class: 'inv-own' });
    const card = h('button', { type: 'button', class: 'inv-card', role: 'radio', 'aria-checked': 'false',
      dataset: { key: p.key, risk: p.key }, onClick: () => choose(p.key) },
    h('span', { class: 'inv-card-name' }, p.name),
    h('span', { class: 'inv-card-blurb' }, p.blurb),
    h('span', { class: 'inv-card-range' },
      `In a typical year, $1,000 could end up between ${formatMoney(r.lowCents)} and ${formatMoney(r.highCents)}.`),
    own);
    card._own = own;
    return card;
  });
  const amount = h('input', { id: 'inv-amount', class: 'inv-input', type: 'text', inputmode: 'numeric', autocomplete: 'off',
    placeholder: 'e.g. 1000', 'aria-describedby': 'inv-max inv-err' });
  const maxLine = h('p', { class: 'inv-max', id: 'inv-max' });
  const err = h('p', { class: 'inv-err', id: 'inv-err', role: 'alert' });
  const ok = h('p', { class: 'inv-ok', role: 'status' });
  const investBtn = h('button', { type: 'submit', class: 'btn btn-primary inv-buy' }, 'Invest');
  const buyForm = h('form', { class: 'inv-form', novalidate: true, onSubmit: (e) => {
    e.preventDefault();
    const v = validateBuy(cur, sel, amount.value);
    err.textContent = v.ok ? '' : v.error;
    ok.textContent = '';
    if (!v.ok) return;
    const name = INVEST.portfolios.find((p) => p.key === sel).name.toLowerCase();
    amount.value = '';
    onBuy?.(sel, v.cents);
    ok.textContent = `You invested ${formatMoney(v.cents)} in ${name}.`;
  } },
  h('fieldset', { class: 'inv-fs', disabled: live },
    h('legend', { class: 'inv-legend' }, 'Invest'),
    h('div', { class: 'inv-cards', role: 'radiogroup', 'aria-label': 'Choose a portfolio' }, ...cards),
    h('p', { class: 'inv-fine' }, 'These are simulated returns based on long-run history. Real markets can do better or worse.'),
    h('label', { class: 'inv-label', for: 'inv-amount' }, 'Amount to invest'),
    h('div', { class: 'inv-row' }, h('span', { class: 'inv-dollar', 'aria-hidden': 'true' }, '$'), amount, investBtn),
    maxLine, err, ok));

  // ── Sell form ──
  const sellPick = h('select', { id: 'inv-sell-pick', class: 'inv-select' });
  const sellAmt = h('input', { id: 'inv-sell-amount', class: 'inv-input', type: 'text', inputmode: 'numeric', autocomplete: 'off',
    placeholder: 'e.g. 500', 'aria-describedby': 'inv-sell-err' });
  const sellErr = h('p', { class: 'inv-err', id: 'inv-sell-err', role: 'alert' });
  const sellOk = h('p', { class: 'inv-ok', role: 'status' });
  function doSell(text) {
    const key = sellPick.value;
    const v = validateSell(cur, key, text);
    sellErr.textContent = v.ok ? '' : v.error;
    sellOk.textContent = '';
    if (!v.ok) return;
    sellAmt.value = '';
    onSell?.(key, v.cents);
    sellOk.textContent = `You sold ${formatMoney(v.cents)}. The money went to your savings.`;
  }
  const sellForm = h('form', { class: 'inv-form inv-sell', novalidate: true, onSubmit: (e) => { e.preventDefault(); doSell(sellAmt.value); } },
    h('fieldset', { class: 'inv-fs', disabled: live },
      h('legend', { class: 'inv-legend' }, 'Sell'),
      h('div', { class: 'inv-sell-row' },
        h('label', { class: 'inv-label', for: 'inv-sell-pick' }, 'From'), sellPick,
        h('label', { class: 'inv-label', for: 'inv-sell-amount' }, 'Amount'),
        h('div', { class: 'inv-row' }, h('span', { class: 'inv-dollar', 'aria-hidden': 'true' }, '$'), sellAmt)),
      h('div', { class: 'inv-row' },
        h('button', { type: 'submit', class: 'btn inv-sell-btn' }, 'Sell'),
        h('button', { type: 'button', class: 'btn btn-ghost inv-sell-all', onClick: () => doSell('all') }, 'Sell all')),
      h('p', { class: 'inv-fine' }, 'In real life, you might owe taxes on gains.'),
      sellErr, sellOk));

  const intro = h('p', { class: 'inv-intro' }, 'You have enough saved to think about investing. Investing can grow your money '
    + 'over time, but the value goes up and down. Only invest money you won’t need soon.');
  const el = h('section', { class: 'inv', dataset: { mode }, 'aria-labelledby': 'inv-h' },
    h('h2', { class: 'inv-h', id: 'inv-h' }, 'Investing'),
    intro, wordsToKnow(['stock', 'bond', 'index-fund', 'diversification', 'risk'], 'inv-words'), stats,
    live ? h('p', { class: 'inv-fine inv-paused' }, 'Buying and selling opens again when the month is over.') : null,
    buyForm, sellForm);

  function choose(key) {
    sel = key;
    for (const c of cards) c.setAttribute('aria-checked', String(c.dataset.key === key));
    err.textContent = '';
  }

  function showTotals(valueCents, growth, byKey, series) {
    total.textContent = formatMoney(valueCents);
    pct.textContent = growth === null ? '—' : signedPct(growth);
    pct.classList.toggle('up', growth > 0);
    pct.classList.toggle('down', growth < 0);
    line.setAttribute('points', series.length > 1 ? sparkLine(series, SPARK_W, SPARK_H) : '');
    byKeyList.replaceChildren(...Object.entries(byKey).map(([k, v]) => h('li', { dataset: { key: k } },
      h('span', null, INVEST.portfolios.find((p) => p.key === k).name), ' ',
      h('span', { class: 'inv-num-sm' }, formatMoney(v.valueCents)),
      v.pct === null ? null : h('span', { class: `inv-num-sm ${v.pct >= 0 ? 'up' : 'down'}` }, ` (${signedPct(v.pct)})`))));
  }

  /** Refresh every number from the state (not during the live ticks). */
  function update(s) {
    cur = s;
    const hs = holdings(s), held = hs.filter((x) => x.valueCents > 0);
    intro.hidden = !neverInvested(s);
    stats.hidden = !held.length;
    const max = maxInvest(s);
    maxLine.textContent = max > 0
      ? `You can invest up to ${formatMoney(max)}. You always keep $2,000 in the bank.`
      : 'You can invest $0 right now. You always keep $2,000 in the bank.';
    for (const c of cards) {
      const x = hs.find((y) => y.key === c.dataset.key);
      c._own.textContent = x.valueCents > 0 ? `You own ${formatMoney(x.valueCents)}` : '';
    }
    sellForm.hidden = !held.length;
    const prev = sellPick.value;
    sellPick.replaceChildren(...held.map((x) => h('option', { value: x.key }, `${x.name} (${formatMoney(x.valueCents)})`)));
    if (held.some((x) => x.key === prev)) sellPick.value = prev;
    if (live) return;
    const g = lastMonthGrowth(s);
    pctLabel.textContent = mode === 'summary' ? 'Average growth rate this month' : 'Average growth rate last month';
    const byKey = Object.fromEntries(held.map((x) => [x.key, { valueCents: x.valueCents, pct: null }]));
    showTotals(totalInvested(s), g ? g.pct : null, byKey, historySeries(s));
  }

  /** Live ticker: `v` = valueAt(…) at this moment; `series` = the month so far. */
  function tick(v, series) {
    pctLabel.textContent = 'Average growth rate this month';
    showTotals(v.valueCents, v.pct, v.byKey, series);
  }

  update(state);
  return { el, update, tick };
}
