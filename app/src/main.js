// Game boot (01 §5). For now: in-memory state { phase: 'intake' }.
// Task 04 brings the store and persistence, task 05 the account provider and login.
import * as config from './config.js';
import { FIREBASE_ENABLED } from './firebase-config.js';
import { h, clear } from './ui/dom.js';
import { registerScreen, renderPhase } from './ui/screens.js';
import { renderHeader } from './ui/header.js';
import { devAllowed as isDevAllowed } from './dev/flags.js';
import { mountGallery } from './dev/galleries.js';

registerScreen('login', () => import('./accounts/ui/login.js'));
registerScreen('intake', () => import('./phases/intake/intakeScreen.js'));
registerScreen('plan', () => import('./phases/plan/planScreen.js'));
registerScreen('paperwork', () => import('./phases/paperwork/paperworkScreen.js'));
registerScreen('design', () => import('./phases/design/designScreen.js'));
registerScreen('life', () => import('./phases/life/lifeScreen.js'));

const params = new URLSearchParams(location.search);
const devAllowed = isDevAllowed();
const firebaseMode = FIREBASE_ENABLED && !params.has('adapter') && !params.has('seed');

applyTheme(devAllowed ? params.get('theme') : null);
installErrorBoundary();
boot().catch(showError);

async function boot() {
  const root = document.getElementById('app');
  // ?dev=<gallery> renders a dev gallery instead of the game (01 §7). ?dev=1 is the dev panel (later task).
  const gallery = devAllowed ? params.get('dev') : null;
  if (gallery && gallery !== '1') {
    const main = h('main', { class: 'app-main', id: 'screen' });
    clear(root).append(main);
    if (await mountGallery(gallery, main)) return;
  }
  // Placeholder store until task 04: same getState/update/subscribe shape as state/store.js.
  let state = { phase: 'intake' };
  const listeners = new Set();
  const store = {
    getState: () => state,
    update(fn) {
      const draft = structuredClone(state);
      state = fn(draft) ?? draft;
      listeners.forEach((l) => l(state));
    },
    subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
  };
  const ctx = { store, accounts: null, persistence: null, config, dev: { allowed: devAllowed, params, firebaseMode } };

  if (devAllowed) window.__homesim = { store, getState: store.getState, update: store.update, seeds: {}, version: 0 };

  const main = h('main', { class: 'app-main', id: 'screen' });
  let shownPhase = null;
  const render = async () => {
    const { phase } = store.getState();
    if (phase === shownPhase) return;
    shownPhase = phase;
    clear(root);
    root.append(renderHeader(phase), main);
    await renderPhase(main, ctx);
  };
  store.subscribe(() => render().catch(showError));
  await render();
}

/** ?theme=light|dark (dev) overrides the OS setting; settings.theme takes over in a later task. */
function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
}

function installErrorBoundary() {
  window.addEventListener('error', (e) => showError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => showError(e.reason));
}

/** One friendly screen for any uncaught error (01 §4). Details only with dev flags on. */
function showError(err) {
  console.error(err);
  const root = document.getElementById('app');
  if (!root) return;
  clear(root);
  root.append(h('section', { class: 'error-boundary card', role: 'alert' },
    h('h2', null, 'Something went wrong.'),
    h('p', null, 'Your progress is saved up to your last step.'),
    h('button', { class: 'btn btn-primary', type: 'button', onClick: () => location.reload() }, 'Reload'),
    devAllowed && params.has('dev') ? h('pre', null, String(err?.stack || err)) : null,
  ));
  document.body.dataset.ready = '1';
}
