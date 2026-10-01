import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashString, seedFor, createRng } from '../../app/src/util/rng.js';

test('hashString and seedFor are stable unsigned ints', () => {
  assert.equal(hashString('local-dev'), hashString('local-dev'));
  assert.notEqual(hashString('a'), hashString('b'));
  assert.ok(hashString('x') >= 0 && hashString('x') < 2 ** 32);
  assert.equal(seedFor(1, 'events', 3), seedFor(1, 'events', 3));
  assert.notEqual(seedFor(1, 'events', 3), seedFor(1, 'events', 4));
});

test('same seed → same sequence; different seed → different', () => {
  const a = createRng(42), b = createRng(42), c = createRng(43);
  const sa = Array.from({ length: 20 }, a.next), sb = Array.from({ length: 20 }, b.next);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, Array.from({ length: 20 }, c.next));
  assert.deepEqual(createRng(7).shuffle([1, 2, 3, 4, 5]), createRng(7).shuffle([1, 2, 3, 4, 5]));
});

test('rough distribution: uniform mean, int range, chance, normal', () => {
  const r = createRng(seedFor('dist'));
  const N = 20000;
  let sum = 0, hits = 0, nsum = 0, nsq = 0;
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    const x = r.next();
    assert.ok(x >= 0 && x < 1);
    sum += x;
    counts[r.int(1, 6) - 1]++;
    if (r.chance(0.3)) hits++;
    const z = r.normal(10, 2);
    nsum += z; nsq += z * z;
  }
  assert.ok(Math.abs(sum / N - 0.5) < 0.02);
  for (const c of counts) assert.ok(Math.abs(c / N - 1 / 6) < 0.02, `die face ${c}`);
  assert.ok(Math.abs(hits / N - 0.3) < 0.02);
  const mean = nsum / N, sd = Math.sqrt(nsq / N - mean * mean);
  assert.ok(Math.abs(mean - 10) < 0.1 && Math.abs(sd - 2) < 0.1, `normal ${mean} ${sd}`);
  assert.ok(['a', 'b'].includes(r.pick(['a', 'b'])));
});
