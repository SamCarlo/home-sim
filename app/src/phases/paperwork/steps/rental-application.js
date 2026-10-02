// Rental application (05 §3–§4, task 20), plus the room-application variant for shared homes. Completion charges the
// non-refundable fee from the snapshot's 'application' line and records a pending application (05 §9).
import { FORMS } from '../../../config.js';
import { addApplication } from '../../../finance/ledger.js';
import { completeStep, upfrontLine } from '../flow.js';
import { renterTerms, gameIdField, partiesFields } from './renterTerms.js';

const yesNo = [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }];

function reference(n) {
  return [
    { id: `ref${n}-name`, kind: 'text', label: `Reference ${n}: name`, required: true, width: 'half', minLength: 3,
      maxLength: 40, hint: 'A made-up person, like a boss or a teacher. Not a family member.' },
    { id: `ref${n}-relation`, kind: 'select', label: 'How they know you', required: true, width: 'half',
      options: [{ value: 'boss', label: 'Boss or supervisor' }, { value: 'coworker', label: 'Coworker' },
        { value: 'teacher', label: 'Teacher or coach' }, { value: 'landlord', label: 'Past landlord' },
        { value: 'neighbor', label: 'Neighbor' }] },
    { id: `ref${n}-phone`, kind: 'phone', label: 'Their phone', required: true, width: 'half',
      hint: `Made-up number: ${FORMS.phoneHint}` },
  ];
}

/** The application schema for renter terms (variant 'apartment' | 'room'). */
export function applicationSchema(terms, state = null) {
  const room = terms.variant === 'room';
  return {
    id: room ? 'room-application' : 'rental-application',
    title: room ? 'Room application' : 'Rental application',
    intro: room
      ? `${terms.landlord} owns this house in ${terms.placeName} and rents out rooms. Fill this in so they can decide `
        + 'whether you would be a good housemate. Everything you write is made up for the game.'
      : `${terms.landlord} manages this building in ${terms.placeName}. Landlords use this form to decide who gets `
        + 'the apartment. Everything you write is made up for the game.',
    submitLabel: 'Sign and submit',
    sections: [
      { id: 'parties', title: 'The rental', fields: [
        ...partiesFields(terms, { tenantLabel: 'Applicant' }),
        { id: 'rent', kind: 'computed', label: room ? 'Room rent' : 'Monthly rent', width: 'half', format: 'money',
          compute: () => terms.rentCents },
        { id: 'move-in', kind: 'computed', label: 'Move-in date', width: 'half', compute: () => terms.startLabel },
      ] },
      { id: 'you', title: 'About you', fields: [
        { id: 'name', kind: 'computed', label: 'Full name', width: 'half', compute: (v, s) => s?.player?.characterName ?? '' },
        gameIdField(state),
        { id: 'living', kind: 'select', label: 'Where do you live now?', required: true, width: 'half',
          options: [{ value: 'family', label: 'With family' }, { value: 'renting', label: 'Renting a place' },
            { value: 'roommates', label: 'With roommates' }, { value: 'dorm', label: 'School housing' }] },
        { id: 'history', kind: 'radio', label: 'Rental history', required: true,
          options: [{ value: 'first', label: 'This will be my first place' }, { value: 'rented', label: 'I have rented before' }] },
        { id: 'past-landlord', kind: 'text', label: 'Your last landlord’s name', required: true, maxLength: 40,
          when: (v) => v.history === 'rented', hint: 'Made up. Landlords often call your last landlord.' },
      ] },
      { id: 'work', title: 'Work and income', fields: [
        { id: 'employer', kind: 'text', label: 'Employer', required: true, width: 'half', minLength: 2, maxLength: 40,
          hint: 'Who pays you (a made-up business is fine).' },
        { id: 'job-title', kind: 'text', label: 'Job title', required: true, width: 'half', minLength: 2, maxLength: 40,
          default: (s) => s?.player?.jobTitle ?? '' },
        { id: 'time-at-job', kind: 'select', label: 'Time at this job', required: true, width: 'half',
          options: [{ value: 'new', label: 'Less than 6 months' }, { value: 'year', label: '6 months to 2 years' },
            { value: 'long', label: 'More than 2 years' }] },
        { id: 'income', kind: 'computed', label: 'Monthly take-home pay', width: 'half', format: 'money',
          compute: (v, s) => s?.player?.netMonthlyIncomeCents ?? 0 },
        { id: 'ratio', kind: 'computed', label: 'Your pay ÷ rent', width: 'half',
          compute: (v, s) => (terms.rentCents ? `${((s?.player?.netMonthlyIncomeCents ?? 0) / terms.rentCents).toFixed(1)}×` : '—') },
        { kind: 'info', tone: 'teach', label: 'What landlords check',
          text: ['Most landlords want your take-home pay to be about 3× the rent. Below 2.5×, many ask for a co-signer: '
            + 'someone who promises to pay if you can’t.', 'They also check your credit and call your references.'] },
      ] },
      { id: 'refs', title: 'References', fields: [...reference(1), ...reference(2)] },
      { id: 'home-life', title: room ? 'Living together' : 'Pets and smoking', fields: [
        { id: 'pets', kind: 'radio', label: 'Pets', required: true, width: 'half',
          options: [{ value: 'none', label: 'None' }, { value: 'cat', label: 'A cat' }, { value: 'dog', label: 'A dog' }] },
        { id: 'smoking', kind: 'radio', label: 'Do you smoke or vape?', required: true, width: 'half', options: yesNo },
        { kind: 'info', tone: 'note', label: 'Why they ask',
          text: 'Pets and smoke can damage carpets and walls, so many places charge extra or say no.' },
      ] },
      { id: 'sign', title: 'Authorize and sign', fields: [
        { id: 'fee', kind: 'computed', label: 'Application fee (not refundable)', width: 'half', format: 'money',
          compute: () => terms.applicationFeeCents },
        { id: 'auth', kind: 'checkbox', required: true,
          label: 'I allow a background check and a credit check, and I understand the fee is not refunded.' },
        { id: 'signature', kind: 'signature', label: 'Signature', required: true },
      ] },
    ],
  };
}

/** Build the step module for a variant (05 §2 contract). */
export function applicationStep(variant) {
  const id = variant === 'room' ? 'room-application' : 'rental-application';
  return {
    id,
    title: variant === 'room' ? 'Room application' : 'Rental application',
    kind: 'form',
    upfrontKey: 'application',
    schema: (state) => applicationSchema(renterTerms(state), state),
    /** Pay the fee (all or nothing), record a pending application, mark the step done. */
    complete(state, values, now = 0) {
      const fee = upfrontLine(state, 'application')?.cents ?? 0;
      const r = completeStep(state, id, { values, upfrontKey: 'application', now,
        feeLabel: `${variant === 'room' ? 'Room' : 'Rental'} application fee` });
      if (!r.ok) return r;
      const c = state.choice;
      addApplication(state, { kind: variant === 'room' ? 'room' : 'rental', target: `${c.locationId}|${c.homeTypeId}`,
        feeCents: fee, at: now });
      return r;
    },
  };
}

export default applicationStep('apartment');
