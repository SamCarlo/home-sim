// Account provider selection, errors and validation (01 §6, 11 §2). No DOM: the rules are unit-tested in Node.
// Both providers (local now, Firebase in task 50) implement:
// { kind, init(), register({username, password, classCode}), login({username, password, remember}), logout(),
//   current() → {uid, username, classCode}|null, onChange(cb) → unsubscribe }.
import { ACCOUNTS } from '../config.js';

/** Error thrown by every provider method. `message` is already student-friendly; `field` names the input it belongs to. */
export class AccountError extends Error {
  constructor(code, message, field = null) {
    super(message);
    this.name = 'AccountError';
    this.code = code;
    this.field = field;
  }
}

/** Friendly messages shared by both providers (11 §2). */
export const MESSAGES = {
  usernameFormat: 'Use 3 to 20 letters or numbers. You can also use - and _ after the first one.',
  usernameTaken: 'That username is taken. Try another.',
  passwordShort: `Use at least ${ACCOUNTS.passwordMinLength} characters.`,
  passwordMismatch: "The two passwords don't match.",
  classCodeFormat: 'Class codes are 4 to 12 letters or numbers, like DEMO.',
  classCodeUnknown: "That class code isn't right. Check with your teacher.",
  badLogin: "Username or password doesn't match.",
  required: 'Fill this in.',
  forgot: 'Ask your teacher. They can move your game to a new username.',
};

/** Lowercase and trim a username as the student types it. */
export const normalizeUsername = (s) => String(s ?? '').trim().toLowerCase();
/** Uppercase and trim a class code. */
export const normalizeClassCode = (s) => String(s ?? '').trim().toUpperCase();

/** Error message for a username, or null when it's fine. Normalizes first. */
export function checkUsername(raw) {
  const u = normalizeUsername(raw);
  if (!u) return MESSAGES.required;
  return ACCOUNTS.usernamePattern.test(u) ? null : MESSAGES.usernameFormat;
}

/** Error message for a password, or null. */
export function checkPassword(pw) {
  if (!pw) return MESSAGES.required;
  return pw.length >= ACCOUNTS.passwordMinLength ? null : MESSAGES.passwordShort;
}

/** Error message for a class code's format, or null. Normalizes first. */
export function checkClassCode(raw) {
  const c = normalizeClassCode(raw);
  if (!c) return MESSAGES.required;
  return ACCOUNTS.classCodePattern.test(c) ? null : MESSAGES.classCodeFormat;
}

/**
 * Check a whole register form. Returns { ok, values (normalized), errors: {field → message} }.
 * `confirm` is only checked when it is passed (the UI passes it; providers don't).
 */
export function validateRegistration({ username, password, confirm, classCode } = {}) {
  const errors = {};
  const values = { username: normalizeUsername(username), password: password ?? '', classCode: normalizeClassCode(classCode) };
  const u = checkUsername(username); if (u) errors.username = u;
  const p = checkPassword(password); if (p) errors.password = p;
  if (confirm !== undefined && !errors.password && confirm !== password) errors.confirm = MESSAGES.passwordMismatch;
  const c = checkClassCode(classCode); if (c) errors.classCode = c;
  return { ok: Object.keys(errors).length === 0, values, errors };
}

/** Throw the first validation error as an AccountError (providers call this before touching storage). */
export function assertRegistration(input) {
  const { ok, values, errors } = validateRegistration(input);
  if (!ok) {
    const [field, message] = Object.entries(errors)[0];
    throw new AccountError(field === 'classCode' ? 'class-code' : `invalid-${field}`, message, field);
  }
  return values;
}

/**
 * Pick the account provider for this boot (01 §5 step 2). Firebase mode arrives in task 50;
 * until then every mode gets the local provider.
 */
export async function selectProvider({ firebaseMode = false } = {}) {
  void firebaseMode; // task 50: firebaseMode → (await import('./firebase.js')).createFirebaseProvider()
  const { createLocalProvider } = await import('./local.js');
  return createLocalProvider();
}
