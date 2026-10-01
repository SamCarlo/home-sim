// Seeded randomness (01 §4). Pure module: game logic never calls Math.random().
// Seeds come from seedFor(state.meta.seed, purpose, index); the PRNG is mulberry32.

/** 32-bit FNV-1a hash of a string → unsigned integer. */
export function hashString(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Combine any number of parts (numbers or strings) into one unsigned 32-bit seed. */
export function seedFor(...parts) {
  return hashString(parts.map((p) => String(p)).join('|'));
}

/**
 * Create a seeded generator. Returns { next, int, float, chance, pick, shuffle, normal }.
 * next() → [0, 1); int(min, max) inclusive; float(min, max); chance(p); pick(arr);
 * shuffle(arr) → a new shuffled copy; normal(mean = 0, sd = 1) via Box–Muller.
 */
export function createRng(seed) {
  let a = (Number(seed) >>> 0) || 0x9e3779b9;
  let spare = null;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const float = (min = 0, max = 1) => min + next() * (max - min);
  const chance = (p) => next() < p;
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const normal = (mean = 0, sd = 1) => {
    if (spare !== null) { const z = spare; spare = null; return mean + sd * z; }
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return mean + sd * r * Math.cos(2 * Math.PI * v);
  };
  return { next, int, float, chance, pick, shuffle, normal };
}
