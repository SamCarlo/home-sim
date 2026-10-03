// Dev flags (01 §7): URL parameters that only work in local mode or on a dev host.
import { DEV_HOSTS } from '../config.js';
import { FIREBASE_ENABLED } from '../firebase-config.js';

/**
 * The gating rule, pure (task 53): dev flags are honored in local mode, or on a dev host (localhost / 127.0.0.1) even in
 * Firebase mode. On the deployed site (Firebase mode, any other host) every dev flag is ignored.
 */
export function devFlagsAllowed({ enabled = false, hostname = '', devHosts = DEV_HOSTS } = {}) {
  return !enabled || devHosts.includes(hostname);
}

/** True when dev flags may be honored on this page (see devFlagsAllowed). */
export function devAllowed() {
  return devFlagsAllowed({ enabled: FIREBASE_ENABLED, hostname: location.hostname });
}

/** Value of the URL flag `name` ('' when present without a value), or null when absent or dev flags aren't allowed. */
export function getFlag(name) {
  if (!devAllowed()) return null;
  return new URLSearchParams(location.search).get(name);
}
