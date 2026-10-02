// Form engine rules (task 18): every validate rule, computed helpers, initials derivation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateField, validateForm, requiredProgress, deriveInitials, initialsMatch, sameName, computeField, formatValue,
  displayValue, tableRows, visibleFields, initialValues, isEmpty, PHONE_RE,
} from '../../app/src/forms/validate.js';
import { SAMPLE_SCHEMA, SAMPLE_VALUES } from '../../app/src/dev/formsGallery.js';

const state = { player: { characterName: 'Keʻala Kahananui-Akana', netMonthlyIncomeCents: 312000 } };
const v = (field, value, values = {}) => validateField(field, value, { values, state });

test('initials: words, hyphens, ʻokina and kahakō', () => {
  assert.equal(deriveInitials('Kai Mana'), 'KM');
  assert.equal(deriveInitials('Keʻala Kahananui-Akana'), 'KKA');
  assert.equal(deriveInitials('ʻIolani Kealoha'), 'IK');
  assert.equal(deriveInitials("‘Ānela O'Brien-Pā"), 'AOP');
  assert.equal(deriveInitials('  mary   jane '), 'MJ');
  assert.equal(deriveInitials(''), '');
  assert.ok(initialsMatch('k.k.a', 'KKA'));
  assert.ok(initialsMatch('K K A', 'KKA'));
  assert.ok(!initialsMatch('KK', 'KKA'));
  assert.ok(!initialsMatch('', ''));
});

test('signature: must match the character name (ʻokina, kahakō, case, spaces forgiven)', () => {
  assert.ok(sameName('Keʻala Kahananui-Akana', state.player.characterName));
  assert.ok(sameName("ke'ala  kahananui-akana", state.player.characterName));
  assert.ok(sameName('Keala Kahananui-Akana', state.player.characterName));
  assert.ok(!sameName('Keala Kahananui', state.player.characterName));
  assert.ok(!sameName('anything', ''));
  const f = { id: 'sig', kind: 'signature', required: true };
  assert.match(v(f, ''), /Sign by typing your full name: Keʻala Kahananui-Akana/);
  assert.match(v(f, 'Keala'), /must match your name/);
  assert.equal(v(f, 'Keʻala Kahananui-Akana'), null);
});

test('required: message per kind, optional empty passes', () => {
  assert.equal(v({ kind: 'text', required: true }, '  '), 'Fill this in.');
  assert.equal(v({ kind: 'text' }, ''), null);
  assert.equal(v({ kind: 'select', required: true }, null), 'Pick one.');
  assert.equal(v({ kind: 'radio', required: true }, undefined), 'Pick one.');
  assert.equal(v({ kind: 'month', required: true }, null), 'Pick one.');
  assert.equal(v({ kind: 'checkbox', required: true }, false), 'Check this box to go on.');
  assert.equal(v({ kind: 'checkbox', required: true }, true), null);
  assert.equal(v({ kind: 'currency', required: true }, null), 'Enter an amount.');
  assert.equal(v({ kind: 'phone', required: true }, ''), 'Enter a phone number.');
  assert.equal(v({ kind: 'question', required: true }, undefined), 'Answer this question.');
  assert.equal(v({ kind: 'text', required: true, requiredMessage: 'Name your employer.' }, ''), 'Name your employer.');
  assert.equal(v({ kind: 'info', required: true }, undefined), null);
});

test('pattern, length, min/max and custom validators', () => {
  const zip = { kind: 'text', pattern: '^\\d{5}$', patternMessage: 'Use 5 digits.' };
  assert.equal(v(zip, '9677'), 'Use 5 digits.');
  assert.equal(v(zip, '96778'), null);
  assert.equal(v({ kind: 'text', pattern: /^a/ }, 'b'), 'Check the format and try again.');
  assert.equal(v({ kind: 'text', minLength: 3 }, 'ab'), 'Use at least 3 characters.');
  assert.equal(v({ kind: 'textarea', maxLength: 4 }, 'abcde'), 'Use 4 characters or fewer.');
  assert.equal(v({ kind: 'number', min: 0, max: 50 }, -1), 'Enter at least 0.');
  assert.equal(v({ kind: 'number', min: 0, max: 50 }, 51), 'Enter no more than 50.');
  assert.equal(v({ kind: 'number' }, 'abc'), 'Enter a number, like 12.');
  assert.equal(v({ kind: 'currency', min: 5000 }, 4999), 'Enter at least $50.');
  assert.equal(v({ kind: 'currency', max: 100000 }, 100001), 'Enter no more than $1,000.');
  assert.match(v({ kind: 'currency' }, '12abc'), /dollar amount/);
  assert.equal(v({ kind: 'month', min: 1 }, 0), 'Pick February 2033 or later.');
  assert.equal(v({ kind: 'month', max: 2 }, 3), 'Pick March 2033 or earlier.');
  const custom = { kind: 'text', validate: (val, values) => (val === values.other ? null : 'Must match the other box.') };
  assert.equal(validateField(custom, 'x', { values: { other: 'x' } }), null);
  assert.equal(validateField(custom, 'x', { values: { other: 'y' } }), 'Must match the other box.');
});

