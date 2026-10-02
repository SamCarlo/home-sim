// Home inspection (05 §3–§4, task 22). Pick an inspector (Budget / Standard / Thorough), pay the fee, read the seeded
// report, then ask the seller for a repair credit, accept the home as-is, or walk away (the attempt is withdrawn).
// Findings the inspector missed are saved in paperwork.options.missedFindings ({month, label, cents}) and become
// surprise repairs in life months 2–8 (09 §7, task 44). Numbers live in finance/buying.js (pure).
import { h } from '../../../ui/dom.js';
import { confirmDialog } from '../../../ui/modal.js';
import { formatMoney } from '../../../finance/money.js';
import { charge, markUpfrontPaid, PAPERWORK_MONTH } from '../../../finance/ledger.js';
import { cashOf } from '../../../finance/grid.js';
import { BUYING } from '../../../config.js';
import { inspectionReport, creditAsk, repairCreditDecision } from '../../../finance/buying.js';
import { businessFor } from '../../../content/names.js';
import { setStep, upfrontLine, withdraw } from '../flow.js';

const money = (c) => formatMoney(c);
const SEVERITY_LABEL = { minor: 'Minor', moderate: 'Moderate', major: 'Major' };

/**
 * Hire inspector `inspectorId`: charge the fee (savings, then checking), mark the snapshot's inspection line paid, and
 * store the report in paperwork.options.inspection plus the misses in options.missedFindings. All or nothing.
 */
export function hireInspector(state, inspectorId) {
  const report = inspectionReport(state, inspectorId);
  const fee = report.inspector.feeCents;
  const r = charge(state, 'savings', fee, { month: PAPERWORK_MONTH, label: `Home inspection (${report.inspector.label})`, category: 'fees' });
  if (!r.ok) return { ok: false, shortfallCents: r.shortfallCents };
  const line = upfrontLine(state, 'inspection');
  const already = state.paperwork.paidUpfront?.inspection ?? 0;
  if (line && line.cents > already) markUpfrontPaid(state, 'inspection', line.cents - already);
  state.paperwork.options.inspection = { inspectorId, feeCents: fee, company: businessFor(state, 'inspectors'),
    found: report.found.map(({ id, label, severity, cents }) => ({ id, label, severity, cents })), decision: null, credit: null };
  state.paperwork.options.missedFindings = report.missedFindings;
  return { ok: true, shortfallCents: 0 };
}

/** Ask the seller for a repair credit (seeded): stores options.inspection.credit and options.repairCreditCents. */
export function requestRepairCredit(state) {
  const insp = state.paperwork.options.inspection;
  const d = repairCreditDecision(state, insp.found);
  insp.credit = d;
  state.paperwork.options.repairCreditCents = d.creditCents;
  return d;
}

function inspectorCards(state, onHire) {
  const cash = cashOf(state);
  return h('div', { class: 'pw-pick-grid' }, ...BUYING.inspection.inspectors.map((x) => h('div', { class: 'pw-pick card' },
    h('h3', null, x.label),
    h('p', { class: 'pw-pick-price' }, money(x.feeCents)),
    h('p', { class: 'pw-pick-stars', 'aria-label': `${x.stars} out of 5 stars` }, `★ ${x.stars}`),
    h('p', null, x.blurb),
    h('button', { type: 'button', class: 'btn btn-secondary', dataset: { inspector: x.id }, disabled: cash < x.feeCents,
      onClick: () => onHire(x.id) }, `Hire for ${money(x.feeCents)}`))));
}

function reportTable(insp) {
  if (!insp.found.length) return h('p', null, 'The inspector found no problems.');
  return h('table', { class: 'fm-table pw-findings' },
    h('caption', null, `Inspection report: ${insp.company}`),
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Problem'), h('th', { scope: 'col' }, 'How serious'),
      h('th', { scope: 'col', class: 'num' }, 'Repair estimate'))),
    h('tbody', null, ...insp.found.map((f) => h('tr', null, h('th', { scope: 'row' }, f.label),
      h('td', null, h('span', { class: `pw-sev is-${f.severity}` }, SEVERITY_LABEL[f.severity])),
      h('td', { class: 'num' }, money(f.cents))))));
}

function creditResult(c) {
  if (!c) return null;
  return h('div', { class: `fm-info fm-info-${c.accepted ? 'teach' : 'warn'} pw-credit-result` },
    h('h4', null, c.accepted ? 'The seller said yes' : 'The seller said no'),
    h('p', null, c.accepted
      ? `The seller gives you a ${money(c.creditCents)} credit at closing, so you need that much less cash to close. `
        + 'You will still have to get the repairs done after you move in.'
      : 'The seller won’t pay for repairs. You can still buy the home as-is, or walk away.'));
}

