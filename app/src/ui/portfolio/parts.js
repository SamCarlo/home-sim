// Small DOM pieces shared by the portfolio tabs (task 17).
import { h } from '../dom.js';
import { formatMoney } from '../../util/format.js';

const ACRONYMS = { pmi: 'PMI', apr: 'APR', hoa: 'HOA', fha: 'FHA' };
/** "principalCents" / "move-in" → "Principal cents" / "Move in" (PMI, APR, HOA, FHA kept upper-case). */
export const humanKey = (k) => String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase()
  .replace(/\b[a-z]+\b/g, (w) => ACRONYMS[w] ?? w).replace(/^./, (c) => c.toUpperCase());

/** Show a stored value (cents fields as money, booleans as Yes/No). Always text, never HTML. */
export function valueText(key, v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number' && /cents$/i.test(key)) return formatMoney(v, { showCents: true });
  if (typeof v === 'number' && /(rate|apr|pct)$/i.test(key)) return `${Number((v * 100).toFixed(3))}%`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
/** An object as kv rows [[label, text]] (Cents suffix dropped from labels). */
export const kvOf = (obj) => Object.entries(obj || {}).map(([k, v]) => [humanKey(k.replace(/Cents$/, '')), valueText(k, v)]);

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