test('phone: fictional 555-01xx only', () => {
  for (const ok of ['(808) 555-0123', '808-555-0199', '8085550100', '808.555.0142']) assert.ok(PHONE_RE.test(ok), ok);
  for (const bad of ['808-555-1234', '555-0123', '(808) 966-0123']) assert.ok(!PHONE_RE.test(bad), bad);
  assert.match(v({ kind: 'phone' }, '808-555-1234'), /555-01xx range, like \(808\) 555-0123/);
});

test('initials-per-clause and multiple-choice question', () => {
  const f = { kind: 'initials', required: true, clauses: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }] };
  assert.equal(v(f, {}), 'Initial every clause with KKA.');
  assert.equal(v(f, { a: 'KKA', b: 'KM', c: '' }), 'Clauses 2 and 3 need your initials, KKA.');
  assert.equal(v(f, { a: 'KKA', b: 'kka', c: 'XX' }), 'Clause 3 needs your initials, KKA.');
  assert.equal(v(f, { a: 'KKA', b: 'kka', c: 'K.K.A.' }), null);
  const q = { kind: 'question', required: true, answer: 'c' };
  assert.match(v(q, { choice: 'a', tries: 1, correct: false }), /right answer/);
  assert.equal(v(q, { choice: 'c', tries: 2, correct: true }), null);
  assert.ok(isEmpty(q, { tries: 0 }));
});

test('computed fields, formats, tables and display values', () => {
  assert.deepEqual(computeField({ compute: (vals, s) => s.player.netMonthlyIncomeCents * 2, format: 'money' }, {}, state),
    { value: 624000, text: '$6,240' });
  assert.equal(computeField({ compute: () => { throw new Error('x'); } }, {}, state).text, '—');
  assert.equal(computeField({ compute: (vals) => vals.a + 1 }, { a: 1 }).text, '2');
  assert.equal(formatValue('money-cents', 12345), '$123.45');
  assert.equal(formatValue('percent', 0.0675), '6.75%');
  assert.equal(formatValue('month', 11), 'December 2033');
  assert.equal(formatValue((x) => `${x}×`, 3), '3×');
  assert.equal(formatValue('money', null), '—');
  assert.deepEqual(tableRows({ rows: (vals) => [{ n: vals.n }] }, { n: 4 }), [{ n: 4 }]);
  assert.deepEqual(tableRows({ rows: () => { throw new Error('x'); } }), []);
  assert.equal(displayValue({ kind: 'select', options: [{ value: 'a', label: 'Apple' }] }, 'a'), 'Apple');
  assert.equal(displayValue({ kind: 'radio', options: ['x', 'y'] }, 'y'), 'y');
  assert.equal(displayValue({ kind: 'currency' }, 25000), '$250');
  assert.equal(displayValue({ kind: 'month' }, 0), 'January 2033');
  assert.equal(displayValue({ kind: 'checkbox' }, true), 'Yes');
});

test('whole form: when() hides fields, progress counts, sample values pass', () => {
  const vis = (values) => visibleFields(SAMPLE_SCHEMA, values, state).map((f) => f.id);
  assert.ok(!vis({ history: 'first' }).includes('landlord'));
  assert.ok(vis({ history: 'rented' }).includes('landlord'));
  assert.deepEqual(requiredProgress(SAMPLE_SCHEMA, {}, state), { done: 0, total: 10 });
  assert.equal(Object.keys(validateForm(SAMPLE_SCHEMA, {}, state)).length, 10);
  assert.deepEqual(validateForm(SAMPLE_SCHEMA, SAMPLE_VALUES, state), {});
  assert.deepEqual(requiredProgress(SAMPLE_SCHEMA, SAMPLE_VALUES, state), { done: 11, total: 11 });
  const schema = { sections: [{ fields: [{ id: 'a', kind: 'checkbox', default: true }, { id: 'b', kind: 'text', default: (s) => s.player.characterName }] }] };
  assert.deepEqual(initialValues(schema, { a: false }, state), { a: false, b: 'Keʻala Kahananui-Akana' });
});
