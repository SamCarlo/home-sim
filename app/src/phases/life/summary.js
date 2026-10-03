// Month summary (09 §11, task 47): "January 2033 — how it went". Money in and out with an income-vs-expenses bar, the
// card, missed payments and warnings (a kind housing notice with things to try), loan progress and the credit score,
// the month's events, wellbeing before → after with reason chips, plants & animals (life/care.js careNotes), the
// investment change and a rotating tip. Numbers come from life/monthReport.js, which reads finalizeMonth's result.
import { h } from '../../ui/dom.js';
import { formatMoney, formatPct } from '../../util/format.js';
import { monthLabel } from '../../util/dates.js';
import { careNotes } from '../../life/care.js';
import { moneyRows, wellbeingRows, housingNotice, isHousingWarning } from '../../life/monthReport.js';
import { tipFor } from '../../content/tips.js';

const signed = (c) => `${c > 0 ? '+' : c < 0 ? '−' : ''}${formatMoney(Math.abs(c))}`;
const statement = (c) => formatMoney(c, { showCents: true });

/** The housing notice box (first missed payment or the final notice), shown at the top of the summary. */
function noticeBox(notice) {
  return h('div', { class: `life-notice ${notice.level}`, role: notice.level === 'final' ? 'alert' : 'note', dataset: { level: notice.level } },
    h('p', { class: 'life-notice-title' }, notice.title),
    h('p', null, notice.text),
    h('p', { class: 'life-notice-try' }, 'Here’s what you can try next:'),
    h('ul', null, ...notice.tryNext.map((t) => h('li', null, t))));
}

/** A labeled section of the summary. */
function section(key, title, ...body) {
  return h('section', { class: 'life-sum-sec', dataset: { sec: key } }, h('h2', { class: 'life-sum-h' }, title), ...body);
}

/** Two thin horizontal bars on one scale: money in vs money out (09 §11). Text stays in ink; hover gives the amount. */
function compareBar(rows) {
  const max = Math.max(1, ...rows.map((r) => r.cents));
  return h('div', { class: 'life-sum-bars', role: 'img',
    'aria-label': rows.map((r) => `${r.label} ${formatMoney(r.cents)}`).join(', ') },
  ...rows.map((r) => h('div', { class: 'life-sum-bar', dataset: { key: r.key }, title: `${r.label}: ${formatMoney(r.cents)}` },
    h('span', { class: 'life-sum-bar-label' }, r.label),
    h('span', { class: 'life-sum-bar-track' }, h('span', { class: 'life-sum-bar-fill', style: `width: ${(100 * r.cents) / max}%` })),
    h('span', { class: 'life-sum-bar-num' }, formatMoney(r.cents)))));
}

/** A two-column money table. */
function table(caption, rows, total) {
  return h('table', { class: 'life-sum-table' },
    h('caption', { class: 'sr-only' }, caption),
    h('tbody', null, ...rows.map((r) => h('tr', { dataset: { row: r.key } }, h('th', { scope: 'row' }, r.label),
      h('td', null, formatMoney(r.cents))))),
    total ? h('tfoot', null, h('tr', null, h('th', { scope: 'row' }, total.label), h('td', null, formatMoney(total.cents)))) : null);
}

function moneySection(result, plan) {
  const m = moneyRows(result, plan);
  const kept = m.netCents >= 0;
  return section('money', 'Money',
    compareBar([{ key: 'in', label: 'Money in', cents: m.incomeCents }, { key: 'out', label: 'Money out', cents: m.expenseCents }]),
    table('Money in', m.income, { label: 'Total in', cents: m.incomeCents }),
    table('Money out', m.expenses, { label: 'Total out', cents: m.expenseCents }),
    h('p', { class: `life-sum-net ${kept ? 'up' : 'down'}`, dataset: { net: String(m.netCents) } },
      !kept ? `You spent ${formatMoney(-m.netCents)} more than you earned this month.`
        : result.missed?.length || result.wentWithout?.length ? `${formatMoney(m.netCents)} was left, but some bills went unpaid.`
          : `You kept ${formatMoney(m.netCents)} this month.`),
    h('p', { class: 'life-sum-line' }, result.savingsDeltaCents
      ? `Savings ${result.savingsDeltaCents > 0 ? 'grew' : 'went down'} by ${formatMoney(Math.abs(result.savingsDeltaCents))}.`
      : 'Savings stayed the same.'));
}

