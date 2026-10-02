// Sending a letter (06 §2): word counts, who it's addressed to, and the record stored in `state.letters`. Pure: no DOM.
// The step module (letterBox.js) marks the paperwork step done; this file only writes letters and paperwork.letterIds.
import { letterType } from './types.js';
import { scoreLetter } from './score.js';
import { businessFor, peopleFor } from '../content/names.js';

/** Number of words in `text` (runs of letters/digits, keeping ʻokina, apostrophes and hyphens inside a word). */
export function wordCount(text) {
  const m = String(text ?? '').normalize('NFC').match(/[\p{L}\p{N}ʻ'’-]+/gu);
  return m ? m.filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;
}

/** Where `count` sits against the type's target: 'empty' | 'short' | 'ok' | 'long'. */
export function lengthStatus(count, { min, max }) {
  if (count === 0) return 'empty';
  if (count < min) return 'short';
  return count > max ? 'long' : 'ok';
}

/** Recipient of a letter in this attempt → {name, org, line}; `line` is the "To:" text. Seeded, stable on reload. */
export function recipientFor(state, typeId) {
  letterType(typeId);
  const lender = () => businessFor(state, 'lenders');
  let name; let org;
  switch (typeId) {
    case 'rental-cover':
      name = peopleFor(state, 'landlord-contact', 1)[0];
      org = businessFor(state, 'landlords', 'landlord');
      break;
    case 'cosigner-request': {
      const last = String(state.player?.characterName ?? '').trim().split(/\s+/).slice(1).join(' ');
      const first = peopleFor(state, 'cosigner', 1)[0].split(' ')[0];
      name = last ? `${first} ${last}` : first;
      org = 'your parent or guardian';
      break;
    }
    case 'roommate-intro': {
      const [owner, ...others] = peopleFor(state, 'household', 4);
      name = others.slice(0, 2).concat(owner).join(', ');
      org = 'your future roommates';
      break;
    }
    case 'construction-purpose':
      name = `${peopleFor(state, 'loan-officer', 1)[0]}, construction loan officer`;
      org = lender();
      break;
    default: // loan-purpose, credit-explanation
      name = `${peopleFor(state, 'loan-officer', 1)[0]}, loan officer`;
      org = lender();
  }
  return { name, org, line: `${name}, ${org}` };
}

/** The next free letter id: 'L1', 'L2', … (letters are kept across attempts). */
export function nextLetterId(state) {
  let n = Object.keys(state.letters ?? {}).length + 1;
  while (state.letters?.[`L${n}`]) n += 1;
  return `L${n}`;
}

/**
 * Send a letter: score it silently (06 §3, score.js), store `letters[id] = {id, type, to, text, sentAt, attempt, score}`
 * and add the id to `paperwork.letterIds`. Mutates the draft; returns the letter.
 */
export function sendLetter(state, { type, text }, now = 0, { speller = null } = {}) {
  letterType(type);
  const body = String(text ?? '').normalize('NFC').trim();
  const id = nextLetterId(state);
  const letter = { id, type, to: recipientFor(state, type).line, text: body, sentAt: now,
    attempt: state.plan?.attempts?.length ?? 0, score: scoreLetter(body, type, { speller }) };
  state.letters ??= {};
  state.letters[id] = letter;
  state.paperwork.letterIds ??= [];
  state.paperwork.letterIds.push(id);
  return letter;
}
