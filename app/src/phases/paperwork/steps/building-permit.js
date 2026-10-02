// Building permit (05 §3–§4, task 23): the county checklist (site plan, setbacks, septic approval, energy code with
// the solar water heater in Hawaiʻi, catchment approval where there's no county water). Completion charges the permit
// fee and marks the snapshot's 'permits' upfront line paid; options.permit records it for underwriting (05 §7).
import { formatMoney } from '../../../finance/money.js';
import { byId } from '../../../data/locations/index.js';
import { permitChecklist } from '../../../finance/build.js';
import { completeStep, upfrontLine } from '../flow.js';

/** The permit schema for the chosen lot. */
export function permitSchema(state) {
  const loc = byId[state?.choice?.locationId];
  const fee = upfrontLine(state, 'permits')?.cents ?? loc?.housing?.build?.permitCents ?? 0;
  const items = permitChecklist(loc);
  return {
    id: 'building-permit',
    title: 'Building permit',
    intro: `Before anyone builds, the county checks your plans. Confirm each item is in your permit packet. The fee is `
      + `${formatMoney(fee)} and is not refunded if your loan falls through.`,
    submitLabel: `Pay ${formatMoney(fee)} and apply`,
    sections: [
      { id: 'checklist', title: '1. County checklist', fields: [
        ...items.map((it) => ({ id: `item-${it.id}`, kind: 'checkbox', required: true, requiredMessage: 'The county needs this item.',
          label: `${it.label}. ${it.why}` })),
        loc?.region === 'hawaii' ? { kind: 'info', tone: 'teach', label: 'Why a solar water heater?',
          text: 'Hawaiʻi makes almost all its electricity from imported oil, so power is expensive. Since 2010 the state '
            + 'has required a solar water heater on new single-family homes. Your blueprint includes one.' } : null,
      ].filter(Boolean) },
      { id: 'fee', title: '2. Fee and signature', fields: [
        { id: 'fee', kind: 'computed', label: 'Permit fee (paid now)', width: 'half', format: 'money', compute: () => fee },
        { id: 'signature', kind: 'signature', label: 'Signature', required: true },
      ] },
    ],
  };
}

export default {
  id: 'building-permit',
  title: 'Building permit',
  kind: 'form',
  upfrontKey: 'permits',
  schema: (state) => permitSchema(state),
  /** Charge the permit fee (marks 'permits' paid), store options.permit, mark done. All or nothing. */
  complete(state, values, now = 0) {
    const fee = (upfrontLine(state, 'permits')?.cents ?? 0) - (state.paperwork.paidUpfront?.permits ?? 0);
    const r = completeStep(state, 'building-permit', { values, upfrontKey: 'permits', feeLabel: 'Building permit fee', now });
    if (!r.ok) return r;
    const loc = byId[state.choice.locationId];
    state.paperwork.options.permit = { feeCents: Math.max(0, fee), items: permitChecklist(loc).map((i) => i.id), approved: true };
    return r;
  },
};
