// Logistic regression for the letter model (06 §4): standardize, L2-regularized batch gradient descent, k-fold CV.
// Pure and deterministic: the only randomness is the seeded fold shuffle and the seeded tiny initial weights.
import { createRng } from '../../app/src/util/rng.js';

export const DEFAULTS = { lambda: 0.05, rate: 0.3, iterations: 3000, seed: 27 };

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const EPS = 1e-9;

/** Column means and standard deviations (population). A constant column gets std 1 so z stays 0. */
export function standardizer(X) {
  const n = X.length;
  const d = X[0].length;
  const mean = Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const std = mean.map((m, j) => Math.sqrt(X.reduce((s, r) => s + (r[j] - m) ** 2, 0) / n) || 1);
  return { mean, std };
}

/** Row → z-scores with the given mean/std. */
export const standardize = (row, { mean, std }) => row.map((x, j) => (x - mean[j]) / std[j]);

/** p = σ(w·z + b). */
export const predict = (z, { weights, bias }) => sigmoid(z.reduce((s, x, j) => s + x * weights[j], bias));

/**
 * Fit on standardized rows Z with labels y (0/1). Loss = mean log-loss + λ/2·‖w‖² (bias not penalized).
 * Full-batch gradient descent, fixed iteration count → identical output for identical input.
 */
export function fit(Z, y, opts = {}) {
  const { lambda, rate, iterations, seed } = { ...DEFAULTS, ...opts };
  const n = Z.length;
  const d = Z[0].length;
  const rng = createRng(seed);
  const weights = Array.from({ length: d }, () => (rng.next() - 0.5) * 0.01);
  let bias = 0;
  for (let it = 0; it < iterations; it++) {
    const gw = weights.map((w) => lambda * w);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      const err = predict(Z[i], { weights, bias }) - y[i];
      for (let j = 0; j < d; j++) gw[j] += (err * Z[i][j]) / n;
      gb += err / n;
    }
    for (let j = 0; j < d; j++) weights[j] -= rate * gw[j];
    bias -= rate * gb;
  }
  return { weights, bias };
}

/** Accuracy (threshold 0.5) and mean log-loss of probabilities p against labels y. */
export function metrics(p, y) {
  const n = y.length;
  const accuracy = p.filter((pi, i) => (pi >= 0.5 ? 1 : 0) === y[i]).length / n;
  const logloss = -p.reduce((s, pi, i) => s + (y[i] ? Math.log(Math.max(pi, EPS)) : Math.log(Math.max(1 - pi, EPS))), 0) / n;
  return { accuracy, logloss };
}

/** Standardize on X, fit, and return {mean, std, weights, bias}. */
export function train(X, y, opts = {}) {
  const sc = standardizer(X);
  return { ...sc, ...fit(X.map((r) => standardize(r, sc)), y, opts) };
}

/** Probability for a raw feature row under a trained model. */
export const probability = (row, model) => predict(standardize(row, model), model);

/**
 * Stratified k-fold CV: positives and negatives are shuffled (seeded) and dealt round-robin into k folds, so every
 * fold has both labels. Each fold standardizes on its own training part. → {accuracy, logloss, folds[]}.
 */
export function crossValidate(X, y, { k = 5, ...opts } = {}) {
  const { seed } = { ...DEFAULTS, ...opts };
  const rng = createRng(seed + 1);
  const fold = new Array(y.length);
  let next = 0;
  for (const label of [1, 0]) {
    for (const i of rng.shuffle(y.map((v, idx) => (v === label ? idx : -1)).filter((idx) => idx >= 0))) fold[i] = next++ % k;
  }
  const p = new Array(y.length);
  const folds = [];
  for (let f = 0; f < k; f++) {
    const tr = y.map((_, i) => i).filter((i) => fold[i] !== f);
    const te = y.map((_, i) => i).filter((i) => fold[i] === f);
    const model = train(tr.map((i) => X[i]), tr.map((i) => y[i]), opts);
    for (const i of te) p[i] = probability(X[i], model);
    folds.push(metrics(te.map((i) => p[i]), te.map((i) => y[i])));
  }
  return { ...metrics(p, y), folds, p };
}
