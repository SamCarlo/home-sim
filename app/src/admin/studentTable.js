// Student table (11 §3, task 52): one row per players doc; filter by class, search by username, sort by any column
// (header buttons with aria-sort), Export CSV of what's shown. Clicking a username opens the read-only detail.
import { h, clear } from '../ui/dom.js';
import { COLUMNS, cellText, filterRows, sortRows } from './adminModel.js';
import { toCsv, downloadCsv } from './csv.js';

/** renderStudentTable({rows, codes, view, onOpen}) → element. view {classCode, search, sort, dir} persists across reloads. */
export function renderStudentTable({ rows, codes, view, onOpen }) {
  const tbody = h('tbody');
  const count = h('p', { class: 'adm-count muted', 'aria-live': 'polite' });
  const headCells = COLUMNS.map((c) => h('th', { scope: 'col', class: c.kind === 'num' ? 'num' : null, dataset: { key: c.key } },
    h('button', { type: 'button', class: 'adm-sort', onClick: () => sortBy(c.key) }, c.label, h('span', { class: 'adm-sort-mark', 'aria-hidden': 'true' }))));

  const classSel = h('select', { id: 'adm-filter-class', class: 'adm-select', onChange: () => { view.classCode = classSel.value; draw(); } },
    h('option', { value: '' }, 'All classes'),
    [...new Set([...codes.map((c) => c.code), ...rows.map((r) => r.classCode)])].filter(Boolean).sort()
      .map((c) => h('option', { value: c, selected: c === view.classCode }, c)));
  const search = h('input', { id: 'adm-search', class: 'adm-input', type: 'search', placeholder: 'Search usernames', value: view.search,
    onInput: () => { view.search = search.value; draw(); } });

  function sortBy(key) {
    view.dir = view.sort === key && view.dir === 'asc' ? 'desc' : 'asc';
    view.sort = key;
    draw();
  }

  const shown = () => sortRows(filterRows(rows, view), view.sort, view.dir);

  function draw() {
    for (const th of headCells) {
      const on = th.dataset.key === view.sort;
      th.setAttribute('aria-sort', on ? (view.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      th.querySelector('.adm-sort-mark').textContent = on ? (view.dir === 'asc' ? ' ▲' : ' ▼') : '';
    }
    const list = shown();
    clear(tbody).append(...list.map((r) => h('tr', { class: r.disabled ? 'is-paused' : null, dataset: { uid: r.uid } },
      COLUMNS.map((c) => (c.key === 'username'
        ? h('th', { scope: 'row' },
          h('button', { type: 'button', class: 'adm-open', onClick: () => onOpen(r.uid) }, r.username),
          r.disabled ? h('span', { class: 'pf-chip st-na adm-paused' }, h('span', { 'aria-hidden': 'true' }, '—'), r.transferredTo ? ' Transferred' : ' Paused') : null)
        : h('td', { class: c.kind === 'num' ? 'num' : null }, cellText(r, c.key)))))));
    if (!list.length) tbody.append(h('tr', null, h('td', { colspan: COLUMNS.length, class: 'muted adm-empty' },
      rows.length ? 'No students match.' : 'No students yet. They appear here once they create an account with a class code.')));
    count.textContent = `${list.length} of ${rows.length} student${rows.length === 1 ? '' : 's'}`;
  }

  const exportBtn = h('button', { type: 'button', class: 'btn btn-secondary adm-export', onClick: () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(toCsv(shown()), `home-sim-students-${view.classCode || 'all'}-${stamp}.csv`);
  } }, 'Export CSV');

  draw();
  return h('section', { class: 'card adm-card adm-students', 'aria-labelledby': 'adm-students-title' },
    h('div', { class: 'adm-card-head' },
      h('h2', { class: 'adm-card-title', id: 'adm-students-title' }, 'Students'),
      h('div', { class: 'adm-toolbar' },
        h('label', { class: 'adm-label', for: 'adm-filter-class' }, 'Class'), classSel,
        h('label', { class: 'adm-label', for: 'adm-search' }, 'Search'), search,
        exportBtn)),
    count,
    h('div', { class: 'adm-table-wrap' }, h('table', { class: 'adm-table adm-student-table' },
      h('thead', null, h('tr', null, headCells)), tbody)));
}
