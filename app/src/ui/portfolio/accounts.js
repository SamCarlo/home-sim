// Portfolio tabs: Accounts and Automatic expenses (02 §2, task 17).
import { h } from '../dom.js';
import { formatMoney } from '../../util/format.js';
import { formatPct } from '../../util/format.js';
import { cash, netWorth } from '../../finance/ledger.js';
import { utilization } from '../../finance/creditScore.js';
import { block, kv, empty, chip } from './parts.js';
import { groupRecurring, loanProgress, whenLabel } from './portfolioModel.js';

const money = (c) => formatMoney(c, { showCents: true });

/** Accounts: checking, savings, card, loans (with a progress bar), investments. */
export function renderAccounts(state) {
  const f = state.finances;
  const card = f.creditCard;
  const inv = f.investments || {};
  const invTotal = ['low', 'medium', 'high'].reduce((t, k) => t + (inv[k]?.valueCents || 0), 0);
  return h('div', { class: 'pf-tab-accounts' },
    h('div', { class: 'pf-stats' },
      stat('Cash', money(cash(state)), 'checking + savings'),
      stat('Net worth', money(netWorth(state)), 'what you own minus what you owe')),
    block('Bank', kv([['Checking', money(f.checkingCents)], ['Savings', money(f.savingsCents)]])),
    block('Credit card', card ? cardView(state, card) : empty('No credit card.')),
    block('Loans', f.loans.length ? h('ul', { class: 'pf-loans' }, f.loans.map(loanView)) : empty('No loans.')),
    block('Investments', invTotal || state.life?.investUnlocked
      ? kv([['Low risk', money(inv.low?.valueCents || 0)], ['Medium risk', money(inv.medium?.valueCents || 0)],
        ['High risk', money(inv.high?.valueCents || 0)], ['Total', money(invTotal)]])
      : empty('Investing opens once you have an emergency fund while living in your home.')),
  );
}

function stat(label, value, hint) {
  return h('div', { class: 'pf-stat' }, h('span', { class: 'pf-stat-label' }, label),
    h('strong', { class: 'pf-stat-value' }, value), h('span', { class: 'pf-stat-hint muted' }, hint));
}

function cardView(state, card) {
  const util = utilization(state);
  const status = util >= 0.6 ? 'red' : util >= 0.3 ? 'yellow' : 'green';
  return h('div', null,
    kv([
      ['Limit', money(card.limitCents)],
      ['Balance owed', money(card.balanceCents)],
      ['Used', chip(status, `${Math.round(util * 100)}% of the limit`)],
      ['APR', formatPct(card.apr, 2)],
      ['Autopay', card.autopay === 'minimum' ? 'Minimum payment' : 'Full balance'],
      card.secured ? ['Secured deposit', money(card.depositCents || 0)] : null,
      card.openedMonth != null ? ['Opened', whenLabel(card.openedMonth)] : null,
    ]));
}

function loanView(loan) {
  const p = loanProgress(loan);
  const pct = Math.round(p.paidPct * 100);
  return h('li', { class: 'pf-loan' },
    h('div', { class: 'pf-loan-head' }, h('strong', null, loan.label), h('span', { class: 'muted' }, loan.lender)),
    kv([
      ['Balance', money(loan.balanceCents)],
      ['Rate', formatPct(loan.rate, 2)],
      ['Monthly payment', money(loan.paymentCents)],
      loan.pmiCents && !loan.pmiDroppedMonth ? ['PMI', `${money(loan.pmiCents)} a month`] : null,
      ['Payments left', String(p.monthsLeft)],
    ]),
    h('div', { class: 'pf-progress', role: 'progressbar', 'aria-label': `${loan.label} paid off`,
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) },
    h('span', { class: 'pf-progress-fill', style: { width: `${p.paidPct * 100}%` } })),
    h('p', { class: 'pf-progress-text muted' }, `${pct}% paid off (${money(p.paidCents)} of ${money(loan.principalCents)})`));
}

/** Automatic expenses: the recurring list grouped by category, with a monthly total. */
export function renderExpenses(state) {
  const month = state.phase === 'life' ? state.life.monthIndex : null;
  const { groups, totalCents } = groupRecurring(state.finances.recurring, month);
  if (!groups.length) return empty('No automatic expenses yet. Rent, loan payments and bills show up here once you have a home.');
  return h('div', { class: 'pf-tab-expenses' },
    groups.map((g) => block(null, h('table', { class: 'pf-table' },
      h('caption', null, g.label),
      h('tbody', null, g.items.map((r) => h('tr', null, h('td', null, r.label,
        r.endsMonth != null ? h('span', { class: 'muted' }, ` (until ${whenLabel(r.endsMonth)})`) : null),
      h('td', { class: 'pf-num' }, money(r.amountCents))))),
      h('tfoot', null, h('tr', null, h('td', null, `${g.label} total`), h('td', { class: 'pf-num' }, money(g.totalCents))))))),
    h('p', { class: 'pf-grand' }, h('span', null, 'Every month'), h('strong', null, money(totalCents))));
}
