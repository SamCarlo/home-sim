// The detail panel for one table cell (04 §6): title + status and reasons, the 2D preview, Upfront and Monthly cost
// tables with every line's note, lifestyle metrics, about this place, and "Choose this home". The same content is
// used inline (a full-width row at ≥ 900 px) and in a modal sheet (below 900 px); planScreen decides which.
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { formatMoney } from '../../finance/money.js';
import { renderPreviewSVG } from './preview2d/index.js';
import { detailTitle, utilityNotes, hazardLabel, chooseCheck } from './detailModel.js';

let uid = 0;

function costTable(caption, lines, totalCents, totalLabel, idBase) {
  return h('table', { class: 'plan-dt-costs' },
    h('caption', null, caption),
    h('thead', { class: 'sr-only' }, h('tr', null, h('th', { scope: 'col' }, 'Item'), h('th', { scope: 'col' }, 'Amount'))),
    h('tbody', null, lines.map((line, i) => {
      const noteId = `${idBase}-${i}`;
      return h('tr', null,
        h('th', { scope: 'row' },
          h('span', { class: 'plan-dt-line', 'aria-describedby': noteId }, line.label),
          h('span', { class: 'plan-dt-note', id: noteId }, line.note)),
        h('td', null, formatMoney(line.cents)));
    })),
    h('tfoot', null, h('tr', null, h('th', { scope: 'row' }, totalLabel), h('td', null, formatMoney(totalCents)))));
}

function metricValue(m) {
  if (m.kind === 'stars') {
    const pct = `${Math.round((m.value / m.max) * 100)}%`;
    return h('span', { class: 'plan-dt-stars', role: 'img', 'aria-label': m.display },
      h('span', { class: 'plan-dt-stars-back', 'aria-hidden': 'true' }, '★★★★★'),
      h('span', { class: 'plan-dt-stars-fill', 'aria-hidden': 'true', style: { width: pct } }, '★★★★★'));
  }
  if (m.kind === 'bar') {
    return h('span', { class: 'plan-dt-bar-wrap' },
      h('span', { class: 'plan-dt-bar', 'aria-hidden': 'true' },
        h('span', { class: 'plan-dt-bar-fill', style: { width: `${Math.round((m.value / m.max) * 100)}%` } })),
      h('span', { class: 'plan-dt-num' }, m.display));
  }
  return h('span', { class: 'plan-dt-num' }, m.display);
}

function metricsList(metrics) {
  return h('ul', { class: 'plan-dt-metrics' }, metrics.map((m) => h('li', { class: 'plan-dt-metric' },
    h('span', { class: 'plan-dt-metric-icon' }, icon(m.key)),
    h('span', { class: 'plan-dt-metric-head' },
      h('span', { class: 'plan-dt-metric-label' }, m.label),
      metricValue(m)),
    h('span', { class: 'plan-dt-metric-meaning' }, m.meaning))));
}

function about(location) {
  return h('section', { class: 'plan-dt-about', 'aria-label': 'About this place' },
    h('h3', null, 'About this place'),
    h('p', null, location.blurb),
    h('ul', { class: 'plan-dt-hazards', 'aria-label': 'Natural hazards' },
      location.hazards.map((k) => h('li', { class: 'plan-dt-chip' }, icon('hazard', { size: 14 }), hazardLabel(k)))),
    location.hazardNotes ? h('p', { class: 'plan-dt-small' }, location.hazardNotes) : null,
    h('ul', { class: 'plan-dt-utils' }, utilityNotes(location).map((t) => h('li', null, icon('water', { size: 16 }), t))));
}

/**
 * renderDetail({cell, location, homeType, denied, mode: 'inline'|'sheet', onClose(), onChoose(cell)}) → Node.
 * The heading (.plan-dt-title) has tabindex -1 so focus can move into the panel when it opens.
 */
export function renderDetail({ cell, location, homeType, denied = false, mode = 'inline', onClose, onChoose }) {
  const id = `plan-dt-${++uid}`;
  const { status, cost } = cell;
  const check = chooseCheck(cell);
  const available = cost.available !== false;
  const title = detailTitle(location, homeType);

  const head = h('header', { class: 'plan-dt-head' },
    h('h2', { class: 'plan-dt-title', id: `${id}-title`, tabindex: -1 }, title),
    h('span', { class: `plan-dt-status st-${status.status}` },
      h('span', { class: 'plan-dt-status-icon', 'aria-hidden': 'true' }, status.icon), status.label),
    denied ? h('span', { class: 'plan-badge plan-dt-denied' }, 'Denied last time') : null,
    h('button', { type: 'button', class: 'btn btn-ghost plan-dt-close', onClick: () => onClose() }, 'Close (Esc)'));
  const reasons = h('ul', { class: 'plan-dt-reasons' }, status.reasons.map((r) => h('li', null, r)),
    denied ? h('li', null, 'Your last application for this home was turned down. You can try again.') : null);

  const preview = h('figure', { class: 'plan-dt-preview' },
    h('div', { class: 'plan-dt-svg' }),
    h('figcaption', null, location.hook));
  // renderPreviewSVG escapes every text node it writes, so innerHTML is safe here (task 13 note).
  preview.firstChild.innerHTML = renderPreviewSVG({ location, homeTypeId: homeType.id });

  const costs = available
    ? h('section', { class: 'plan-dt-cost', 'aria-label': 'Cost breakdown' },
      h('h3', null, 'What it costs'),
      costTable('Upfront (once)', cost.upfront, cost.upfrontCents, 'Total upfront', `${id}-up`),
      costTable('Monthly (first year)', cost.monthly, cost.monthlyCents, 'Total per month', `${id}-mo`))
    : h('section', { class: 'plan-dt-cost', 'aria-label': 'Cost breakdown' },
      h('h3', null, 'What it costs'), h('p', { class: 'plan-dt-small' }, 'There are no prices because this home type is not available here.'));

  const metrics = h('section', { class: 'plan-dt-life', 'aria-label': 'Lifestyle' },
    h('h3', null, 'What life is like'), metricsList(cell.metrics));

  const choose = h('button', {
    type: 'button', class: 'btn btn-primary btn-lg plan-dt-choose', disabled: !check.ok,
    'aria-describedby': check.ok ? null : `${id}-why`, onClick: () => onChoose(cell),
  }, 'Choose this home');
  const foot = h('footer', { class: 'plan-dt-foot' },
    choose,
    check.ok ? h('p', { class: 'plan-dt-small' }, 'Next: the paperwork to rent or buy it.')
      : h('p', { class: 'plan-dt-why', id: `${id}-why` }, check.reasons.join(' ')));

  const panel = h('div', {
    class: `plan-detail plan-detail--${mode}`, role: mode === 'inline' ? 'region' : null, 'aria-labelledby': `${id}-title`,
    dataset: { loc: location.id, type: homeType.id },
  },
  head, reasons,
  h('div', { class: 'plan-dt-body' },
    h('div', { class: 'plan-dt-col' }, preview, about(location)),
    h('div', { class: 'plan-dt-col' }, costs),
    h('div', { class: 'plan-dt-col' }, metrics)),
  foot);
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mode === 'inline') { e.preventDefault(); onClose(); }
  });
  return panel;
}
