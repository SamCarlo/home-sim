// Glossary (12 §5) and the copy audit helpers (tools/copy-audit.mjs), task 55.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, REQUIRED_TERMS, glossaryEntry } from '../../app/src/content/glossary.js';
import { STEP_TERMS } from '../../app/src/phases/paperwork/stepTerms.js';
import { extractStrings, spellingHits, syllables, counts, fkGrade, isProse } from '../../tools/copy-audit.mjs';

test('every 12 §5 term has a word, a definition and an example', () => {
  assert.equal(REQUIRED_TERMS.length, 40);
  for (const id of REQUIRED_TERMS) {
    const e = glossaryEntry(id);
    assert.ok(e.word && e.def && e.example, id);
    assert.ok(/[.!?]$/.test(e.def) && /[.!?]$/.test(e.example), `${id} ends with punctuation`);
    assert.ok(!/—/.test(e.def + e.example), `${id} has no em dash`);
  }
  assert.throws(() => glossaryEntry('nope'), /unknown term/);
});

test('glossary entries read at grade 7 or below, pooled', () => {
  const text = Object.values(GLOSSARY).map((e) => `${e.def} ${e.example}`).join(' ');
  assert.ok(fkGrade(counts(text)) <= 7, `grade ${fkGrade(counts(text)).toFixed(2)}`);
});

test('paperwork Words to know only use real glossary ids', () => {
  for (const [step, ids] of Object.entries(STEP_TERMS)) for (const id of ids) assert.ok(GLOSSARY[id], `${step}: ${id}`);
});

test('extractStrings merges + joins, skips comments and regexes, and replaces ${}', () => {
  const src = "// 'Hawaii' in a comment\nconst a = 'One two ' + 'three';\nconst r = /Pahoa'x/g;\nconst t = `Hi ${name}!`;";
  const s = extractStrings(src).map((x) => x.text);
  assert.deepEqual(s, ['One two three', 'Hi X!']);
});

test('spellingHits flags UI text but not ids', () => {
  const hits = spellingHits([{ text: 'Welcome to Hawaii', line: 1 }, { text: "Life on O'ahu", line: 2 },
    { text: 'lanai', line: 3 }, { text: 'A shaded lanai out back', line: 4 }, { text: 'Hawaiʻi and Pāhoa', line: 5 },
    { text: 'Hawaiian music', line: 6 }]);
  assert.deepEqual(hits.map((h) => h.line), [1, 2, 4]);
});

test('syllables, sentences and the prose filter', () => {
  assert.equal(syllables('cat'), 1);
  assert.equal(syllables('insurance'), 3);
  assert.equal(syllables('Pāhoa'), 2);
  assert.deepEqual(counts('You pay rent. Then you save!'), { words: 6, sentences: 2, syllables: 6 });
  assert.ok(isProse('Your take-home pay each month is what is left after taxes.'));
  assert.ok(!isProse('display: flex; gap: 4px and more words here'));
  assert.ok(!isProse('M236 252 q-28 -6 -40 8 M236 252 q-6 -26'));
});
