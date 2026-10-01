import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pmt, amortizationSchedule, totalInterest, pmiMonthly, fhaLoan, constructionInterestReserve, cardPayoff,
} from '../../app/src/finance/loans.js';

test('pmt matches standard mortgage payments', () => {
  assert.equal(pmt(30000000, 0.065, 360), 189620);   // $300,000 at 6.5% for 30 years = $1,896.20
  assert.equal(pmt(10000000, 0.06, 360), 59955);     // $100,000 at 6% for 30 years = $599.55
  assert.equal(pmt(0, 0.065, 360), 0);
});

test('pmt at 0% is principal ÷ n', () => {
  assert.equal(pmt(120000, 0, 12), 10000);
  assert.equal(pmt(100000, 0, 3), 33334);            // rounded up so 3 payments cover it
  assert.throws(() => pmt(100000, 0.05, 0), RangeError);
});

test('amortization: principal sums to the loan and the final balance is 0', () => {
  for (const [p, r, n] of [[30000000, 0.065, 360], [10000000, 0.06, 360], [27000000, 0.0585, 180], [100000, 0, 3]]) {
    const rows = amortizationSchedule(p, r, n);
    assert.equal(rows.length, n);
    assert.equal(rows.reduce((t, row) => t + row.principalCents, 0), p);
    assert.equal(rows.at(-1).balanceCents, 0);
    for (const row of rows) {
      assert.ok(Number.isInteger(row.interestCents) && Number.isInteger(row.principalCents));
      assert.equal(row.paymentCents, row.interestCents + row.principalCents);
    }
  }
  const first = amortizationSchedule(30000000, 0.065, 360)[0];
  assert.equal(first.interestCents, 162500);          // $300,000 × 6.5% ÷ 12
  assert.equal(first.principalCents, 189620 - 162500);
});

test('totalInterest = payments − principal', () => {
  const rows = amortizationSchedule(30000000, 0.065, 360);
  const paid = rows.reduce((t, row) => t + row.paymentCents, 0);
  assert.equal(totalInterest(30000000, 0.065, 360), paid - 30000000);
  assert.equal(totalInterest(120000, 0, 12), 0);
  const ti = totalInterest(30000000, 0.065, 360);
  assert.ok(ti > 38200000 && ti < 38300000, `about $382,6xx, got ${ti}`);
});

test('pmiMonthly', () => {
  assert.equal(pmiMonthly(27000000, 0.006), 13500);  // $270,000 × 0.6% ÷ 12 = $135
  assert.equal(pmiMonthly(27000000), 13500);         // default rate from config
  assert.equal(pmiMonthly(0, 0.006), 0);
});

test('fhaLoan: 1.75% upfront MIP financed plus 0.55%/yr MIP', () => {
  const f = fhaLoan({ priceCents: 40000000 });       // $400,000 at the 3.5% minimum
  assert.equal(f.downCents, 1400000);
  assert.equal(f.baseLoanCents, 38600000);
  assert.equal(f.upfrontMipCents, 675500);           // 1.75% of $386,000
  assert.equal(f.loanCents, 39275500);
  assert.equal(f.monthlyMipCents, 18001);            // $392,755 × 0.55% ÷ 12 = $180.01
  assert.equal(f.monthlyPICents, pmt(39275500, 0.065, 360));
  const ten = fhaLoan({ priceCents: 40000000, downPct: 0.10, annualRate: 0.06 });
  assert.equal(ten.downCents, 4000000);
  assert.equal(ten.loanCents, 36000000 + 630000);
  assert.equal(fhaLoan({ priceCents: 40000000, downPct: 0.01 }).downCents, 1400000); // floor at 3.5%
});

test('constructionInterestReserve: loan × 50% drawn × rate ÷ 12 × months', () => {
  assert.equal(constructionInterestReserve({ loanCents: 40000000, rate: 0.07, months: 9 }), 1050000);
  assert.equal(constructionInterestReserve({ loanCents: 40000000, months: 9 }), 1050000); // 7% default
  assert.equal(constructionInterestReserve({ loanCents: 0, rate: 0.07, months: 9 }), 0);
});

test('cardPayoff: $1,000 at 24.99% on minimums is finite and plausible', () => {
  const r = cardPayoff({ balanceCents: 100000, apr: 0.2499 });
  assert.ok(Number.isFinite(r.months));
  assert.ok(r.months >= 48 && r.months <= 120, `months ${r.months}`);
  assert.ok(r.interestCents >= 30000 && r.interestCents <= 150000, `interest ${r.interestCents}`);
  // $20 owed: interest $0.42, the $25 floor is capped at the $20.42 owed, so it's paid off in one month
  assert.deepEqual(cardPayoff({ balanceCents: 2000, apr: 0.2499 }), { months: 1, interestCents: 42 });
  // $25 owed: interest $0.52, pay the $25 floor, then $0.52 + $0.01 interest next month
  assert.deepEqual(cardPayoff({ balanceCents: 2500, apr: 0.2499 }), { months: 2, interestCents: 53 });
  assert.deepEqual(cardPayoff({ balanceCents: 0, apr: 0.2499 }), { months: 0, interestCents: 0 });
});

test('cardPayoff: a fixed minimum that never covers the interest never ends', () => {
  const r = cardPayoff({ balanceCents: 1000000, apr: 0.2999, minRule: { floorCents: 2500, pct: 0 } });
  assert.equal(r.months, Infinity);
});
