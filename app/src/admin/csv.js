// CSV export of the student table (11 §3, task 52). toCsv is pure; downloadCsv is the browser edge.
import { COLUMNS } from './adminModel.js';

/** One CSV field (RFC 4180): quoted when it holds a comma, quote, CR or LF; a leading = + - @ is defused for spreadsheets. */
export function csvCell(v) {
  if (v == null) return '';
  let s = String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Money cents → dollars as a number (sortable in a spreadsheet; numbers are never defused). */
const dollars = (c) => (Number.isFinite(c) ? c / 100 : '');

/** Table rows → CSV text (CRLF line ends, header row first). Money in dollars, last active as an ISO time. */
export function toCsv(rows) {
  const header = COLUMNS.map((c) => (c.key.endsWith('Cents') ? `${c.label} ($)` : c.label)).concat('Status');
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    const cells = COLUMNS.map((c) => {
      const v = r[c.key];
      if (c.key.endsWith('Cents')) return dollars(v);
      if (c.key === 'lastActive') return Number.isFinite(v) ? new Date(v).toISOString() : '';
      return v;
    });
    cells.push(r.transferredTo ? 'transferred' : r.disabled ? 'paused' : 'active');
    lines.push(cells.map(csvCell).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** Save the CSV through a temporary download link. */
export function downloadCsv(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
