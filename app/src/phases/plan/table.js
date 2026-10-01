// The Phase 1 table (04 §5): 20 places × 5 home types, colored by affordability. The DOM is built once from the
// grid's layout; update() swaps classes and text when income, cash, hiding, denials or the open cell change.
// Cells are buttons with a roving tabindex: arrows, Home/End move; Enter/Space opens; Esc closes.
import { h } from '../../ui/dom.js';
import { HOME_TYPE_LIST } from '../../data/homeTypes.js';
import {
  cellKey, upfrontText, monthlyText, cellAriaLabel, isHiddenStatus, moveFocus, firstVisible,
} from './tableModel.js';

const STATUS_CLASSES = ['st-red', 'st-yellow', 'st-cyan', 'st-green', 'st-na'];

/**
 * createTable(grid, {onOpen(locationId, homeTypeId), onClose()}) → { el, update(grid, view), focusCell(key) }.
 * view: { hideUnaffordable, denied: Set<key>, expanded: {locationId, homeTypeId} | null, detail: (cell) → Node }.
 */
export function createTable(grid, { onOpen, onClose }) {
  const cells = []; // [r][c] → { button, parts, cell, location, homeType, td }
  const rows = []; // [r] → { tr, regionIndex }
  const regionRows = [];
  const tbody = h('tbody');
  let focus = { r: 0, c: 0 };
  let visible = [];
  let detailRow = null;

  grid.groups.forEach((group, gi) => {
    const regionTr = h('tr', { class: 'plan-region' },
      h('th', { scope: 'colgroup', colspan: HOME_TYPE_LIST.length + 1 }, h('span', null, group.label)));
    regionRows.push(regionTr);
    tbody.append(regionTr);
    for (const row of group.rows) {
      const r = rows.length;
      const loc = row.location;
      const tr = h('tr', { class: 'plan-row' },
        h('th', { scope: 'row', class: 'plan-loc', title: loc.fullName },
          h('span', { class: 'plan-loc-name' }, loc.name),
          h('span', { class: 'plan-loc-sub' }, loc.state || loc.country)));
      const rowCells = row.cells.map((cell, c) => {
        const homeType = HOME_TYPE_LIST[c];
        const parts = {
          icon: h('span', { class: 'plan-cell-icon', 'aria-hidden': 'true' }),
          label: h('span', { class: 'plan-cell-label' }),
          up: h('span', { class: 'plan-cell-up' }),
          mo: h('span', { class: 'plan-cell-mo' }),
          badge: h('span', { class: 'plan-badge', hidden: true }, 'Denied last time'),
        };
        const button = h('button', {
          type: 'button', class: 'plan-cell', tabindex: -1,
          dataset: { loc: loc.id, type: homeType.id, r: String(r), c: String(c) },
          onClick: () => { focus = { r, c }; syncTabindex(); onOpen(loc.id, homeType.id); },
          onFocus: () => { focus = { r, c }; syncTabindex(); },
        },
        h('span', { class: 'plan-cell-status' }, parts.icon, parts.label),
        parts.up, parts.mo, parts.badge);
        const td = h('td', null, button);
        tr.append(td);
        return { button, parts, cell, location: loc, homeType, td };
      });
      cells.push(rowCells);
      rows.push({ tr, regionIndex: gi });
      tbody.append(tr);
    }
  });

  const thead = h('thead', null, h('tr', null,
    h('th', { scope: 'col', class: 'plan-corner' }, 'Place'),
    HOME_TYPE_LIST.map((t) => h('th', { scope: 'col' },
      h('span', { class: 'plan-col-title' }, t.header),
      h('span', { class: 'plan-col-tip', 'aria-hidden': 'true' }, t.explainer)))));

  const table = h('table', { class: 'plan-table', 'aria-label': 'Homes you could choose: places down the side, home types across the top' },
    thead, tbody);
  const el = h('div', { class: 'plan-table-wrap', tabindex: -1 }, table);

  table.addEventListener('keydown', (e) => {
    const btn = e.target.closest?.('.plan-cell');
    if (!btn) return;
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    const next = moveFocus(visible, focus, e.key);
    if (!next) return;
    e.preventDefault();
    focusAt(next);
  });

  function syncTabindex() {
    cells.forEach((row, r) => row.forEach((x, c) => { x.button.tabIndex = r === focus.r && c === focus.c ? 0 : -1; }));
  }

  function focusAt(pos) {
    focus = pos;
    syncTabindex();
    const { button } = cells[pos.r][pos.c];
    button.focus();
    button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /** Recolor and refill every cell from a (memoized) grid; never rebuilds the table. */
  function update(nextGrid, { hideUnaffordable = false, denied = new Set(), expanded = null, detail = null } = {}) {
    const flat = nextGrid.groups.flatMap((g) => g.rows.map((row) => row.cells));
    visible = flat.map((rowCells, r) => rowCells.map((cell, c) => {
      const x = cells[r][c];
      x.cell = cell;
      const st = cell.status;
      const isDenied = denied.has(cellKey(cell.locationId, cell.homeTypeId));
      const hidden = isHiddenStatus(st.status, hideUnaffordable);
      x.button.classList.remove(...STATUS_CLASSES);
      x.button.classList.add(`st-${st.status}`);
      x.button.hidden = hidden;
      x.td.classList.toggle('is-hidden', hidden);
      x.parts.icon.textContent = st.icon;
      x.parts.label.textContent = st.status === 'na' ? 'Not available' : st.label;
      x.parts.up.textContent = upfrontText(cell.cost) || '';
      x.parts.mo.textContent = monthlyText(cell.cost) || '';
      x.parts.badge.hidden = !isDenied;
      x.button.setAttribute('aria-label', cellAriaLabel(x.location, x.homeType, cell, { denied: isDenied }));
      const open = !!expanded && expanded.locationId === cell.locationId && expanded.homeTypeId === cell.homeTypeId;
      x.button.setAttribute('aria-expanded', String(open));
      x.button.classList.toggle('is-open', open);
      return !hidden;
    }));
    rows.forEach((row, r) => { row.tr.hidden = !visible[r].some(Boolean); });
    regionRows.forEach((tr, gi) => { tr.hidden = rows.every((row, r) => row.regionIndex !== gi || !visible[r].some(Boolean)); });
    if (!visible[focus.r]?.[focus.c]) focus = firstVisible(visible) || { r: 0, c: 0 };
    syncTabindex();

    detailRow?.remove();
    detailRow = null;
    if (expanded) {
      const r = cells.findIndex((row) => row[0].location.id === expanded.locationId);
      const c = HOME_TYPE_LIST.findIndex((t) => t.id === expanded.homeTypeId);
      if (r >= 0 && c >= 0 && visible[r][c] && detail) {
        const x = cells[r][c];
        detailRow = h('tr', { class: 'plan-detail-row' },
          h('td', { colspan: HOME_TYPE_LIST.length + 1 }, detail(x)));
        rows[r].tr.after(detailRow);
      }
    }
  }

  /** Focus the cell with this key (or the roving one); used to return focus after Esc. */
  function focusCell(key) {
    if (key) {
      const r = cells.findIndex((row) => row.some((x) => cellKey(x.location.id, x.homeType.id) === key));
      const c = r >= 0 ? cells[r].findIndex((x) => cellKey(x.location.id, x.homeType.id) === key) : -1;
      if (r >= 0 && visible[r][c]) { focusAt({ r, c }); return; }
    }
    if (visible[focus.r]?.[focus.c]) focusAt(focus);
  }

  update(grid);
  return { el, update, focusCell };
}
