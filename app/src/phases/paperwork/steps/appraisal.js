// Appraisal (05 §3–§4, task 22). The $600 fee is paid when the student orders it; the seeded value is price × 0.96–1.03.
// Below the price, the student pays the gap in cash (if affordable), asks the seller to lower the price (50%, seeded,
// one try) or walks away. The outcome is paperwork.options.purchase {priceCents, appraisedCents, gapCents, resolution},
// which finance/loanOptions.js uses for the loan (lenders lend on the lower of price and value) and cash to close.
import { h } from '../../../ui/dom.js';
import { confirmDialog } from '../../../ui/modal.js';
import { formatMoney } from '../../../finance/money.js';
import { byId } from '../../../data/locations/index.js';
import { loanOptions, findOption } from '../../../finance/loanOptions.js';
import { appraisalResult, canPayGap, sellerLowersDecision, resolvePurchase } from '../../../finance/buying.js';
import { setStep, payFee, upfrontLine, withdraw } from '../flow.js';

const money = (c) => formatMoney(c);

/** List price of the chosen home in cents. */
const listPrice = (state) => byId[state.choice.locationId].housing[state.choice.homeTypeId].priceCents;

/** Order the appraisal: pay the fee (all or nothing) and store options.appraisal = {priceCents, appraisedCents, gapCents}. */
export function orderAppraisal(state) {
  const line = upfrontLine(state, 'appraisal');
  const paid = state.paperwork.paidUpfront?.appraisal ?? 0;
  const r = payFee(state, { lineKey: 'appraisal', cents: (line?.cents ?? 0) - paid, label: 'Appraisal' });
  if (!r.ok) return r;
  const a = appraisalResult(state, listPrice(state));
  state.paperwork.options.appraisal = { ...a, sellerAsked: null };
  if (a.gapCents === 0) state.paperwork.options.purchase = resolvePurchase(a, 'at-value');
  return { ok: true, shortfallCents: 0 };
}

/** Can this player pay the gap? → {ok, needCents, cashCents} using the chosen loan's cash to close. */
export function gapAffordability(state) {
  const a = state.paperwork.options.appraisal;
  const r = loanOptions(state);
  const o = findOption(r, state.paperwork.options);
  const cashToCloseCents = o?.cashToCloseCents ?? 0;
  return { ok: canPayGap({ cashCents: r.cashCents, cashToCloseCents, gapCents: a.gapCents }),
    needCents: cashToCloseCents + a.gapCents, cashCents: r.cashCents };
}

/** Ask the seller to lower the price (one try): stores the answer; a yes sets options.purchase. */
export function askSeller(state) {
  const a = state.paperwork.options.appraisal;
  const d = sellerLowersDecision(state);
  a.sellerAsked = d;
  if (d.agreed) state.paperwork.options.purchase = resolvePurchase(a, 'seller-lowered');
  return d;
}

/** Pay the gap in cash: options.purchase keeps the price, the gap goes into cash to close. */
export function payGap(state) {
  state.paperwork.options.purchase = resolvePurchase(state.paperwork.options.appraisal, 'pay-gap');
}

function resolutionText(p) {
  if (!p) return null;
  if (p.resolution === 'at-value') return 'The home appraised at or above the price. Nothing more to do.';
  if (p.resolution === 'seller-lowered') return `The seller lowered the price to ${money(p.priceCents)}.`;
  return `You will pay the ${money(p.gapCents)} gap in cash at closing.`;
}

