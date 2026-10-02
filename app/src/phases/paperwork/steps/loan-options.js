// Loan options (05 §3–§4, task 21): a live comparison of FHA 3.5% and conventional 5/10/20% down at 15 and 30 years.
// The numbers come from finance/loanOptions.js (pure); this module only draws them. Options the student can't use are
// disabled with the reason. Choosing one stores paperwork.options.{program, downPaymentPct, termYears}.
import { h } from '../../../ui/dom.js';
import { formatMoney } from '../../../finance/money.js';
/** "6.875%": rates keep three decimals (pctText rounds to two). */
const pctText = (rate) => `${+(rate * 100).toFixed(3)}%`;
import { loanOptions, findOption, optionKey, optionLabel, PROGRAM_LABELS } from '../../../finance/loanOptions.js';
import { setStep } from '../flow.js';

const money = (c) => formatMoney(c);

function summary(r) {
  const tierNote = !r.tier ? 'too low for any loan'
    : r.tier.rateAdj > 0 ? `adds ${pctText(r.tier.rateAdj)} to your rate`
      : r.tier.rateAdj < 0 ? `takes ${pctText(-r.tier.rateAdj)} off your rate` : 'gets the normal rate';
  const fixed = r.fixedLines.map((l) => `${l.label} ${money(l.cents)}`).join(' · ');
  return h('dl', { class: 'pw-lo-facts' },
    h('div', null, h('dt', null, 'Price'), h('dd', null, money(r.priceCents))),
    h('div', null, h('dt', null, 'Your savings + checking'), h('dd', null, money(r.cashCents))),
    h('div', null, h('dt', null, 'Credit score'), h('dd', null, `${r.score} (${tierNote})`)),
    h('div', null, h('dt', null, 'Every option also pays'), h('dd', null, `${money(r.fixedCents)}/mo: ${fixed}`)));
}

function teach(r) {
  const items = [
    'A bigger down payment means a smaller loan, a smaller monthly payment, and no PMI at 20%.',
    'A 15-year loan costs more each month but has a lower rate, so you pay far less interest in total.',
    'FHA loans let you put down only 3.5%, but add 1.75% to the loan up front and charge mortgage insurance (MIP) every month.',
    'Cash to close = down payment + closing costs + inspection and appraisal + 2 months of payments the bank wants left in your account.',
  ];
  if (r.strictLava) {
    items.unshift(`This home is in Lava Zone ${r.lavaZone}. FHA won’t insure homes in Lava Zones 1–2, and regular lenders want at least 20% down.`);
  }
  return h('div', { class: `fm-info fm-info-${r.strictLava ? 'warn' : 'teach'} pw-lo-teach` },
    h('h4', null, r.strictLava ? 'Lava zone rules' : 'How to read this table'),
    h('ul', null, ...items.map((t) => h('li', null, t))));
}

function badge(text, cls) {
  return h('span', { class: `pw-lo-badge ${cls}` }, text);
}

function row(o, r, { selected, readOnly, onPick }) {
  const disabled = !!o.disabledReason;
  const id = `lo-${o.key}`;
  const mi = o.insuranceKind ? `${money(o.mortgageInsuranceCents)} ${o.insuranceKind === 'mip' ? 'MIP' : 'PMI'}` : 'None';
  const badges = [o.key === r.cheapestMonthlyKey ? badge('Lowest monthly', 'is-monthly') : null,
    o.key === r.leastInterestKey ? badge('Least interest', 'is-interest') : null].filter(Boolean);
  return h('tr', { class: `pw-lo-row${disabled ? ' is-disabled' : ''}${selected ? ' is-selected' : ''}`
    + `${badges.length ? ' is-best' : ''}`, dataset: { key: o.key } },
  h('th', { scope: 'row' },
    h('label', { class: 'pw-lo-pick', for: id },
      h('input', { type: 'radio', name: 'loan-option', id, value: o.key, checked: selected,
        disabled: disabled || readOnly, onChange: () => onPick(o.key) }),
      h('span', null,
        h('strong', null, `${PROGRAM_LABELS[o.program]} ${+(o.downPaymentPct * 100).toFixed(1)}% · ${o.termYears} yr`),
        h('span', { class: 'pw-lo-rate' }, `${pctText(o.rate)} fixed`),
        ...badges)),
    disabled ? h('span', { class: 'pw-lo-why' }, o.disabledReason) : null),
  h('td', null, money(o.downCents)),
  h('td', null, money(o.loanCents), o.upfrontMipCents ? h('span', { class: 'pw-lo-sub' }, `incl. ${money(o.upfrontMipCents)} MIP`) : null),
  h('td', null, money(o.piCents)),
  h('td', null, mi),
  h('td', { class: 'pw-lo-strong' }, money(o.housingCents)),
  h('td', null, money(o.totalInterestCents)),
  h('td', { class: 'pw-lo-strong' }, money(o.cashToCloseCents)));
}

