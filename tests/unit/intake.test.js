// Intake rules (04 §1): parsing, ranges, the live one-liner and the Continue write.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateIntake, payRates, payLine, checkName, parseMoneyField, parseHours, applyIntake, INTAKE_MESSAGES as M,
} from '../../app/src/phases/intake/intakeModel.js';
import { createInitialState, validateState } from '../../app/src/state/schema.js';

const good = { characterName: '  Kai   Mana ', jobTitle: 'Dental assistant', income: '$3,200.50', hours: '40', savings: '8,000' };

test('valid intake parses money to cents and tidies names', () => {
  const r = validateIntake(good);
  assert.equal(r.ok, true);
  assert.deepEqual(r.player, {
    characterName: 'Kai Mana', jobTitle: 'Dental assistant', netMonthlyIncomeCents: 320050, weeklyJobHours: 40, startingSavingsCents: 800000,
  });
});

test('currency inputs accept 3200, 3,200 and $3,200.50', () => {
  assert.equal(parseMoneyField('3200', 'income').cents, 320000);
  assert.equal(parseMoneyField('3,200', 'income').cents, 320000);
  assert.equal(parseMoneyField('$3,200.50', 'income').cents, 320050);
  assert.equal(parseMoneyField('0', 'savings').error, null);
});

test('money errors: empty, junk, out of range', () => {
  assert.equal(parseMoneyField('', 'income').error, M.incomeMissing);
  assert.equal(parseMoneyField('lots', 'income').error, M.incomeBad);
  assert.equal(parseMoneyField('499.99', 'income').error, M.incomeRange);
  assert.equal(parseMoneyField('500', 'income').error, null);
  assert.equal(parseMoneyField('20,000', 'income').error, null);
  assert.equal(parseMoneyField('20,000.01', 'income').error, M.incomeRange);
  assert.equal(parseMoneyField('-5', 'savings').error, M.savingsRange);
  assert.equal(parseMoneyField('1,000,001', 'savings').error, M.savingsRange);
  assert.equal(parseMoneyField('', 'savings').error, M.savingsMissing);
});

test('names: length and characters, ʻokina allowed', () => {
  assert.equal(checkName('Kalāʻau Keliʻi'), null);
  assert.equal(checkName("O'Neil-Smith"), null);
  assert.equal(checkName('K'), M.nameLength);
  assert.equal(checkName('x'.repeat(31)), M.nameLength);
  assert.equal(checkName('Kai99'), M.nameChars);
  assert.equal(checkName('<b>Kai</b>'), M.nameChars);
});

test('hours: whole numbers 10–80', () => {
  assert.equal(parseHours('40').hours, 40);
  assert.equal(parseHours('9').error, M.hoursRange);
  assert.equal(parseHours('81').error, M.hoursRange);
  assert.equal(parseHours('forty').error, M.hoursBad);
  assert.equal(parseHours('37.5').error, M.hoursBad);
});

test('every bad field is reported at once; job title is optional', () => {
  const r = validateIntake({ characterName: '', jobTitle: '', income: 'abc', hours: '5', savings: '' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['characterName', 'hours', 'income', 'savings']);
  assert.equal(validateIntake({ ...good, jobTitle: '' }).ok, true);
  assert.ok(validateIntake({ ...good, jobTitle: 'x'.repeat(41) }).errors.jobTitle);
});

test('per-year and per-hour one-liner', () => {
  assert.deepEqual(payRates(320000, 40), { yearCents: 3840000, hourCents: 1846 });
  assert.equal(payLine('3,200', '40'), "That's about $38,400 per year take-home, or $18.46 per hour.");
  assert.equal(payLine('3,200', ''), payLine('3,200', '40')); // bad hours fall back to 40
  assert.equal(payLine('', '40'), null);
  assert.equal(payLine('12', '40'), null);
});

test('applyIntake writes player, savings (first time only) and phase', () => {
  const s = createInitialState({ uid: 'u1', username: 'kai', now: 1 });
  const { player } = validateIntake(good);
  applyIntake(s, player);
  assert.equal(s.phase, 'plan');
  assert.equal(s.finances.savingsCents, 800000);
  assert.equal(s.player.netMonthlyIncomeCents, 320050);
  assert.deepEqual(validateState(s), []);
  s.finances.savingsCents = 123;
  applyIntake(s, { ...player, startingSavingsCents: 999 });
  assert.equal(s.finances.savingsCents, 123); // not overwritten once past intake
});
