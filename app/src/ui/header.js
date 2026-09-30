// App header: title, phase stepper and a slot for the save indicator (04 §1).
// Task 04/05 wire in the save status, portfolio button and the username + Log out.
import { h } from './dom.js';
import { GAME_TITLE } from '../config.js';

const STEPS = [
  { phase: 'plan', label: 'Plan' },
  { phase: 'paperwork', label: 'Paperwork' },
  { phase: 'design', label: 'Design' },
  { phase: 'life', label: 'Live' },
];

/** Build the header for a phase. Finished phases are checked, the current one highlighted. */
export function renderHeader(phase) {
  const idx = STEPS.findIndex((s) => s.phase === phase);
  return h('header', { class: 'app-header' },
    h('p', { class: 'app-title' }, GAME_TITLE),
    h('ol', { class: 'stepper', 'aria-label': 'Game phases' },
      STEPS.map((s, i) => h('li', {
        class: i === idx ? 'is-current' : i < idx ? 'is-done' : '',
        'aria-current': i === idx ? 'step' : null,
      },
      h('span', { class: 'step-num', 'aria-hidden': 'true' }, i < idx ? '✓' : String(i + 1)),
      s.label))),
    h('span', { class: 'save-indicator', dataset: { status: 'local' } }, ''),
  );
}
