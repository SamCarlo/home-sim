// Roommate agreement (05 §3–§4, task 20): house rules the student agrees with the homeowner and housemates. Its
// answers set the housemates' comfort with the student (−1…1), stored in paperwork.options.roommateComfort; the
// roommates decision (task 29) turns it into the small ± bonus. Completion stores a pending agreement.
import { addAgreement } from '../../../finance/ledger.js';
import { setStep } from '../flow.js';
import { renterTerms } from './renterTerms.js';

/** Options per question with how comfortable the housemates are with each answer (−1 … +1). */
export const ROOMMATE_CHOICES = {
  chores: [
    { value: 'chart', label: 'A chore chart that rotates every week', comfort: 1 },
    { value: 'own-mess', label: 'Everyone cleans up their own mess right away', comfort: 0.5 },
    { value: 'notice', label: 'Whoever notices it first does it', comfort: -1 },
  ],
  quiet: [
    { value: '10pm', label: '10 pm to 7 am', comfort: 1 },
    { value: 'midnight', label: 'Midnight to 8 am', comfort: 0.3 },
    { value: 'none', label: 'No quiet hours', comfort: -1 },
  ],
  guests: [
    { value: '0', label: 'None', comfort: 0.5 },
    { value: '1', label: '1 night a week', comfort: 1 },
    { value: '2', label: '2 nights a week', comfort: 0.3 },
    { value: '4', label: '4 or more nights a week', comfort: -1 },
  ],
  groceries: [
    { value: 'separate', label: 'Separate food, labeled shelves', comfort: 0.8 },
    { value: 'basics', label: 'Share basics (rice, oil, coffee), split the cost', comfort: 1 },
    { value: 'all', label: 'Share everything, no tracking', comfort: -0.3 },
  ],
  bills: [
    { value: 'equal', label: 'Split utilities equally, paid by the 1st', comfort: 1 },
    { value: 'use', label: 'Split by how much each person uses', comfort: 0.3 },
    { value: 'later', label: 'Pay when I can', comfort: -1 },
  ],
  conflict: [
    { value: 'talk-24h', label: 'Talk it out within 24 hours', comfort: 1 },
    { value: 'meeting', label: 'A weekly house meeting', comfort: 0.8 },
    { value: 'hooponopono', label: 'A hoʻoponopono-style talk: acknowledge what happened, take responsibility, '
      + 'forgive, and release it', comfort: 1 },
  ],
  pets: [
    { value: 'none', label: 'No pets', comfort: 0.6 },
    { value: 'ask', label: 'Only if everyone agrees first', comfort: 1 },
    { value: 'bring', label: 'I’m bringing my dog', comfort: -1 },
  ],
};

const opts = (key) => ROOMMATE_CHOICES[key].map(({ value, label }) => ({ value, label }));

/** Housemates' comfort with these answers: the average of the answered choices, −1 … 1 (0 when nothing is answered). */
export function roommateComfort(values = {}) {
  const scores = Object.entries(ROOMMATE_CHOICES)
    .map(([key, list]) => list.find((o) => o.value === values[key])?.comfort)
    .filter((x) => typeof x === 'number');
  if (!scores.length) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
}

/** The roommate agreement schema for renter terms (also rebuilt from agreement.terms in the portfolio). */
export function roommateSchema(terms) {
  const mates = terms.roommates ?? [];
  return {
    id: 'roommate-agreement',
    title: 'Roommate agreement',
    intro: `You will share a house in ${terms.placeName} with ${mates.join(', ')}. Good house rules, written down `
      + 'before anyone moves in, prevent most fights. Pick what you would really do.',
    submitLabel: 'Sign the agreement',
    sections: [
      { id: 'house', title: 'House rules', fields: [
        { id: 'chores', kind: 'radio', label: 'Chores', required: true, options: opts('chores') },
        { id: 'quiet', kind: 'radio', label: 'Quiet hours', required: true, width: 'half', options: opts('quiet') },
        { id: 'guests', kind: 'radio', label: 'Overnight guests per week', required: true, width: 'half', options: opts('guests') },
        { id: 'pets', kind: 'radio', label: 'Pets', required: true, width: 'half', options: opts('pets') },
      ] },
      { id: 'money', title: 'Food and bills', fields: [
        { id: 'groceries', kind: 'radio', label: 'Groceries', required: true, options: opts('groceries') },
        { id: 'bills', kind: 'radio', label: 'Bills', required: true, options: opts('bills') },
        { id: 'thermostat', kind: 'text', label: 'AC and thermostat rule', required: true, minLength: 5, maxLength: 80,
          hint: 'For example: “AC on only when it’s over 85°F, set to 78°F.”' },
      ] },
      { id: 'conflict', title: 'When something goes wrong', fields: [
        { id: 'conflict', kind: 'radio', label: 'Our conflict plan', required: true, options: opts('conflict') },
        { kind: 'info', tone: 'teach', label: 'Hoʻoponopono',
          text: 'Hoʻoponopono is a Hawaiian practice of making things right. People talk honestly, take responsibility '
            + 'for their part, forgive, and let the problem go so it doesn’t keep growing.' },
      ] },
      { id: 'sign', title: 'Sign', fields: [
        { id: 'signature', kind: 'signature', label: 'Your signature', required: true },
        { id: 'housemates', kind: 'computed', label: 'Housemates', compute: () => `${mates.join(', ')} (sign after approval)` },
      ] },
    ],
  };
}

export default {
  id: 'roommate-agreement',
  title: 'Roommate agreement',
  kind: 'form',
  schema: (state) => roommateSchema(renterTerms(state)),
  /** Store a pending agreement and the housemates' comfort; then mark done. */
  complete(state, values, now = 0) {
    const terms = renterTerms(state);
    const comfort = roommateComfort(values);
    state.paperwork.options.roommateComfort = comfort;
    addAgreement(state, {
      type: 'roommate-agreement', docType: 'roommate-agreement', title: `Roommate agreement (${terms.placeName})`,
      counterparty: (terms.roommates ?? []).join(', '), signedAt: now,
      summary: 'House rules for chores, guests, food, bills and conflicts. Waiting for approval.',
      terms: { ...terms, comfort }, docValues: values,
    });
    setStep(state, 'roommate-agreement', 'done', values, now);
    return { ok: true, shortfallCents: 0 };
  },
};
