// Account validation rules and the local provider (11 §2), with Node's WebCrypto and in-memory storage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AccountError, checkUsername, checkClassCode, normalizeUsername, normalizeClassCode, validateRegistration,
} from '../../app/src/accounts/provider.js';
import { createLocalProvider, ACCOUNTS_KEY, SESSION_KEY } from '../../app/src/accounts/local.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    map: m,
  };
}

const make = (local = memoryStorage(), session = memoryStorage()) =>
  ({ local, session, p: createLocalProvider({ local, session, crypto: globalThis.crypto }) });

const KID = { username: 'testkid1', password: 'password123', classCode: 'DEMO' };

test('username rules: too short rejected, uppercase lowercased', () => {
  assert.ok(checkUsername('ab'));
  assert.equal(checkUsername('abc'), null);
  assert.equal(normalizeUsername('  TestKid1 '), 'testkid1');
  assert.equal(checkUsername('TestKid1'), null);
  assert.ok(checkUsername('_kid'), 'must start with a letter or digit');
  assert.ok(checkUsername('kid with space'));
  assert.ok(checkUsername('a'.repeat(21)));
});

test('class code format and password rules', () => {
  assert.equal(normalizeClassCode(' demo '), 'DEMO');
  assert.equal(checkClassCode('demo'), null);
  assert.equal(checkClassCode('PAHOA-7'), null);
  assert.ok(checkClassCode('ABC'));
  assert.ok(checkClassCode('ABCDEFGHIJKLM'));
  assert.ok(checkClassCode('DE MO'));
  const r = validateRegistration({ username: 'Kid', password: 'short', confirm: 'short', classCode: 'x' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['classCode', 'password']);
  assert.equal(r.values.username, 'kid');
  const m = validateRegistration({ ...KID, confirm: 'password124' });
  assert.ok(m.errors.confirm);
});

test('register signs in, stores a PBKDF2 hash (never the password), session only', async () => {
  const { p, local, session } = make();
  const seen = [];
  p.onChange((u) => seen.push(u?.username ?? null));
  const user = await p.register({ ...KID, username: 'TestKid1', classCode: 'demo' });
  assert.equal(user.username, 'testkid1');
  assert.equal(user.classCode, 'DEMO');
  assert.match(user.uid, /^local-[0-9a-f]{16}$/);
  assert.deepEqual(p.current(), user);
  const stored = JSON.parse(local.getItem(ACCOUNTS_KEY)).testkid1;
  assert.match(stored.hash, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(stored).includes('password123'));
  assert.ok(session.getItem(SESSION_KEY));
  assert.equal(local.getItem(SESSION_KEY), null);
  assert.deepEqual(seen, ['testkid1']);
});

test('logout, login again, remember → localStorage, init restores', async () => {
  const { p, local, session } = make();
  const first = await p.register(KID);
  await p.logout();
  assert.equal(p.current(), null);
  assert.equal(session.getItem(SESSION_KEY), null);
  const again = await p.login({ username: 'TESTKID1', password: 'password123', remember: true });
  assert.equal(again.uid, first.uid);
  assert.ok(local.getItem(SESSION_KEY));
  const reopened = createLocalProvider({ local, session: memoryStorage(), crypto: globalThis.crypto });
  assert.equal((await reopened.init())?.uid, first.uid);
});

test('duplicate username, wrong password, unknown user, bad class code', async () => {
  const { p } = make();
  await p.register(KID);
  await assert.rejects(p.register(KID), (e) => e instanceof AccountError && e.code === 'username-taken' && e.field === 'username');
  await p.logout();
  await assert.rejects(p.login({ username: 'testkid1', password: 'password124' }),
    (e) => e.code === 'invalid-credential' && /doesn't match/.test(e.message));
  await assert.rejects(p.login({ username: 'nobody', password: 'password123' }), { code: 'invalid-credential' });
  await assert.rejects(p.register({ ...KID, username: 'kid2', classCode: 'NOPE' }), { code: 'class-code' });
  await assert.rejects(p.register({ ...KID, username: 'ab' }), { code: 'invalid-username' });
  assert.equal(p.current(), null);
});
