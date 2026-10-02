// Letter scores (task 28, 06 §3 steps 6–7 and §4): the sanity letters, determinism, contributions, excerpts and rescoring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scoreLetter, bandFor, predict, needsScore, rescorePending, issueExcerpt, LETTER_MODEL } from '../../app/src/letters/score.js';
import { createSpeller } from '../../app/src/letters/spell.js';
import { extractFeatures } from '../../app/src/letters/features.js';
import { SAMPLE_LETTERS, REPORT_SAMPLES } from '../../app/src/dev/sampleLetters.js';
import { letterRevealed } from '../../app/src/ui/portfolio/portfolioModel.js';

const dict = (f) => fs.readFileSync(new URL(`../../app/vendor/dictionary-en/${f}`, import.meta.url), 'utf8');
const speller = createSpeller({ aff: dict('index.aff'), dic: dict('index.dic') });
const score = (text, type = 'rental-cover') => scoreLetter(text, type, { speller });

// The three sanity letters from 06 §4. Every name is made up.
const STRONG = 'Dear Mr. Kamakau,\n\nMy name is Leilani Akana, and I work full time as a medical assistant at a clinic in '
  + 'Hilo. I am applying for the one-bedroom apartment because it is close to my job and the neighborhood is quiet and safe.\n\n'
  + 'My income is steady, and I have saved enough for the deposit and first month of rent. I keep a monthly budget and I '
  + 'will set up autopay so the rent is always paid on time.\n\nI am a clean, quiet and respectful tenant, and I will take '
  + 'care of the apartment as if it were my own. My manager and my last landlord are happy to be references.\n\n'
  + 'Thank you for considering my application.\n\nSincerely,\nLeilani Akana';
const RANT = 'yo i need this place asap!!! u gotta rent it to me cuz my old landlord was the WORST EVER and i hate him lol. '
  + 'idk why ur asking for a letter its dumb. i got money ok. plz just say yes';
const POLITE_EMPTY = 'Dear Property Manager,\n\nThank you so much for taking the time to read my letter. I really appreciate '
  + 'the chance to write to you today, and I am grateful for your kindness and your time. I hope you are having a wonderful '
  + 'week and that the weather is nice where you are.\n\nI think your company is very nice and I have heard good things about '
  + 'it from many people. It would be a great honor to hear back from you. I look forward to your reply and I wish you all '
  + 'the best.\n\nThank you again for your time and consideration.\n\nSincerely,\nLeilani Akana';

test('sanity letters land in their required ranges (06 §4)', () => {
  const strong = score(STRONG);
  const rant = score(RANT);
  const polite = score(POLITE_EMPTY);
  assert.ok(strong.likelihood >= 70, `strong ${strong.likelihood}`);
  assert.ok(rant.likelihood <= 35, `rant ${rant.likelihood}`);
  assert.ok(polite.likelihood > 35 && polite.likelihood < 70, `polite but empty ${polite.likelihood}`);
  assert.ok(polite.contributions.some((c) => c.feature === 'contentCoverage' && c.effect < 0), 'empty letter is told what it left out');
});

test('every sample letter scores Strong or better, and the gallery samples are strong > middling > weak', () => {
  for (const [type, text] of Object.entries(SAMPLE_LETTERS)) assert.ok(score(text, type).likelihood >= 70, type);
  const [s, m, w] = REPORT_SAMPLES.map((x) => score(x.text, x.type).likelihood);
  assert.ok(s > m && m > w, `${s} > ${m} > ${w}`);
  assert.ok(m >= 40 && m < 85, `middling ${m}`);
});

test('scores are deterministic and follow the 06 §3 contract', () => {
  const a = score(STRONG);
  assert.deepEqual(score(STRONG), a);
  for (const k of ['likelihood', 'band', 'sentiment', 'wordCount', 'issues', 'features', 'contributions', 'modelVersion']) assert.ok(k in a, k);
  assert.equal(a.modelVersion, LETTER_MODEL.version);
  assert.equal(a.spellChecked, true);
  assert.equal(a.band, bandFor(a.likelihood).key);
  const { p } = predict(extractFeatures(STRONG, 'rental-cover', { speller }).vector);
  assert.equal(a.likelihood, Math.round(100 * p));
});

test('bands follow config (85/70/55/40)', () => {
  assert.deepEqual([100, 85, 84, 70, 69, 55, 54, 40, 39, 0].map((x) => bandFor(x).key),
    ['excellent', 'excellent', 'strong', 'strong', 'fair', 'fair', 'weak', 'weak', 'needs-work', 'needs-work']);
});

