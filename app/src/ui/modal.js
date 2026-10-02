// Modal dialogs (12 §4): a dimmed backdrop, focus moved in and trapped, Esc and the backdrop close, focus restored
// on close. openModal() is the generic sheet; confirmDialog() is a yes/no question built on it.
import { h } from './dom.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), '
  + 'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const stack = []; // open modals, newest last; only the top one handles keys and focus

/**
 * openModal({label, content, className?, onClose?, initialFocus?}) → { el, panel, close() }.
 * label names the dialog for screen readers; content is a Node. onClose runs once, after focus is restored.
 */
export function openModal({ label, content, className = '', onClose = null, initialFocus = null }) {
  const opener = document.activeElement;
  const panel = h('div', { class: `modal ${className}`.trim(), role: 'dialog', 'aria-modal': 'true', 'aria-label': label,
    tabindex: -1 }, content);
  const el = h('div', { class: 'modal-backdrop' }, panel);
  let closed = false;

  const focusables = () => [...panel.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
  const onKey = (e) => {
    if (stack[stack.length - 1] !== panel) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) { e.preventDefault(); panel.focus(); return; }
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const onFocusIn = (e) => { if (stack[stack.length - 1] === panel && !panel.contains(e.target)) (focusables()[0] || panel).focus(); };

  el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('focusin', onFocusIn);
  document.body.append(el);
  stack.push(panel);
  document.body.classList.add('has-modal');
  const target = typeof initialFocus === 'string' ? panel.querySelector(initialFocus) : initialFocus;
  (target || focusables()[0] || panel).focus();

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('focusin', onFocusIn);
    el.remove();
    stack.splice(stack.indexOf(panel), 1);
    if (!document.querySelector('.modal-backdrop')) document.body.classList.remove('has-modal');
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    onClose?.();
  }
  return { el, panel, close };
}

/**
 * confirmDialog({title, message, confirmLabel?, cancelLabel?}) → Promise<boolean>. Resolves true only when the
 * confirm button is pressed; Esc, Cancel and the backdrop resolve false. Focus starts on Cancel (the safe choice).
 */
export function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }) {
  return new Promise((resolve) => {
    let answer = false;
    const titleId = `modal-title-${Math.floor(performance.now() * 1000).toString(36)}`;
    const cancel = h('button', { type: 'button', class: 'btn btn-secondary modal-cancel', onClick: () => modal.close() }, cancelLabel);
    const ok = h('button', { type: 'button', class: 'btn btn-primary modal-confirm',
      onClick: () => { answer = true; modal.close(); } }, confirmLabel);
    const content = h('div', { class: 'modal-confirm-body' },
      h('h2', { class: 'modal-title', id: titleId }, title),
      h('p', { class: 'modal-message' }, message),
      h('div', { class: 'modal-actions' }, cancel, ok));
    const modal = openModal({ label: title, content, className: 'modal-confirm-dialog', initialFocus: cancel,
      onClose: () => resolve(answer) });
    modal.panel.removeAttribute('aria-label');
    modal.panel.setAttribute('aria-labelledby', titleId);
    modal.panel.setAttribute('role', 'alertdialog');
  });
}
