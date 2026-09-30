// Placeholder screen for the Phase 4: Live phase. Task 42 replaces it.
import { h } from '../../ui/dom.js';

/** Mount the placeholder; returns unmount. */
export function mount(container) {
  container.appendChild(
    h('section', { class: 'placeholder card' },
      h('span', { class: 'phase-tag' }, 'life'),
      h('h1', null, 'Phase 4: Live'),
      h('p', { class: 'muted' }, 'Coming in task 42.'),
    ),
  );
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