export default {
  id: 'home-inspection',
  title: 'Home inspection',
  kind: 'choice',
  upfrontKey: 'inspection',
  /** Hire → report → credit / accept / walk away. onDone({decision}) finishes the step. */
  mount(container, { store, status, onDone }) {
    const readOnly = status === 'done' || status === 'skipped';
    const root = h('section', { class: 'pw-insp card' });
    container.append(root);
    const error = h('p', { class: 'pw-error', role: 'alert', hidden: true });

    async function walkAway() {
      const ok = await confirmDialog({ title: 'Walk away from this home?',
        message: 'You stop buying this home and go back to planning. The inspection fee is not refunded.',
        confirmLabel: 'Yes, walk away', cancelLabel: 'Keep going' });
      if (ok) store.update((s) => withdraw(s, Date.now(), 'You walked away after the home inspection.'), { checkpoint: 'paperwork-withdrawn' });
    }

    function draw() {
      const s = store.getState();
      const insp = s.paperwork.options.inspection;
      const parts = [h('p', { class: 'pw-kind' }, 'Choice'), h('h2', { class: 'pw-step-title', tabindex: '-1' }, 'Home inspection')];
      if (!insp) {
        parts.push(h('p', { class: 'pw-lo-intro' }, 'A home inspector checks the roof, plumbing, wiring and more before you buy. '
          + 'A cheaper inspector is quicker, but may miss problems you would pay for later.'),
        inspectorCards(s, (id) => {
          let res = null;
          store.update((d) => { res = hireInspector(d, id); }, { checkpoint: 'paperwork-inspection-hired' });
          error.hidden = res.ok;
          error.textContent = res.ok ? '' : `You need ${money(res.shortfallCents)} more in the bank to hire this inspector.`;
          draw();
        }), error);
      } else {
        const x = BUYING.inspection.inspectors.find((i) => i.id === insp.inspectorId);
        const ask = creditAsk(insp.found);
        parts.push(h('p', { class: 'pw-lo-intro' }, `You hired ${insp.company} (${x.label}, ${money(insp.feeCents)}). Here is the report.`),
          reportTable(insp),
          insp.inspectorId !== 'thorough' ? h('p', { class: 'muted pw-insp-note' }, x.id === 'budget'
            ? 'A quick walk-through doesn’t check inside walls, under the house, for termites or down the sewer line.'
            : 'A standard inspection doesn’t include a termite check or a sewer camera.') : null,
          h('div', { class: 'fm-info fm-info-teach' }, h('h4', null, 'Your choices'), h('ul', null,
            h('li', null, `Ask for a repair credit: the seller takes ${money(ask.cents)} off what you pay at closing. `
              + 'Sellers say yes more often for serious problems.'),
            h('li', null, 'Accept the home as-is: you buy it and fix things yourself later.'),
            h('li', null, 'Walk away: you stop buying this home. The inspection fee is not refunded.'))),
          creditResult(insp.credit));
        if (readOnly) {
          parts.push(h('p', { class: 'pw-lo-done' }, insp.decision === 'credit' && insp.credit?.accepted
            ? `You got a ${money(insp.credit.creditCents)} repair credit.` : 'You accepted the home as-is.'));
        } else {
          parts.push(h('div', { class: 'pw-actions' },
            !insp.credit && ask.items.length ? h('button', { type: 'button', class: 'btn btn-primary', dataset: { act: 'credit' },
              onClick: () => { store.update((d) => { requestRepairCredit(d); }, { checkpoint: 'paperwork-repair-credit' }); draw(); } },
            `Ask for a ${money(ask.cents)} repair credit`) : null,
            h('button', { type: 'button', class: `btn ${insp.credit || !ask.items.length ? 'btn-primary' : 'btn-secondary'}`,
              dataset: { act: 'accept' }, onClick: () => onDone({ decision: insp.credit?.accepted ? 'credit' : 'accept' }) },
            insp.credit?.accepted ? 'Continue with the credit' : 'Accept the home as-is'),
            h('button', { type: 'button', class: 'btn btn-secondary pw-walk', dataset: { act: 'walk' }, onClick: walkAway }, 'Walk away')));
        }
      }
      root.replaceChildren(...parts.filter(Boolean));
    }
    draw();
    return () => {};
  },
  /** Finish after hiring: record the decision ('credit' | 'accept'). Refuses if no inspector was hired. */
  complete(state, values, now = 0) {
    const insp = state.paperwork.options.inspection;
    if (!insp) throw new Error('Hire an inspector first');
    insp.decision = values.decision === 'credit' && insp.credit?.accepted ? 'credit' : 'accept';
    setStep(state, 'home-inspection', 'done', { decision: insp.decision }, now);
    return { ok: true, shortfallCents: 0 };
  },
};
