// HOA review (05 §3–§4, task 22): a condo's HOA documents (dues and what they cover, reserve fund, special
// assessments, rules), three comprehension questions, an acknowledgment and a signature. A pending special assessment
// becomes a monthly 'special-assessment' line in the snapshot (it counts as housing cost in underwriting; commit makes
// it a recurring expense) and paperwork.options.specialAssessment.
import { formatMoney } from '../../../finance/money.js';
import { addAgreement } from '../../../finance/ledger.js';
import { hoaReport } from '../../../finance/buying.js';
import { businessFor } from '../../../content/names.js';
import { byId } from '../../../data/locations/index.js';
import { setStep } from '../flow.js';
import { gameIdField } from './renterTerms.js';

const money = (c) => formatMoney(c);

/** The HOA terms for this attempt (report + association name + place). */
export function hoaTerms(state) {
  return { ...hoaReport(state), association: businessFor(state, 'hoas'), placeName: byId[state.choice.locationId].name };
}

/** The three comprehension questions for these terms. */
export function hoaQuestions(t) {
  const a = t.assessment;
  return [
    { id: 'q-dues', kind: 'question', required: true, label: 'What do your HOA dues pay for?', answer: 'b',
      choices: [
        { value: 'a', label: 'Your own electric bill and internet', why: 'Those are your bills. Dues pay for the shared parts of the building.' },
        { value: 'b', label: 'The building’s insurance, shared repairs and trash pickup', why: '' },
        { value: 'c', label: 'Nothing; they are a one-time fee', why: 'Dues come every month for as long as you own the condo.' },
      ],
      explanation: 'Right. Dues pay for everything the owners share: the roof, halls, grounds and the building’s insurance.' },
    { id: 'q-reserve', kind: 'question', required: true,
      label: `The reserve fund is ${t.reservePct}% funded. What does that tell you?`, answer: t.reserveHealthy ? 'a' : 'b',
      choices: [
        { value: 'a', label: 'The HOA has saved most of what it needs for big repairs', why: t.reserveHealthy ? '' : `${t.reservePct}% is low. The HOA has saved only a small part of what big repairs will cost.` },
        { value: 'b', label: 'The HOA is short on savings, so owners may get surprise bills', why: t.reserveHealthy ? `${t.reservePct}% is healthy. About 70% or more means the HOA has saved most of what it needs.` : '' },
        { value: 'c', label: 'Nothing; the reserve fund is the HOA’s profit', why: 'An HOA isn’t a business. The reserve fund is savings for future repairs.' },
      ],
      explanation: t.reserveHealthy ? 'Right. A well-funded reserve means fewer surprise bills.'
        : 'Right. A low reserve is a warning sign: when a big repair comes, owners pay extra.' },
    a ? { id: 'q-assessment', kind: 'question', required: true,
      label: `How much will the special assessment add to your housing cost each month, and for how long?`, answer: 'c',
      choices: [
        { value: 'a', label: 'Nothing; it’s included in the dues', why: 'A special assessment is on top of the regular dues.' },
        { value: 'b', label: `${money(a.monthlyCents)} once`, why: `It’s ${money(a.monthlyCents)} every month, not once.` },
        { value: 'c', label: `${money(a.monthlyCents)} a month for ${a.months} months`, why: '' },
      ],
      explanation: `Right. That’s ${money(a.totalCents)} in total, on top of ${money(t.hoaCents)} a month in dues.` }
      : { id: 'q-assessment', kind: 'question', required: true, label: 'What is a special assessment?', answer: 'a',
        choices: [
          { value: 'a', label: 'An extra bill to owners when the HOA needs money for a big repair', why: '' },
          { value: 'b', label: 'A test the HOA gives new owners', why: 'It’s a bill, not a test.' },
          { value: 'c', label: 'A discount on the dues', why: 'It costs more, not less.' },
        ],
        explanation: 'Right. They happen most when the reserve fund is low.' },
  ];
}

