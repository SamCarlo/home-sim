// Letter features (06 §3 steps 1 and 5): turns a letter into the fixed-order vector the scoring model reads. Pure and
// deterministic: the same text, type and speller always give the same numbers. The speller is optional (null → no
// spelling check, spellRate 0); the browser passes the one from loadSpeller.js, Node tests build one with fs.
import { letterType } from './types.js';
import { normalizeText, foldKey, tokenize, splitSentences, splitLines } from './text.js';
import { checkGrammar } from './grammar.js';
import { analyzeSentiment } from './sentiment.js';

/** Feature order (06 §3 step 5). model.json records the same list; never reorder without retraining. */
export const FEATURE_NAMES = ['spellRate', 'grammarPer100w', 'sentiment', 'negSentenceRate', 'politeness', 'hasGreeting',
  'hasClosing', 'lengthFit', 'sentenceLenFit', 'contentCoverage', 'textSpeak', 'shouting', 'exclaimRate', 'paragraphs',
  'lexicalVariety'];

/** Caps and the range each feature stays in. */
export const FEATURE_CAPS = { grammarPer100w: 20, politeness: 5, textSpeak: 5 };
export const FEATURE_RANGES = {
  spellRate: [0, 1], grammarPer100w: [0, FEATURE_CAPS.grammarPer100w], sentiment: [-1, 1], negSentenceRate: [0, 1],
  politeness: [0, FEATURE_CAPS.politeness], hasGreeting: [0, 1], hasClosing: [0, 1], lengthFit: [0, 1],
  sentenceLenFit: [0, 1], contentCoverage: [0, 1], textSpeak: [0, FEATURE_CAPS.textSpeak], shouting: [0, 1],
  exclaimRate: [0, 1], paragraphs: [0, 1], lexicalVariety: [0, 1],
};

// Rules that have their own feature, so grammarPer100w doesn't count them twice.
const OWN_FEATURE_RULES = new Set(['missing-greeting', 'missing-closing', 'text-speak', 'shouting', 'exclamations']);
const POLITE = /\b(please|thank|thanks|appreciate|grateful|gratitude|respect|respectfully|mahalo)/g;
const SENTENCE_LEN = { lo: 10, hi: 22, floor: 4, ceil: 40 };
const VARIETY_WORDS = 150;
const PARAGRAPH_MIN_WORDS = 8;

const round4 = (x) => Math.round(x * 1e4) / 1e4;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** 1 inside [min, max], sliding linearly to 0 at min ÷ 2 and at 2 × max. */
export function lengthFit(words, { min, max }) {
  if (words >= min && words <= max) return 1;
  if (words < min) return clamp((words - min / 2) / (min / 2), 0, 1);
  return clamp((2 * max - words) / max, 0, 1);
}

/** 1 when the average sentence is 10–22 words, sliding to 0 at 4 and at 40. */
export function sentenceLenFit(avg) {
  const { lo, hi, floor, ceil } = SENTENCE_LEN;
  if (avg >= lo && avg <= hi) return 1;
  if (avg < lo) return clamp((avg - floor) / (lo - floor), 0, 1);
  return clamp((ceil - avg) / (ceil - hi), 0, 1);
}

/** Content groups of `type` the letter covers → ids. Keywords are lowercase substrings, matched with and without diacritics. */
export function contentHits(text, type) {
  const lower = normalizeText(text).toLowerCase();
  const folded = foldKey(lower);
  return letterType(type).groups.filter((g) => g.keywords.some((k) => lower.includes(k) || folded.includes(foldKey(k)))
    || (g.patterns ?? []).some((re) => re.test(lower))).map((g) => g.id);
}

/**
 * extractFeatures(text, type, {speller}) → {vector, named, issues: {spelling, grammar}, sentiment, wordCount, groupsHit}.
 * `vector[i]` = `named[FEATURE_NAMES[i]]`; every value is inside FEATURE_RANGES and rounded to 4 decimals.
 */
export function extractFeatures(text, type, { speller = null } = {}) {
  const t = letterType(type);
  const s = normalizeText(text);
  const tokens = tokenize(s);
  const words = tokens.length;
  const per100 = (n) => (words ? (n * 100) / words : 0);
  const lines = splitLines(s);
  const sentences = splitSentences(s);
  const body = sentences.filter((x) => lines[x.line].words > 4);

  const spelling = speller ? speller.check(s) : { misspelled: [], rate: 0, words };
  const grammar = checkGrammar(s, { type });
  const sentiment = analyzeSentiment(s);
  const groupsHit = contentHits(s, type);
  const has = (rule) => grammar.some((g) => g.rule === rule);

  const counted = grammar.filter((g) => !OWN_FEATURE_RULES.has(g.rule)).reduce((sum, g) => sum + g.weight, 0);
  const lower = tokens.slice(0, VARIETY_WORDS).map((x) => foldKey(x.word));
  const avgLen = body.length ? body.reduce((sum, x) => sum + x.words, 0) / body.length : 0;

  const named = {
    spellRate: spelling.rate,
    grammarPer100w: Math.min(FEATURE_CAPS.grammarPer100w, per100(counted)),
    sentiment: sentiment.compound,
    negSentenceRate: sentiment.negSentenceRate,
    politeness: Math.min(FEATURE_CAPS.politeness, per100((s.toLowerCase().match(POLITE) ?? []).length)),
    hasGreeting: words && !has('missing-greeting') ? 1 : 0,
    hasClosing: words && !has('missing-closing') ? 1 : 0,
    lengthFit: lengthFit(words, t.targetWords),
    sentenceLenFit: sentenceLenFit(avgLen),
    contentCoverage: t.groups.length ? groupsHit.length / t.groups.length : 0,
    textSpeak: Math.min(FEATURE_CAPS.textSpeak, grammar.filter((g) => g.rule === 'text-speak').length),
    shouting: has('shouting') ? 1 : 0,
    exclaimRate: sentences.length ? sentences.filter((x) => /![\s"')\]”]*$/.test(x.text)).length / sentences.length : 0,
    paragraphs: lines.filter((l) => l.words >= PARAGRAPH_MIN_WORDS).length >= 2 ? 1 : 0,
    lexicalVariety: lower.length ? new Set(lower).size / lower.length : 0,
  };
  for (const k of FEATURE_NAMES) named[k] = round4(named[k]);
  return {
    vector: FEATURE_NAMES.map((k) => named[k]),
    named,
    issues: { spelling: spelling.misspelled, grammar },
    sentiment: { compound: sentiment.compound, label: sentiment.label, sentences: sentiment.sentences },
    wordCount: words,
    groupsHit,
  };
}
