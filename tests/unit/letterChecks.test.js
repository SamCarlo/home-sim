// Task 26: letter text helpers, spelling, grammar rules, sentiment and features (06 §3 steps 1–5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeText, foldKey, tokenize, splitSentences, splitParagraphs } from '../../app/src/letters/text.js';
import { isAllowed, GAME_PLACES } from '../../app/src/letters/allowlist.js';
import { createSpeller } from '../../app/src/letters/spell.js';
import { GRAMMAR_RULES, GRAMMAR_RULE_IDS, checkGrammar } from '../../app/src/letters/grammar.js';
import { analyzeSentiment, sentimentLabel } from '../../app/src/letters/sentiment.js';
import { extractFeatures, FEATURE_NAMES, FEATURE_RANGES, lengthFit, sentenceLenFit, contentHits } from '../../app/src/letters/features.js';
import { LETTER_TYPES } from '../../app/src/letters/types.js';
import { LOCATIONS } from '../../app/src/data/locations/index.js';
import { SAMPLE_LETTERS } from '../../app/src/dev/sampleLetters.js';

const dict = (f) => fs.readFileSync(new URL(`../../app/vendor/dictionary-en/${f}`, import.meta.url), 'utf8');
const speller = createSpeller({ aff: dict('index.aff'), dic: dict('index.dic'), extraWords: ['Kealoha'] });

const WEAK = 'hey\ni want the apartment its really nice and i would of taken it alot sooner but my mom said no lol. '
  + 'u should give it to me becuase im a good person and i promise i will pay u on time   i think. PLEASE PICK ME NOW!!!';

// ---------- text ----------

test('sentence splitting keeps Mr., Dr., Ms. and a.m. together', () => {
  const s = splitSentences('Dear Ms. Kahale,\nI met Mr. Lee and Dr. Ito at 9 a.m. today. It went well! Did it? Yes.');
  assert.deepEqual(s.map((x) => x.text), ['Dear Ms. Kahale,', 'I met Mr. Lee and Dr. Ito at 9 a.m. today.',
    'It went well!', 'Did it?', 'Yes.']);
  assert.equal(s[0].ended, false);
  assert.equal(s[1].ended, true);
  assert.equal(splitSentences('I live near St. Louis and Mt. Vernon.').length, 1);
  assert.equal(splitSentences('Thank you. I am J. Doe. Bye.').length, 3);
});

test('normalization: NFC, curly apostrophes, ʻokina lookalikes, folded keys', () => {
  assert.equal(normalizeText('I don’t live in Hawai‘i'), "I don't live in Hawaiʻi");
  assert.equal(normalizeText('Pāhoa'), 'Pāhoa'); // decomposed kahakō → NFC
  for (const w of ['Pāhoa', 'Pahoa', 'PAHOA']) assert.equal(foldKey(w), 'pahoa');
  for (const w of ['Hawaiʻi', "Hawai'i", 'Hawaii', 'Hawai‘i']) assert.equal(foldKey(w), 'hawaii');
  assert.deepEqual(tokenize("Our ʻohana's lānai, co-signer -- 'quoted' 2033").map((t) => t.word),
    ["Our", "ʻohana's", 'lānai', 'co-signer', 'quoted', '2033']);
  const p = splitParagraphs('Dear Kai,\n\nLine one.\nLine two.\n\n\nBye,\nMe');
  assert.deepEqual(p.map((x) => x.words), [2, 4, 2]);
});

// ---------- allowlist + spelling ----------

test('allowlist has all 20 game places and Hawaiian words with or without diacritics', () => {
  assert.deepEqual(GAME_PLACES, LOCATIONS.map((l) => l.name));
  for (const w of ['Hawaiʻi', 'Hawaii', 'Oʻahu', 'Oahu', 'mālama', 'malama', 'ʻohana', 'ohana', 'lānai', 'lanai', 'kūpuna',
    'Kailua-Kona', 'Yellow', 'Chattanooga', 'HOA', 'PMI', 'co-signer', 'cosigner', 'autopay']) {
    assert.ok(isAllowed(w), w);
  }
  assert.equal(isAllowed('becuase'), false);
});

test('spelling flags real mistakes with suggestions and gives a rate', () => {
  const r = speller.check('I want to recieve the keys becuase I am ready.');
  assert.deepEqual(r.misspelled.map((m) => m.word), ['recieve', 'becuase']);
  assert.ok(r.misspelled[0].suggestions.includes('receive'));
  assert.ok(r.misspelled[1].suggestions.includes('because'));
  assert.ok(r.misspelled.every((m) => m.suggestions.length <= 3));
  assert.equal(r.misspelled[0].index, 10);
  assert.equal(r.rate, 2 / r.words);
});

