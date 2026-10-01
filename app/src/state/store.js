// The store (01 §6): the only way state changes. UI reads getState()/subscribe(); writes go through update().

/**
 * createStore(initialState, {now}) → { getState, update(fn, {checkpoint}), subscribe(listener) → unsubscribe }.
 * update hands fn a structuredClone; fn mutates it or returns a new state. The store bumps meta.updatedAt
 * and calls listeners with (state, {checkpoint, prev}).
 */
export function createStore(initialState, { now = () => Date.now() } = {}) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    update(fn, { checkpoint = null } = {}) {
      const prev = state;
      const draft = structuredClone(state);
      const next = fn(draft) ?? draft;
      if (next.meta) next.meta.updatedAt = now();
      state = next;
      for (const l of [...listeners]) l(state, { checkpoint, prev });
      return state;
    },
    /** Replace the whole state (seed load, reset). Counts as a checkpoint. */
    replace(newState, { checkpoint = 'replace' } = {}) {
      const prev = state;
      state = newState;
      for (const l of [...listeners]) l(state, { checkpoint, prev });
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
