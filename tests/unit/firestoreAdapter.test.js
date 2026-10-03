// persistence/firestore.js with a fake firebase/firestore module, and the save policy with a remote adapter (task 51).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreAdapter, pickNewer, saveDoc, copyKey, MAX_STATE_JSON } from '../../app/src/persistence/firestore.js';
import { attach, summaryKeyFor } from '../../app/src/state/persistence.js';
import { createStore } from '../../app/src/state/store.js';
import { createInitialState, STATE_VERSION } from '../../app/src/state/schema.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const tick = () => new Promise((r) => setImmediate(r));

/** Fake firestore module: docs in a Map; commit() waits on `gate` when set (an offline write). */
function fakeFirestore() {
  const docs = new Map();
  const commits = [];
  const fs = {
    docs, commits, gate: null,
    doc: (_db, col, id) => `${col}/${id}`,
    getDoc: async (path) => ({ exists: () => docs.has(path), data: () => docs.get(path) }),
    writeBatch: () => {
      const ops = [];
      return {
        set: (path, data) => ops.push({ op: 'set', path, data }),
        update: (path, data) => ops.push({ op: 'update', path, data }),
        async commit() {
          if (fs.gate) await fs.gate;
          for (const o of ops) docs.set(o.path, o.op === 'set' ? o.data : { ...docs.get(o.path), ...o.data });
          commits.push(ops);
        },
      };
    },
  };
  return fs;
}

test('pickNewer: newer local copy wins, otherwise the server, otherwise nothing', () => {
  const server = { stateJson: JSON.stringify({ from: 'server' }), updatedAt: 100 };
  assert.deepEqual(pickNewer(server, { updatedAt: 200, state: { from: 'copy' } }), { source: 'copy', state: { from: 'copy' } });
  assert.deepEqual(pickNewer(server, { updatedAt: 100, state: { from: 'copy' } }), { source: 'server', state: { from: 'server' } });
  assert.deepEqual(pickNewer(server, null), { source: 'server', state: { from: 'server' } });
  assert.deepEqual(pickNewer(null, { updatedAt: 1, state: { from: 'copy' } }), { source: 'copy', state: { from: 'copy' } });
  assert.deepEqual(pickNewer(null, null), { source: 'none', state: null });
});

test('saveDoc has exactly the four rule-checked keys', () => {
  const d = saveDoc({ version: STATE_VERSION, meta: { saveCount: 7 } }, 123);
  assert.deepEqual(Object.keys(d).sort(), ['saveCount', 'stateJson', 'updatedAt', 'version']);
  assert.deepEqual([d.version, d.updatedAt, d.saveCount], [STATE_VERSION, 123, 7]);
});

test('save: one batch, summary only when given, local copy kept; too big is refused before writing', async () => {
  const fs = fakeFirestore();
  const storage = memStorage();
  let t = 0;
  const a = createFirestoreAdapter({ db: {}, firestore: fs, storage, now: () => ++t });
  const s = createInitialState({ uid: 'u1', username: 'kai', now: 0 });
  await a.save('u1', s, { phase: 'intake' });
  await a.save('u1', s, null);
  assert.deepEqual(fs.commits.map((ops) => ops.map((o) => o.path)), [['saves/u1', 'players/u1'], ['saves/u1']]);
  assert.deepEqual(fs.commits[0][1].data, { summary: { phase: 'intake', updatedAt: 1 }, updatedAt: 1 });
  assert.equal(JSON.parse(storage.getItem(copyKey('u1'))).updatedAt, 2);
  assert.deepEqual(a.stats, { commits: 2, docWrites: 3 });
  const big = { ...s, pad: 'x'.repeat(MAX_STATE_JSON) };
  assert.equal((await a.save('u1', big, null)).code, 'too-big');
  assert.equal(fs.commits.length, 2);
});

test('policy + remote adapter: offline status, one write in flight, stash keeps the newest state, then sync', async () => {
  const fs = fakeFirestore();
  const storage = memStorage();
  const adapter = createFirestoreAdapter({ db: {}, firestore: fs, storage, now: () => Date.now() });
  const store = createStore(createInitialState({ uid: 'u1', username: 'kai', now: 0 }));
  let online = true;
  const events = new EventTarget();
  const p = attach(store, adapter, { uid: 'u1', events, isOnline: () => online, checkpointMinGapMs: 0 });
  await p.saveNow('account-created');
  assert.equal(p.status.get(), 'saved');

  let release;
  fs.gate = new Promise((r) => { release = r; });
  online = false;
  events.dispatchEvent(new Event('offline'));
  assert.equal(p.status.get(), 'offline');
  store.update((s) => { s.player.jobTitle = 'first'; }, { checkpoint: 'a' });
  await tick();
  store.update((s) => { s.player.jobTitle = 'second'; }, { checkpoint: 'b' });
  const flushed = p.flush();
  await tick();
  assert.equal(p.status.get(), 'offline');
  assert.equal(fs.commits.length, 1, 'the second write waits for the first');
  assert.equal(JSON.parse(storage.getItem(copyKey('u1'))).state.player.jobTitle, 'second', 'stashed while in flight');

  online = true;
  fs.gate = null;
  events.dispatchEvent(new Event('online'));
  release();
  await flushed; // flush waits for the follow-up save too
  assert.equal(p.status.get(), 'saved');
  assert.equal(JSON.parse(fs.docs.get('saves/u1').stateJson).player.jobTitle, 'second');
  p.detach();
});

test('summarized: a save loaded from the server skips the summary until the phase or month changes', async () => {
  const fs = fakeFirestore();
  const adapter = createFirestoreAdapter({ db: {}, firestore: fs, storage: memStorage() });
  const store = createStore(createInitialState({ uid: 'u1', username: 'kai', now: 0 }));
  const p = attach(store, adapter, { uid: 'u1', events: null, summarized: true, checkpointMinGapMs: 0 });
  await p.saveNow('x');
  store.update((s) => { s.phase = 'plan'; }, { checkpoint: 'phase' });
  await p.flush();
  assert.deepEqual(fs.commits.map((ops) => ops.length), [1, 2]);
  assert.equal(summaryKeyFor(store.getState()), 'plan|0');
  p.detach();
});

test('load: a newer local copy is returned once flagged for a push; forget drops it', async () => {
  const fs = fakeFirestore();
  const storage = memStorage();
  const a = createFirestoreAdapter({ db: {}, firestore: fs, storage });
  fs.docs.set('saves/u1', { stateJson: '{"n":1}', updatedAt: 10 });
  storage.setItem(copyKey('u1'), JSON.stringify({ updatedAt: 20, state: { n: 2 } }));
  assert.deepEqual(await a.load('u1'), { n: 2 });
  assert.equal(a.takePendingPush(), true);
  a.forget('u1');
  assert.deepEqual(await a.load('u1'), { n: 1 });
  assert.equal(a.takePendingPush(), false);
});