test('spelling skips names, Hawaiian words, numbers, URLs and acronyms', () => {
  const text = 'Aloha Ms. Kahale,\n\nMy ʻohana and I love Pāhoa and Hawaii. I talked with Keoni Nakamura about the '
    + 'lanai. We will mālama the home. I pay $1,200 by 2033 and check www.example.com or kai@example.com. '
    + 'The HOA and PMI are fine. Kealoha says mahalo.\n\nMahalo,\nKai Mana';
  assert.deepEqual(speller.check(text).misspelled, []);
  // a capitalized word at the start of a sentence is still checked
  assert.deepEqual(speller.check('Becuase I work hard.').misspelled.map((m) => m.word), ['Becuase']);
  assert.ok(speller.correct("don't") && speller.correct('co-signer') && speller.correct("roommate's"));
});

// ---------- grammar ----------

const CASES = {
  'lowercase-start': ['i am ready. the rent is fine.', 'I am ready. The rent is fine.'],
  'lowercase-i': ['Yesterday i saw it and i\'m happy.', 'Yesterday I saw it. Use i.e. here.'],
  'missing-end-punctuation': ['Dear Kai,\nI will pay the rent on time every month\nSincerely,', 'Dear Kai,\nI will pay the rent on time every month.\nSincerely,'],
  'repeated-word': ['I will pay the the rent.', 'I will pay the rent. The other one had had a dog.'],
  'double-space': ['I will pay  the rent.', 'I will pay the rent.'],
  'your-youre': ['Thanks, your welcome to visit. Is you\'re house nice?', 'You\'re welcome to visit your house.'],
  'their-there': ['Their is a park. There going home. They\'re house is big.', 'There is a park. They\'re going to their house.'],
  'its-its': ['The dog has it\'s own bed. Its a nice place.', 'The dog has its own bed. It\'s a nice place.'],
  'should-of': ['I should of paid. You could of called.', 'I should have paid. Some of us could.'],
  'alot': ['I save alot each month.', 'I save a lot each month.'],
  'then-than': ['This place is better then my old one.', 'It is better than my old one, and then I moved.'],
  'to-too': ['I want to come to. It is to expensive.', 'I want to come too. It is too expensive. I went to school.'],
  'run-on': [`I ${'really '.repeat(40)}want it.`, `I ${'really '.repeat(30)}want it.`],
  'shouting': ['PLEASE PICK ME NOW for the place.', 'I read the HOA PMI rules. I am OK.'],
  'exclamations': ['I love it!! Really!?!', 'I love it! Really?'],
  'text-speak': ['Thx, u r the best lol. I wanna move.', 'Thanks, you are the best. R. Kahale wrote back.'],
  'missing-greeting': ['I want the apartment.\nSincerely,\nKai', 'Hello Mr. Rivera,\nI want the apartment.'],
  'missing-closing': ['Dear Kai,\nI want the apartment.', 'Dear Kai,\nI want the apartment.\nBest regards,\nKai'],
  'long-block': [`Dear Kai, ${'I will pay. '.repeat(55)}`, `Dear Kai,\n\n${'I will pay. '.repeat(30)}\n\n${'I will pay. '.repeat(30)}`],
};

test('every grammar rule has an id, message, suggestion, weight and a test case', () => {
  assert.equal(GRAMMAR_RULES.length, 19);
  for (const r of GRAMMAR_RULES) {
    assert.match(r.id, /^[a-z-]+$/);
    assert.ok(r.message && r.suggestion && r.weight > 0 && typeof r.test === 'function', r.id);
    assert.ok(CASES[r.id], `case for ${r.id}`);
  }
});

for (const [id, [bad, good]] of Object.entries(CASES)) {
  test(`grammar ${id}: positive and negative examples`, () => {
    const opts = { type: 'rental-cover' };
    const hitsOf = (t) => checkGrammar(t, opts).filter((g) => g.rule === id);
    const found = hitsOf(bad);
    assert.ok(found.length > 0, `${id} should fire on: ${bad}`);
    for (const h of found) assert.ok(h.message && h.suggestion !== undefined && h.index >= 0 && h.length >= 0);
    assert.deepEqual(hitsOf(good), [], `${id} should not fire on: ${good}`);
  });
}

test('grammar spans point at the mistake; "Love," is a closing only for a parent letter', () => {
  const t = 'Dear Kai,\nI save alot and i should of paid.\nSincerely,\nKai';
  for (const g of checkGrammar(t)) {
    const span = normalizeText(t).slice(g.index, g.index + g.length);
    if (g.rule === 'alot') assert.equal(span, 'alot');
    if (g.rule === 'lowercase-i') assert.equal(span, 'i');
    if (g.rule === 'should-of') assert.equal(span, 'should of');
  }
  const love = 'Dear Mom,\nPlease co-sign for me.\nLove,\nKai';
  assert.ok(checkGrammar(love, { type: 'cosigner-request' }).every((g) => g.rule !== 'missing-closing'));
  assert.ok(checkGrammar(love, { type: 'loan-purpose' }).some((g) => g.rule === 'missing-closing'));
  assert.deepEqual(GRAMMAR_RULE_IDS.length, new Set(GRAMMAR_RULE_IDS).size);
});