/** The HOA review form for these terms. */
export function hoaSchema(t, state = null) {
  const a = t.assessment;
  return {
    id: 'hoa-review',
    title: 'HOA document review',
    intro: `${t.association} runs the building. Before you buy, read its documents: they say what you will pay `
      + 'every month on top of your mortgage, and what the HOA can make you pay later.',
    submitLabel: 'Sign and acknowledge',
    sections: [
      { id: 'who', title: 'Association', fields: [
        { id: 'assoc', kind: 'computed', label: 'Homeowners association', width: 'half', compute: () => t.association },
        { id: 'place', kind: 'computed', label: 'Condo', width: 'half', compute: () => `Unit in ${t.placeName}` },
        gameIdField(state),
      ] },
      { id: 'dues', title: 'Dues and what they cover', fields: [
        { id: 'dues-amount', kind: 'computed', label: 'Monthly dues', width: 'half', format: 'money', compute: () => t.hoaCents },
        { id: 'covers', kind: 'clauses', label: 'Dues pay for', items: t.covers },
      ] },
      { id: 'reserve', title: 'Reserve fund and special assessments', fields: [
        { id: 'reserve-pct', kind: 'computed', label: 'Reserve fund', width: 'half',
          compute: () => `${t.reservePct}% funded (${t.reserveHealthy ? 'healthy' : 'low'})` },
        { id: 'reserve-teach', kind: 'info', tone: t.reserveHealthy ? 'teach' : 'warn', label: 'What’s a reserve fund?',
          text: 'It’s the HOA’s savings for big repairs like a new roof or elevator. About 70% funded is healthy. '
            + 'Under about 30% means owners are likely to get special assessments: extra bills on top of the dues.' },
        { id: 'history', kind: 'clauses', label: 'Special assessment history', items: t.history },
        a ? { id: 'pending', kind: 'info', tone: 'warn', label: 'Pending special assessment',
          text: [`${a.reason}: ${money(a.monthlyCents)} a month for ${a.months} months (${money(a.totalCents)} in total).`,
            'Every owner pays it, including new owners. It counts as housing cost when the bank decides on your loan.'] }
          : { id: 'pending', kind: 'info', tone: 'note', label: 'Pending special assessment', text: 'None right now.' },
      ] },
      { id: 'rules', title: 'House rules', fields: [{ id: 'rules-list', kind: 'clauses', label: 'Rules', items: t.rules }] },
      { id: 'check', title: 'Check your understanding', fields: hoaQuestions(t) },
      { id: 'sign', title: 'Acknowledge', fields: [
        { id: 'ack', kind: 'checkbox', required: true,
          label: 'I have read the HOA documents and understand I must pay the dues'
            + (a ? ' and the special assessment.' : ' and any future special assessment.') },
        { id: 'signature', kind: 'signature', label: 'Signature', required: true },
      ] },
    ],
  };
}

export default {
  id: 'hoa-review',
  title: 'HOA review',
  kind: 'form',
  schema: (state) => hoaSchema(hoaTerms(state), state),
  /** Store the review; a pending assessment adds the monthly 'special-assessment' housing line. No money moves. */
  complete(state, values, now = 0) {
    const t = hoaTerms(state);
    const a = t.assessment;
    state.paperwork.options.hoa = { association: t.association, reservePct: t.reservePct, reserveHealthy: t.reserveHealthy };
    const snap = state.choice.snapshot;
    const monthly = snap?.breakdown?.monthly;
    if (monthly && !monthly.some((l) => l.key === 'special-assessment')) {
      if (a) {
        state.paperwork.options.specialAssessment = { label: `Special assessment: ${a.reason}`, monthlyCents: a.monthlyCents,
          months: a.months, totalCents: a.totalCents };
        monthly.push({ key: 'special-assessment', label: 'Special assessment', cents: a.monthlyCents,
          note: `${a.reason}. ${money(a.monthlyCents)} a month for ${a.months} months.` });
        snap.monthlyCents += a.monthlyCents;
      }
    }
    addAgreement(state, { type: 'hoa', docType: 'hoa-review', title: `HOA documents (${t.association})`,
      counterparty: t.association, signedAt: now,
      summary: `Dues ${money(t.hoaCents)} a month; reserve ${t.reservePct}% funded`
        + (a ? `; special assessment ${money(a.monthlyCents)} a month for ${a.months} months.` : '; no pending assessment.'),
      terms: t, docValues: values });
    setStep(state, 'hoa-review', 'done', values, now);
    return { ok: true, shortfallCents: 0 };
  },
};