test('contributions: at most 3 helped then 3 hurt, each with a message, never the two neutral features', () => {
  for (const text of [STRONG, RANT, POLITE_EMPTY, REPORT_SAMPLES[1].text]) {
    const { contributions } = score(text);
    const up = contributions.filter((c) => c.effect > 0);
    const down = contributions.filter((c) => c.effect < 0);
    assert.ok(up.length <= 3 && down.length <= 3);
    assert.deepEqual(contributions, [...up, ...down]);
    for (const c of contributions) {
      assert.ok(typeof c.message === 'string' && c.message.length > 5, c.feature);
      assert.ok(!['negSentenceRate', 'lexicalVariety'].includes(c.feature));
    }
  }
  const short = score('Dear Ms. Lee,\n\nI want the apartment. I have a job and I will pay on time.\n\nSincerely,\nAva');
  assert.ok(short.contributions.some((c) => /^Too short: \d+ words/.test(c.message)));
});

test('issue excerpts split around the problem span within its line', () => {
  const text = 'Dear Ms. Lee,\n\nI like it alot because it is close.\n\nAva';
  const i = text.indexOf('alot');
  assert.deepEqual(issueExcerpt(text, { index: i, length: 4 }), { before: 'I like it ', match: 'alot', after: ' because it is close.' });
  const long = `Dear Ms. Lee,\n\n${'word '.repeat(30)}alot ${'more '.repeat(30)}`;
  const ex = issueExcerpt(long, { index: long.indexOf('alot'), length: 4 }, 20);
  assert.ok(ex.before.startsWith('…') && ex.after.endsWith('…') && ex.match === 'alot');
  assert.ok(ex.before.length <= 22 && ex.after.length <= 22);
  assert.deepEqual(issueExcerpt('Hi', { index: 2, length: 0 }), { before: 'Hi', match: '', after: '' });
});

test('rescorePending scores stubs, upgrades speller-less scores and leaves real ones alone', () => {
  const s = { letters: {
    L1: { id: 'L1', type: 'rental-cover', text: STRONG, score: { likelihood: null, pending: true } },
    L2: { id: 'L2', type: 'rental-cover', text: STRONG, score: scoreLetter(STRONG, 'rental-cover') },
    L3: { id: 'L3', type: 'rental-cover', text: RANT, score: score(RANT) },
  } };
  const keep = s.letters.L3.score;
  assert.equal(rescorePending(s, { speller: null }), 1, 'without a speller only stubs are scored');
  assert.equal(s.letters.L1.score.spellChecked, false);
  assert.equal(rescorePending(s, { speller }), 2);
  assert.ok(!needsScore(s.letters.L1.score) && !needsScore(s.letters.L2.score));
  assert.equal(s.letters.L3.score, keep);
  assert.equal(rescorePending(s, { speller }), 0);
});

test('scores stay hidden for the paperwork attempt in progress until Results (D11)', () => {
  const s = { phase: 'paperwork', paperwork: { letterIds: ['L2'], steps: {} } };
  assert.equal(letterRevealed(s, { id: 'L2' }), false);
  assert.equal(letterRevealed(s, { id: 'L1' }), true, 'an earlier attempt’s letter');
  assert.equal(letterRevealed({ ...s, paperwork: { ...s.paperwork, lettersRevealed: true } }, { id: 'L2' }), true);
  assert.equal(letterRevealed({ ...s, paperwork: { ...s.paperwork, steps: { results: { status: 'done' } } } }, { id: 'L2' }), true);
  assert.equal(letterRevealed({ ...s, phase: 'life' }, { id: 'L2' }), true);
});

test('report: issues at one spot merge, and part-word fixes show the whole word', async () => {
  const { wholeWordFix, groupBySpot } = await import('../../app/src/ui/letterReport.js');
  const text = 'hi,\n\ni want it!! ok';
  assert.equal(wholeWordFix(text, { index: 0, length: 1, suggestion: 'H' }), 'Hi');
  assert.equal(wholeWordFix(text, { index: 5, length: 1, suggestion: 'I' }), 'I');
  assert.equal(wholeWordFix(text, { index: 14, length: 2, suggestion: '!' }), '!', 'punctuation spans are not extended');
  assert.equal(wholeWordFix(text, { index: 0, length: 1, suggestion: 'Capitalize the first word.' }), 'Capitalize the first word.');
  const merged = groupBySpot([
    { index: 5, length: 1, message: 'Starts lowercase.', suggestion: 'I' },
    { index: 5, length: 1, message: 'Capital I.', suggestion: 'I' },
    { index: 14, length: 2, message: 'Too many.', suggestion: '!' },
  ]);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0].messages, ['Starts lowercase.', 'Capital I.']);
});
