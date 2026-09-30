// Placeholder screen for the About you phase. Task 11 replaces it.
import { h } from '../../ui/dom.js';

/** Mount the placeholder; returns unmount. */
export function mount(container) {
  container.appendChild(
    h('section', { class: 'placeholder card' },
      h('span', { class: 'phase-tag' }, 'intake'),
      h('h1', null, 'About you'),
      h('p', { class: 'muted' }, 'Coming in task 11.'),
    ),
  );
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
