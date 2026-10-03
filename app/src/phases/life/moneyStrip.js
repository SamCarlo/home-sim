// The Phase 4 money strip (09 §1, task 42): Checking · Savings · Credit card · Investments (if any) · Net worth.
// Figures come from the pure life/monthFlow.js moneyStrip(state); the card shows what's owed.
import { h } from '../../ui/dom.js';
import { formatMoney } from '../../util/format.js';
import { moneyStrip } from '../../life/monthFlow.js';
import { term } from '../../ui/term.js';

/**
 * Render the money strip; returns `{el, update(state), tick({key: cents})}`. `tick` rewrites single figures in place
 * (the investment ticker, task 48); the next `update` redraws everything from the state.
 */
export function renderMoneyStrip(state) {
  const el = h('section', { class: 'life-money', 'aria-label': 'Your money' });
  function update(s) {
    el.replaceChildren(...moneyStrip(s).map((it) => h('div', { class: `life-money-item m-${it.key}`, dataset: { key: it.key } },
      h('span', { class: 'life-money-label' }, it.key === 'card' ? 'Credit card owed'
        : it.key === 'net' ? term('net-worth', it.label) : it.label),
      h('span', { class: `life-money-value${it.cents < 0 ? ' neg' : ''}` }, formatMoney(it.cents)),
    )));
  }
  function tick(values) {
    for (const [key, cents] of Object.entries(values)) {
      const v = el.querySelector(`[data-key="${key}"] .life-money-value`);
      if (!v) continue;
      v.textContent = formatMoney(cents);
      v.classList.toggle('neg', cents < 0);
    }
  }
  update(state);
  return { el, update, tick };
}
