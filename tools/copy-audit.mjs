#!/usr/bin/env node
// Copy audit (12 §1, §5, §6; task 55). Pulls the string literals out of the student-facing source files and checks:
//   1. Hawaiian spelling: no Hawaii / Hawai'i / Oahu / Pahoa / lanai … in UI text (ids like 'lanai' are fine).
//   2. Readability: Flesch–Kincaid grade of the sentence-like strings, pooled (word-weighted), must be ≤ TARGET.
// Usage: node tools/copy-audit.mjs [--quiet] [--worst N]. Exit 1 on a spelling hit or a grade over the target.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 7;
const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const worstN = Number(args[args.indexOf('--worst') + 1]) || 15;

// Student-facing code. dev/ (fixtures), admin/ (teacher), three/ (no text), accounts/ (errors only) and the letter
// checker's internals stay out; letters/types.js (prompts and tips) is in.
const SKIP_DIRS = ['app/src/dev', 'app/src/admin', 'app/src/three', 'app/src/persistence', 'app/src/state'];
const SKIP_FILES = ['app/src/letters/allowlist.js', 'app/src/letters/text.js', 'app/src/letters/grammar.js',
  'app/src/letters/spell.js', 'app/src/letters/features.js', 'app/src/data/validate.js', 'app/src/data/sanity.js',
  'app/src/firebase-config.js'];

/** Every .js file under app/src that the audit covers. */
export function auditFiles(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      const rel = path.relative(root, p);
      if (e.isDirectory()) { if (!SKIP_DIRS.includes(rel)) walk(p); } else if (e.name.endsWith('.js') && !SKIP_FILES.includes(rel)) out.push(rel);
    }
  };
  walk(path.join(root, 'app/src'));
  return out.sort();
}

/** String literals in JS source → [{text, line}]. Comments and regex literals are skipped; `${…}` becomes "X";
 * literals joined with + are merged into one. */
export function extractStrings(src) {
  const out = [];
  let i = 0, line = 1, prevSig = '', lastEnd = -1;
  const n = src.length;
  const push = (text, startLine, start) => {
    const between = lastEnd >= 0 ? src.slice(lastEnd, start) : null;
    if (between !== null && /^\s*\+\s*$/.test(between) && out.length) out[out.length - 1].text += text;
    else out.push({ text, line: startLine });
  };
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; line += (src.slice(i, end).match(/\n/g) || []).length; i = end; continue; }
    if (c === '/' && (prevSig === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prevSig) || /\b(return|typeof|case)$/.test(src.slice(Math.max(0, i - 7), i).trim()))) {
      i++; let cls = false;
      while (i < n && src[i] !== '\n') { if (src[i] === '\\') i += 2; else { if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; else if (src[i] === '/' && !cls) break; i++; } }
      i++; while (/[a-z]/.test(src[i] || '')) i++;
      prevSig = ')'; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const start = i, startLine = line;
      let text = '';
      i++;
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') { const nx = src[i + 1]; text += nx === 'n' ? ' ' : nx; i += 2; continue; }
        if (c === '`' && src[i] === '$' && src[i + 1] === '{') {
          let depth = 1; i += 2;
          while (i < n && depth) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; else if (src[i] === '\n') line++; i++; }
          text += 'X'; continue;
        }
        if (src[i] === '\n') line++;
        text += src[i]; i++;
      }
      i++;
      push(text, startLine, start);
      lastEnd = i; prevSig = c; continue;
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return out;
}

// ── 1. Hawaiian spelling ──
const BAD_SPELLINGS = [
  [/\bHawaii\b/, 'Hawaiʻi'], [/Hawai['‘’`]i/, 'Hawaiʻi'], [/\bO['‘’`]?ahu\b/, 'Oʻahu'], [/\bPahoa\b/, 'Pāhoa'],
  [/\bKilauea\b/, 'Kīlauea'], [/\bWaiakea\b/, 'Waiākea'], [/\bLeahi\b/, 'Lēʻahi'], [/\bKaneohe\b/, 'Kāneʻohe'],
  [/\bKaimuki\b/, 'Kaimukī'], [/\b[Ll]anai\b/, 'lānai'], [/(^|[^ʻ\w])['‘’`]?[Oo]hana\b/, 'ʻohana'], [/\b[Mm]alama\b/, 'mālama'],
  [/(^|[^ʻ\w])['‘’`]?[Aa]ina\b/, 'ʻāina'], [/(^|[^ʻ\w])['‘’`]?[Oo]hia\b/, 'ʻōhiʻa'], [/(^|[^ʻ\w])['‘’`]?[Uu]lu\b/, 'ʻulu'],
  [/\bKailua Kona\b/, 'Kailua-Kona'],
];
// Strings that are identifiers, CSS or keyword lists for matching what students type (they may skip the marks).
const isCodeLike = (t) => /^[a-z0-9_:.\/-]*$/i.test(t) && !/\s/.test(t);
const TYPED_KEYWORDS = new Set(['malama']);

