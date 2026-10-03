// The care minigame (09 §10, task 46): real-time windows, ?care= results, the 0.5 survival line, summary notes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds } from '../../app/src/dev/seeds.js';
import { LIFE } from '../../app/src/config.js';
import { startPlan, startLive, finishLive } from '../../app/src/life/monthFlow.js';
import { careWindows, careAutoResult, careWindowMs, careNotes, CARE_TEXT } from '../../app/src/life/care.js';

const NOW = Date.UTC(2026, 9, 2);
const items = (fractions, monthGameMs) => fractions.map((f, index) => ({ index, gameMs: f * monthGameMs }));
const FRACTIONS = Array.from({ length: LIFE.careAppearances }, (_, i) => (i + 0.5) / LIFE.careAppearances);

test('the button text is exact', () => {
  assert.equal(CARE_TEXT, 'Click here to water your plants and feed your animals!');
});

test('every window fits inside the month at every speed, for both window lengths and month lengths', () => {
  for (const days of [28, 30, 31]) {
    const monthGameMs = days * LIFE.dayMs;
    for (const speed of LIFE.speeds) {
      for (const longCareWindow of [false, true]) {
        const windowMs = careWindowMs({ longCareWindow });
        const w = careWindows({ items: items(FRACTIONS, monthGameMs), monthGameMs, rate: speed, windowMs });
        const monthReal = monthGameMs / speed;
        assert.equal(w.length, FRACTIONS.length);
        for (const x of w) {
          assert.ok(x.start >= 0 && x.end <= monthReal + 1e-9, `${days}d ${speed}× ${windowMs}ms: ${x.start}–${x.end} of ${monthReal}`);
          assert.equal(x.end - x.start, windowMs);
        }
        if (FRACTIONS.length * windowMs <= monthReal) {
          for (let i = 1; i < w.length; i++) assert.ok(w[i].start >= w[i - 1].end - 1e-9, 'no overlap when they all fit');
        }
      }
    }
  }
});

test('windows are real time: a faster speed brings them closer, and re-timing from mid-month keeps them in the month', () => {
  const monthGameMs = 31 * LIFE.dayMs;
  const one = careWindows({ items: [{ index: 3, gameMs: 15000 }], monthGameMs, rate: 1, windowMs: 2500 });
  const four = careWindows({ items: [{ index: 3, gameMs: 15000 }], monthGameMs, rate: 4, windowMs: 2500 });
  assert.equal(one[0].start, 15000);
  assert.equal(four[0].start, 3750);
  assert.equal(four[0].end - four[0].start, 2500);
  // Switch to 4× late in the month: the remaining appearance is pulled in so it still closes by the month's end.
  const late = careWindows({ items: [{ index: 7, gameMs: 36000 }], nowGameMs: 20000, monthGameMs, rate: 4, windowMs: 2500 });
  assert.ok(late[0].end <= (monthGameMs - 20000) / 4 + 1e-9);
  // A button already up pushes the next one after it.
  const busy = careWindows({ items: [{ index: 1, gameMs: 0 }], monthGameMs, rate: 1, windowMs: 2500, busyUntil: 2000 });
  assert.equal(busy[0].start, 2000);
  assert.deepEqual(careWindows({ items: [{ index: 0, gameMs: 10 }], monthGameMs, rate: 0, windowMs: 2500 }), []);
});

test('careWindowMs doubles with the longer-window setting', () => {
  assert.equal(careWindowMs({}), LIFE.careWindowMs);
  assert.equal(careWindowMs({ longCareWindow: true }), LIFE.careWindowLongMs);
  assert.equal(LIFE.careWindowLongMs, LIFE.careWindowMs * 2);
});

test('?care=hit|miss|half', () => {
  assert.deepEqual(careAutoResult('hit', 8), { shown: 8, hits: 8 });
  assert.deepEqual(careAutoResult('miss', 8), { shown: 8, hits: 0 });
  assert.deepEqual(careAutoResult('half', 8), { shown: 8, hits: 4 });
  assert.equal(careAutoResult('half', 0), null);
  assert.equal(careAutoResult(null, 8), null);
});

/** Run January for a seed with the given care counts; → {s, result}. */
function month(seedName, care) {
  const s = seeds[seedName].build(NOW);
  startPlan(s);
  startLive(s);
  s.life.current.care = care;
  return { s, result: finishLive(s) };
}

test('a care rate of exactly 0.5 keeps every plant and animal', () => {
  const { s, result } = month('life-month1-house', { shown: 8, hits: 4 });
  assert.equal(result.careRate, 0.5);
  assert.ok(s.home.plants.length + s.home.animals.length > 0, 'the seed has living things');
  assert.ok(s.home.plants.every((p) => p.alive !== false));
  assert.ok(s.home.animals.every((a) => a.present !== false));
  const notes = careNotes(s.home, result, true);
  assert.ok(notes.some((n) => n.kind === 'kept'));
});

test('a miss wilts plants and sends animals to a neighbor, with gentle notes', () => {
  const { s, result } = month('life-month1-house', { shown: 8, hits: 0 });
  assert.equal(result.careRate, 0);
  assert.ok(s.home.plants.every((p) => p.alive === false && p.diedMonth === 0));
  assert.ok(s.home.animals.every((a) => a.present === false && a.leftMonth === 0));
  const notes = careNotes(s.home, result, true);
  if (s.home.plants.length) assert.ok(notes.some((n) => n.kind === 'wilted'));
  if (s.home.animals.length) {
    const n = notes.find((x) => x.kind === 'neighbor');
    assert.match(n.text, /went to live with Auntie Noe next door, who has more time for them\. You can adopt again when you’re ready\./);
  }
  for (const n of notes) assert.doesNotMatch(n.text, /die|dead|death|hurt|starv/i);
});

test('no plants or animals → the tip', () => {
  const notes = careNotes({ plants: [], animals: [] }, { monthIndex: 0, careRate: null }, false);
  assert.equal(notes[0].text, 'Plants and pets make a home feel alive, and they’re good for your mental health.');
});
