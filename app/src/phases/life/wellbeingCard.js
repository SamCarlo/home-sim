// "Domains of personal wellbeing" (09 §1, task 42): five labeled 0–100 bars, each with its number and last month's
// change (▲3 / ▼2). Values come from the pure life/monthFlow.js wellbeingBars(state).
import { h } from '../../ui/dom.js';
import { wellbeingBars } from '../../life/monthFlow.js';

/** "▲3", "▼2", "–" (no change) or '' before the first month. */
function changeText(change) {
  if (change === null) return '';
  if (change > 0) return `▲${change}`;
  if (change < 0) return `▼${-change}`;
  return '–';
}

/** Render the wellbeing card; returns `{el, update(state)}`. */
export function renderWellbeingCard(state) {
  const el = h('section', { class: 'life-wb', 'aria-labelledby': 'life-wb-title' });
  function update(s) {
    el.replaceChildren(
      h('h2', { class: 'life-wb-title', id: 'life-wb-title' }, 'Domains of personal wellbeing'),
      h('ul', { class: 'life-wb-list' }, ...wellbeingBars(s).map((b) => {
        const ch = changeText(b.change);
        const dir = b.change > 0 ? 'up' : b.change < 0 ? 'down' : 'flat';
        return h('li', { class: 'life-wb-row', dataset: { domain: b.key } },
          h('span', { class: 'life-wb-label' }, b.label),
          h('span', { class: 'life-wb-num' }, String(b.value)),
          h('span', { class: `life-wb-ch ${dir}`, 'aria-label': b.change === null ? null : b.change === 0 ? 'no change last month' : `changed ${b.change > 0 ? 'up' : 'down'} ${Math.abs(b.change)} last month` }, ch),
          h('span', { class: 'life-wb-track', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100',
            'aria-valuenow': String(b.value), 'aria-label': b.label },
          h('span', { class: `life-wb-fill ${b.value < 35 ? 'low' : b.value >= 70 ? 'high' : 'mid'}`, style: `width: ${b.value}%` })),
        );
      })),
    );
  }
  update(state);
  return { el, update };
}