/** Hawaiian spelling problems in a list of extracted strings → [{line, text, fix}]. */
export function spellingHits(strings) {
  const hits = [];
  for (const s of strings) {
    if (isCodeLike(s.text) && !/^[A-Z]/.test(s.text)) continue;
    if (TYPED_KEYWORDS.has(s.text)) continue;
    for (const [re, fix] of BAD_SPELLINGS) if (re.test(s.text)) hits.push({ line: s.line, text: s.text, fix });
  }
  return hits;
}

// ── 2. Readability ──
const WORD_RE = /[A-Za-zÀ-ɏʻ’'-]+|\$?\d[\d,.]*%?/g;

/** Rough English syllable count (the usual vowel-group heuristic; kahakō and ʻokina folded away). */
export function syllables(word) {
  if (/\d/.test(word)) return 2;
  let w = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) || []).length);
}

/** {words, sentences, syllables} for a piece of text. */
export function counts(text) {
  const clean = text.replace(/<[^>]+>/g, ' ');
  const words = clean.match(WORD_RE) || [];
  const sentences = Math.max(1, clean.split(/[.!?]+(?:[)"”’]*)(?:\s+|$)/).filter((x) => /[A-Za-z]/.test(x)).length);
  return { words: words.length, sentences, syllables: words.reduce((t, w) => t + syllables(w), 0) };
}

/** Flesch–Kincaid grade level. */
export const fkGrade = ({ words, sentences, syllables: syl }) => (words
  ? 0.39 * (words / sentences) + 11.8 * (syl / words) - 15.59 : 0);

/** A sentence-like UI string: at least 8 words, starts like a sentence, no code characters. */
export function isProse(text) {
  const t = text.replace(/<[^>]+>/g, ' ').trim();
  if (/[{};=<>#]|=>|\b(px|rgb|var\(|http)/.test(t)) return false;
  if (!/^[A-Z“"‘(ʻ$0-9]/.test(t) || !/[a-z]/.test(t)) return false;
  const words = t.match(WORD_RE) || [];
  const alpha = words.filter((w) => /^[A-Za-zÀ-ɏʻ’'-]{2,}$/.test(w)).length;
  return words.length >= 8 && alpha / words.length >= 0.6;
}

function main() {
  const spelling = [];
  const prose = [];
  for (const rel of auditFiles()) {
    const strings = extractStrings(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    for (const hit of spellingHits(strings)) spelling.push({ file: rel, ...hit });
    for (const s of strings) if (isProse(s.text)) prose.push({ file: rel, line: s.line, text: s.text, ...counts(s.text) });
  }
  const total = prose.reduce((t, p) => ({ words: t.words + p.words, sentences: t.sentences + p.sentences,
    syllables: t.syllables + p.syllables }), { words: 0, sentences: 0, syllables: 0 });
  const pooled = fkGrade(total);
  const mean = prose.reduce((t, p) => t + fkGrade(p), 0) / (prose.length || 1);
  const worst = prose.map((p) => ({ ...p, grade: fkGrade(p) })).sort((a, b) => b.grade - a.grade).slice(0, worstN);

  if (!quiet) {
    console.log(`Readability: ${prose.length} strings, ${total.words} words, ${total.sentences} sentences`);
    console.log(`  Flesch–Kincaid grade (pooled): ${pooled.toFixed(2)}   mean per string: ${mean.toFixed(2)}   target ≤ ${TARGET}`);
    console.log(`  Hardest ${worst.length}:`);
    for (const w of worst) console.log(`   ${w.grade.toFixed(1).padStart(5)}  ${w.file}:${w.line}  ${w.text.slice(0, 110)}`);
  }
  for (const s of spelling) console.log(`spelling: ${s.file}:${s.line} "${s.text.slice(0, 80)}" → use ${s.fix}`);
  const ok = !spelling.length && pooled <= TARGET;
  console.log(`copy-audit: ${ok ? 'OK' : 'FAIL'} (grade ${pooled.toFixed(2)} ≤ ${TARGET}${ok ? '' : '?'}, ${spelling.length} spelling hits)`);
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
