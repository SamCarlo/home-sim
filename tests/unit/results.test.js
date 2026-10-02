// Results numbers (05 §8, task 31): resultsSummary must match what commitPaperwork actually does to the ledger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds } from '../../app/src/dev/seeds.js';
import { decide } from '../../app/src/finance/underwriting.js';
import { commitPaperwork } from '../../app/src/phases/paperwork/commit.js';
import { resultsSummary, factorLine, letterStepsFor } from '../../app/src/phases/paperwork/resultsModel.js';
import { cashOf } from '../../app/src/finance/grid.js';
import { sumCents } from '../../app/src/finance/money.js';

const TYPES = ['apartment', 'shared', 'condo', 'house', 'build'];

for (const type of TYPES) {
  test(`${type}: pay-now, monthly bills and loan match the commit`, () => {
    const s = seeds[`paperwork-ready-${type}`].build(0);
    const decisions = decide(s);
    const r = resultsSummary(s, decisions);
    const before = cashOf(s);
    assert.equal(r.payNow.cashBeforeCents, before);
    assert.equal(r.payNow.totalCents, sumCents(r.payNow.lines.map((l) => l.cents)));
    const res = commitPaperwork(s, decisions, 0);
    assert.equal(res.approved, r.approved);
    assert.equal(before - cashOf(s), r.payNow.totalCents - (res.refundCents ?? 0), 'cash charged = the pay-now total');
    if (r.approved) {
      assert.deepEqual(res.recurring.map((x) => [x.label, x.amountCents]), r.monthly.items.map((x) => [x.label, x.cents]));
      assert.equal(r.monthly.totalCents, sumCents(r.monthly.items.map((i) => i.cents)));
      assert.equal(r.monthly.leftCents, s.player.netMonthlyIncomeCents - r.monthly.totalCents);
      if (res.loan) {
        assert.equal(r.loan.principalCents, res.loan.principalCents);
        assert.equal(r.loan.paymentCents, res.loan.paymentCents);
        assert.equal(r.loan.totalPaidCents, r.loan.principalCents + r.loan.totalInterestCents);
      }
      assert.equal(r.nextSteps.length, 0);
    } else {
      assert.equal(r.monthly, null);
      assert.ok(r.nextSteps.length >= 2, 'a denial always offers a way forward');
    }
  });
}

test('denied apartment: the card still shows, rent consequences do not', () => {
  const s = seeds['results-denied-apartment'].build(0);
  const r = resultsSummary(s, s.paperwork.decisions);
  assert.equal(r.approved, false);
  assert.ok(r.cardTerms && r.cardTerms.limitCents > 0);
  assert.deepEqual(r.ifYouDontPay.map((c) => c.key), ['card']);
  assert.ok(r.nextSteps.some((x) => /brand-new decision/.test(x)));
});

test('approved house: consequences use the student\'s own numbers', () => {
  const s = seeds['results-approved-house'].build(0);
  const r = resultsSummary(s, s.paperwork.decisions);
  const m = r.ifYouDontPay.find((c) => c.key === 'mortgage');
  assert.match(m.title, /\$2,217/);
  assert.match(m.items[0], /5% late fee \(\$111\)/);
  assert.match(m.items[2], /\$37,500 you put down/);
  assert.match(factorLine(r.home), /^Finances ×0\.55 · Reserves ×1 · Credit ×0\.9 · Letter ×0\.9/);
});

test('letterStepsFor maps decisions to their letters', () => {
  const s = seeds['paperwork-ready-house'].build(0);
  assert.deepEqual(letterStepsFor('lease', s), ['rental-cover']);
  assert.deepEqual(letterStepsFor('mortgage', s), ['loan-purpose']);
  assert.deepEqual(letterStepsFor('credit-card', s), []);
});