function billsSection(result, notice) {
  const warnings = (result.warnings ?? []).filter((w) => !(notice && isHousingWarning(w)));
  const c = result.card, lp = result.loanPayments;
  const lines = [];
  if (c && c.statementCents > 0) {
    lines.push(`Credit card statement ${statement(c.statementCents)}; you paid ${statement(c.paidCents)}`
      + (c.carried ? `. You carry ${statement(c.balanceCents)} into next month${c.interestCents ? ` (interest ${statement(c.interestCents)})` : ''}.` : ' in full, so no interest.'));
  } else if (c) lines.push('Nothing on the credit card this month.');
  for (const m of (result.missed ?? []).filter((x) => x.kind !== 'housing')) {
    lines.push(`Missed: ${m.label.toLowerCase()} (${formatMoney(m.cents)}).`);
  }
  if (lp && (lp.principalCents || lp.interestCents)) {
    lines.push(`Loan: ${formatMoney(lp.principalCents)} paid down the loan and ${formatMoney(lp.interestCents)} was interest. `
      + `You still owe ${formatMoney(lp.balanceCents)}.`);
  }
  const dc = result.creditAfter - result.creditBefore;
  lines.push(`Credit score ${result.creditBefore} → ${result.creditAfter} (${dc > 0 ? `▲${dc}` : dc < 0 ? `▼${-dc}` : 'no change'}).`);
  return section('bills', 'Bills and credit',
    warnings.length ? h('ul', { class: 'life-warnings', role: 'list' }, ...warnings.map((w) => h('li', null, w))) : null,
    h('ul', { class: 'life-sum-list', role: 'list' }, ...lines.map((l) => h('li', null, l))));
}

function eventsSection(result) {
  const ev = result.events ?? [];
  return section('events', 'What happened',
    ev.length ? h('ul', { class: 'life-sum-events', role: 'list' }, ...ev.map((e) => h('li', { dataset: { event: e.id } },
      h('span', { class: 'life-sum-ev-label' }, e.label),
      h('span', { class: `life-sum-ev-amt ${e.amountCents >= 0 ? 'up' : 'down'}` }, e.amountCents ? signed(e.amountCents) : ''),
      e.message ? h('span', { class: 'life-sum-ev-msg' }, e.message) : null)))
      : h('p', { class: 'muted' }, 'A quiet month: no surprises.'));
}

function wellbeingSection(result) {
  return section('wellbeing', 'Wellbeing',
    h('ul', { class: 'life-sum-wb', role: 'list' }, ...wellbeingRows(result).map((r) => h('li', { dataset: { domain: r.key } },
      h('span', { class: 'life-sum-wb-label' }, r.label),
      h('span', { class: 'life-sum-wb-nums' }, `${r.before} → ${r.after}`,
        h('span', { class: `life-wb-ch ${r.change > 0 ? 'up' : r.change < 0 ? 'down' : 'flat'}` },
          r.change > 0 ? ` ▲${r.change}` : r.change < 0 ? ` ▼${-r.change}` : ' –')),
      r.chips.length ? h('span', { class: 'life-sum-chips' }, ...r.chips.map((c) =>
        h('span', { class: `life-chip ${c.delta > 0 ? 'up' : 'down'}` }, `${c.delta > 0 ? '+' : '−'}${Math.abs(c.delta)} ${c.text}`))) : null))));
}

function careSection(state, result, needed) {
  const notes = careNotes(state.home, result, needed);
  return section('care', 'Plants & animals', h('ul', { class: 'life-care-notes', role: 'list' },
    ...notes.map((n) => h('li', { class: `life-care-note ${n.kind}`, dataset: { kind: n.kind } }, n.text))));
}

function investSection(result) {
  const inv = result.investment;
  if (!inv?.startCents) return null;
  const d = inv.endCents - inv.startCents;
  return section('invest', 'Investments', h('p', { class: 'life-sum-line' },
    `Your investments went from ${formatMoney(inv.startCents)} to ${formatMoney(inv.endCents)} (${d >= 0 ? '+' : '−'}${formatPct(Math.abs(inv.pct))}). `
    + 'Prices go up and down month to month; investing pays off over years.'));
}

/** The summary panel's body for `state.life.current` (stage 'summary'). → Node[] */
export function renderSummary(state) {
  const cur = state.life.current, result = cur.result, mi = state.life.monthIndex;
  if (!result) return [h('p', { class: 'muted' }, 'This month’s results are missing. Continue to the next month.')];
  const notice = housingNotice(result, state.finances?.credit?.lateHousingStreak ?? 0, state.home?.kind);
  return [
    notice ? noticeBox(notice) : null,
    moneySection(result, cur.plan),
    billsSection(result, notice),
    eventsSection(result),
    wellbeingSection(result),
    state.home ? careSection(state, result, !!cur.plan?.care?.needed) : null,
    investSection(result),
    h('aside', { class: 'life-tip', 'aria-label': 'Tip' }, h('span', { class: 'life-tip-k' }, `Tip for ${monthLabel(mi + 1)}`),
      h('span', null, tipFor(mi))),
  ].filter(Boolean);
}
