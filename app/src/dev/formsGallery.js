// `?dev=forms` (task 18): a sample document that uses every field kind of the form engine.
// &fill=1 starts with valid answers; &mode=readonly shows the signed copy (implies fill); &theme=light|dark as usual.
import { h, clear } from '../ui/dom.js';
import { renderForm } from '../forms/engine.js';
import { FORMS } from '../config.js';

const NAME = 'Keʻala Kahananui-Akana';
const STATE = { player: { characterName: NAME, netMonthlyIncomeCents: 312000 } };
const RENT = 145000;

/** The sample rental application: every kind once (signature, initials, question, table, computed…). */
export const SAMPLE_SCHEMA = {
  id: 'sample-rental',
  title: 'Sample rental application',
  intro: 'Every field kind the paperwork uses. Puna Rentals LLC, 15-2900 Pāhoa Village Road, Unit to be chosen in Phase 3.',
  submitLabel: 'Sign and submit',
  sections: [
    { id: 'you', title: 'About you', fields: [
      { id: 'game-id', kind: 'computed', label: 'Game ID', compute: () => '•••-••-4821', hint: 'Never type a real Social Security number on a form like this.' },
      { id: 'employer', kind: 'text', label: 'Employer', required: true, width: 'half', maxLength: 40 },
      { id: 'job-title', kind: 'text', label: 'Job title', required: true, width: 'half', minLength: 2 },
      { id: 'living', kind: 'select', label: 'Where do you live now?', required: true, width: 'half',
        options: [{ value: 'family', label: 'With family' }, { value: 'renting', label: 'Renting' }, { value: 'dorm', label: 'Dorm or shared' }] },
      { id: 'move-in', kind: 'month', label: 'Move-in month', required: true, width: 'half', from: 0, to: 5, min: 0 },
      { id: 'years', kind: 'number', label: 'Years at your job', width: 'half', min: 0, max: 50, hint: 'Whole years, like 2.' },
      { id: 'income', kind: 'computed', label: 'Monthly net income', width: 'half', format: 'money',
        compute: (v, s) => s.player.netMonthlyIncomeCents },
      { id: 'other-income', kind: 'currency', label: 'Other monthly income', prefix: '$', width: 'half', min: 0, max: 1000000,
        hint: 'Leave blank if none.' },
      { id: 'phone', kind: 'phone', label: 'Reference phone', required: true, width: 'half', hint: `Made-up number: ${FORMS.phoneHint}` },
      { id: 'history', kind: 'radio', label: 'Rental history', required: true,
        options: [{ value: 'first', label: 'This is my first place' }, { value: 'rented', label: 'I have rented before' }] },
      { id: 'landlord', kind: 'text', label: 'Last landlord’s name', required: true, when: (v) => v.history === 'rented' },
      { id: 'about', kind: 'textarea', label: 'Anything else the landlord should know?', rows: 3, maxLength: 400 },
    ] },
    { id: 'money', title: 'The numbers', fields: [
      { kind: 'info', tone: 'teach', label: 'Why landlords ask', text: 'Landlords usually want your income to be about 3× the rent.' },
      { id: 'costs', kind: 'table', label: 'Move-in costs', columns: [
        { key: 'item', label: 'Item' }, { key: 'cents', label: 'Amount', align: 'right', format: 'money' }],
        rows: [{ item: 'First month', cents: RENT }, { item: 'Security deposit', cents: RENT }, { item: 'Application fee', cents: 5000 }] },
      { id: 'ratio', kind: 'computed', label: 'Your income ÷ rent', format: (x) => `${x.toFixed(2)}×`,
        compute: (v, s) => (s.player.netMonthlyIncomeCents + (Number.isInteger(v['other-income']) ? v['other-income'] : 0)) / RENT },
    ] },
    { id: 'lease', title: 'Lease clauses', fields: [
      { kind: 'clauses', label: 'Read these first', items: ['The lease runs 12 months from January 1, 2033.', 'Rent is due on the 1st.'] },
      { id: 'init', kind: 'initials', label: 'Initial each clause', required: true, clauses: [
        { id: 'c1', text: 'The lease renews automatically unless you give 60 days’ written notice.' },
        { id: 'c2', text: 'Rent is due on the 1st. After the 5th there is a $75 late fee plus $10 a day.' },
        { id: 'c3', text: 'Quiet hours are 10 pm to 7 am.' }] },
      { id: 'q-late', kind: 'question', label: 'If rent arrives on the 8th, what’s the late fee?', required: true, answer: 'c',
        choices: [{ value: 'a', label: '$75', why: 'The $75 is only the start. Count the days after the 5th.' },
          { value: 'b', label: '$10', why: 'That’s one day. The flat $75 comes first.' },
          { value: 'c', label: '$105' }, { value: 'd', label: 'Nothing', why: 'Rent is late after the 5th.' }],
        explanation: '$75 + 3 days × $10 = $105.' },
    ] },
    { id: 'sign', title: 'Sign', fields: [
      { id: 'auth', kind: 'checkbox', label: 'I allow a background and credit check.', required: true },
      { id: 'signature', kind: 'signature', label: 'Signature', required: true },
    ] },
  ],
};

/** Answers that pass every rule (for &fill=1 and the read-only view). */
export const SAMPLE_VALUES = {
  employer: 'Puna Community Medical Center', 'job-title': 'Nurse aide', living: 'family', 'move-in': 0, years: 2,
  'other-income': 25000, phone: '(808) 555-0142', history: 'rented', landlord: 'Mele Akana', about: 'I have a cat named Poki.',
  init: { c1: 'KKA', c2: 'KKA', c3: 'kka' },
  'q-late': { choice: 'c', tries: 2, correct: true, firstTry: false, wrong: ['a'] },
  auth: true, signature: NAME,
};

/** Render the gallery into root. */
export function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const params = new URLSearchParams(location.search);
  const readOnly = params.get('mode') === 'readonly';
  const fill = readOnly || params.get('fill') === '1';
  const out = h('pre', { class: 'dev-forms-out', hidden: true });
  const host = h('div');
  root.append(h('div', { class: 'dev-forms' },
    h('p', { class: 'dev-forms-bar muted small' }, `?dev=forms · character name “${NAME}” · `,
      readOnly ? 'read-only' : fill ? 'filled' : 'empty', ' · add &fill=1 or &mode=readonly'),
    host, out));
  renderForm(host, SAMPLE_SCHEMA, {
    values: fill ? SAMPLE_VALUES : {}, state: STATE, readOnly,
    onSubmit: (values) => { out.hidden = false; out.textContent = `Submitted ✓\n${JSON.stringify(values, null, 2)}`; },
  });
  document.body.dataset.ready = '1';
  return () => delete document.body.dataset.ready;
}
