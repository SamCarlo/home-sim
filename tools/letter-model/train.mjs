#!/usr/bin/env node
// Train the letter-scoring model (06 §4): corpus/<type>.json → app/src/letters/model.json.
// Uses the same extractFeatures as the game, so training and scoring can't drift apart. Deterministic: same corpus →
// same weights. Writes nothing (exit 1) if CV accuracy < 0.80 or a required weight sign is backwards; fix the corpus.
//   npm run train:letters            train, report, write model.json
//   node tools/letter-model/train.mjs --dry   report only
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFeatures, FEATURE_NAMES } from '../../app/src/letters/features.js';
import { createSpeller } from '../../app/src/letters/spell.js';
import { LETTER_TYPE_IDS } from '../../app/src/letters/types.js';
import { hashString } from '../../app/src/util/rng.js';
import { DEFAULTS, train, crossValidate, probability, metrics } from './logreg.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(ROOT, 'app/src/letters/model.json');
const MIN_CV_ACCURACY = 0.8;

/** Required signs (06 §4 acceptance) and the ones we expect but only warn about. */
export const REQUIRED_SIGNS = { spellRate: -1, grammarPer100w: -1, sentiment: 1, hasGreeting: 1, hasClosing: 1, contentCoverage: 1 };
export const EXPECTED_SIGNS = { negSentenceRate: -1, politeness: 1, lengthFit: 1, sentenceLenFit: 1, textSpeak: -1, shouting: -1,
  exclaimRate: -1, paragraphs: 1 };

const r6 = (x) => Math.round(x * 1e6) / 1e6;
const fmt = (x, n = 3) => (x >= 0 ? ' ' : '') + x.toFixed(n);

function loadCorpus() {
  const letters = [];
  for (const type of LETTER_TYPE_IDS) {
    const file = path.join(HERE, 'corpus', `${type}.json`);
    for (const e of JSON.parse(fs.readFileSync(file, 'utf8'))) {
      if (e.type !== type || (e.label !== 0 && e.label !== 1) || !e.text) throw new Error(`${file}: bad entry ${e.id}`);
      letters.push(e);
    }
  }
  const ids = new Set(letters.map((e) => e.id));
  if (ids.size !== letters.length) throw new Error('duplicate corpus ids');
  return letters;
}

function loadSpeller() {
  const dict = (f) => fs.readFileSync(path.join(ROOT, 'app/vendor/dictionary-en', f), 'utf8');
  return createSpeller({ aff: dict('index.aff'), dic: dict('index.dic') });
}

export function run({ write = true, log = console.log } = {}) {
  const letters = loadCorpus();
  const speller = loadSpeller();
  const rows = letters.map((e) => ({ ...e, x: extractFeatures(e.text, e.type, { speller }).vector }));
  const tr = rows.filter((r) => r.split !== 'test');
  const te = rows.filter((r) => r.split === 'test');
  const X = tr.map((r) => r.x);
  const y = tr.map((r) => r.label);

  const cv = crossValidate(X, y, { k: 5 });
  const model = train(X, y);
  const test = metrics(te.map((r) => probability(r.x, model)), te.map((r) => r.label));
  const trainFit = metrics(X.map((x) => probability(x, model)), y);

  log(`corpus: ${rows.length} letters (${rows.filter((r) => r.label).length} labeled 1), train ${tr.length}, test ${te.length}`);
  log(`5-fold CV: accuracy ${cv.accuracy.toFixed(3)}, log-loss ${cv.logloss.toFixed(3)} `
    + `(folds ${cv.folds.map((f) => f.accuracy.toFixed(2)).join(' ')})`);
  log(`held-out test: accuracy ${test.accuracy.toFixed(3)}, log-loss ${test.logloss.toFixed(3)}`);
  log(`train fit: accuracy ${trainFit.accuracy.toFixed(3)}`);
  log('\nfeature            weight    mean     std   sign');
  const problems = [];
  FEATURE_NAMES.forEach((f, j) => {
    const w = model.weights[j];
    const need = REQUIRED_SIGNS[f] ?? EXPECTED_SIGNS[f];
    const ok = !need || Math.sign(w) === need;
    if (!ok && REQUIRED_SIGNS[f]) problems.push(`${f} weight ${w.toFixed(3)} has the wrong sign`);
    log(`${f.padEnd(17)} ${fmt(w)} ${fmt(model.mean[j]).padStart(7)} ${model.std[j].toFixed(3).padStart(7)}   `
      + `${need ? (ok ? 'ok' : (REQUIRED_SIGNS[f] ? 'WRONG' : 'warn')) : '-'}`);
  });
  log(`bias              ${fmt(model.bias)}`);

  const missed = rows.filter((r, i) => (probability(r.x, model) >= 0.5 ? 1 : 0) !== r.label);
  if (missed.length) log(`\nmisclassified by the final model: ${missed.map((r) => r.id).join(', ')}`);
  const cvMissed = tr.filter((r, i) => (cv.p[i] >= 0.5 ? 1 : 0) !== r.label);
  if (cvMissed.length) log(`misclassified in CV: ${cvMissed.map((r) => `${r.id} (${r.note.split(':')[0]})`).join(', ')}`);

  if (cv.accuracy < MIN_CV_ACCURACY) problems.push(`CV accuracy ${cv.accuracy.toFixed(3)} < ${MIN_CV_ACCURACY}`);
  const corpusHash = hashString(JSON.stringify([FEATURE_NAMES, letters, DEFAULTS])).toString(16).padStart(8, '0');
  const out = {
    version: `letters-lr-${corpusHash}`,
    trainedAt: new Date().toISOString(),
    features: FEATURE_NAMES,
    mean: model.mean.map(r6),
    std: model.std.map(r6),
    weights: model.weights.map(r6),
    bias: r6(model.bias),
    cv: { k: 5, accuracy: r6(cv.accuracy), logloss: r6(cv.logloss) },
    test: { accuracy: r6(test.accuracy), logloss: r6(test.logloss), n: te.length },
    corpus: { letters: rows.length, train: tr.length, positive: rows.filter((r) => r.label).length },
    hyper: DEFAULTS,
  };
  if (problems.length) {
    log(`\nNOT written: ${problems.join('; ')}. Improve the corpus, not the math.`);
    return { ok: false, model: out, problems };
  }
  if (write) {
    fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
    log(`\nwrote ${path.relative(ROOT, OUT)} (${out.version})`);
  }
  return { ok: true, model: out, problems };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { ok } = run({ write: !process.argv.includes('--dry') });
  process.exit(ok ? 0 : 1);
}
