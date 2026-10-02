// Portfolio tabs: Agreements, Letters, Applications (02 §2, 05 §9, task 17).
// nav = { openId, open(id), back() }: a list, or one item's read-only detail with a Back button.
import { h } from '../dom.js';
import { formatMoney } from '../../util/format.js';
import { byId } from '../../data/locations/index.js';
import { HOME_TYPES_BY_ID } from '../../data/homeTypes.js';
import { block, kv, empty, chip, rowButton, detail } from './parts.js';
import { AGREEMENT_STATUS, APPLICATION_STATUS, letterList } from './portfolioModel.js';

const AG_CHIP = { pending: 'yellow', active: 'green', void: 'na' };
const APP_CHIP = { pending: 'yellow', approved: 'green', denied: 'red' };
const dateText = (ms) => (ms ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const ACRONYMS = { pmi: 'PMI', apr: 'APR', hoa: 'HOA', fha: 'FHA' };
const humanKey = (k) => String(k).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase()
  .replace(/\b[a-z]+\b/g, (w) => ACRONYMS[w] ?? w).replace(/^./, (c) => c.toUpperCase());

/** Show a stored value (cents fields as money, booleans as Yes/No). Always text, never HTML. */
function valueText(key, v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number' && /cents$/i.test(key)) return formatMoney(v, { showCents: true });
  if (typeof v === 'number' && /(rate|apr|pct)$/i.test(key)) return `${Number((v * 100).toFixed(3))}%`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
const kvOf = (obj) => Object.entries(obj || {}).map(([k, v]) => [humanKey(k.replace(/Cents$/, '')), valueText(k, v)]);

/** Agreements list; opening one shows the signed values read-only (task 18's form render replaces the summary). */
export function renderAgreements(state, nav) {
  const list = state.finances.agreements;
  const open = list.find((a) => a.id === nav.openId);
  if (open) {
    return detail({ title: open.title || humanKey(open.type), onBack: nav.back },
      h('p', null, chip(AG_CHIP[open.status] ?? 'na', AGREEMENT_STATUS[open.status] ?? open.status)),
      open.summary ? h('p', { class: 'pf-summary' }, open.summary) : null,
      block('Details', kv([['With', open.counterparty || '—'], ['Signed', dateText(open.signedAt) || '—'], ...kvOf(open.terms)])),
      Object.keys(open.docValues || {}).length ? block('What you filled in', kv(kvOf(open.docValues))) : null,
      h('p', { class: 'pf-note muted' }, 'Read-only. This is a copy of what you signed.'));
  }
  if (!list.length) return empty('No agreements yet. Leases, loans and policies you sign appear here.');
  return h('ul', { class: 'pf-list' }, list.map((a) => rowButton({
    title: a.title || humanKey(a.type), meta: [a.counterparty, dateText(a.signedAt)].filter(Boolean).join(' · '),
    badge: chip(AG_CHIP[a.status] ?? 'na', AGREEMENT_STATUS[a.status] ?? a.status), onClick: () => nav.open(a.id),
  })));
}

/** Letters list; opening one shows its text (the score report arrives in task 28). */
export function renderLetters(state, nav) {
  const list = letterList(state);
  const open = list.find((l) => l.id === nav.openId);
  if (open) {
    return detail({ title: letterTitle(open), onBack: nav.back },
      kv([['To', open.to || '—'], ['Sent', dateText(open.sentAt) || '—'],
        open.score?.band ? ['Letter score', `${open.score.band}${open.score.likelihood != null ? ` (${Math.round(open.score.likelihood * 100)}% likely to help)` : ''}`] : null]),
      h('div', { class: 'pf-letter' }, String(open.text || '').split(/\n{2,}/).map((p) => h('p', null, p))));
  }
  if (!list.length) return empty('No letters yet. Letters you write during paperwork are kept here.');
  return h('ul', { class: 'pf-list' }, list.map((l) => rowButton({
    title: letterTitle(l), meta: [l.to, dateText(l.sentAt)].filter(Boolean).join(' · '),
    badge: l.score?.band ? h('span', { class: 'pf-tag' }, l.score.band) : null, onClick: () => nav.open(l.id),
  })));
}

function letterTitle(l) {
  return `${humanKey(l.type || 'letter')} letter`;
}

/** Applications: kind, target, status, fee and reasons. */
export function renderApplications(state) {
  const list = [...state.finances.applications].sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  if (!list.length) return empty('No applications yet.');
  return h('ul', { class: 'pf-list pf-apps' }, list.map((a) => h('li', { class: 'pf-app' },
    h('div', { class: 'pf-app-head' },
      h('strong', null, `${humanKey(a.kind)} application`),
      chip(APP_CHIP[a.status] ?? 'na', APPLICATION_STATUS[a.status] ?? a.status)),
    kv([['For', targetText(a.target)], ['Fee', formatMoney(a.feeCents || 0, { showCents: true })],
      a.at ? ['Submitted', dateText(a.at)] : null]),
    a.reasons?.length ? h('ul', { class: 'pf-reasons' }, a.reasons.map((r) => h('li', null, r))) : null)));
}

function targetText(t) {
  if (!t) return '—';
  const [loc, type] = String(t).split('|');
  const place = byId[loc]?.name ?? humanKey(loc);
  return type ? `${place}, ${(HOME_TYPES_BY_ID[type]?.label ?? type).toLowerCase()}` : place;
}
