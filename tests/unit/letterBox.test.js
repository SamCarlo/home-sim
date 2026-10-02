// Task 25: letter types data, word counts, recipients and sending (06 §1–§2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LETTER_TYPES, LETTER_TYPE_IDS, letterType } from '../../app/src/letters/types.js';
import { wordCount, lengthStatus, recipientFor, sendLetter, nextLetterId } from '../../app/src/letters/send.js';
import { scoreLetter } from '../../app/src/letters/score.js';
import { LETTER_STEPS } from '../../app/src/phases/paperwork/flow.js';
import { step } from '../../app/src/phases/paperwork/steps/index.js';
import { seeds } from '../../app/src/dev/seeds.js';
import { SAMPLE_LETTERS } from '../../app/src/dev/sampleLetters.js';

test('six letter types, one per letter step, each complete', () => {
  assert.deepEqual([...LETTER_TYPE_IDS].sort(), Object.keys(LETTER_STEPS).sort());
  for (const t of Object.values(LETTER_TYPES)) {
    assert.ok(t.prompt && t.recipientRole && t.title, t.id);
    assert.ok(t.tips.length >= 4 && t.greetingExamples.length && t.closingExamples.length, t.id);
    assert.ok(t.targetWords.min < t.targetWords.max, t.id);
    assert.ok(t.groups.length >= 4 && t.groups.every((g) => g.id && g.label && g.keywords.length), t.id);
  }
  assert.throws(() => letterType('nope'));
});

test('word count keeps ʻokina and contractions inside words', () => {
  assert.equal(wordCount(''), 0);
  assert.equal(wordCount('  \n '), 0);
  assert.equal(wordCount("Aloha! I'm moving to Hawaiʻi — co-signer, 2 cats."), 8);
  assert.equal(lengthStatus(0, { min: 80, max: 200 }), 'empty');
  assert.equal(lengthStatus(79, { min: 80, max: 200 }), 'short');
  assert.equal(lengthStatus(80, { min: 80, max: 200 }), 'ok');
  assert.equal(lengthStatus(201, { min: 80, max: 200 }), 'long');
});

test('sample letters sit in their target ranges', () => {
  for (const [id, text] of Object.entries(SAMPLE_LETTERS)) {
    assert.equal(lengthStatus(wordCount(text), letterType(id).targetWords), 'ok', `${id}: ${wordCount(text)} words`);
  }
});

test('score is a pending stub until task 28', () => {
  assert.deepEqual(scoreLetter('Dear you, hi.', 'rental-cover'), { likelihood: null, pending: true });
});

test('recipients are seeded, named and stable', () => {
  const s = seeds['paperwork-letter'].build(1000);
  for (const id of LETTER_TYPE_IDS) {
    const r = recipientFor(s, id);
    assert.ok(r.name && r.org && r.line === `${r.name}, ${r.org}`, id);
    assert.deepEqual(recipientFor(s, id), r);
  }
  assert.match(recipientFor(s, 'loan-purpose').name, /loan officer$/);
});

test('sending stores the letter, marks the step done and keeps letters across ids', () => {
  const s = seeds['paperwork-letter'].build(1000);
  assert.equal(s.paperwork.steps['rental-cover'], undefined);
  const r = step('rental-cover').complete(s, { text: '  Dear Ms. Kahale,\n\nThank you.  ' }, 5000);
  assert.deepEqual(r, { ok: true, shortfallCents: 0 });
  const id = s.paperwork.steps['rental-cover'].values.letterId;
  const letter = s.letters[id];
  assert.equal(s.paperwork.steps['rental-cover'].status, 'done');
  assert.deepEqual(s.paperwork.letterIds, [id]);
  assert.equal(letter.type, 'rental-cover');
  assert.equal(letter.text, 'Dear Ms. Kahale,\n\nThank you.');
  assert.equal(letter.sentAt, 5000);
  assert.equal(letter.attempt, 0);
  assert.equal(letter.to, recipientFor(s, 'rental-cover').line);
  assert.equal(letter.score.pending, true);
  assert.notEqual(nextLetterId(s), id);
  const second = sendLetter(s, { type: 'cosigner-request', text: 'Hi' }, 6000);
  assert.notEqual(second.id, id);
  assert.equal(Object.keys(s.letters).length, 2);
});

test('seeds that finish a letter step store the sample letter', () => {
  const s = seeds['paperwork-apartment-lease'].build(1000);
  const id = s.paperwork.steps['rental-cover'].values.letterId;
  assert.equal(s.letters[id].text, SAMPLE_LETTERS['rental-cover'].trim());
});
