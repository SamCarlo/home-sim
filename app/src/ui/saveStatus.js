// Save indicator (02 §4): follows the persistence status. Task 11 places it in the header.
import { h } from './dom.js';

/** Student-facing text per persistence status. */
export const SAVE_LABELS = {
  saved: 'Saved ✓',
  saving: 'Saving…',
  offline: 'Offline — will sync',
  error: 'Couldn’t save',
};

/** Build the indicator for a status observable. Call el.destroy() to stop listening. */
export function renderSaveStatus(status) {
  const el = h('span', { class: 'save-indicator', role: 'status', 'aria-live': 'polite' });
  const unsub = status.subscribe((s) => {
    el.dataset.status = s;
    el.textContent = SAVE_LABELS[s] ?? s;
  });
  el.destroy = unsub;
  return el;
}
