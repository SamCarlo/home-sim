// The letter box (06 §2): recipient card, prompt, a static tip list, a big textarea with a live word count, the
// made-up-names note, and Send with confirmation. Scoring is silent (letters/score.js); the rating is revealed at
// Results (D11). letterStep(id) builds the step module; the six letter steps are one-liners.
import { h } from '../../ui/dom.js';
import { confirmDialog } from '../../ui/modal.js';
import { LETTERS } from '../../config.js';
import { letterType } from '../../letters/types.js';
import { wordCount, lengthStatus, recipientFor, sendLetter } from '../../letters/send.js';
import { setStep } from './flow.js';
import { loadSpeller, loadedSpeller } from '../../letters/loadSpeller.js';

const DRAFT_DEBOUNCE_MS = 400; // the store save policy throttles the actual writes (SAVE.draftIntervalMs)

const COUNT_TEXT = {
  empty: (n, t) => `0 words · aim for ${t.min} to ${t.max}`,
  short: (n, t) => `${n} words · aim for ${t.min} to ${t.max}`,
  ok: (n, t) => `${n} words · right in the ${t.min} to ${t.max} range`,
  long: (n, t) => `${n} words · a bit long, aim for at most ${t.max}`,
};

/** "To:" card for the letter's recipient. */
function recipientCard(state, type) {
  const r = recipientFor(state, type.id);
  return h('div', { class: 'pw-letter-to' },
    h('span', { class: 'pw-letter-to-label' }, 'To:'),
    h('span', { class: 'pw-letter-to-name' }, r.name),
    h('span', { class: 'pw-letter-to-org' }, r.org));
}

/** The sent view: confirmation, then the letter as plain text. */
function sentView(container, state, type, ctx) {
  const id = state.paperwork.steps[type.id]?.values?.letterId;
  const letter = id ? state.letters?.[id] : null;
  const next = ctx.onNext
    ? h('button', { type: 'button', class: 'btn btn-primary pw-letter-next', onClick: () => ctx.onNext() }, 'Next step')
    : null;
  container.append(h('section', { class: 'pw-letter card' },
    h('p', { class: 'pw-kind' }, 'Letter'),
    h('h2', { class: 'pw-step-title', tabindex: '-1' }, type.title),
    h('div', { class: 'pw-letter-sent', role: 'status' },
      h('p', { class: 'pw-letter-sent-head' }, '✓ Sent!'),
      h('p', null, "You'll find out how it was received at the end of this phase.")),
    recipientCard(state, type),
    letter ? h('div', { class: 'pw-letter-copy' }, letter.text.split(/\n{2,}/).map((p) => h('p', null, p))) : null,
    next));
  return () => {};
}

/** Mount the writing box for letter type `typeId`; ctx is the paperwork step context. Returns unmount. */
export function mountLetterBox(container, typeId, ctx) {
  const type = letterType(typeId);
  const { store } = ctx;
  if (ctx.status === 'done') return sentView(container, store.getState(), type, ctx);
  loadSpeller().catch((err) => console.warn('Spelling dictionary not loaded; letters are scored without it.', err));

  const t = type.targetWords;
  const area = h('textarea', {
    id: `pw-letter-${type.id}`, class: 'pw-letter-text', rows: '14',
    spellcheck: LETTERS.browserSpellcheck ? 'true' : 'false', autocomplete: 'off', autocapitalize: 'sentences',
    'aria-describedby': `pw-letter-count pw-letter-note`,
    placeholder: 'Start with a greeting.\n\nWrite your letter here.\n\nEnd with a closing and your name.',
  });
  area.value = ctx.values?.text ?? '';
  const count = h('p', { class: 'pw-letter-count', id: 'pw-letter-count', 'aria-live': 'polite' });
  const send = h('button', { type: 'button', class: 'btn btn-primary pw-letter-send', onClick: () => onSend() }, 'Send letter');

  let timer = null;
  let dirty = false;
  const flush = () => {
    clearTimeout(timer); timer = null;
    if (dirty) { dirty = false; ctx.onDraft({ text: area.value }); }
  };
  function updateCount() {
    const n = wordCount(area.value);
    const status = lengthStatus(n, t);
    count.textContent = COUNT_TEXT[status](n, t);
    count.dataset.status = status;
    send.disabled = n === 0;
  }
  area.addEventListener('input', () => {
    updateCount();
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flush, DRAFT_DEBOUNCE_MS);
  });

  async function onSend() {
    const n = wordCount(area.value);
    if (n === 0) return;
    const status = lengthStatus(n, t);
    const lengthNote = status === 'short' ? ` It has ${n} words, and letters like this usually have at least ${t.min}.`
      : status === 'long' ? ` It has ${n} words, more than the ${t.max} most readers want.` : '';
    const ok = await confirmDialog({
      title: 'Send this letter?',
      message: `Once you send it, you can't change it.${lengthNote}`,
      confirmLabel: 'Send it',
      cancelLabel: 'Keep writing',
    });
    if (!ok) { area.focus(); return; }
    clearTimeout(timer); timer = null; dirty = false;
    ctx.onDone({ text: area.value });
  }

  const tips = h('aside', { class: 'pw-letter-tips', 'aria-label': 'Tips' },
    h('h3', null, 'A strong letter'),
    h('ul', null, type.tips.map((tip) => h('li', null, tip))),
    h('p', { class: 'pw-letter-examples' }, h('strong', null, 'Greetings: '), type.greetingExamples.map((x) => `“${x}”`).join(' or ')),
    h('p', { class: 'pw-letter-examples' }, h('strong', null, 'Closings: '), type.closingExamples.map((x) => `“${x}”`).join(' or ')));

  container.append(h('section', { class: 'pw-letter card' },
    h('p', { class: 'pw-kind' }, 'Letter'),
    h('h2', { class: 'pw-step-title', tabindex: '-1' }, type.title),
    recipientCard(store.getState(), type),
    h('p', { class: 'pw-letter-prompt' }, type.prompt),
    h('div', { class: 'pw-letter-grid' },
      h('div', { class: 'pw-letter-write' },
        h('label', { class: 'pw-letter-label', for: area.id }, 'Your letter'),
        area,
        count,
        h('p', { class: 'pw-letter-note', id: 'pw-letter-note' },
          "Use made-up names. Don't share real personal information."),
        h('div', { class: 'pw-letter-actions' }, send)),
      tips)));
  updateCount();
  return () => flush();
}

/** A letter step module (05 §2 contract) for type `id`: mount = the letter box, complete = send + mark done. */
export function letterStep(id) {
  const type = letterType(id);
  return {
    id, title: type.title, kind: 'letter', stayOnDone: true,
    mount: (container, ctx) => mountLetterBox(container, id, ctx),
    complete(state, values, now = 0) {
      const letter = sendLetter(state, { type: id, text: values.text }, now, { speller: loadedSpeller() });
      setStep(state, id, 'done', { letterId: letter.id }, now);
      return { ok: true, shortfallCents: 0 };
    },
  };
}
