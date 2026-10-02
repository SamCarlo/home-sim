import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../app/src/state/schema.js';
import {
  ACCOUNTS, accountValue, post, transfer, charge, available, addRecurring, removeRecurring, updateRecurring, recurringFor,
  openLoan, payLoan, closeLoan, pmiSource, addAgreement, setAgreementStatus, addApplication, resolveApplication,
  markUpfrontPaid, unpaidUpfront, cash, netWorth, ledgerSums, compactHistory,
} from '../../app/src/finance/ledger.js';
import { amortizationSchedule, pmt, pmiMonthly } from '../../app/src/finance/loans.js';
import { FINANCE } from '../../app/src/config.js';

function player({ checking = 0, savings = 800000, card = null } = {}) {
  const s = createInitialState({ uid: 'u1', username: 'kai', now: 0 });
  s.finances.checkingCents = checking;
  s.finances.savingsCents = savings;
  s.finances.creditCard = card;
  return s;
}
const card = (limitCents = 100000, balanceCents = 0) => ({ limitCents, balanceCents, apr: 0.2599 });
/** accountValue − ledgerSums per account: must never change while money moves through the ledger. */
const drift = (s) => {
  const sums = ledgerSums(s);
  return Object.fromEntries(ACCOUNTS.filter((a) => a !== 'card' || s.finances.creditCard).map((a) => [a, accountValue(s, a) - sums[a]]));
};

test('post moves the balance with the transaction and numbers ids', () => {
  const s = player();
  const before = drift(s);
  const t1 = post(s, { month: 0, day: 1, label: 'Paycheck', amountCents: 160000, account: 'checking', category: 'income' });
  const t2 = post(s, { month: 0, label: 'Groceries', amountCents: -45000, account: 'checking', category: 'living' });
  assert.equal(s.finances.checkingCents, 115000);
  assert.deepEqual([t1.id, t2.id], ['t1', 't2']);
  assert.deepEqual(drift(s), before);
  assert.throws(() => post(s, { month: 0, amountCents: 10.5, account: 'checking' }), TypeError);
  assert.throws(() => post(s, { month: 0, amountCents: 1, account: 'piggy' }), RangeError);
});

test('balances and transactions agree through a mixed sequence of operations', () => {
  const s = player({ checking: 20000, savings: 500000, card: card(150000, 0) });
  const before = drift(s);
  post(s, { month: 0, amountCents: 320000, account: 'checking', category: 'income', label: 'Pay' });
  charge(s, 'checking', 400000, { month: 0, label: 'Rent', category: 'housing' });        // spills into savings
  charge(s, 'card', 60000, { month: 0, label: 'Car repair', category: 'event' });
  transfer(s, 'checking', 'card', 0, { month: 0 });
  transfer(s, 'savings', 'card', 60000, { month: 0 });
  transfer(s, 'savings', 'checking', 10000, { month: 0 });
  charge(s, ['checking', 'savings', 'card'], 999999999, { month: 0, label: 'Too much' }); // refused, nothing moves
  assert.deepEqual(drift(s), before);
  assert.equal(s.finances.creditCard.balanceCents, 0);
  assert.equal(cash(s), 20000 + 500000 + 320000 - 400000 - 60000);
});

test('charge: checking spills into savings, then refuses without touching anything', () => {
  const s = player({ checking: 30000, savings: 50000 });
  const r = charge(s, 'checking', 70000, { month: 2, label: 'Rent', category: 'housing' });
  assert.equal(r.ok, true);
  assert.equal(r.txns.length, 2);
  assert.deepEqual([s.finances.checkingCents, s.finances.savingsCents], [0, 10000]);
  const snapshot = structuredClone(s.finances);
  assert.deepEqual(charge(s, 'checking', 25000, { month: 2 }), { ok: false, shortfallCents: 15000 });
  assert.deepEqual(s.finances, snapshot);
  // overdraft can't happen through charge; a negative checking balance (via post) counts as 0 available
  post(s, { month: 2, amountCents: -5000, account: 'checking', label: 'Bank fee' });
  assert.equal(available(s, 'checking'), 0);
  assert.deepEqual(charge(s, 'checking', 12000, { month: 2 }), { ok: false, shortfallCents: 2000 });
  assert.deepEqual(charge(s, 'savings', 0, { month: 2 }).ok, true);
});

