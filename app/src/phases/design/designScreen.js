// Placeholder screen for the Phase 3: Design phase. Task 36 replaces it.
import { h } from '../../ui/dom.js';

/** Mount the placeholder; returns unmount. */
export function mount(container) {
  container.appendChild(
    h('section', { class: 'placeholder card' },
      h('span', { class: 'phase-tag' }, 'design'),
      h('h1', null, 'Phase 3: Design'),
      h('p', { class: 'muted' }, 'Coming in task 36.'),
    ),
  );
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
