// Letter-scoring model (task 27, 06 §4): the logistic-regression trainer and the committed model.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { standardizer, standardize, fit, train, probability, metrics, crossValidate } from '../../tools/letter-model/logreg.mjs';
import { run, REQUIRED_SIGNS } from '../../tools/letter-model/train.mjs';
import { extractFeatures, FEATURE_NAMES } from '../../app/src/letters/features.js';
import { createSpeller } from '../../app/src/letters/spell.js';
import { SAMPLE_LETTERS } from '../../app/src/dev/sampleLetters.js';

const model = JSON.parse(fs.readFileSync(new URL('../../app/src/letters/model.json', import.meta.url), 'utf8'));
const dict = (f) => fs.readFileSync(new URL(`../../app/vendor/dictionary-en/${f}`, import.meta.url), 'utf8');
const speller = createSpeller({ aff: dict('index.aff'), dic: dict('index.dic') });

// A tiny separable set: label = first feature > 0.5; the second feature is noise.
const X = [[0.1, 3], [0.2, 1], [0.3, 2], [0.4, 5], [0.6, 2], [0.7, 4], [0.8, 1], [0.9, 3], [0.15, 2], [0.85, 2]];
const y = X.map(([a]) => (a > 0.5 ? 1 : 0));

test('standardizer gives mean 0 / std 1 columns and guards constant columns', () => {
  const sc = standardizer([[1, 5], [3, 5]]);
  assert.deepEqual(sc.mean, [2, 5]);
  assert.deepEqual(sc.std, [1, 1]);
  assert.deepEqual(standardize([3, 5], sc), [1, 0]);
});

test('fit is deterministic and learns a separable rule', () => {
  const a = train(X, y);
  const b = train(X, y);
  assert.deepEqual(a, b);
  assert.ok(a.weights[0] > 0, 'the informative feature gets a positive weight');
  assert.ok(Math.abs(a.weights[1]) < a.weights[0], 'the noise feature stays small');
  assert.equal(metrics(X.map((x) => probability(x, a)), y).accuracy, 1);
});

test('L2 shrinks weights', () => {
  const Z = X.map((r) => standardize(r, standardizer(X)));
  const loose = fit(Z, y, { lambda: 0.001 });
  const tight = fit(Z, y, { lambda: 1 });
  assert.ok(Math.abs(tight.weights[0]) < Math.abs(loose.weights[0]));
});

test('metrics: accuracy and log-loss', () => {
  const m = metrics([0.9, 0.2, 0.6], [1, 0, 0]);
  assert.equal(m.accuracy, 2 / 3);
  assert.ok(Math.abs(m.logloss - -(Math.log(0.9) + Math.log(0.8) + Math.log(0.4)) / 3) < 1e-12);
});

test('crossValidate is seeded and every fold sees both labels', () => {
  const a = crossValidate(X, y, { k: 5 });
  const b = crossValidate(X, y, { k: 5 });
  assert.deepEqual(a, b);
  assert.equal(a.folds.length, 5);
  assert.ok(a.accuracy >= 0.8);
});

test('model.json matches FEATURE_NAMES and passes the 06 §4 acceptance bar', () => {
  assert.deepEqual(model.features, FEATURE_NAMES);
  for (const k of ['mean', 'std', 'weights']) assert.equal(model[k].length, FEATURE_NAMES.length, k);
  assert.ok(model.std.every((s) => s > 0));
  assert.equal(typeof model.bias, 'number');
  assert.match(model.version, /^letters-lr-[0-9a-f]{8}$/);
  assert.ok(model.cv.accuracy >= 0.8, `CV accuracy ${model.cv.accuracy}`);
  for (const [f, sign] of Object.entries(REQUIRED_SIGNS)) {
    assert.equal(Math.sign(model.weights[FEATURE_NAMES.indexOf(f)]), sign, `${f} sign`);
  }
});

test('retraining the corpus reproduces the committed model exactly', () => {
  const { ok, model: fresh } = run({ write: false, log: () => {} });
  assert.ok(ok);
  const strip = ({ trainedAt, ...rest }) => rest;
  assert.deepEqual(strip(fresh), strip(model), 'model.json is stale: run npm run train:letters');
});

test('the dev sample letters score as likely; a text-speak rant does not', () => {
  const p = (text, type) => probability(extractFeatures(text, type, { speller }).vector, model);
  for (const [type, text] of Object.entries(SAMPLE_LETTERS)) assert.ok(p(text, type) > 0.7, `${type} ${p(text, type)}`);
  const rant = 'hey\ni want the apartment its really nice and i would of taken it alot sooner but my mom said no lol. '
    + 'u should give it to me becuase im a good person and i promise i will pay u on time   i think. PLEASE PICK ME NOW!!!';
  assert.ok(p(rant, 'rental-cover') < 0.2);
});