test('charge on the card respects the limit; no card means no room', () => {
  const s = player({ card: card(100000, 70000) });
  assert.equal(available(s, 'card'), 30000);
  assert.deepEqual(charge(s, 'card', 40000, { month: 1 }), { ok: false, shortfallCents: 10000 });
  assert.equal(s.finances.creditCard.balanceCents, 70000);
  assert.equal(charge(s, 'card', 30000, { month: 1, label: 'Vet' }).ok, true);
  assert.equal(s.finances.creditCard.balanceCents, 100000);
  assert.equal(s.finances.transactions.at(-1).amountCents, -30000);
  const noCard = player({ savings: 0 });
  assert.deepEqual(charge(noCard, 'card', 100, { month: 0 }), { ok: false, shortfallCents: 100 });
  // the fallback chain: cash first, the rest on the card
  const t = player({ checking: 1000, savings: 2000, card: card(10000) });
  assert.equal(charge(t, ['checking', 'savings', 'card'], 8000, { month: 0, category: 'living' }).ok, true);
  assert.deepEqual([t.finances.checkingCents, t.finances.savingsCents, t.finances.creditCard.balanceCents], [0, 0, 5000]);
});

test('transfer is all or nothing and never draws from the card', () => {
  const s = player({ checking: 5000, savings: 0, card: card(50000, 20000) });
  assert.deepEqual(transfer(s, 'checking', 'savings', 6000, { month: 0 }), { ok: false, shortfallCents: 1000 });
  assert.equal(s.finances.transactions.length, 0);
  assert.deepEqual(transfer(s, 'checking', 'card', 5000, { month: 0 }), { ok: true, shortfallCents: 0 });
  assert.equal(s.finances.creditCard.balanceCents, 15000);
  assert.deepEqual(s.finances.transactions.map((t) => [t.account, t.amountCents, t.category]),
    [['checking', -5000, 'transfer'], ['card', 5000, 'transfer']]);
  assert.throws(() => transfer(s, 'card', 'checking', 100, { month: 0 }), RangeError);
});

test('recurring: add, update, remove, and the active-month filter', () => {
  const s = player();
  const rent = addRecurring(s, { label: 'Rent', amountCents: 150000, category: 'housing', source: 'lease', startsMonth: 0 });
  const gym = addRecurring(s, { label: 'Gym', amountCents: 4000, category: 'lifestyle', startsMonth: 3, endsMonth: 5 });
  assert.deepEqual([rent.id, gym.id], ['r1', 'r2']);
  assert.equal(updateRecurring(s, 'r1', { amountCents: 155000, id: 'hack' }).amountCents, 155000);
  assert.equal(s.finances.recurring[0].id, 'r1');
  assert.deepEqual(recurringFor(s, 0).map((r) => r.id), ['r1']);
  assert.deepEqual(recurringFor(s, 4).map((r) => r.id), ['r1', 'r2']);
  assert.equal(removeRecurring(s, 'r2').label, 'Gym');
  assert.equal(removeRecurring(s, 'nope'), null);
  assert.equal(updateRecurring(s, 'nope', {}), null);
  assert.throws(() => addRecurring(s, { id: 'r1', label: 'dup', amountCents: 1 }));
});

