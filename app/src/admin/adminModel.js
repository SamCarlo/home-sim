// Admin console rules (11 §3, task 52). Pure: table rows, filter/sort/search, class-code checks and the reset and
// transfer plans. The data source (admin/dataSource.js) carries the plans out against Firestore or localStorage.
import { createInitialState } from '../state/schema.js';
import { summarize } from '../state/summary.js';
import { monthLabel } from '../util/dates.js';
import { formatMoney } from '../util/format.js';

/** Student table columns (11 §3): key, header label, kind ('text' | 'num'). */
export const COLUMNS = [
  { key: 'username', label: 'Username', kind: 'text' },
  { key: 'classCode', label: 'Class', kind: 'text' },
  { key: 'phase', label: 'Phase', kind: 'text' },
  { key: 'monthIndex', label: 'Game month', kind: 'num' },
  { key: 'cashCents', label: 'Cash', kind: 'num' },
  { key: 'netWorthCents', label: 'Net worth', kind: 'num' },
  { key: 'creditScore', label: 'Credit', kind: 'num' },
  { key: 'wellbeingAvg', label: 'Wellbeing', kind: 'num' },
  { key: 'home', label: 'Home', kind: 'text' },
  { key: 'lastActive', label: 'Last active', kind: 'num' },
];

const PHASE_LABEL = { intake: 'Intake', plan: 'Plan', paperwork: 'Paperwork', design: 'Design', life: 'Life' };
const num = (v) => (Number.isFinite(v) ? v : null);

/**
 * One table row from a players doc ({uid, username, classCode, updatedAt, disabled, transferredTo?, summary}).
 * Summary fields are null until the student's first summary write (register writes only phase and monthIndex).
 */
export function rowFor(player) {
  const s = player?.summary || {};
  const place = s.locationName || null;
  const home = s.homeLabel || [place, s.homeTypeId].filter(Boolean).join(' · ') || '';
  return {
    uid: player.uid,
    username: player.username ?? '',
    classCode: player.classCode ?? '',
    phase: s.phase ?? 'intake',
    monthIndex: num(s.monthIndex) ?? 0,
    cashCents: num(s.cashCents),
    netWorthCents: num(s.netWorthCents),
    creditScore: num(s.creditScore),
    wellbeingAvg: num(s.wellbeingAvg),
    home,
    lastActive: num(s.updatedAt) ?? num(player.updatedAt) ?? num(player.createdAt),
    disabled: player.disabled === true,
    transferredTo: player.transferredTo ?? null,
  };
}

/** Display text for a row's cell (also the CSV value, except money stays unformatted there). */
export function cellText(row, key) {
  const v = row[key];
  if (v == null || v === '') return '—';
  switch (key) {
    case 'phase': return PHASE_LABEL[v] ?? String(v);
    case 'monthIndex': return row.phase === 'life' ? monthLabel(v) : '—';
    case 'cashCents': case 'netWorthCents': return formatMoney(v);
    case 'lastActive': return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    default: return String(v);
  }
}

/** Keep rows in a class ('' = all) whose username contains the search text (case-insensitive). */
export function filterRows(rows, { classCode = '', search = '' } = {}) {
  const q = String(search).trim().toLowerCase();
  return rows.filter((r) => (!classCode || r.classCode === classCode) && (!q || r.username.toLowerCase().includes(q)));
}

/** Sort a copy by a column; blanks (null/'') always go last; ties break by username. dir: 'asc' | 'desc'. */
export function sortRows(rows, key = 'username', dir = 'asc') {
  const col = COLUMNS.find((c) => c.key === key) ?? COLUMNS[0];
  const sign = dir === 'desc' ? -1 : 1;
  const blank = (v) => v == null || v === '';
  return [...rows].sort((a, b) => {
    const [x, y] = [a[col.key], b[col.key]];
    if (blank(x) || blank(y)) return blank(x) === blank(y) ? a.username.localeCompare(b.username) : blank(x) ? 1 : -1;
    const d = col.kind === 'num' ? x - y : String(x).localeCompare(String(y), 'en', { sensitivity: 'base' });
    return d ? d * sign : a.username.localeCompare(b.username);
  });
}

/** Students per class code (including paused ones). */
export function codeCounts(players) {
  const counts = {};
  for (const p of players) counts[p.classCode] = (counts[p.classCode] ?? 0) + 1;
  return counts;
}

/** A new class code: 2–12 of A–Z, 0–9 and hyphens, upper-cased; not already used. Returns {code, label} or {error}. */
export function checkNewCode({ code, label }, existing = []) {
  const c = String(code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{1,11}$/.test(c)) return { error: 'Use 2 to 12 letters, numbers or hyphens, like IO-P3.' };
  if (existing.some((x) => x.code === c)) return { error: 'That class code already exists.' };
  return { code: c, label: String(label ?? '').trim().slice(0, 60) || c };
}

/** Reset plan: a fresh save for the player and its summary (11 §3, 02 §5). */
export function planReset(player, now) {
  const state = createInitialState({ uid: player.uid, username: player.username, classCode: player.classCode, now });
  return { uid: player.uid, state, summary: { ...summarize(state), updatedAt: now } };
}

/**
 * Transfer plan (11 §3): copy `from`'s save to `to` (a student who forgot their password and made a new username).
 * The copied state takes the new account's username and class. Returns
 * { ok: true, toUid, state, summary, fromPatch } or { ok: false, error }.
 */
export function planTransfer({ from, to, fromState, now }) {
  if (!from || !to) return { ok: false, error: 'Pick both students.' };
  if (from.uid === to.uid) return { ok: false, error: 'Pick a different student to receive the save.' };
  if (to.disabled) return { ok: false, error: `${to.username} is paused. Unpause them first.` };
  if (!fromState) return { ok: false, error: `${from.username} has no saved game to transfer.` };
  const state = structuredClone(fromState);
  state.account = { ...state.account, username: to.username, classCode: to.classCode };
  state.meta = { ...state.meta, updatedAt: now };
  return {
    ok: true,
    toUid: to.uid,
    state,
    summary: { ...summarize(state), updatedAt: now },
    fromPatch: { disabled: true, transferredTo: to.uid, updatedAt: now },
  };
}

/** Students who can receive a transfer from `from`: active, not `from`; same class first, then by username. */
export function transferTargets(players, from) {
  return players.filter((p) => p.uid !== from.uid && !p.disabled)
    .sort((a, b) => (a.classCode === from.classCode ? 0 : 1) - (b.classCode === from.classCode ? 0 : 1)
      || a.username.localeCompare(b.username));
}