function breakdown(o, r) {
  if (!o) return h('p', { class: 'pw-lo-detail muted' }, 'Pick a loan to see how its numbers add up.');
  const gross = r.grossCents;
  const front = gross ? o.housingCents / gross : 0;
  return h('div', { class: 'pw-lo-detail' },
    h('h3', null, optionLabel(o)),
    h('ul', null,
      h('li', null, `Monthly: ${money(o.piCents)} principal & interest`
        + `${o.mortgageInsuranceCents ? ` + ${money(o.mortgageInsuranceCents)} ${o.insuranceKind === 'mip' ? 'FHA MIP' : 'PMI'}` : ''}`
        + ` + ${money(o.fixedCents)} tax and insurance = ${money(o.housingCents)}.`),
      h('li', null, `Cash to close: ${money(o.downCents)} down + ${money(o.closingCents)} closing costs + `
        + `${money(o.feesCents)} inspection and appraisal + ${money(o.reservesCents)} reserves (2 months) = ${money(o.cashToCloseCents)}.`),
      h('li', null, `Over ${o.termYears} years you pay ${money(o.totalInterestCents)} in interest on a ${money(o.loanCents)} loan.`),
      gross ? h('li', null, `Housing is ${Math.round(front * 100)}% of your estimated gross pay (${money(gross)}). `
        + 'Lenders like 36% or less.') : null));
}

export default {
  id: 'loan-options',
  title: 'Loan options',
  kind: 'choice',
  /** Draw the comparison; onDone({program, downPaymentPct, termYears}) when the student chooses. */
  mount(container, { state, status, values, onDone, onDraft }) {
    const r = loanOptions(state);
    const readOnly = status === 'done' || status === 'skipped';
    const stored = readOnly ? state.paperwork.options : values;
    let picked = findOption(r, stored)?.key ?? null;
    if (picked && !readOnly && r.options.find((o) => o.key === picked)?.disabledReason) picked = null;

    const tbody = h('tbody');
    const detail = h('div');
    const choose = h('button', { type: 'button', class: 'btn btn-primary pw-lo-choose', disabled: true,
      onClick: () => {
        const o = r.options.find((x) => x.key === picked);
        if (o) onDone({ program: o.program, downPaymentPct: o.downPaymentPct, termYears: o.termYears });
      } }, 'Choose this loan');

    function draw() {
      tbody.replaceChildren(...r.options.map((o) => row(o, r, { selected: o.key === picked, readOnly, onPick })));
      const o = r.options.find((x) => x.key === picked);
      detail.replaceChildren(breakdown(o, r));
      choose.disabled = !o || !!o.disabledReason;
    }
    function onPick(key) {
      picked = key;
      const o = r.options.find((x) => x.key === key);
      onDraft?.({ program: o.program, downPaymentPct: o.downPaymentPct, termYears: o.termYears });
      draw();
    }

    const none = !r.options.some((o) => !o.disabledReason);
    container.append(h('section', { class: 'pw-lo card' },
      h('p', { class: 'pw-kind' }, 'Choice'),
      h('h2', { class: 'pw-step-title', tabindex: '-1' }, 'Loan options'),
      h('p', { class: 'pw-lo-intro' }, 'The bank offers several ways to borrow for this home. Compare what each one costs '
        + 'every month, in total interest, and in cash on closing day. Then pick one.'),
      summary(r), teach(r),
      h('div', { class: 'pw-lo-wrap' }, h('table', { class: 'pw-lo-table' },
        h('caption', { class: 'sr-only' }, 'Loan options by down payment and term'),
        h('thead', null, h('tr', null, ...['Loan', 'Down payment', 'Loan amount', 'Principal & interest', 'PMI / MIP',
          'Housing / month', 'Total interest', 'Cash to close'].map((t) => h('th', { scope: 'col' }, t)))),
        tbody)),
      detail,
      none && !readOnly ? h('div', { class: 'fm-info fm-info-warn' }, h('h4', null, 'No loan fits yet'),
        h('p', null, 'None of these loans works with your cash and credit right now. You can choose a different home.')) : null,
      readOnly ? h('p', { class: 'pw-lo-done' }, picked ? `You chose: ${optionLabel(r.options.find((o) => o.key === picked))}.`
        : 'Done.') : choose));
    draw();
    return () => {};
  },
  /** Store the choice (must be an option the student can use); no money moves until closing. */
  complete(state, values, now = 0) {
    const o = findOption(loanOptions(state), values);
    if (!o) throw new Error(`Unknown loan option ${values && optionKey(values)}`);
    if (o.disabledReason) return { ok: false, shortfallCents: o.shortCents };
    state.paperwork.options.program = o.program;
    state.paperwork.options.downPaymentPct = o.downPaymentPct;
    state.paperwork.options.termYears = o.termYears;
    setStep(state, 'loan-options', 'done', { program: o.program, downPaymentPct: o.downPaymentPct, termYears: o.termYears }, now);
    return { ok: true, shortfallCents: 0 };
  },
};
