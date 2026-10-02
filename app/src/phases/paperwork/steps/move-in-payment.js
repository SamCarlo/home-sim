// Move-in payment authorization (05 §3–§4, task 20): the deposit plus first month, drawn from savings, charged only
// if approved. Nothing is charged here: results/commit (task 31) charge the still-unpaid upfront lines. Completion
// records the authorization in paperwork.options.moveIn.
import { formatMoney } from '../../../finance/money.js';
import { setStep } from '../flow.js';
import { cashOf } from '../../../finance/grid.js';
import { renterTerms, partiesFields } from './renterTerms.js';

/** Deposit + first month in cents for these terms. */
export const moveInTotal = (terms) => terms.depositCents + terms.firstMonthCents;

/** The authorization schema for renter terms. */
export function moveInSchema(terms) {
  const total = moveInTotal(terms);
  return {
    id: 'move-in-payment',
    title: 'Move-in payment authorization',
    intro: `Before you get the keys, ${terms.landlord} needs the security deposit and the first month’s rent. `
      + 'This form says you will pay them once you are approved.',
    submitLabel: 'Authorize payment',
    sections: [
      { id: 'parties', title: 'Payment to', fields: partiesFields(terms) },
      { id: 'amount', title: 'What you pay before move-in', fields: [
        { id: 'items', kind: 'table', label: 'Move-in costs', columns: [
          { key: 'item', label: 'Item' }, { key: 'cents', label: 'Amount', align: 'right', format: 'money' }],
        rows: [{ item: 'Security deposit (you get it back if you leave the place clean and undamaged)', cents: terms.depositCents },
          { item: 'First month’s rent', cents: terms.firstMonthCents },
          { item: 'Total', cents: total }] },
        { id: 'from', kind: 'computed', label: 'Paid from', width: 'half', compute: () => 'Savings (then checking)' },
        { id: 'after', kind: 'computed', label: 'Your savings and checking after', width: 'half', format: 'money',
          compute: (v, s) => (s ? cashOf(s) - total : 0) },
        { id: 'short', kind: 'info', tone: 'warn', label: 'Not enough saved',
          when: (v, s) => !!s && cashOf(s) < total,
          text: `You don’t have ${formatMoney(total)} yet. If you are approved, the payment can’t go through and you `
            + 'won’t get this place. You can still choose a cheaper home from the plan.' },
      ] },
      { id: 'sign', title: 'Authorize', fields: [
        { id: 'only-if-approved', kind: 'checkbox', required: true,
          label: `I understand ${formatMoney(total)} is charged only if my application is approved.` },
        { id: 'signature', kind: 'signature', label: 'Signature', required: true },
      ] },
    ],
  };
}

export default {
  id: 'move-in-payment',
  title: 'Move-in payment',
  kind: 'form',
  schema: (state) => moveInSchema(renterTerms(state)),
  /** Record the authorization (no money moves until commit); then mark done. */
  complete(state, values, now = 0) {
    const terms = renterTerms(state);
    state.paperwork.options.moveIn = { authorized: true, account: 'savings', depositCents: terms.depositCents,
      firstMonthCents: terms.firstMonthCents, totalCents: moveInTotal(terms) };
    setStep(state, 'move-in-payment', 'done', values, now);
    return { ok: true, shortfallCents: 0 };
  },
};
