// Placeholder screen for the Log in phase. Task 05 replaces it.
import { h } from '../../ui/dom.js';

/** Mount the placeholder; returns unmount. */
export function mount(container) {
  container.appendChild(
    h('section', { class: 'placeholder card' },
      h('span', { class: 'phase-tag' }, 'login'),
      h('h1', null, 'Log in'),
      h('p', { class: 'muted' }, 'Coming in task 05.'),
    ),
  );
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