export default {
  id: 'appraisal',
  title: 'Appraisal',
  kind: 'choice',
  upfrontKey: 'appraisal',
  mount(container, { store, status, onDone }) {
    const readOnly = status === 'done' || status === 'skipped';
    const root = h('section', { class: 'pw-appr card' });
    const error = h('p', { class: 'pw-error', role: 'alert', hidden: true });
    container.append(root);
    const act = (fn, checkpoint) => { store.update((d) => { fn(d); }, { checkpoint }); draw(); };

    async function walkAway() {
      const ok = await confirmDialog({ title: 'Walk away from this home?',
        message: 'You stop buying this home and go back to planning. The inspection and appraisal fees are not refunded.',
        confirmLabel: 'Yes, walk away', cancelLabel: 'Keep going' });
      if (ok) store.update((s) => withdraw(s, Date.now(), 'You walked away after the appraisal came in low.'), { checkpoint: 'paperwork-withdrawn' });
    }

    function draw() {
      const s = store.getState();
      const a = s.paperwork.options.appraisal;
      const p = s.paperwork.options.purchase;
      const parts = [h('p', { class: 'pw-kind' }, 'Choice'), h('h2', { class: 'pw-step-title', tabindex: '-1' }, 'Appraisal'),
        h('p', { class: 'pw-lo-intro' }, 'The bank won’t lend more than a home is worth. An appraiser compares this home with '
          + 'similar homes that sold nearby and reports its value. You pay the fee.')];
      if (!a) {
        const fee = upfrontLine(s, 'appraisal')?.cents ?? 0;
        parts.push(h('button', { type: 'button', class: 'btn btn-primary', dataset: { act: 'order' }, onClick: () => {
          let res = null;
          store.update((d) => { res = orderAppraisal(d); }, { checkpoint: 'paperwork-appraisal-ordered' });
          error.hidden = res.ok;
          error.textContent = res.ok ? '' : `You need ${money(res.shortfallCents)} more in the bank to pay for the appraisal.`;
          draw();
        } }, `Order the appraisal (${money(fee)})`), error);
        root.replaceChildren(...parts);
        return;
      }
      const low = a.gapCents > 0;
      parts.push(h('dl', { class: 'pw-lo-facts' },
        h('div', null, h('dt', null, 'Price you offered'), h('dd', null, money(a.priceCents))),
        h('div', null, h('dt', null, 'Appraised value'), h('dd', { class: low ? 'pw-bad' : 'pw-good' }, money(a.appraisedCents))),
        h('div', null, h('dt', null, 'Gap'), h('dd', null, low ? money(a.gapCents) : 'None'))));
      if (low) {
        parts.push(h('div', { class: 'fm-info fm-info-warn' }, h('h4', null, 'The appraisal came in low'),
          h('p', null, `The bank will lend based on ${money(a.appraisedCents)}, not ${money(a.priceCents)}. `
            + `Someone has to cover the ${money(a.gapCents)} difference.`)));
      }
      if (a.sellerAsked && !a.sellerAsked.agreed) {
        parts.push(h('div', { class: 'fm-info fm-info-warn' }, h('h4', null, 'The seller said no'),
          h('p', null, 'The seller won’t lower the price. You can pay the gap yourself or walk away.')));
      }
      if (p) parts.push(h('p', { class: 'pw-lo-done' }, resolutionText(p)));
      if (!readOnly && !p && low) {
        const g = gapAffordability(s);
        parts.push(h('div', { class: 'pw-actions' },
          h('button', { type: 'button', class: 'btn btn-secondary', dataset: { act: 'pay-gap' }, disabled: !g.ok,
            onClick: () => act(payGap, 'paperwork-appraisal-gap') }, `Pay the ${money(a.gapCents)} gap`),
          a.sellerAsked ? null : h('button', { type: 'button', class: 'btn btn-primary', dataset: { act: 'ask' },
            onClick: () => act(askSeller, 'paperwork-appraisal-ask') }, 'Ask the seller to lower the price'),
          h('button', { type: 'button', class: 'btn btn-secondary pw-walk', dataset: { act: 'walk' }, onClick: walkAway }, 'Walk away')),
        g.ok ? null : h('p', { class: 'pw-lo-why' }, `To pay the gap you would need ${money(g.needCents)} to close, `
          + `but you have ${money(g.cashCents)}.`));
      }
      if (!readOnly && p) {
        parts.push(h('button', { type: 'button', class: 'btn btn-primary', dataset: { act: 'continue' },
          onClick: () => onDone({ resolution: p.resolution }) }, 'Continue'));
      }
      root.replaceChildren(...parts.filter(Boolean));
    }
    draw();
    return () => {};
  },
  /** Finish once the purchase is settled (options.purchase). */
  complete(state, values, now = 0) {
    const p = state.paperwork.options.purchase;
    if (!p) throw new Error('Settle the appraisal first');
    setStep(state, 'appraisal', 'done', { resolution: p.resolution }, now);
    return { ok: true, shortfallCents: 0 };
  },
};
