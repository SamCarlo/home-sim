// Read-only student detail (11 §3, task 52): reads the save and shows the current home, the portfolio tabs
// (ui/portfolio/*), every letter with its score report, and the month history with wellbeing. The actions
// (reset, transfer, pause) sit in the header; each asks first.
import { h, clear } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { TABS } from '../ui/portfolio/index.js';
import { kv, chip, empty, humanKey } from '../ui/portfolio/parts.js';
import { letterList } from '../ui/portfolio/portfolioModel.js';
import { renderLetterReport } from '../ui/letterReport.js';
import { formatMoney } from '../util/format.js';
import { monthLabel } from '../util/dates.js';
import { rowFor, cellText } from './adminModel.js';
import { resetGame, transferSave, togglePause } from './actions.js';

const READ_ONLY_TABS = TABS.filter((t) => !['settings', 'letters'].includes(t.id));
const avg = (o) => { const v = Object.values(o || {}).filter(Number.isFinite); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };

/** openStudentDetail({source, player, players, onChanged}) → {close}. onChanged() reloads the console after an action. */
export function openStudentDetail({ source, player, players, onChanged }) {
  const row = rowFor(player);
  const body = h('div', { class: 'adm-detail-body' }, h('p', { class: 'muted' }, 'Loading the saved game…'));
  const act = (fn) => async () => { if (await fn()) { modal.close(); onChanged(); } };
  const status = row.transferredTo
    ? chip('na', `Transferred to ${players.find((p) => p.uid === row.transferredTo)?.username ?? 'another username'}`)
    : row.disabled ? chip('na', 'Paused') : chip('green', 'Active');
  const content = h('div', { class: 'adm-detail' },
    h('div', { class: 'adm-detail-head' },
      h('div', null,
        h('h2', { class: 'adm-detail-title', id: 'adm-detail-title' }, row.username),
        h('p', { class: 'adm-detail-meta' }, `${row.classCode} · `, status, ` · last active ${cellText(row, 'lastActive')}`)),
      h('div', { class: 'adm-detail-actions' },
        h('button', { type: 'button', class: 'btn btn-secondary btn-small adm-transfer', onClick: act(() => transferSave(source, player, players)) }, 'Transfer save'),
        h('button', { type: 'button', class: 'btn btn-secondary btn-small adm-pause', onClick: act(() => togglePause(source, player)) }, player.disabled ? 'Unpause' : 'Pause'),
        h('button', { type: 'button', class: 'btn btn-danger btn-small adm-reset', onClick: act(() => resetGame(source, player)) }, 'Reset game'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-small adm-detail-close', 'aria-label': 'Close', onClick: () => modal.close() }, '✕'))),
    body);
  const modal = openModal({ label: `${row.username}'s game`, content, className: 'adm-detail-modal' });

  source.loadSave(player.uid).then((state) => {
    clear(body).append(state ? renderBody(state) : empty(`${row.username} hasn't saved a game yet.`));
    document.body.dataset.detailReady = '1';
  }).catch((err) => {
    console.warn('admin load save', err?.code || err);
    clear(body).append(h('p', { class: 'adm-error', role: 'alert' }, "This student's save couldn't be read."));
    document.body.dataset.detailReady = '1';
  });
  delete document.body.dataset.detailReady;
  return { close: () => modal.close() };
}

function renderBody(state) {
  return h('div', { class: 'adm-detail-grid' },
    h('div', { class: 'adm-detail-col' }, homeBlock(state), historyBlock(state), lettersBlock(state)),
    h('div', { class: 'adm-detail-col' }, portfolioBlock(state)));
}

function section(title, ...children) {
  return h('section', { class: 'adm-block' }, h('h3', { class: 'adm-block-title' }, title), ...children);
}

function homeBlock(s) {
  const life = s.phase === 'life';
  return section('Current home', kv([
    ['Character', s.player?.characterName || '—'],
    ['Job', s.player?.jobTitle ? `${s.player.jobTitle} · ${formatMoney(s.player.netMonthlyIncomeCents ?? 0)}/mo` : '—'],
    ['Phase', humanKey(s.phase)],
    life ? ['Game month', monthLabel(s.life?.monthIndex ?? 0)] : null,
    ['Home', s.home?.label || [s.choice?.locationName ?? s.choice?.locationId, s.choice?.homeTypeId].filter(Boolean).join(' · ') || 'Not chosen yet'],
    ['Wellbeing now', avg(s.life?.wellbeing) == null ? '—' : String(avg(s.life.wellbeing))],
  ]));
}

function historyBlock(s) {
  const months = s.life?.history ?? [];
  if (!months.length) return section('Month history', empty('No months lived yet.'));
  return section('Month history', h('table', { class: 'adm-table adm-history' },
    h('thead', null, h('tr', null, ['Month', 'Income', 'Spent', 'Net worth', 'Credit', 'Wellbeing'].map((t, i) => h('th', { scope: 'col', class: i ? 'num' : null }, t)))),
    h('tbody', null, months.map(({ monthIndex, result: r = {} }) => h('tr', null,
      h('th', { scope: 'row' }, monthLabel(monthIndex), r.evicted ? ' (evicted)' : ''),
      h('td', { class: 'num' }, formatMoney(r.incomeCents ?? 0)),
      h('td', { class: 'num' }, formatMoney(Math.abs(r.expenseCents ?? 0))),
      h('td', { class: 'num' }, formatMoney(r.netWorthCents ?? 0)),
      h('td', { class: 'num' }, String(r.creditAfter ?? '—')),
      h('td', { class: 'num' }, String(avg(r.wellbeingAfter) ?? '—')))))));
}

function lettersBlock(s) {
  const list = letterList(s);
  if (!list.length) return section('Letters', empty('No letters yet.'));
  return section(`Letters (${list.length})`, list.map((l) => h('details', { class: 'adm-letter' },
    h('summary', null, `${humanKey(l.type || 'letter')} letter`, l.to ? ` to ${l.to}` : ''),
    h('div', { class: 'pf-report' }, renderLetterReport(l)),
    h('div', { class: 'pf-letter' }, String(l.text || '').split(/\n{2,}/).map((p) => h('p', null, p))))));
}

/** The student's portfolio tabs, read-only (no settings, no restart). */
function portfolioBlock(state) {
  let current = READ_ONLY_TABS[0].id;
  let openId = null;
  const nav = { get openId() { return openId; }, open: (id) => { openId = id; draw(); }, back: () => { openId = null; draw(); } };
  const panel = h('div', { class: 'pf-panel adm-pf-panel', role: 'tabpanel', id: 'adm-pf-panel', tabindex: '0' });
  const buttons = READ_ONLY_TABS.map((t) => h('button', { type: 'button', role: 'tab', class: 'pf-tab', 'aria-controls': 'adm-pf-panel',
    dataset: { tab: t.id }, onClick: () => { current = t.id; openId = null; draw(); } }, t.label));
  function draw() {
    for (const b of buttons) { const on = b.dataset.tab === current; b.setAttribute('aria-selected', String(on)); b.classList.toggle('is-current', on); }
    clear(panel).append(READ_ONLY_TABS.find((t) => t.id === current).render(state, { nav, store: null, user: null }));
  }
  draw();
  return section('Portfolio (read-only)', h('div', { class: 'pf adm-pf' },
    h('div', { class: 'pf-tabs', role: 'tablist', 'aria-label': 'Portfolio sections' }, buttons), panel));
}
