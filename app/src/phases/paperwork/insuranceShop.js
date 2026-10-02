// Insurance shopping (05 §5, task 24): the shared screen for renters-insurance, condo-insurance and home-insurance.
// Three quote cards, hazard add-ons with explanations (required ones locked for buyers and builders, HPIA in Lava
// Zones 1–2, Florida's hurricane deductible), and the "if a loss happens" calculator. Buying calls onDone({quoteId,
// addOns}); the step's complete() runs choosePolicy (recurring draft + policy agreement + deductible).
import { h, clear } from '../../ui/dom.js';
import { formatMoney, dollarsToCents } from '../../finance/money.js';
import { INSURANCE } from '../../config.js';
import { insuranceOffer, chosenAddOns, policyMonthlyCents, outOfPocket, choosePolicy } from '../../finance/insurance.js';
import { businessFor } from '../../content/names.js';
import { setStep } from './flow.js';

const money = (c) => formatMoney(c);
const moneyC = (c) => formatMoney(c, { showCents: true });

function quoteCard(q, { chosen, readOnly, insurer, onPick }) {
  return h('div', { class: `pw-pick card pw-quote${chosen ? ' is-chosen' : ''}`, dataset: { quote: q.id } },
    h('p', { class: 'pw-kind' }, q.label),
    h('h3', null, insurer),
    h('p', { class: 'pw-pick-price' }, moneyC(q.premiumMonthlyCents), h('span', { class: 'pw-per' }, ' / month')),
    h('dl', { class: 'pw-bid-facts' },
      h('dt', null, 'Deductible'), h('dd', null, money(q.deductibleCents)),
      h('dt', null, 'Liability'), h('dd', null, money(q.liabilityCents)),
      h('dt', null, 'Per year'), h('dd', null, money(q.premiumMonthlyCents * 12))),
    h('p', { class: 'pw-quote-cover' }, q.coverage),
    q.extras.length ? h('ul', { class: 'pw-quote-extras' }, ...q.extras.map((x) => h('li', null, '+ ', x))) : null,
    readOnly ? (chosen ? h('p', { class: 'pw-lo-done' }, 'Your policy') : null)
      : h('button', { type: 'button', class: `btn ${chosen ? 'btn-primary' : 'btn-secondary'}`, 'aria-pressed': chosen ? 'true' : 'false',
        dataset: { pick: q.id }, onClick: () => onPick(q.id) }, chosen ? 'Chosen' : `Choose ${q.label}`));
}

function addOnRow(a, { checked, readOnly, onToggle }) {
  const id = `pw-addon-${a.type}`;
  return h('div', { class: `pw-addon${a.locked ? ' is-locked' : ''}`, dataset: { addon: a.type } },
    h('input', { type: 'checkbox', id, checked, disabled: readOnly || a.locked, onChange: (e) => onToggle(a.type, e.target.checked) }),
    h('label', { for: id },
      h('strong', null, `${a.label} coverage`), ' ', h('span', { class: 'pw-addon-price' }, `+${moneyC(a.monthlyCents)} / month`),
      a.locked ? h('span', { class: 'pw-chip' }, 'Required by your lender') : null,
      a.provider ? h('span', { class: 'pw-chip pw-chip-hpia' }, `From ${a.provider}, the only company that will insure here`) : null,
      h('span', { class: 'pw-addon-note' }, a.note)));
}

