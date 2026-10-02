// Slide-over drawer (12 §4, task 17). It opens from the LEFT so it never covers the Phase 4 right panel.
// Built on ui/modal.js, so it shares the modal stack: focus is trapped, Esc closes the top layer only (a confirm
// dialog opened from inside the drawer closes first), and focus returns to the opener on close.
import { h } from './dom.js';
import { openModal } from './modal.js';

/**
 * openDrawer({label, title, content, onClose?, initialFocus?}) → { el, panel, body, close() }.
 * label names the dialog for screen readers; title is the visible heading; content is a Node placed in `body`.
 */
export function openDrawer({ label, title = label, content, onClose = null, initialFocus = null }) {
  const body = h('div', { class: 'drawer-body' }, content);
  let modal = null;
  const closeBtn = h('button', { type: 'button', class: 'btn btn-ghost drawer-close', 'aria-label': `Close ${label}`,
    onClick: () => modal.close() }, '✕');
  const panelContent = h('div', { class: 'drawer-inner' },
    h('div', { class: 'drawer-head' }, h('h2', { class: 'drawer-title' }, title), closeBtn),
    body);
  modal = openModal({ label, content: panelContent, className: 'drawer', onClose, initialFocus: initialFocus || closeBtn });
  modal.el.classList.add('drawer-backdrop');
  requestAnimationFrame(() => modal.el.classList.add('is-open'));
  return { el: modal.el, panel: modal.panel, body, close: modal.close };
}