test('loan payoff over a full schedule matches the amortization table', () => {
  const s = player();
  const loan = openLoan(s, { kind: 'mortgage', principalCents: 27000000, rate: 0.065, termMonths: 360, priceCents: 30000000 });
  assert.equal(loan.paymentCents, pmt(27000000, 0.065, 360));
  const sched = amortizationSchedule(27000000, 0.065, 360);
  let interest = 0;
  let last;
  for (let m = 0; m < 360; m++) {
    last = payLoan(s, loan.id, m);
    assert.equal(last.interestCents, sched[m].interestCents, `month ${m} interest`);
    assert.equal(last.balanceCents, sched[m].balanceCents, `month ${m} balance`);
    interest += last.interestCents;
  }
  assert.equal(last.paidOff, true);
  assert.equal(s.finances.loans[0].balanceCents, 0);
  assert.equal(s.finances.loans[0].paidOffMonth, 359);
  assert.equal(s.finances.loans[0].interestPaidCents, interest);
  assert.equal(payLoan(s, loan.id, 360), null);
  assert.equal(payLoan(s, 'nope', 0), null);
});

test('PMI drops (with its recurring line) once the balance is ≤ 78% of the original price', () => {
  const s = player();
  const price = 30000000;
  const principal = price - Math.round(price * 0.1);
  const loan = openLoan(s, { principalCents: principal, rate: 0.065, termMonths: 360, priceCents: price,
    pmiCents: pmiMonthly(principal) });
  addRecurring(s, { label: 'PMI', amountCents: loan.pmiCents, category: 'housing', source: pmiSource(loan.id) });
  addRecurring(s, { label: 'Mortgage', amountCents: loan.paymentCents, category: 'housing', source: loan.id });
  assert.equal(loan.pmiUntilBalanceCents, price * FINANCE.pmiDropLtv);
  const sched = amortizationSchedule(principal, 0.065, 360);
  const expected = sched.findIndex((r) => r.balanceCents <= price * 0.78);
  let droppedAt = null;
  for (let m = 0; m < 360 && droppedAt === null; m++) {
    const r = payLoan(s, loan.id, m);
    if (r.pmiDropped) droppedAt = m;
    else assert.ok(s.finances.loans[0].pmiCents > 0);
  }
  assert.equal(droppedAt, expected);
  assert.ok(droppedAt > 60 && droppedAt < 200, `PMI dropped at month ${droppedAt}`);
  assert.equal(s.finances.loans[0].pmiCents, 0);
  assert.deepEqual(s.finances.recurring.map((r) => r.label), ['Mortgage']);
  assert.equal(payLoan(s, loan.id, droppedAt + 1).pmiDropped, false);
  // a 20%-down loan never had PMI
  const t = player();
  const l2 = openLoan(t, { principalCents: 24000000, rate: 0.065, termMonths: 360, priceCents: price });
  assert.equal(l2.pmiUntilBalanceCents, 0);
  assert.equal(payLoan(t, l2.id, 0).pmiDropped, false);
});

test('closeLoan zeroes the balance', () => {
  const s = player();
  const l = openLoan(s, { principalCents: 1000000, rate: 0.06, termMonths: 120 });
  assert.equal(closeLoan(s, l.id, 7, 'foreclosure').balanceCents, 0);
  assert.equal(s.finances.loans[0].closedReason, 'foreclosure');
  assert.equal(closeLoan(s, 'nope', 7), null);
});

test('agreements and applications', () => {
  const s = player();
  const a = addAgreement(s, { type: 'lease', title: 'Lease', counterparty: 'Kaiko Terrace', signedAt: 5 });
  assert.deepEqual([a.id, a.status], ['ag1', 'pending']);
  assert.equal(setAgreementStatus(s, 'ag1', 'active').status, 'active');
  assert.throws(() => setAgreementStatus(s, 'ag1', 'signed'), RangeError);
  assert.equal(setAgreementStatus(s, 'nope', 'void'), null);
  const app = addApplication(s, { kind: 'rental', target: 'hilo|apartment', feeCents: 5000, at: 5 });
  assert.deepEqual([app.id, app.status], ['app1', 'pending']);
  assert.deepEqual(resolveApplication(s, 'app1', { approved: false, reasons: ['Income too low'] }).reasons, ['Income too low']);
  assert.equal(s.finances.applications[0].status, 'denied');
  assert.equal(resolveApplication(s, 'nope', { approved: true }), null);
});

