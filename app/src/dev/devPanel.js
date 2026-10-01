// Dev panel (01 §7), shown with ?dev=1: jump to phase, load a seed, reset, download the state, live save status.
// Lives outside #app so phase re-renders don't remove it.
import { h } from '../ui/dom.js';
import { PHASES, createInitialState } from '../state/schema.js';
import { seeds, buildSeed } from './seeds.js';
import { renderSaveStatus } from '../ui/saveStatus.js';

/**
 * Mount the panel. opts: store, persistence, user {uid, username, classCode}, rerender() (forces a screen re-render).
 * Returns unmount.
 */
export function mountDevPanel({ store, persistence, user, rerender }) {
  const phaseSel = h('select', { class: 'dev-select', 'aria-label': 'Phase' },
    PHASES.map((p) => h('option', { value: p }, p)));
  const seedSel = h('select', { class: 'dev-select', 'aria-label': 'Seed' },
    Object.entries(seeds).map(([name, def]) => h('option', { value: name, title: def.description }, name)));
  const info = h('p', { class: 'dev-info muted' });
  const refreshInfo = (s = store.getState()) => {
    phaseSel.value = s.phase;
    info.textContent = `${user.uid} · phase ${s.phase} · month ${s.life?.monthIndex ?? 0} · saves this visit ${persistence.stats.saves}`;
  };

  const swap = (state, reason) => {
    const samePhase = store.getState().phase === state.phase; // a phase change re-renders by itself
    store.replace(state, { checkpoint: reason });
    if (samePhase) rerender();
  };
  const actions = {
    jump: () => { store.update((s) => { s.phase = phaseSel.value; }, { checkpoint: 'dev-jump' }); },
    seed: () => swap(buildSeed(seedSel.value, Date.now()), `dev-seed:${seedSel.value}`),
    reset: () => swap(createInitialState({ ...user, now: Date.now() }), 'dev-reset'),
    download: () => {
      const blob = new Blob([JSON.stringify(store.getState(), null, 2)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: `homesim-${user.uid}.json` });
      document.body.append(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    },
  };
  const btn = (label, fn, extra = 'btn-secondary') => h('button', { class: `btn btn-small ${extra}`, type: 'button', onClick: fn }, label);

  const panel = h('details', { class: 'dev-panel', open: true },
    h('summary', null, 'Dev ', renderSaveStatus(persistence.status)),
    h('div', { class: 'dev-row' }, phaseSel, btn('Jump', actions.jump)),
    h('div', { class: 'dev-row' }, seedSel, btn('Load seed', actions.seed)),
    h('div', { class: 'dev-row' }, btn('Download JSON', actions.download), btn('Reset', actions.reset, 'btn-danger')),
    info,
  );
  const unsubs = [store.subscribe(refreshInfo), persistence.status.subscribe(() => refreshInfo())];
  refreshInfo(store.getState());
  document.body.append(panel);
  return () => { unsubs.forEach((u) => u()); panel.remove(); };
}
