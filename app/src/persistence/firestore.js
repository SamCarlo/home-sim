// Firestore persistence adapter (11 §4, §6; task 51): saves/{uid} = { stateJson, version, updatedAt, saveCount }, plus
// players/{uid}.summary in the same batch when the save policy passes a summary (02 §5: phase changes, month ends).
// The policy (state/persistence.js) keeps at most one save in flight. Firestore's persistent cache queues writes while
// offline; a copy of every save also goes to localStorage, and on load a copy newer than the server's is pushed
// (last write wins, 11 §6). Same interface as local.js plus remote, stash, takePendingPush, forget.
import { STORAGE_PREFIX } from '../config.js';
import { STATE_VERSION } from '../state/schema.js';

/** localStorage key for the conflict-check copy of a uid's last save. */
export const copyKey = (uid) => `${STORAGE_PREFIX}cloudcopy:${uid}`;

/** Rules cap stateJson below 900,000 characters (11 §5). */
export const MAX_STATE_JSON = 899999;

/**
 * Pick what to load (pure): the local copy when it's newer than the server's save (a flush that never synced),
 * otherwise the server's. server = saves doc data or null; copy = {updatedAt, state} or null.
 * Returns { source: 'server' | 'copy' | 'none', state }.
 */
export function pickNewer(server, copy) {
  const serverAt = Number.isFinite(server?.updatedAt) ? server.updatedAt : -Infinity;
  if (copy?.state && Number.isFinite(copy.updatedAt) && copy.updatedAt > serverAt) return { source: 'copy', state: copy.state };
  if (server?.stateJson) return { source: 'server', state: JSON.parse(server.stateJson) };
  return { source: 'none', state: null };
}

/** Build the saves/{uid} document for a state (pure). */
export function saveDoc(state, now) {
  return {
    stateJson: JSON.stringify(state),
    version: Number.isFinite(state?.version) ? state.version : STATE_VERSION,
    updatedAt: now,
    saveCount: state?.meta?.saveCount ?? 0,
  };
}

/**
 * Create the adapter. opts: db (Firestore instance from the account provider), firestore (the firebase/firestore
 * module), storage (localStorage), now () → ms.
 */
export function createFirestoreAdapter({ db, firestore, storage = globalThis.localStorage, now = () => Date.now() }) {
  const { doc, getDoc, writeBatch } = firestore;
  const stats = { commits: 0, docWrites: 0 };
  let pendingPush = false;

  const readCopy = (uid) => {
    try { return JSON.parse(storage?.getItem(copyKey(uid)) ?? 'null'); } catch { return null; }
  };
  const writeCopy = (uid, state, at) => {
    try { storage?.setItem(copyKey(uid), JSON.stringify({ updatedAt: at, state })); } catch (err) {
      console.warn('local save copy not written', err?.name || err); // quota on a shared Chromebook: the server copy still counts
    }
  };

  return {
    kind: 'firestore',
    remote: true,
    stats,

    /** Read saves/{uid} (from the cache when offline) and the local copy; a newer local copy wins and is pushed later. */
    async load(uid) {
      let server = null;
      try {
        const snap = await getDoc(doc(db, 'saves', uid));
        server = snap.exists() ? snap.data() : null;
      } catch (err) {
        if (err?.code !== 'unavailable') throw err;
        console.warn('save not reachable; using the local copy', err.code);
      }
      let picked;
      try { picked = pickNewer(server, readCopy(uid)); } catch { throw new Error('This save file is damaged and could not be read.'); }
      pendingPush = picked.source === 'copy';
      return picked.state;
    },

    /** Write the local copy, then one batch: saves/{uid}, and players/{uid}.summary when a summary is given. */
    async save(uid, state, summary) {
      const at = now();
      writeCopy(uid, state, at);
      const data = saveDoc(state, at);
      if (data.stateJson.length > MAX_STATE_JSON) return { ok: false, code: 'too-big', message: 'This save is too big.' };
      const batch = writeBatch(db);
      batch.set(doc(db, 'saves', uid), data);
      if (summary) batch.update(doc(db, 'players', uid), { summary: { ...summary, updatedAt: at }, updatedAt: at });
      await batch.commit(); // resolves when the server acknowledges; offline it waits in the persistent cache
      stats.commits++;
      stats.docWrites += summary ? 2 : 1;
      return { ok: true };
    },

    /** Keep the newest state in the local copy while a write is still in flight (called by the save policy). */
    stash(uid, state) { writeCopy(uid, state, now()); },

    /** True once after load picked the local copy, so the caller pushes it with a checkpoint. */
    takePendingPush() { const p = pendingPush; pendingPush = false; return p; },

    /** Drop the local copy (logout with everything synced, so a shared device keeps nothing). */
    forget(uid) { try { storage?.removeItem(copyKey(uid)); } catch { /* ignore */ } },
  };
}