test('upfront lines: paid during paperwork, the rest is left for commit', () => {
  const s = player();
  s.choice = { locationId: 'hilo', homeTypeId: 'apartment', snapshot: { breakdown: { upfront: [
    { key: 'deposit', label: 'Security deposit', cents: 150000, note: '' },
    { key: 'first-month', label: "First month's rent", cents: 150000, note: '' },
    { key: 'application', label: 'Application fee', cents: 5000, note: '' },
  ] } } };
  assert.equal(unpaidUpfront(s).length, 3);
  assert.equal(charge(s, 'savings', 5000, { month: -1, label: 'Application fee', category: 'fees' }).ok, true);
  markUpfrontPaid(s, 'application', 5000);
  assert.deepEqual(unpaidUpfront(s).map((l) => [l.key, l.cents]), [['deposit', 150000], ['first-month', 150000]]);
  markUpfrontPaid(s, 'deposit', 100000);
  assert.equal(unpaidUpfront(s)[0].cents, 50000);
  assert.deepEqual(unpaidUpfront(player()), []);
});

test('cash and net worth (02 §2)', () => {
  const s = player({ checking: 100000, savings: 500000, card: card(100000, 20000) });
  s.finances.investments.medium.valueCents = 30000;
  assert.equal(cash(s), 600000);
  assert.equal(netWorth(s), 600000 + 30000 - 20000);
  s.choice = { locationId: 'hilo', homeTypeId: 'house', snapshot: {} };
  s.home = { kind: 'house' };
  openLoan(s, { principalCents: 27000000, rate: 0.065, termMonths: 360, priceCents: 30000000 });
  assert.equal(netWorth(s), 600000 + 30000 - 20000 + 3000000);
  s.home.purchasePriceCents = 31000000;
  assert.equal(netWorth(s), 600000 + 30000 - 20000 + 4000000);
  assert.equal(cash({}), 0);
  assert.equal(netWorth({}), 0);
});

test('compaction keeps month −1 and the last 24 months, and the totals still reconcile', () => {
  const s = player({ checking: 0, savings: 1000000 });
  const before = drift(s);
  post(s, { month: -1, label: 'Deposit', amountCents: -150000, account: 'savings', category: 'housing' });
  for (let m = 0; m < 30; m++) {
    post(s, { month: m, label: 'Pay', amountCents: 300000, account: 'checking', category: 'income' });
    charge(s, 'checking', 200000, { month: m, label: 'Rent', category: 'housing' });
    transfer(s, 'checking', 'savings', 50000, { month: m });
  }
  const n = s.finances.transactions.length;
  const folded = compactHistory(s);
  assert.deepEqual(folded, [0, 1, 2, 3, 4, 5]);
  const months = new Set(s.finances.transactions.map((t) => t.month));
  assert.deepEqual([...months].sort((a, b) => a - b), [-1, ...Array.from({ length: 24 }, (_, i) => i + 6)]);
  assert.equal(s.finances.transactions.length, n - 6 * 4);
  assert.deepEqual(s.finances.monthTotals.map((m) => m.month), [0, 1, 2, 3, 4, 5]);
  const m0 = s.finances.monthTotals[0];
  assert.deepEqual([m0.incomeCents, m0.expenseCents, m0.byCategory.housing], [300000, 200000, -200000]);
  assert.equal(m0.byCategory.transfer, undefined);
  assert.deepEqual(drift(s), before);
  assert.deepEqual(compactHistory(s), []);                       // idempotent
  // a later month's compaction merges into existing totals; the new ids don't collide with kept ones
  post(s, { month: 30, label: 'Pay', amountCents: 300000, account: 'checking', category: 'income' });
  assert.deepEqual(compactHistory(s, { currentMonth: 30 }), [6]);
  assert.equal(new Set(s.finances.transactions.map((t) => t.id)).size, s.finances.transactions.length);
  assert.deepEqual(drift(s), before);
});
