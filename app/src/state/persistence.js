// Save policy (01 §6, 02 §4): checkpoints right away (≥ checkpointMinGapMs apart), drafts at most once per
// draftIntervalMs, flush on hide/close. Exposes a status observable: saved | saving | offline | error.
// Clock and event target are injectable so tests can drive it without timers or a DOM. A remote adapter (Firestore,
// task 51) also gets "offline" while the network is down, and stash(uid, state) for changes made while a write waits.
import { SAVE } from '../config.js';
import { summarize } from './summary.js';

/** Tiny observable value: { get(), set(v), subscribe(cb) → unsubscribe } (cb runs immediately). */
export function observable(initial) {
  let value = initial;
  const subs = new Set();
  return {
    get: () => value,
    set(v) { if (v === value) return; value = v; for (const cb of [...subs]) cb(v); },
    subscribe(cb) { subs.add(cb); cb(value); return () => subs.delete(cb); },
  };
}

const realClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};

/** The key that decides when a summary is due (02 §5: phase changes and month ends). */
export const summaryKeyFor = (state) => `${state?.phase}|${state?.life?.monthIndex ?? 0}`;

/**
 * Hook autosave onto a store. Returns { status, flush(), saveNow(reason), detach(), stats }.
 * opts: uid, clock {now, setTimeout, clearTimeout}, events (EventTarget-ish with addEventListener; null = none),
 * isOnline () → bool, draftIntervalMs, checkpointMinGapMs, summarized (the starting state's summary is already stored,
 * e.g. a save loaded from the server, so the first save skips it).
 */
export function attach(store, adapter, opts = {}) {
  const {
    uid,
    clock = realClock,
    events = typeof window !== 'undefined' ? window : null,
    isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    draftIntervalMs = SAVE.draftIntervalMs,
    checkpointMinGapMs = SAVE.checkpointMinGapMs,
    summarized = false,
  } = opts;
  const remote = adapter.remote === true;
  const busyStatus = () => (remote && !isOnline() ? 'offline' : 'saving');
  const status = observable('saved');
  const stats = { saves: 0, checkpoints: 0, drafts: 0, summaries: 0 };
  let lastCheckpointAt = -Infinity;
  let lastSaveAt = -Infinity;
  let dirty = false;
  let timer = null;          // pending save (draft or throttled checkpoint)
  let timerKind = null;      // 'draft' | 'checkpoint'
  let pendingReason = null;
  let inFlight = null;       // the one adapter.save in flight
  let chain = null;          // resolves after inFlight and any follow-up save it triggers (what flush() waits for)
  let again = false;
  let lastSummaryKey = summarized ? summaryKeyFor(store.getState()) : null;
  let saveCount = store.getState()?.meta?.saveCount ?? 0;

  const cancel = () => { if (timer !== null) clock.clearTimeout(timer); timer = null; timerKind = null; };
  const schedule = (kind, delay) => { cancel(); timerKind = kind; timer = clock.setTimeout(() => { timer = null; timerKind = null; run(kind); }, Math.max(0, delay)); };

  function run(kind) {
    if (kind === 'checkpoint') { lastCheckpointAt = clock.now(); stats.checkpoints++; pendingReason = null; } else stats.drafts++;
    return doSave();
  }

  function doSave() {
    if (inFlight) {
      again = true;
      if (adapter.stash) { const s = store.getState(); adapter.stash(uid, { ...s, meta: { ...s.meta, saveCount } }); }
      return chain;
    }
    cancel();
    dirty = false;
    lastSaveAt = clock.now();
    const state = store.getState();
    saveCount++;
    const doc = { ...state, meta: { ...state.meta, saveCount } };
    const key = summaryKeyFor(doc);
    const summary = key !== lastSummaryKey ? summarize(doc) : null;
    status.set(busyStatus());
    inFlight = (async () => {
      try {
        const res = await adapter.save(uid, doc, summary);
        if (res && res.ok === false) throw Object.assign(new Error(res.message || 'save failed'), { code: res.code });
        stats.saves++;
        if (summary) { lastSummaryKey = key; stats.summaries++; }
        status.set(dirty ? busyStatus() : 'saved');
      } catch (err) {
        dirty = true;
        status.set(isOnline() ? 'error' : 'offline');
        if (err?.code !== 'quota') console.warn('save failed', err);
      }
    })();
    chain = (async () => {
      await inFlight;
      inFlight = null;
      if (again) { again = false; await doSave(); }
    })();
    return chain;
  }

  const unsubscribe = store.subscribe((_state, info = {}) => {
    dirty = true;
    const now = clock.now();
    if (info.checkpoint) {
      pendingReason = info.checkpoint;
      const wait = lastCheckpointAt + checkpointMinGapMs - now;
      if (wait <= 0) { cancel(); run('checkpoint'); } else { schedule('checkpoint', wait); status.set(busyStatus()); } // newer replaces pending
    } else if (timerKind !== 'checkpoint' && timer === null) {
      schedule('draft', lastSaveAt + draftIntervalMs - now);
    }
  });

  /** Save immediately if anything is unsaved (used on hide/close and by the dev panel). */
  function flush() {
    if (!dirty && timer === null) return Promise.resolve();
    const kind = pendingReason ? 'checkpoint' : 'draft';
    cancel();
    return run(kind);
  }

  const visTarget = typeof document !== 'undefined' ? document : events;
  const onVisibility = () => { if (visTarget?.visibilityState === 'hidden') flush(); };
  const onPageHide = () => flush();
  const onOnline = () => {
    if (status.get() !== 'offline') return;
    if (inFlight) status.set('saving'); // the queued write syncs by itself
    else if (dirty || timer !== null) flush();
    else status.set('saved');
  };
  const onOffline = () => { if (remote) status.set('offline'); };
  if (events?.addEventListener) {
    visTarget.addEventListener('visibilitychange', onVisibility);
    events.addEventListener('pagehide', onPageHide);
    events.addEventListener('online', onOnline);
    events.addEventListener('offline', onOffline);
  }

  return {
    status,
    stats,
    flush,
    /** Force a checkpoint save now, ignoring the throttle (account creation, admin actions). */
    saveNow(reason = 'manual') { pendingReason = reason; cancel(); return run('checkpoint'); },
    detach() {
      unsubscribe();
      cancel();
      if (events?.removeEventListener) {
        visTarget.removeEventListener('visibilitychange', onVisibility);
        events.removeEventListener('pagehide', onPageHide);
        events.removeEventListener('online', onOnline);
        events.removeEventListener('offline', onOffline);
      }
    },
  };
}
