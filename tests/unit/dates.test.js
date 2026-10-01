import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthLabel, daysInMonth, weekday, dayLabel } from '../../app/src/util/dates.js';

test('monthIndex 0 is January 2033 on the real calendar', () => {
  assert.equal(monthLabel(0), 'January 2033');
  assert.equal(monthLabel(13), 'February 2034');
  assert.equal(daysInMonth(0), 31);
  assert.equal(daysInMonth(1), 28);
  assert.equal(daysInMonth(12 * 3 + 1), 29); // February 2036 is a leap year
  assert.equal(weekday(0, 1), 6);            // Saturday
  assert.equal(dayLabel(0, 1), 'Saturday, January 1');
});
