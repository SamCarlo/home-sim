// Small DOM pieces shared by the portfolio tabs (task 17).
import { h } from '../dom.js';

/** A titled block inside a tab. */
export function block(title, ...children) {
  return h('section', { class: 'pf-block' }, title ? h('h3', { class: 'pf-block-title' }, title) : null, ...children);
}

/** A key/value list: rows = [[label, value], …]; null rows are skipped. Values may be strings or Nodes. */
export function kv(rows) {
  return h('dl', { class: 'pf-kv' }, rows.filter(Boolean).map(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
}

/** A status chip with icon + label (never color alone, 12 §3). status: red | yellow | cyan | green | na. */
export function chip(status, label) {
  const icons = { red: '✕', yellow: '⚠', cyan: '◎', green: '✓', na: '—' };
  return h('span', { class: `pf-chip st-${status}` }, h('span', { 'aria-hidden': 'true' }, icons[status] ?? '•'), ' ', label);
}

/** A muted "nothing here yet" line. */
export function empty(text) {
  return h('p', { class: 'pf-empty muted' }, text);
}

/** A clickable list row: title, a meta line, and an optional chip. */
export function rowButton({ title, meta, badge = null, onClick }) {
  return h('li', null, h('button', { type: 'button', class: 'pf-row', onClick },
    h('span', { class: 'pf-row-main' }, h('span', { class: 'pf-row-title' }, title), h('span', { class: 'pf-row-meta muted' }, meta)),
    badge,
    h('span', { class: 'pf-row-go', 'aria-hidden': 'true' }, '›')));
}

/** A detail view with a Back button that returns to the list (onBack). */
export function detail({ title, onBack }, ...children) {
  return h('div', { class: 'pf-detail' },
    h('button', { type: 'button', class: 'btn btn-ghost btn-small pf-back', onClick: onBack }, '‹ Back'),
    h('h3', { class: 'pf-detail-title' }, title),
    ...children);
}
