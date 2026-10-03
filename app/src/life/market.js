// Market paths (10 §4, task 44). Pure: one seeded geometric-Brownian-motion path of daily multipliers per portfolio,
// v₀ = 1, vₖ₊₁ = vₖ · exp((μ − σ²/2)·Δt + σ·√Δt·Zₖ), Δt = (1/12) / days. All holdings of a portfolio share the path.
import { INVEST } from '../config.js';
import { createRng, seedFor } from '../util/rng.js';

/** The portfolio record for a key ('low' | 'medium' | 'high'). */
export const portfolio = (key) => INVEST.portfolios.find((p) => p.key === key);

/** One daily path: `days + 1` multipliers, index 0 = 1. `seed` feeds the Box–Muller normals. */
export function gbmPath({ mu, sigma }, days, seed) {
  const rng = createRng(seed);
  const dt = 1 / 12 / days;
  const drift = (mu - (sigma * sigma) / 2) * dt, vol = sigma * Math.sqrt(dt);
  const path = [1];
  for (let k = 0; k < days; k++) path.push(path[k] * Math.exp(drift + vol * rng.normal()));
  return path;
}

/**
 * Paths for every portfolio the student holds (`valueCents > 0`), seeded by seedFor(meta.seed, 'market', monthIndex,
 * key) → `{low?, medium?, high?}`, or null when nothing is invested.
 */
export function marketPaths(state, monthIndex, days) {
  const out = {};
  for (const p of INVEST.portfolios) {
    if ((state.finances?.investments?.[p.key]?.valueCents ?? 0) <= 0) continue;
    out[p.key] = gbmPath(p, days, seedFor(state.meta.seed, 'market', monthIndex, p.key));
  }
  return Object.keys(out).length ? out : null;
}
