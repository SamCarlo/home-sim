// Placeholder screen for the Phase 2: Paperwork phase. Task 19 replaces it.
import { h } from '../../ui/dom.js';

/** Mount the placeholder; returns unmount. */
export function mount(container) {
  container.appendChild(
    h('section', { class: 'placeholder card' },
      h('span', { class: 'phase-tag' }, 'paperwork'),
      h('h1', null, 'Phase 2: Paperwork'),
      h('p', { class: 'muted' }, 'Coming in task 19.'),
    ),
  );
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