test('sample letters are clean', () => {
  for (const [type, text] of Object.entries(SAMPLE_LETTERS)) {
    assert.deepEqual(checkGrammar(text, { type }).map((g) => g.rule), [], type);
    assert.deepEqual(speller.check(text).misspelled, [], type);
  }
});

// ---------- sentiment ----------

test('sentiment labels and cut-offs', () => {
  assert.equal(sentimentLabel(0.5), 'warm');
  assert.equal(sentimentLabel(0.2), 'positive');
  assert.equal(sentimentLabel(0.05), 'positive');
  assert.equal(sentimentLabel(0), 'neutral');
  assert.equal(sentimentLabel(-0.05), 'negative');
  assert.equal(analyzeSentiment('Thank you so much, I really appreciate your kind help and I am grateful!').label, 'warm');
  assert.equal(analyzeSentiment('The unit is on the second floor.').label, 'neutral');
  assert.equal(analyzeSentiment('This is terrible and unfair. I hate the awful rules.').label, 'negative');
  const mixed = analyzeSentiment('I love this place. The last landlord was terrible and rude.');
  assert.deepEqual(mixed.sentences.map((s) => s.label), ['warm', 'negative']);
  assert.equal(mixed.negSentenceRate, 0.5);
  assert.deepEqual(analyzeSentiment(''), { compound: 0, label: 'neutral', sentences: [], negSentenceRate: 0 });
});

// ---------- features ----------

test('length and sentence-length fit slide to 0', () => {
  const t = { min: 80, max: 200 };
  assert.equal(lengthFit(80, t), 1);
  assert.equal(lengthFit(200, t), 1);
  assert.equal(lengthFit(60, t), 0.5);
  assert.equal(lengthFit(40, t), 0);
  assert.equal(lengthFit(300, t), 0.5);
  assert.equal(lengthFit(400, t), 0);
  assert.equal(sentenceLenFit(15), 1);
  assert.equal(sentenceLenFit(7), 0.5);
  assert.equal(sentenceLenFit(31), 0.5);
  assert.equal(sentenceLenFit(50), 0);
});

test('content groups match with and without diacritics', () => {
  assert.ok(contentHits('I will malama the home.', 'rental-cover').includes('neighbor'));
  assert.ok(contentHits('I will mālama the home.', 'rental-cover').includes('neighbor'));
  assert.deepEqual(contentHits('Hello.', 'rental-cover'), []);
});

test('features: fixed order, in range, deterministic, for every type', () => {
  assert.equal(FEATURE_NAMES.length, 15);
  assert.deepEqual(Object.keys(FEATURE_RANGES), FEATURE_NAMES);
  for (const type of Object.keys(LETTER_TYPES)) {
    for (const text of [SAMPLE_LETTERS[type], WEAK, '', 'hi']) {
      const a = extractFeatures(text, type, { speller });
      const b = extractFeatures(text, type, { speller });
      assert.deepEqual(a, b);
      assert.deepEqual(a.vector, FEATURE_NAMES.map((k) => a.named[k]));
      for (const k of FEATURE_NAMES) {
        const [lo, hi] = FEATURE_RANGES[k];
        assert.ok(Number.isFinite(a.named[k]) && a.named[k] >= lo && a.named[k] <= hi, `${type} ${k}=${a.named[k]}`);
      }
    }
  }
});

test('features separate a strong letter from a weak one', () => {
  const strong = extractFeatures(SAMPLE_LETTERS['rental-cover'], 'rental-cover', { speller }).named;
  const weak = extractFeatures(WEAK, 'rental-cover', { speller }).named;
  assert.equal(strong.spellRate, 0);
  assert.ok(weak.spellRate > 0.05);
  assert.ok(weak.grammarPer100w > strong.grammarPer100w);
  assert.equal(strong.contentCoverage, 1);
  assert.ok(weak.contentCoverage < 0.5);
  assert.deepEqual([strong.hasGreeting, strong.hasClosing, strong.paragraphs, strong.lengthFit], [1, 1, 1, 1]);
  assert.deepEqual([weak.hasClosing, weak.paragraphs, weak.shouting], [0, 0, 1]);
  assert.ok(weak.textSpeak >= 3);
  assert.ok(weak.lengthFit < 1);
});

test('without a speller, spelling is skipped and the rest still works', () => {
  const f = extractFeatures(WEAK, 'rental-cover');
  assert.equal(f.named.spellRate, 0);
  assert.deepEqual(f.issues.spelling, []);
  assert.ok(f.issues.grammar.length > 5);
});
