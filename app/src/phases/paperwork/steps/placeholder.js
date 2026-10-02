// Placeholder step (task 19): a title, "Coming in task NN", and a "Mark done" button shown only with ?dev=1 so the flow can be
// exercised before the real step exists. Tasks 20–31 replace each placeholder module with the real step.
import { h } from '../../../ui/dom.js';
import { getFlag } from '../../../dev/flags.js';

/**
 * Build a placeholder step module (05 §2 contract): {id, title, kind, upfrontKey?, placeholder, task, mount}.
 * mount(container, ctx) shows the stub; ctx.onDone(values) finishes the step.
 */
export function placeholderStep({ id, title, kind = 'form', task, upfrontKey = null, intro = null, devDone = true }) {
  return {
    id, title, kind, upfrontKey, task, placeholder: true,
    mount(container, ctx) {
      const done = devDone && getFlag('dev') === '1'
        ? h('button', { type: 'button', class: 'btn btn-secondary pw-dev-done', onClick: () => ctx.onDone({}) },
          'Mark done (dev)')
        : null;
      container.append(h('section', { class: 'pw-placeholder card' },
        h('p', { class: 'pw-kind' }, kind === 'letter' ? 'Letter' : kind === 'review' ? 'Review' : 'Document'),
        h('h2', { class: 'pw-step-title', tabindex: '-1' }, title),
        intro ? h('p', null, intro) : null,
        h('p', { class: 'muted' }, `Coming in task ${task}.`),
        done));
      return () => {};
    },
  };
}
