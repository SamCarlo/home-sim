// Pure parts of Firebase accounts (11 §1–§2, task 50): mode choice, synthetic email, error mapping.
// The emulator tests live in tests/firebase/accounts.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseMode, MESSAGES } from '../../app/src/accounts/provider.js';
import { emailFor, friendlyError, FIREBASE_MESSAGES } from '../../app/src/accounts/firebase.js';

const DEV = ['localhost', '127.0.0.1'];
const mode = (q, enabled = false, hostname = '127.0.0.1') =>
  chooseMode({ enabled, params: new URLSearchParams(q), hostname, devHosts: DEV });

test('chooseMode: local by default, Firebase when enabled, emulator only on dev hosts', () => {
  assert.deepEqual(mode(''), { firebaseMode: false, emulator: false });
  assert.deepEqual(mode('', true), { firebaseMode: true, emulator: false });
  assert.deepEqual(mode('?emulator=1'), { firebaseMode: true, emulator: true });
  assert.deepEqual(mode('?emulator=1', true, 'homesim.web.app'), { firebaseMode: true, emulator: false });
  assert.deepEqual(mode('?emulator=1', false, 'homesim.web.app'), { firebaseMode: false, emulator: false });
  assert.deepEqual(mode('?emulator=1&seed=fresh'), { firebaseMode: false, emulator: false });
  assert.deepEqual(mode('?adapter=local', true), { firebaseMode: false, emulator: false });
});

test('emailFor uses the reserved example.com domain', () => {
  assert.equal(emailFor(' Lani_7 '), 'lani_7@players.example.com');
});

test('friendlyError maps every 11 §2 code', () => {
  const m = (code) => friendlyError({ code });
  assert.deepEqual([m('auth/email-already-in-use').message, m('auth/email-already-in-use').field], [MESSAGES.usernameTaken, 'username']);
  for (const c of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found']) assert.equal(m(c).message, MESSAGES.badLogin);
  assert.equal(m('auth/too-many-requests').message, 'Too many tries. Wait a minute, then try again.');
  assert.equal(m('auth/network-request-failed').message, "Can't reach the server. Check your internet.");
  assert.equal(m('unavailable').message, FIREBASE_MESSAGES.network);
  assert.equal(m('auth/weak-password').message, 'Use at least 8 characters.');
  assert.equal(m('auth/user-disabled').message, 'Your account is paused. Ask your teacher.');
  assert.equal(m('weird/thing').message, 'Something went wrong. Try again.');
  const own = friendlyError(m('auth/wrong-password'));
  assert.equal(own.name, 'AccountError');
});
