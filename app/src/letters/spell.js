// Spelling (06 §3 step 2): nspell with the en_US Hunspell dictionary, plus the allowlist. Pure: the caller supplies the
// .aff/.dic text (Node reads them with fs, the browser through loadSpeller.js), so this file never touches the network.
import nspell from '../../vendor/nspell/nspell.js';
import { ALLOW_KEYS } from './allowlist.js';
import { foldKey, normalizeText, tokenize, splitSentences, splitLines } from './text.js';

const MAX_SUGGESTIONS = 3;
const MAX_SUGGESTED_WORDS = 25; // nspell.suggest is slow on long words; later misspellings get no suggestions
const URLISH = /\b(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+|\b[\w-]+\.(?:com|org|net|edu|gov|io)\b\S*/gi;

/**
 * createSpeller({aff, dic, extraWords}) → {correct(word), suggest(word), check(text)}.
 * `check` → `{misspelled: [{word, index, suggestions}], rate, words}`; rate = misspelled ÷ words checked + skipped.
 */
export function createSpeller({ aff, dic, extraWords = [] }) {
  const sp = nspell(aff, dic);
  const extra = new Set(extraWords.map(foldKey));
  const cache = new Map();

  function known(w) {
    if (ALLOW_KEYS.has(foldKey(w)) || extra.has(foldKey(w))) return true;
    const plain = w.replace(/ʻ/g, "'");
    if (sp.correct(plain) || sp.correct(plain.toLowerCase())) return true;
    if (/'s$/i.test(plain)) return known(plain.slice(0, -2));
    if (/s'$/i.test(plain)) return known(plain.slice(0, -1));
    if (plain.includes('-')) return plain.split('-').filter(Boolean).every(known);
    return false;
  }

  /** True when `word` is spelled right (or allowed). */
  function correct(word) {
    const w = String(word ?? '');
    if (!cache.has(w)) cache.set(w, known(w));
    return cache.get(w);
  }

  /** Up to 3 dictionary suggestions for `word`. */
  function suggest(word) {
    return sp.suggest(String(word).replace(/ʻ/g, "'")).slice(0, MAX_SUGGESTIONS);
  }

  /** Check a whole letter. Skips numbers, URLs/emails, short all-caps acronyms and capitalized words mid-sentence. */
  function check(text) {
    const s = normalizeText(text).replace(URLISH, (m) => ' '.repeat(m.length));
    const tokens = tokenize(s);
    const starts = new Set();
    for (const sent of splitSentences(s)) {
      const first = tokens.find((t) => t.index >= sent.index);
      if (first) starts.add(first.index);
    }
    // Short lines without end punctuation are greetings, closings and signatures: capitals there are names.
    const nameLines = splitLines(s).filter((l) => l.words <= 4 && !/[.!?]$/.test(l.text));
    const inNameLine = (i) => nameLines.some((l) => i >= l.index && i < l.index + l.text.length);
    const misspelled = [];
    for (const { word, index } of tokens) {
      if (/\p{N}/u.test(word)) continue;
      const capital = /^\p{Lu}/u.test(word);
      if (capital && (!starts.has(index) || inNameLine(index))) continue;
      if (word.length <= 4 && word === word.toUpperCase() && /\p{Lu}{2}/u.test(word)) continue;
      if (correct(word)) continue;
      misspelled.push({ word, index, suggestions: misspelled.length < MAX_SUGGESTED_WORDS ? suggest(word) : [] });
    }
    return { misspelled, rate: tokens.length ? misspelled.length / tokens.length : 0, words: tokens.length };
  }

  return { correct, suggest, check };
}
