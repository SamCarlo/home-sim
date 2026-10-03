// The water-and-feed minigame (09 §10, task 46). Pure: when each button appearance is visible in real time
// (`careWindows`), the `?care=` auto result, seeded on-screen spots, and the gentle summary lines (12 §7).
// The button itself lives in phases/life/careButton.js; finalizeMonth applies the care rate.
import { LIFE } from '../config.js';

/** The exact button text (09 §10). */
export const CARE_TEXT = 'Click here to water your plants and feed your animals!';
export const NEIGHBOR = 'Auntie Noe';

/**
 * Real-time windows for the appearances still to come. `items` [{index, gameMs}] (game time of each appearance),
 * `nowGameMs`, `monthGameMs` (the whole month), `rate` (game ms per real ms = speed × ?speed flag), `windowMs` (real ms
 * each stays up), `busyUntil` (real ms until the buttons already showing close). → [{index, start, end}] in real ms from
 * now, sorted. Each window is `windowMs` long and ends by the month's end when the month has room for one; when all of
 * them fit they don't overlap either. Recompute after any speed change (or every frame): that's the re-timing.
 */
export function careWindows({ items, nowGameMs = 0, monthGameMs, rate, windowMs, busyUntil = 0 }) {
  if (!(rate > 0) || !items.length) return [];
  const sorted = [...items].sort((a, b) => a.gameMs - b.gameMs);
  const monthEnd = Math.max(0, (monthGameMs - nowGameMs) / rate);
  const latest = Math.max(0, monthEnd - windowMs);
  const starts = sorted.map((it) => Math.min(latest, Math.max(0, (it.gameMs - nowGameMs) / rate)));
  if (sorted.length * windowMs <= monthEnd - busyUntil) {
    let free = busyUntil;
    for (let i = 0; i < starts.length; i++) { starts[i] = Math.max(starts[i], free); free = starts[i] + windowMs; }
    let cap = latest;
    for (let i = starts.length - 1; i >= 0; i--) { starts[i] = Math.min(starts[i], cap); cap = starts[i] - windowMs; }
  }
  return sorted.map((it, i) => ({ index: it.index, start: starts[i], end: starts[i] + windowMs }));
}

/** Real ms a button stays up: `LIFE.careWindowMs`, or `careWindowLongMs` with the "longer care window" setting. */
export function careWindowMs(settings = {}) {
  return settings.longCareWindow ? LIFE.careWindowLongMs : LIFE.careWindowMs;
}

/** `?care=hit|miss|half` → {shown, hits} for `count` appearances (half = exactly the survival rate), else null. */
export function careAutoResult(flag, count) {
  if (!count || !['hit', 'miss', 'half'].includes(flag)) return null;
  const hits = flag === 'hit' ? count : flag === 'miss' ? 0 : Math.ceil(count * LIFE.careSurviveRate);
  return { shown: count, hits };
}

/** Seeded spot for an appearance: {fx, fy} in 0..1 across the free part of the 3D view. `rng` = util/rng. */
export function careSpot(rng) {
  return { fx: rng.float(0, 1), fy: rng.float(0, 1) };
}

const plural = (n, one, many) => (n === 1 ? one : many);

/**
 * The care lines for the month summary (09 §10, 12 §7): kind, never about death or injury. `home` after
 * finalizeMonth, `result` = current.result, `needed` = plan.care.needed. → [{kind 'kept'|'wilted'|'neighbor'|'tip', text}].
 */
export function careNotes(home, result, needed) {
  const mi = result.monthIndex;
  if (!needed) return [{ kind: 'tip', text: 'Plants and pets make a home feel alive, and they’re good for your mental health.' }];
  const wilted = (home?.plants ?? []).filter((p) => p.alive === false && p.diedMonth === mi);
  const left = (home?.animals ?? []).filter((a) => a.present === false && a.leftMonth === mi);
  const out = [];
  if (result.careRate !== null && result.careRate !== undefined) {
    const pct = Math.round(result.careRate * 100);
    out.push({ kind: 'rate', text: `You watered and fed ${pct}% of the times you were asked.` });
  }
  if (!wilted.length && !left.length) {
    out.push({ kind: 'kept', text: 'Your plants and animals are happy and healthy. Taking care of them is good for you too.' });
    return out;
  }
  if (wilted.length) {
    out.push({ kind: 'wilted', text: `Your ${plural(wilted.length, 'plant', 'plants')} wilted without enough water. `
      + 'You can replant any month with the home & garden question.' });
  }
  const hens = left.filter((a) => a.kind === 'chicken');
  const others = left.filter((a) => a.kind !== 'chicken');
  const after = 'next door, who has more time for them. You can adopt again when you’re ready.';
  if (hens.length) out.push({ kind: 'neighbor', text: `Your ${plural(hens.length, 'chicken', 'chickens')} went to live with ${NEIGHBOR} ${after}` });
  for (const a of others) out.push({ kind: 'neighbor', text: `Your ${a.kind} ${a.name ?? ''}`.trim() + ` went to live with ${NEIGHBOR} ${after}` });
  return out;
}
