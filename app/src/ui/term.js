// term(): a glossary word with a dotted underline and a tooltip (12 §5, task 55). Hover, keyboard focus and tap all
// open it; Esc, blur, mouse-out or a second tap close it. One shared role=tooltip element, fixed-positioned so table
// frames and modals with overflow:hidden can't clip it. The word is a <button> so it is reachable by Tab and tap.

import { h } from './dom.js';
import { glossaryEntry } from '../content/glossary.js';

let tip = null;
let owner = null;

function tipEl() {
  if (tip && tip.isConnected) return tip;
  tip = h('div', { id: 'term-tip', class: 'term-tip', role: 'tooltip', hidden: true });
  document.body.appendChild(tip);
  return tip;
}

function place(btn) {
  const r = btn.getBoundingClientRect();
  const t = tipEl();
  const w = Math.min(320, window.innerWidth - 16);
  t.style.maxWidth = `${w}px`;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  t.style.left = `${left}px`;
  const below = r.bottom + 6;
  t.style.top = `${below}px`;
  // Flip above the word when the tip would run off the bottom of the window.
  const height = t.offsetHeight;
  if (below + height > window.innerHeight - 8 && r.top - height - 6 > 8) t.style.top = `${r.top - height - 6}px`;
}

function show(btn) {
  const { word, def, example } = glossaryEntry(btn.dataset.term);
  const t = tipEl();
  t.replaceChildren(h('strong', null, word), ' ', def, h('span', { class: 'term-ex' }, `Example: ${example}`));
  t.hidden = false;
  if (owner && owner !== btn) owner.setAttribute('aria-expanded', 'false');
  owner = btn;
  btn.setAttribute('aria-expanded', 'true');
  btn.setAttribute('aria-describedby', 'term-tip');
  place(btn);
}

/** Close the open tooltip, if any. */
export function hideTerm() {
  if (tip) tip.hidden = true;
  if (owner) {
    owner.setAttribute('aria-expanded', 'false');
    owner.removeAttribute('aria-describedby');
  }
  owner = null;
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && owner) hideTerm(); });
  document.addEventListener('pointerdown', (e) => {
    if (owner && !e.target.closest?.('.term')) hideTerm();
  });
  // Follow the word when a frame scrolls; close once it has scrolled out of the window.
  window.addEventListener('scroll', () => {
    if (!owner) return;
    const r = owner.getBoundingClientRect();
    if (!owner.isConnected || r.bottom < 0 || r.top > window.innerHeight) hideTerm(); else place(owner);
  }, true);
}

/**
 * Render a glossary word. id is a GLOSSARY key; text overrides the shown words (e.g. "Down payment" at a sentence start).
 * Returns a <button class="term">. Unknown ids throw.
 */
export function term(id, text) {
  const entry = glossaryEntry(id);
  let touched = false;
  return h('button', {
    type: 'button', class: 'term', dataset: { term: id }, 'aria-expanded': 'false',
    onPointerdown: (e) => { touched = e.pointerType === 'touch'; },
    onMouseenter: (e) => show(e.currentTarget),
    onMouseleave: (e) => { if (!touched && owner === e.currentTarget && document.activeElement !== owner) hideTerm(); },
    onFocus: (e) => show(e.currentTarget),
    onBlur: (e) => { if (owner === e.currentTarget) hideTerm(); },
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = e.currentTarget;
      if (touched && owner === btn && !tip.hidden && btn.dataset.opened === '1') { hideTerm(); btn.dataset.opened = ''; return; }
      show(btn);
      btn.dataset.opened = '1';
    },
  }, text ?? entry.word);
}

/** A "Words to know: a, b, c" line of term() buttons. cls is the paragraph's class (e.g. 'pw-words'). */
export function wordsToKnow(ids, cls = 'words-to-know') {
  return h('p', { class: `words ${cls}` }, h('span', { class: 'words-k' }, 'Words to know:'), ' ',
    ids.flatMap((id, i) => (i ? [', ', term(id)] : [term(id)])));
}
