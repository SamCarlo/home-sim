// Letter scoring (06 §3 steps 6–7): features → the trained logistic-regression model (model.json, task 27) → a likelihood,
// a band and the plain-language reasons. Pure and deterministic: the same text, type and speller always give the same
// score. Without a speller the score is still computed, but `spellChecked: false` marks it for a rescore once the
// dictionary has loaded (rescorePending).
import model from './model.json' with { type: 'json' };
import { LETTERS } from '../config.js';
import { letterType } from './types.js';
import { extractFeatures, FEATURE_NAMES } from './features.js';

if (model.features.join() !== FEATURE_NAMES.join()) throw new Error('letters/model.json is stale: run npm run train:letters');

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const round3 = (x) => Math.round(x * 1e3) / 1e3;
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Feature → [message when it helped, message when it hurt]. A function gets {named, type, wordCount, groupsHit}.
 * negSentenceRate and lexicalVariety are left out: their weights are tiny or point the "wrong" way for a reader
 * (a varied vocabulary isn't a flaw), so they never appear as reasons (task 27 notes).
 */
const MESSAGES = {
  spellRate: ['Few spelling mistakes.', 'Several words are misspelled.'],
  grammarPer100w: ['Clean grammar and punctuation.', 'Grammar and punctuation mistakes make it harder to read.'],
  sentiment: ['Friendly, positive tone.', 'The tone sounds flat or negative.'],
  politeness: ['Polite words like "please" and "thank you".', 'Few polite words like "please" or "thank you".'],
  hasGreeting: ['Opens with a greeting.', 'Missing a greeting like "Dear …".'],
  hasClosing: ['Ends with a closing.', 'Missing a closing like "Sincerely,".'],
  lengthFit: ['A good length for this letter.', ({ wordCount, type }) => (wordCount < letterType(type).targetWords.min
    ? `Too short: ${wordCount} words, and this letter needs at least ${letterType(type).targetWords.min}.`
    : `Too long: ${wordCount} words. Try to stay under ${letterType(type).targetWords.max}.`)],
  sentenceLenFit: ['Sentences are an easy length to read.', 'Sentences are very short or very long.'],
  contentCoverage: ['Covers what the reader needs to know.', ({ type, groupsHit }) => {
    const missing = letterType(type).groups.filter((g) => !groupsHit.includes(g.id)).map((g) => lowerFirst(g.label));
    return missing.length ? `Left out what the reader needs to know: ${missing.join('; ')}.` : 'Some topics were covered only briefly.';
  }],
  textSpeak: ['No text-speak.', 'Text-speak like "u", "pls" or "gonna" sounds too casual.'],
  shouting: ['No ALL-CAPS shouting.', 'ALL CAPS reads like shouting.'],
  exclaimRate: ['Calm punctuation.', 'Too many exclamation points.'],
  paragraphs: ['Split into paragraphs.', 'One big block of text. Split it into paragraphs.'],
};

/** likelihood (0–100) → the band from config: {min, key, label, status}. */
export function bandFor(likelihood) {
  return LETTERS.bands.find((b) => likelihood >= b.min) ?? LETTERS.bands.at(-1);
}

/** The model's probability for a feature vector: σ(Σ wᵢ·(xᵢ − meanᵢ)/stdᵢ + b). Also returns each cᵢ = wᵢ·zᵢ. */
export function predict(vector, m = model) {
  const effects = vector.map((x, i) => m.weights[i] * ((x - m.mean[i]) / m.std[i]));
  return { p: sigmoid(effects.reduce((s, c) => s + c, m.bias)), effects };
}

/** Top helped/hurt contributions with messages: [{feature, value, effect, message}], helped first (largest first). */
export function contributions(extracted, type, effects) {
  const ctx = { ...extracted, type };
  const rows = FEATURE_NAMES.map((feature, i) => ({ feature, value: extracted.named[feature], effect: round3(effects[i]) }))
    .filter((r) => MESSAGES[r.feature] && Math.abs(r.effect) >= LETTERS.minEffect);
  const pick = (sign) => rows.filter((r) => Math.sign(r.effect) === sign)
    .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)).slice(0, LETTERS.topContributions)
    .map((r) => {
      const msg = MESSAGES[r.feature][sign > 0 ? 0 : 1];
      return { ...r, message: typeof msg === 'function' ? msg(ctx) : msg };
    });
  return [...pick(1), ...pick(-1)];
}

/**
 * scoreLetter(text, type, {speller}) → {likelihood, band, bandLabel, sentiment: {compound, label}, wordCount,
 * issues: {spelling, grammar}, features, contributions, modelVersion, spellChecked} (06 §3 contract).
 */
export function scoreLetter(text, type, { speller = null } = {}) {
  const x = extractFeatures(text, type, { speller });
  const { p, effects } = predict(x.vector);
  const likelihood = Math.round(100 * p);
  const band = bandFor(likelihood);
  return {
    likelihood,
    band: band.key,
    bandLabel: band.label,
    sentiment: { compound: x.sentiment.compound, label: x.sentiment.label },
    wordCount: x.wordCount,
    issues: {
      spelling: x.issues.spelling.map(({ word, index, suggestions }) => ({ word, index, suggestions })),
      grammar: x.issues.grammar.map(({ rule, index, length, message, suggestion }) => ({ rule, index, length, message, suggestion })),
    },
    features: x.named,
    contributions: contributions(x, type, effects),
    modelVersion: model.version,
    spellChecked: Boolean(speller),
  };
}

/** True when a stored score still needs the real scorer (task-25 stubs, or scored before the dictionary loaded). */
export const needsScore = (score) => !score || score.pending === true || score.likelihood == null || score.spellChecked === false;

/** Rescore every letter in `state.letters` that needsScore(). Mutates the draft; returns how many changed. */
export function rescorePending(state, { speller = null } = {}) {
  let n = 0;
  for (const letter of Object.values(state.letters ?? {})) {
    if (!needsScore(letter.score)) continue;
    if (!speller && letter.score && letter.score.pending !== true && letter.score.likelihood != null) continue;
    letter.score = scoreLetter(letter.text ?? '', letter.type, { speller });
    n += 1;
  }
  return n;
}

/**
 * The line around an issue, split for highlighting: {before, match, after}. Clipped to about `radius` characters each
 * side at word boundaries ("…" marks a cut). Indices point into the stored letter text (normalizeText keeps lengths).
 */
export function issueExcerpt(text, { index, length = 0 }, radius = 45) {
  const t = String(text ?? '');
  const i = Math.max(0, Math.min(index, t.length));
  const end = Math.min(t.length, i + Math.max(0, length));
  let a = t.lastIndexOf('\n', i - 1) + 1;
  let b = t.indexOf('\n', end);
  if (b < 0) b = t.length;
  let pre = '';
  let post = '';
  if (i - a > radius) { a = t.indexOf(' ', i - radius) + 1 || i - radius; pre = '…'; }
  if (b - end > radius) { b = t.lastIndexOf(' ', end + radius); if (b <= end) b = end + radius; post = '…'; }
  return { before: pre + t.slice(a, i), match: t.slice(i, end), after: t.slice(end, b) + post };
}

export { model as LETTER_MODEL };
