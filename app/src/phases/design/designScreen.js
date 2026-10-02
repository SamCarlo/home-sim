// Phase 3: Design (07 §1). Routes by home type: apartments and condos use the building picker (task 36); houses,
// shared rooms and builds show a placeholder until their tasks (38 and 41).
import { h } from '../../ui/dom.js';

const PICKERS = {
  apartment: () => import('./apartmentPicker.js'),
  condo: () => import('./apartmentPicker.js'),
};
const LATER = { shared: 38, house: 38, build: 41 };

/** Mount the design screen for state.home.kind; returns unmount. */
export async function mount(container, ctx) {
  const kind = ctx.store.getState().home?.kind;
  if (PICKERS[kind]) return (await PICKERS[kind]()).mount(container, ctx);
  container.appendChild(
    h('section', { class: 'placeholder card' },
      h('span', { class: 'phase-tag' }, 'design'),
      h('h1', null, 'Phase 3: Design'),
      h('p', { class: 'muted' }, LATER[kind] ? `Designing this kind of home comes in task ${LATER[kind]}.` : 'No home to design yet.'),
    ),
  );
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
