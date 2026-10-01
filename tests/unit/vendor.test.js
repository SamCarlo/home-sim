// Vendored nspell + dictionary-en and VADER work from Node (task 03).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import nspell from '../../app/vendor/nspell/nspell.js';
import { polarityScores } from '../../app/vendor/vader/vader.js';

const dict = (f) => fs.readFileSync(new URL(`../../app/vendor/dictionary-en/${f}`, import.meta.url), 'utf8');

test('nspell with the en dictionary', () => {
  const speller = nspell(dict('index.aff'), dict('index.dic'));
  assert.equal(speller.correct('house'), true);
  assert.equal(speller.correct('hosue'), false);
  assert.ok(speller.suggest('hosue').includes('house'));
});

test('VADER compound scores', () => {
  const pos = polarityScores('Thank you so much for your kind help, I really appreciate it!');
  const neg = polarityScores('This is terrible and I am very angry about the awful service.');
  assert.deepEqual(Object.keys(pos).sort(), ['compound', 'neg', 'neu', 'pos']);
  assert.ok(pos.compound > 0.3, `positive compound ${pos.compound}`);
  assert.ok(neg.compound < -0.3, `negative compound ${neg.compound}`);
});
