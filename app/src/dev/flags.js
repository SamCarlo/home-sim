// Dev flags (01 §7): URL parameters that only work in local mode or on a dev host.
import { DEV_HOSTS } from '../config.js';
import { FIREBASE_ENABLED } from '../firebase-config.js';

/** True when dev flags may be honored: local mode, or localhost / 127.0.0.1 even in Firebase mode. */
export function devAllowed() {
  return !FIREBASE_ENABLED || DEV_HOSTS.includes(location.hostname);
}

/** Value of the URL flag `name` ('' when present without a value), or null when absent or dev flags aren't allowed. */
export function getFlag(name) {
  if (!devAllowed()) return null;
  return new URLSearchParams(location.search).get(name);
}
