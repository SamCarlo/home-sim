// Letter text helpers (06 §3 step 1): normalization, lines, paragraphs, sentences and word tokens. Pure: no DOM.
// Every index points into normalizeText(text), which keeps the length of the NFC string (one char in → one char out),
// so spans from spell.js and grammar.js line up with the same normalized text.

const LETTER = /[\p{L}\p{M}]/u;
// Words that end in "." without ending the sentence ("Dear Ms. Kahale", "Dr. Ito", "St. Louis", "a.m.").
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'prof', 'mt', 'ave', 'rd', 'blvd', 'apt',
  'inc', 'co', 'corp', 'ltd', 'vs', 'etc', 'no', 'e.g', 'i.e', 'a.m', 'p.m', 'u.s', 'jan', 'feb', 'mar', 'apr', 'jun',
  'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec']);

/**
 * NFC, curly apostrophes → "'", and a curly or backtick quote between two letters → the ʻokina (Hawai‘i → Hawaiʻi).
 * Length-preserving after NFC.
 */
export function normalizeText(text) {
  const s = String(text ?? '').normalize('NFC').replace(/\r\n?/g, '\n');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '‘' || c === '`') {
      out += LETTER.test(s[i - 1] ?? '') && LETTER.test(s[i + 1] ?? '') ? 'ʻ' : "'";
    } else out += c === '’' || c === 'ʼ' ? "'" : c;
  }
  return out;
}

/** Lowercase lookup key that ignores the ʻokina, apostrophes and kahakō: "Pāhoa" / "Pahoa" → "pahoa". */
export function foldKey(word) {
  return String(word ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[ʻ'‘’`]/g, '').toLowerCase().normalize('NFC');
}

/** Word tokens `[{word, index}]`: letters, digits, the ʻokina and inner apostrophes/hyphens ("don't", "co-signer"). */
export function tokenize(text) {
  const s = normalizeText(text);
  const out = [];
  for (const m of s.matchAll(/[\p{L}\p{M}\p{N}ʻ'-]+/gu)) {
    let word = m[0];
    let index = m.index;
    const lead = word.match(/^['-]+/)?.[0].length ?? 0;
    word = word.slice(lead).replace(/['-]+$/, '');
    index += lead;
    if (/[\p{L}\p{N}]/u.test(word)) out.push({ word, index });
  }
  return out;
}

/** Non-empty lines `[{text, index, words}]` (a textarea newline is deliberate: greeting, body, closing, signature). */
export function splitLines(text) {
  const s = normalizeText(text);
  const out = [];
  let index = 0;
  for (const raw of s.split('\n')) {
    const lead = raw.length - raw.trimStart().length;
    const t = raw.trim();
    if (t) out.push({ text: t, index: index + lead, words: tokenize(t).length });
    index += raw.length + 1;
  }
  return out;
}

/** Paragraphs `[{text, index, words}]`, separated by blank lines. */
export function splitParagraphs(text) {
  const s = normalizeText(text);
  const out = [];
  const re = /\n[ \t]*\n/g;
  let start = 0;
  const push = (end) => {
    const raw = s.slice(start, end);
    const lead = raw.length - raw.trimStart().length;
    const t = raw.trim();
    if (t) out.push({ text: t, index: start + lead, words: tokenize(t).length });
  };
  for (const m of s.matchAll(re)) { push(m.index); start = m.index + m[0].length; }
  push(s.length);
  return out;
}

/**
 * Sentences `[{text, index, words, line, ended}]`: each line is split after `.!?` (plus closing quotes/brackets) that is
 * followed by whitespace or the end of the line, except after abbreviations ("Mr.", "Dr.", "a.m.") and single initials.
 * `ended` is false when the sentence has no end punctuation.
 */
export function splitSentences(text) {
  const out = [];
  splitLines(text).forEach((line, lineNo) => {
    const t = line.text;
    let start = 0;
    const push = (end) => {
      const raw = t.slice(start, end);
      const lead = raw.length - raw.trimStart().length;
      const st = raw.trim();
      if (st) {
        out.push({ text: st, index: line.index + start + lead, words: tokenize(st).length, line: lineNo,
          ended: /[.!?…]["')\]”]*$/.test(st) });
      }
    };
    for (const m of t.matchAll(/[.!?…]+["')\]”]*(?=\s|$)/g)) {
      if (m[0][0] === '.' && m[0].length === 1) {
        const before = t.slice(start, m.index).match(/([\p{L}.]+)$/u)?.[1] ?? '';
        if (ABBREVIATIONS.has(before.toLowerCase()) || (/^\p{Lu}$/u.test(before) && before !== 'I')) continue;
      }
      push(m.index + m[0].length);
      start = m.index + m[0].length;
    }
    push(t.length);
  });
  return out;
}
