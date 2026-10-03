// Admin console boot (11 §3, §7; task 52). One admin, signed in with Google:
//   Firebase mode: signInWithPopup, falling back to redirect when the popup is blocked;
//   emulator (?emulator=1 on localhost): ?fakeAdmin=<email> signs in with a fake Google credential the Auth emulator accepts;
//   local mode: a "Local admin (dev only)" button over the local profiles (?localAdmin=1 presses it, for smoke).
// The client only checks the email to choose what to show; the Firestore rules are the real lock (11 §5).
import { h, clear } from '../ui/dom.js';
import { applySettings } from '../ui/portfolio/settings.js';
import { DEV_HOSTS } from '../config.js';
import { FIREBASE_ENABLED, ADMIN_EMAIL, firebaseConfig } from '../firebase-config.js';
import { chooseMode } from '../accounts/provider.js';
import { EMULATOR } from '../accounts/firebase.js';
import { devAllowed } from '../dev/flags.js';
import { rowFor, codeCounts } from './adminModel.js';
import { createFirestoreSource, createLocalSource } from './dataSource.js';
import { renderClassCodes } from './classCodes.js';
import { renderStudentTable } from './studentTable.js';
import { openStudentDetail } from './studentDetail.js';

const root = document.getElementById('admin');
const params = new URLSearchParams(location.search);
const { firebaseMode, emulator } = chooseMode({ enabled: FIREBASE_ENABLED, params, hostname: location.hostname, devHosts: DEV_HOSTS });
const theme = devAllowed() && ['light', 'dark'].includes(params.get('theme')) ? params.get('theme') : null;
applySettings(null, { themeOverride: theme });

const ready = () => { document.body.dataset.ready = '1'; };
const notReady = () => { delete document.body.dataset.ready; };

boot().catch((err) => {
  console.error(err);
  card('Something went wrong.', h('p', null, 'Reload the page to try again.'));
});

async function boot() {
  if (!firebaseMode) return localSignIn();
  const [app, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  const fbApp = app.getApps().find((a) => a.name === 'admin') ?? app.initializeApp(emulator ? EMULATOR.config : firebaseConfig, 'admin');
  const fbAuth = auth.getAuth(fbApp);
  const db = fs.getFirestore(fbApp);
  if (emulator) {
    auth.connectAuthEmulator(fbAuth, EMULATOR.authUrl, { disableWarnings: true });
    fs.connectFirestoreEmulator(db, EMULATOR.firestoreHost, EMULATOR.firestorePort);
  }
  await fbAuth.authStateReady();
  await auth.getRedirectResult(fbAuth).catch((err) => console.warn('admin redirect', err?.code || err));
  const fake = emulator ? params.get('fakeAdmin') : null;
  if (fake) {
    const cred = auth.GoogleAuthProvider.credential(JSON.stringify({ sub: `fake-${fake}`, email: fake, email_verified: true }));
    await auth.signInWithCredential(fbAuth, cred);
  }
  const signOut = async () => { await auth.signOut(fbAuth); location.replace(location.pathname + (emulator ? '?emulator=1' : '')); };
  const show = (user) => {
    notReady();
    if (!user) return googleSignIn(auth, fbAuth, show);
    if (String(user.email).toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return notAdmin(user.email, signOut);
    return startConsole(createFirestoreSource({ db, fs }), { who: user.email, signOut, emulator });
  };
  await show(fbAuth.currentUser);
  auth.onAuthStateChanged(fbAuth, (u) => { if (!u) show(null); });
}

/** A centered card: the sign-in states. */
function card(title, ...children) {
  clear(root).append(h('section', { class: 'card adm-signin' },
    h('p', { class: 'adm-kicker' }, 'Home & Life Sim'), h('h1', { class: 'adm-signin-title' }, title), ...children));
  ready();
}

function googleSignIn(auth, fbAuth, onSignedIn) {
  const error = h('p', { class: 'adm-error', role: 'alert', hidden: true });
  const btn = h('button', { type: 'button', class: 'btn btn-primary adm-google', onClick: async () => {
    btn.disabled = true;
    const provider = new auth.GoogleAuthProvider();
    try {
      const { user } = await auth.signInWithPopup(fbAuth, provider);
      await onSignedIn(user);
    } catch (err) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(err?.code)) {
        await auth.signInWithRedirect(fbAuth, provider);
        return;
      }
      btn.disabled = false;
      error.textContent = err?.code === 'auth/popup-closed-by-user' ? 'Sign-in was closed before it finished.' : "Couldn't sign in. Try again.";
      error.hidden = false;
    }
  } }, 'Sign in with Google');
  card('Teacher console', h('p', null, 'Sign in with the Google account set up as the admin.'), btn, error);
}

function notAdmin(email, signOut) {
  card("This account isn't the admin",
    h('p', { class: 'adm-not-admin' }, `You're signed in as ${email}. Only the teacher's Google account can open this console.`),
    h('button', { type: 'button', class: 'btn btn-secondary adm-signout', onClick: signOut }, 'Sign out'));
}

function localSignIn() {
  const go = () => startConsole(createLocalSource(), { who: 'Local admin (dev only)', signOut: null, emulator: false });
  if (params.get('localAdmin') === '1') return go();
  card('Teacher console',
    h('p', null, 'Firebase isn\'t set up, so the game runs on this browser only. The local console lists the profiles saved in this browser.'),
    h('button', { type: 'button', class: 'btn btn-primary adm-local', onClick: go }, 'Local admin (dev only)'));
}

/** The console: header, class codes, student table. Reloads everything after any change. */
async function startConsole(source, { who, signOut, emulator: emu }) {
  const view = { classCode: '', search: '', sort: 'username', dir: 'asc' };
  const main = h('main', { class: 'adm-main', id: 'adm-main' });
  clear(root).append(
    h('header', { class: 'app-header adm-header' },
      h('h1', { class: 'app-title' }, 'Home & Life Sim · Teacher console'),
      h('div', { class: 'header-tools' },
        emu ? h('span', { class: 'adm-badge' }, 'Local test emulator') : null,
        h('span', { class: 'header-user adm-who' }, who),
        signOut ? h('button', { type: 'button', class: 'btn btn-ghost header-logout', onClick: signOut }, 'Sign out') : null)),
    main);

  async function load() {
    notReady();
    let codes; let players;
    try { [codes, players] = await Promise.all([source.listCodes(), source.listPlayers()]); } catch (err) {
      console.warn('admin load', err?.code || err);
      clear(main).append(h('section', { class: 'card adm-card', role: 'alert' }, h('h2', null, "The class data couldn't be loaded."),
        h('p', null, err?.code === 'permission-denied' ? 'The database only lets the admin account read it.' : 'Check the internet connection and reload.')));
      return ready();
    }
    const counts = codeCounts(players);
    const rows = players.map(rowFor);
    const open = (uid) => openStudentDetail({ source, player: players.find((p) => p.uid === uid), players, onChanged: load });
    clear(main).append(
      renderStudentTable({ rows, codes, view, onOpen: open }),
      renderClassCodes({ source, codes, counts, onChanged: load }));
    if (devAllowed()) window.__admin = { source, codes, players, rows, reload: load };
    ready();
  }
  await load();
}
