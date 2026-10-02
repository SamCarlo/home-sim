// Land purchase (05 §3–§4, task 23). The seeded lot listing, the offer terms ($1,000 earnest money, a financing
// contingency on by default) and a signature. Completion pays the earnest money from savings (it counts toward the
// down payment), stores paperwork.options.land and a pending 'land' agreement (docType 'land-purchase').
import { BUILD } from '../../../config.js';
import { formatMoney } from '../../../finance/money.js';
import { charge, markUpfrontPaid, addAgreement, PAPERWORK_MONTH } from '../../../finance/ledger.js';
import { lotListing } from '../../../finance/build.js';
import { peopleFor } from '../../../content/names.js';
import { byId } from '../../../data/locations/index.js';
import { setStep } from '../flow.js';

/** Offer terms for the agreement and the read-only portfolio view: the listing plus seller, earnest money and place. */
export function landTerms(state) {
  const loc = byId[state.choice.locationId];
  return { ...lotListing(state), seller: peopleFor(state, 'lot-seller')[0], earnestCents: BUILD.earnestMoneyCents,
    place: loc.fullName };
}

const lavaText = (z) => (z == null ? 'Not in a lava hazard zone'
  : `Zone ${z}${z <= 2 ? ': high risk. Lava has covered land near here in the last 100 years.' : ''}`);

/** The land-purchase schema from terms (landTerms). */
export function landSchema(t) {
  const rows = [
    { item: 'Price', value: formatMoney(t.priceCents) },
    { item: 'Size', value: `${t.acres} acres (${t.widthFt} × ${t.depthFt} ft shown on the plan)` },
    { item: 'Zoning', value: t.zoning },
    { item: 'Lava zone', value: lavaText(t.lavaZone) },
    { item: 'Flood zone', value: t.floodZone },
    { item: 'Water', value: t.water },
    { item: 'Power', value: t.power },
    { item: 'Sewer', value: t.sewer },
    { item: 'Road access', value: t.road },
  ];
  return {
    id: 'land-purchase',
    title: 'Land purchase offer',
    intro: `Before you can build, you need land. This is the listing for a lot in ${t.place} from ${t.seller}. `
      + 'Read it carefully: what the lot is missing, you pay to add.',
    submitLabel: 'Sign the offer',
    sections: [
      { id: 'listing', title: '1. The lot', fields: [
        { id: 'listing', kind: 'table', label: 'Lot listing', columns: [{ key: 'item', label: 'Item' }, { key: 'value', label: 'Details' }],
          rows },
        { kind: 'info', tone: 'teach', label: 'Cheap land usually has a reason',
          text: 'Lots without county water, sewer or power cost less to buy, but you pay for a tank, a septic system and a '
            + 'power line later. Those are in your site-work cost.' },
      ] },
      { id: 'terms', title: '2. Your offer', fields: [
        { id: 'price', kind: 'computed', label: 'Offer price', width: 'half', format: 'money', compute: () => t.priceCents },
        { id: 'earnest', kind: 'computed', label: 'Earnest money (paid now)', width: 'half', format: 'money', compute: () => t.earnestCents },
        { kind: 'info', tone: 'note', label: 'What is earnest money?',
          text: 'A deposit that shows the seller you are serious. It is held by the escrow company and counts toward your '
            + 'down payment when the sale closes.' },
        { id: 'contingency', kind: 'checkbox', default: true,
          label: 'Financing contingency: if the bank turns down my construction loan, I get my earnest money back (recommended)' },
        { kind: 'info', tone: 'warn', label: 'Without the contingency',
          text: `If your loan is denied, the seller keeps your ${formatMoney(t.earnestCents)}. Sellers sometimes like that, but it is a risk for you.`,
          when: (v) => v.contingency === false },
      ] },
      { id: 'sign', title: '3. Signature', fields: [
        { id: 'signature', kind: 'signature', label: 'Signature', required: true },
      ] },
    ],
  };
}

export default {
  id: 'land-purchase',
  title: 'Land purchase',
  kind: 'form',
  schema: (state) => landSchema(landTerms(state)),
  /** Pay the earnest money (savings, then checking; counts toward the down payment), store the lot and the offer. */
  complete(state, values, now = 0) {
    const t = landTerms(state);
    const r = charge(state, 'savings', t.earnestCents, { month: PAPERWORK_MONTH, label: 'Earnest money for the lot (held in escrow)', category: 'housing' });
    if (!r.ok) return { ok: false, shortfallCents: r.shortfallCents };
    markUpfrontPaid(state, 'down-payment', t.earnestCents);
    const contingency = values.contingency !== false;
    state.paperwork.options.land = { ...t, contingency };
    addAgreement(state, { type: 'land', docType: 'land-purchase', title: `Land purchase offer (${t.acres} acres)`,
      counterparty: t.seller, signedAt: now,
      summary: `${formatMoney(t.priceCents)} lot; ${formatMoney(t.earnestCents)} earnest money; financing contingency `
        + (contingency ? 'on (refunded if the loan is denied).' : 'off (lost if the loan is denied).'),
      terms: t, docValues: { ...values, contingency } });
    setStep(state, 'land-purchase', 'done', { ...values, contingency }, now);
    return { ok: true, shortfallCents: 0 };
  },
};
