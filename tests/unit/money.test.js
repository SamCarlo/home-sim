import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dollarsToCents, assertCents, mulRate, sumCents, pctOf, clampCents, formatMoney,
} from '../../app/src/finance/money.js';
import { formatMoney as uiFormatMoney } from '../../app/src/util/format.js';

test('dollarsToCents: numbers and typed strings', () => {
  assert.equal(dollarsToCents(3200), 320000);
  assert.equal(dollarsToCents(3200.5), 320050);
  assert.equal(dollarsToCents('3200'), 320000);
  assert.equal(dollarsToCents('3,200'), 320000);
  assert.equal(dollarsToCents('$3,200.50'), 320050);
  assert.equal(dollarsToCents('  $1,234,567.89 '), 123456789);
  assert.equal(dollarsToCents('.5'), 50);
  assert.equal(dollarsToCents('12.'), 1200);
  assert.equal(dollarsToCents('0'), 0);
  assert.equal(dollarsToCents('-$45'), -4500);
  assert.equal(dollarsToCents('$-45.10'), -4510);
  assert.equal(dollarsToCents(-0.01), -1);
});

test('dollarsToCents: extra decimals round half away from zero (no float drift)', () => {
  assert.equal(dollarsToCents('1.005'), 101);
  assert.equal(dollarsToCents('1.004'), 100);
  assert.equal(dollarsToCents(1.005), 101);
  assert.equal(dollarsToCents('-2.675'), -268);
  assert.equal(dollarsToCents(0.1 + 0.2), 30);
});

test('dollarsToCents: returns null when it cannot parse', () => {
  for (const bad of ['', '   ', 'abc', '$', '-', '.', '3,20', '1,2345', '12a', '$$5', '--5', '-$-5', '1.2.3',
    NaN, Infinity, -Infinity, null, undefined, {}, [], true, '99999999999999999999']) {
    assert.equal(dollarsToCents(bad), null, `expected null for ${JSON.stringify(String(bad))}`);
  }
});

test('assertCents accepts safe integers only', () => {
  assert.equal(assertCents(0), 0);
  assert.equal(assertCents(-500), -500);
  assert.throws(() => assertCents(1.5), TypeError);
  assert.throws(() => assertCents('100'), TypeError);
  assert.throws(() => assertCents(NaN), TypeError);
  assert.throws(() => assertCents(2 ** 60), TypeError);
});

test('mulRate rounds half away from zero to whole cents', () => {
  assert.equal(mulRate(150, 0.5), 75);
  assert.equal(mulRate(101, 0.5), 51);       // 50.5 → 51
  assert.equal(mulRate(-101, 0.5), -51);     // -50.5 → -51
  assert.equal(mulRate(1005, 0.1), 101);     // 100.49999… in floats; still 100.5 → 101
  assert.equal(mulRate(30000000, 0.03), 900000);
  assert.equal(mulRate(0, 0.065), 0);
  assert.throws(() => mulRate(1.5, 0.1), TypeError);
  assert.throws(() => mulRate(100, NaN), TypeError);
});

test('sumCents, pctOf, clampCents', () => {
  assert.equal(sumCents([100, 250, -50]), 300);
  assert.equal(sumCents(1, 2, 3), 6);
  assert.equal(sumCents([]), 0);
  assert.throws(() => sumCents([1, 0.5]), TypeError);
  assert.equal(pctOf(25000, 100000), 0.25);
  assert.equal(pctOf(5, 0), 0);
  assert.equal(clampCents(500, 0, 300), 300);
  assert.equal(clampCents(-5, 0), 0);
  assert.equal(clampCents(50, null, 100), 50);
});

test('formatMoney: showCents option, alias, and util/format delegates to it', () => {
  assert.equal(formatMoney(320050, { showCents: true }), '$3,200.50');
  assert.equal(formatMoney(320050, { cents: true }), '$3,200.50');
  assert.equal(formatMoney(320050), '$3,201');
  assert.equal(formatMoney(-49), '$0');      // rounds to zero: no "-$0"
  assert.equal(uiFormatMoney, formatMoney);
});