/** Mount the insurance shop for step `stepId` into `container` (05 §5). */
export function mountInsuranceShop(container, { store, status, values, onDone, onDraft }, stepId) {
  const state = store.getState();
  const readOnly = status === 'done' || status === 'skipped';
  const offer = insuranceOffer(state);
  const insurer = businessFor(state, 'insurers');
  const stored = state.paperwork.options.insurance;
  let quoteId = (readOnly && stored?.quoteId) || values.quoteId || INSURANCE.defaultQuote;
  let picked = readOnly && stored ? stored.addOns.map((a) => a.type) : [...(values.addOns ?? [])];
  let lossCents = INSURANCE.sampleLossCents;

  const grid = h('div', { class: 'pw-pick-grid' });
  const total = h('p', { class: 'pw-ins-total', 'aria-live': 'polite' });
  const calcOut = h('p', { class: 'pw-calc-out', 'aria-live': 'polite' });
  const lossInput = h('input', { type: 'text', inputmode: 'decimal', id: 'pw-loss', class: 'pw-calc-input', value: '3,000',
    onInput: (e) => { const c = dollarsToCents(e.target.value); if (c != null && c >= 0) { lossCents = c; update(); } } });

  const quote = () => offer.quotes.find((q) => q.id === quoteId);
  function update() {
    clear(grid).append(...offer.quotes.map((q) => quoteCard(q, { chosen: q.id === quoteId, readOnly, insurer,
      onPick: (id) => { quoteId = id; onDraft?.({ quoteId, addOns: picked }); update(); } })));
    const q = quote();
    const m = policyMonthlyCents(q, offer.addOns, picked);
    const extras = chosenAddOns(offer.addOns, picked);
    clear(total).append(h('strong', null, `Your policy: ${moneyC(m)} a month`), ` (${money(m * 12)} a year). `,
      `${q.label}${extras.length ? ` + ${extras.map((a) => a.label.toLowerCase()).join(' + ')}` : ''}, ${money(q.deductibleCents)} deductible.`);
    const r = outOfPocket(lossCents, q);
    clear(calcOut).append(`If a ${money(r.lossCents)} loss happens, you pay `, h('strong', null, money(r.youPayCents)),
      ' (your deductible) and insurance pays ', h('strong', null, money(r.insurerPaysCents)), '.');
  }

  const fl = offer.hurricaneDeductible;
  const required = offer.requiredBy === 'lease'
    ? 'Your lease requires renters insurance.' : 'Your lender won’t let you close without insurance.';
  container.append(h('section', { class: 'pw-ins card' },
    h('p', { class: 'pw-kind' }, 'Choice'),
    h('h2', { class: 'pw-step-title', tabindex: '-1' }, `${offer.title} (${offer.code})`),
    h('p', { class: 'pw-lo-intro' }, `${offer.title} covers ${offer.covers} ${required} ${insurer} sent you three quotes.`),
    h('div', { class: 'fm-info fm-info-teach' }, h('h4', null, 'Premium vs. deductible'),
      h('p', null, 'The premium is what you pay every month, no matter what. The deductible is what you pay yourself '
        + 'when something goes wrong, before insurance pays the rest. A cheaper premium means a bigger deductible.')),
    grid,
    offer.addOns.length ? h('fieldset', { class: 'pw-addons' },
      h('legend', null, 'Hazard coverage for this place'),
      h('p', { class: 'muted' }, offer.kind === 'renters'
        ? 'Regular policies leave these out. For renters they cover only your belongings, so they cost less.'
        : 'Regular policies leave these disasters out. You add them as separate coverage.'),
      ...offer.addOns.map((a) => addOnRow(a, { checked: a.locked || picked.includes(a.type), readOnly,
        onToggle: (type, on) => { picked = on ? [...new Set([...picked, type])] : picked.filter((t) => t !== type);
          onDraft?.({ quoteId, addOns: picked }); update(); } })))
      : h('p', { class: 'muted pw-addons-none' }, 'No extra hazard coverage is offered or needed here.'),
    offer.hpia && offer.kind !== 'renters' ? h('div', { class: 'fm-info fm-info-warn' }, h('h4', null, 'Lava Zone ' + offer.location.ownership.lavaZone),
      h('p', null, 'Most insurance companies won’t cover homes this close to Kīlauea’s rift zone. HPIA, a group set up by the '
        + 'state’s insurers, is the only company that will insure here, and your lender requires that coverage.')) : null,
    fl ? h('div', { class: 'fm-info fm-info-warn' }, h('h4', null, 'Florida hurricane deductible'),
      h('p', null, `Florida policies have a separate hurricane deductible of ${Math.round(fl.lowPct * 100)}–${Math.round(fl.highPct * 100)}% `
        + `of the home's value. On ${money(offer.valueCents)} that is ${money(fl.lowCents)} to ${money(fl.highCents)} out of your pocket `
        + 'after a hurricane, even with insurance.')) : null,
    h('div', { class: 'pw-calc' }, h('h3', null, 'What would you pay?'),
      h('label', { for: 'pw-loss' }, 'Size of the loss ($)'), lossInput, calcOut),
    total,
    readOnly ? h('p', { class: 'pw-lo-done' }, 'You bought this policy. It starts when your paperwork is approved.')
      : h('button', { type: 'button', class: 'btn btn-primary pw-buy', onClick: () => onDone({ quoteId, addOns: picked }) },
        'Buy this policy')));
  update();
  return () => {};
}

/** Read-only policy document from an agreement's terms (portfolio Agreements tab). */
export function policySchema(t = {}) {
  const rows = [
    { item: `${t.quoteLabel ?? ''} ${t.code ?? ''} premium`, cost: moneyC(t.premiumMonthlyCents ?? 0) },
    ...(t.addOns ?? []).map((a) => ({ item: `${a.label} coverage${a.provider ? ` (${a.provider})` : ''}`, cost: moneyC(a.monthlyCents) })),
    { item: 'Total each month', cost: moneyC(t.monthlyCents ?? 0) },
  ];
  const facts = [`Deductible: ${money(t.deductibleCents ?? 0)}`, `Liability: ${money(t.liabilityCents ?? 0)}`,
    `Coverage: ${t.coverage ?? ''}${t.extras?.length ? `, plus ${t.extras.join(', ').toLowerCase()}` : ''}`];
  if (t.hurricaneDeductible) facts.push(`Hurricane deductible: ${money(t.hurricaneDeductible.lowCents)}–${money(t.hurricaneDeductible.highCents)}`);
  return { id: 'insurance-policy', title: `${t.title ?? 'Insurance'} policy`, intro: `Insurer: ${t.insurer || 'Your insurer'}.`,
    sections: [{ id: 'policy', title: 'Your policy', fields: [
      { id: 'cost', kind: 'table', label: 'What you pay', columns: [{ key: 'item', label: 'Item' },
        { key: 'cost', label: 'Per month', align: 'right' }], rows },
      { id: 'facts', kind: 'info', label: 'Terms', text: facts },
    ] }] };
}

/** A step module that uses the shop: {id, title, kind 'choice', mount, complete}. */
export function insuranceStep({ id, title }) {
  return {
    id, title, kind: 'choice',
    mount: (container, ctx) => mountInsuranceShop(container, ctx, id),
    /** Store the policy (recurring draft, deductible, pending agreement) and mark the step done. */
    complete(state, values = {}, now = 0) {
      choosePolicy(state, values, { stepId: id, insurer: businessFor(state, 'insurers'), now });
      setStep(state, id, 'done', { quoteId: state.paperwork.options.insurance.quoteId,
        addOns: state.paperwork.options.insurance.addOns.map((a) => a.type) }, now);
      return { ok: true, shortfallCents: 0 };
    },
  };
}
