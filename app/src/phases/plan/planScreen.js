// Phase 1: Plan (04 §5). "Your numbers" bar + legend + hide toggle, the affordability table, and the notes under it.
// The table DOM is built once; store changes only recolor it. Opening a cell sets plan.expanded (detail panel: task 15).
import { h } from '../../ui/dom.js';
import { AFFORD } from '../../config.js';
import { formatMoney } from '../../finance/money.js';
import { STATUSES } from '../../finance/affordability.js';
import { buildGrid } from '../../finance/grid.js';
import { createTable } from './table.js';
import { cellKey, deniedKeys } from './tableModel.js';

const PRICE_NOTE = 'Prices are approximate 2025–26 figures for each place. Canada is converted to U.S. dollars.';

/** Mount the plan screen; returns unmount. */
export function mount(container, ctx) {
  const { store } = ctx;
  let grid = buildGrid(store.getState());

  const num = (label, value, extra = null) => h('div', { class: 'plan-num' },
    h('span', { class: 'plan-num-label' }, label), h('strong', { class: 'plan-num-value' }, value), extra);
  const nums = {
    income: h('span'), cash: h('span'), third: h('span'), fifth: h('span'),
  };
  const toggle = h('input', {
    type: 'checkbox', class: 'plan-hide-input', id: 'plan-hide',
    onChange: () => store.update((s) => { s.plan.hideUnaffordable = toggle.checked; }),
  });

  const bar = h('section', { class: 'plan-bar card', 'aria-label': 'Your numbers' },
    h('div', { class: 'plan-bar-nums' },
      h('h2', { class: 'plan-bar-title' }, 'Your numbers'),
      num('Take-home pay', nums.income),
      num('Cash in the bank', nums.cash),
      num('⅓ of your income', nums.third, h('span', { class: 'plan-num-note' }, 'stretch line')),
      num('⅕ of your income', nums.fifth, h('span', { class: 'plan-num-note' }, 'well-below line'))),
    h('div', { class: 'plan-bar-side' },
      h('ul', { class: 'plan-legend', 'aria-label': 'What the colors mean' },
        STATUSES.map((s) => h('li', { class: `plan-legend-item st-${s.status}` },
          h('span', { class: 'plan-legend-icon', 'aria-hidden': 'true' }, s.icon), s.label))),
      h('label', { class: 'plan-hide', for: 'plan-hide' }, toggle, "Hide homes I can't afford")),
  );

  const table = createTable(grid, {
    onOpen: (locationId, homeTypeId) => store.update((s) => {
      const e = s.plan.expanded;
      s.plan.expanded = e && e.locationId === locationId && e.homeTypeId === homeTypeId ? null : { locationId, homeTypeId };
    }),
    onClose: () => close(),
  });

  function close() {
    const e = store.getState().plan.expanded;
    if (!e) return;
    store.update((s) => { s.plan.expanded = null; });
    table.focusCell(cellKey(e.locationId, e.homeTypeId));
  }

  // Placeholder for the detail panel (task 15): proves the expand/close mechanics.
  const detail = (x) => h('div', { class: 'plan-detail', role: 'region', 'aria-label': `${x.location.name}, ${x.homeType.label}` },
    h('p', null, h('strong', null, `${x.location.name} · ${x.homeType.title}`), ' ', h('span', null, 'Details coming in task 15.')),
    h('button', { type: 'button', class: 'btn btn-ghost plan-detail-close', onClick: close }, 'Close (Esc)'));

  const notes = h('footer', { class: 'plan-notes' }, h('p', null, grid.assumptions), h('p', null, PRICE_NOTE));
  const screen = h('div', { class: 'plan-screen' },
    h('h1', { class: 'sr-only' }, 'Phase 1: Plan. Pick a place and a home type.'),
    bar, table.el, notes);
  container.appendChild(screen);

  const render = (state) => {
    grid = buildGrid(state);
    nums.income.textContent = `${formatMoney(grid.incomeCents)}/mo`;
    nums.cash.textContent = formatMoney(grid.cashCents);
    nums.third.textContent = formatMoney(Math.round(grid.incomeCents / AFFORD.stretchDivisor));
    nums.fifth.textContent = formatMoney(Math.round(grid.incomeCents / AFFORD.wellBelowDivisor));
    toggle.checked = !!state.plan.hideUnaffordable;
    table.update(grid, {
      hideUnaffordable: state.plan.hideUnaffordable,
      denied: deniedKeys(state.plan.attempts),
      expanded: state.plan.expanded,
      detail,
    });
  };
  render(store.getState());
  const unsub = store.subscribe((state) => { if (state.phase === 'plan') render(state); });

  document.body.dataset.ready = '1';
  return () => { unsub(); delete document.body.dataset.ready; };
}
