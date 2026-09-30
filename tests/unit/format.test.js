import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, formatPct, formatHours } from '../../app/src/util/format.js';
import { escapeHtml } from '../../app/src/util/escape.js';

test('formatMoney: whole dollars with thousands separators', () => {
  assert.equal(formatMoney(0), '$0');
  assert.equal(formatMoney(320000), '$3,200');
  assert.equal(formatMoney(123456789), '$1,234,568');
});

test('formatMoney: rounds half away from zero in whole-dollar mode', () => {
  assert.equal(formatMoney(150), '$2');
  assert.equal(formatMoney(149), '$1');
  assert.equal(formatMoney(-150), '-$2');
});

test('formatMoney: cents mode', () => {
  assert.equal(formatMoney(320050, { cents: true }), '$3,200.50');
  assert.equal(formatMoney(5, { cents: true }), '$0.05');
  assert.equal(formatMoney(-4500, { cents: true }), '-$45.00');
});

test('formatMoney: bad input is $0', () => {
  assert.equal(formatMoney(undefined), '$0');
  assert.equal(formatMoney('abc'), '$0');
});

test('formatPct and formatHours', () => {
  assert.equal(formatPct(0.065), '6.5%');
  assert.equal(formatPct(0.2299, 2), '22.99%');
  assert.equal(formatPct(0.1), '10%');
  assert.equal(formatHours(25), '25 h');
  assert.equal(formatHours(7.5), '7.5 h');
});

test('escapeHtml escapes markup characters', () => {
  assert.equal(escapeHtml('<b>"Tom" & \'Ana\'</b>'), '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Ana&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(null), '');
});
