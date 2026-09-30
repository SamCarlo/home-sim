// Placeholder screen for the Phase 1: Plan phase. Task 12 replaces it.
import { h } from '../../ui/dom.js';

/** Mount the placeholder; returns unmount. */
export function mount(container) {
  container.appendChild(
    h('section', { class: 'placeholder card' },
      h('span', { class: 'phase-tag' }, 'plan'),
      h('h1', null, 'Phase 1: Plan'),
      h('p', { class: 'muted' }, 'Coming in task 12.'),
    ),
  );
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
