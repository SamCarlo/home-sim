// Game boot (01 §5): store + local persistence. Task 05 brings the account provider and login.
import * as config from './config.js';
import { FIREBASE_ENABLED } from './firebase-config.js';
import { h, clear } from './ui/dom.js';
import { registerScreen, renderPhase } from './ui/screens.js';
import { renderHeader } from './ui/header.js';
import { devAllowed as isDevAllowed } from './dev/flags.js';
import { mountGallery } from './dev/galleries.js';
import { seeds, buildSeed, DEV_USER } from './dev/seeds.js';
import { createInitialState, STATE_VERSION } from './state/schema.js';
import { migrate } from './state/migrate.js';
import { createStore } from './state/store.js';
import { attach } from './state/persistence.js';
import { createLocalAdapter } from './persistence/local.js';

/** Temporary player until login exists (task 05 replaces it). */
const ANON_USER = { uid: 'local-anon', username: 'player', classCode: 'DEMO' };

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
  // ?dev=<gallery> renders a dev gallery instead of the game (01 §7). ?dev=1 is the dev panel (below).
  const gallery = devAllowed ? params.get('dev') : null;
  if (gallery && gallery !== '1') {
    const main = h('main', { class: 'app-main', id: 'screen' });
    clear(root).append(main);
    if (await mountGallery(gallery, main)) return;
  }
  // Seed mode (01 §7): the local dev user with a fixture. Otherwise the temporary local-anon save.
  const seedName = devAllowed ? params.get('seed') : null;
  const user = seedName ? DEV_USER : ANON_USER;
  const adapter = createLocalAdapter();
  let state;
  let fresh = false;
  if (seedName) {
    state = buildSeed(seedName, Date.now());
    fresh = true;
  } else {
    const loaded = await adapter.load(user.uid);
    state = loaded ? migrate(loaded) : createInitialState({ ...user, now: Date.now() });
    fresh = !loaded;
  }

  const store = createStore(state);
  const persistence = attach(store, adapter, { uid: user.uid });
  if (fresh) await persistence.saveNow(seedName ? `seed:${seedName}` : 'account-created');
  const ctx = { store, accounts: null, persistence, config, user, dev: { allowed: devAllowed, params, firebaseMode } };

  if (devAllowed) {
    window.__homesim = { store, getState: store.getState, update: store.update, seeds, version: STATE_VERSION, persistence };
  }

  const main = h('main', { class: 'app-main', id: 'screen' });
  let shownPhase = null;
  const render = async (force = false) => {
    const { phase } = store.getState();
    if (phase === shownPhase && !force) return;
    shownPhase = phase;
    clear(root);
    root.append(renderHeader(phase), main);
    await renderPhase(main, ctx);
  };
  store.subscribe(() => render().catch(showError));
  await render();

  if (devAllowed && params.get('dev') === '1') {
    const { mountDevPanel } = await import('./dev/devPanel.js');
    mountDevPanel({ store, persistence, user, rerender: () => render(true).catch(showError) });
  }
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
