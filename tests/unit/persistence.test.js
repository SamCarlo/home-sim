import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attach } from '../../app/src/state/persistence.js';
import { createStore } from '../../app/src/state/store.js';
import { createLocalAdapter, saveKey } from '../../app/src/persistence/local.js';
import { createInitialState } from '../../app/src/state/schema.js';

// Fake clock: timers fire when advance() passes their time.
function fakeClock() {
  let t = 0, id = 0;
  const timers = new Map();
  return {
    now: () => t,
    setTimeout: (fn, ms) => { timers.set(++id, { fn, at: t + ms }); return id; },
    clearTimeout: (i) => timers.delete(i),
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        const due = [...timers].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        t = due[1].at; timers.delete(due[0]); due[1].fn();
        await new Promise((r) => setImmediate(r));
      }
      t = end;
      await new Promise((r) => setImmediate(r));
    },
  };
}
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const tick = () => new Promise((r) => setImmediate(r));

function setup() {
  const clock = fakeClock();
  const store = createStore(createInitialState({ uid: 'u1', username: 'kai', now: 0 }), { now: clock.now });
  const writes = [];
  const adapter = { kind: 'mem', save: async (uid, state, summary) => { writes.push({ at: clock.now(), state, summary }); } };
  const events = new EventTarget();
  const p = attach(store, adapter, { uid: 'u1', clock, events });
  return { clock, store, writes, p, events };
}

test('checkpoints save right away but at least checkpointMinGapMs apart; newer replaces pending', async () => {
  const { clock, store, writes, p } = setup();
  store.update((s) => { s.phase = 'plan'; }, { checkpoint: 'a' });
  await tick();
  assert.equal(writes.length, 1);
  await clock.advance(1000);
  store.update((s) => { s.player.jobTitle = 'x'; }, { checkpoint: 'b' });
  store.update((s) => { s.player.jobTitle = 'y'; }, { checkpoint: 'c' });
  await tick();
  assert.equal(writes.length, 1);           // throttled
  await clock.advance(4000);                // 5 s after the first
  assert.equal(writes.length, 2);
  assert.equal(writes[1].at, 5000);
  assert.equal(writes[1].state.player.jobTitle, 'y');
  assert.equal(p.status.get(), 'saved');
});

test('drafts save at most once per draftIntervalMs', async () => {
  const { clock, store, writes } = setup();
  store.update((s) => { s.player.jobTitle = 'a'; }, { checkpoint: 'start' });
  await tick();
  for (let i = 0; i < 50; i++) { store.update((s) => { s.player.jobTitle = `t${i}`; }); await clock.advance(1000); }
  // 50 s of typing → the checkpoint at 0, then drafts at 30 s (and nothing else yet)
  assert.deepEqual(writes.map((w) => w.at), [0, 30000]);
  await clock.advance(30000);
  assert.equal(writes.length, 3);
  assert.equal(writes[2].state.player.jobTitle, 't49');
});

test('flush on pagehide and visibilitychange:hidden; summary only on phase/month change', async () => {
  const { clock, store, writes, events } = setup();
  store.update((s) => { s.player.jobTitle = 'a'; });
  await clock.advance(0);                    // first draft goes right away (nothing saved before)
  assert.equal(writes.length, 1);
  store.update((s) => { s.player.jobTitle = 'b'; });
  events.dispatchEvent(new Event('pagehide'));
  await tick();
  assert.equal(writes.length, 2);
  assert.equal(writes[1].state.player.jobTitle, 'b');
  store.update((s) => { s.player.jobTitle = 'c'; });
  events.visibilityState = 'hidden';
  events.dispatchEvent(new Event('visibilitychange'));
  await tick();
  assert.equal(writes.length, 3);
  assert.ok(writes[0].summary);              // first save writes the summary
  assert.equal(writes[1].summary, null);
  assert.equal(writes[2].summary, null);
  assert.equal(writes[2].state.meta.saveCount, 3);
});

test('local adapter: round trip, quota error → status error, not a throw', async () => {
  const storage = memStorage();
  const local = createLocalAdapter(storage);
  const s = createInitialState({ uid: 'u2', now: 0 });
  await local.save('u2', s, null);
  assert.ok(storage.m.has(saveKey('u2')));
  assert.deepEqual(await local.load('u2'), s);
  assert.equal(await local.load('nobody'), null);

  storage.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  assert.deepEqual((await local.save('u2', s, null)).code, 'quota');
  const store = createStore(s);
  const p = attach(store, local, { uid: 'u2', events: null });
  await p.saveNow('x');
  assert.equal(p.status.get(), 'error');
  p.detach();
});
