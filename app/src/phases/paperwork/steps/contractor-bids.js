// Contractor bids (05 §3–§4, task 23): three fictional bids for the chosen tier. A is cheap, slow and unwarrantied;
// B is the local price; C costs 10% more and uses up the contingency but is fast with a 2-year warranty. Choosing A
// stores a seeded risk (extra months of temporary housing, a defect in life months 1–6) and the lender docks it (05 §7).
// Stores options.contractorId, options.bid and options.contractorRisk; re-snapshots the project for the bid.
import { h } from '../../../ui/dom.js';
import { formatMoney } from '../../../finance/money.js';
import { BUILD } from '../../../config.js';
import { byId } from '../../../data/locations/index.js';
import { contractorBids, contractorRisk, projectCost, refreshBuildSnapshot, tierOf } from '../../../finance/build.js';
import { namesFor, regionOf, nameRng } from '../../../content/names.js';
import { setStep } from '../flow.js';

const money = (c) => formatMoney(c);

/** The bids with seeded company names for this attempt. */
export function bidsFor(state) {
  const companies = nameRng(state, 'contractors').shuffle(namesFor(regionOf(state)).contractors);
  return contractorBids(state, companies);
}

function bidCard(state, bid, { chosen, readOnly, onPick }) {
  const loc = byId[state.choice.locationId];
  const o = state.paperwork.options;
  const p = projectCost(loc, { tierId: o.buildTier ?? BUILD.defaultTier, bidId: bid.id });
  const delta = bid.deltaCents === 0 ? 'The local price' : `${bid.deltaCents < 0 ? '' : '+'}${money(bid.deltaCents)} vs the local price`;
  return h('div', { class: `pw-pick card pw-bid${chosen ? ' is-chosen' : ''}${bid.risky ? ' is-risky' : ''}`, dataset: { bid: bid.id } },
    h('p', { class: 'pw-kind' }, bid.label),
    h('h3', null, bid.company),
    h('p', { class: 'pw-pick-price' }, money(bid.priceCents)),
    h('p', { class: 'muted' }, delta),
    h('dl', { class: 'pw-bid-facts' },
      h('dt', null, 'Time to build'), h('dd', null, `${bid.months} months`),
      h('dt', null, 'Reviews'), h('dd', { 'aria-label': `${bid.stars} out of 5 stars` }, `★ ${bid.stars}`),
      h('dt', null, 'Warranty'), h('dd', null, bid.warrantyYears ? `${bid.warrantyYears} year${bid.warrantyYears > 1 ? 's' : ''}` : 'None'),
      h('dt', null, 'Your project'), h('dd', null, money(p.project.projectCents)),
      h('dt', null, 'Cash needed'), h('dd', null, money(p.cashNeededCents))),
    bid.flags.length ? h('ul', { class: 'pw-flags' }, ...bid.flags.map((f) => h('li', null, '⚠ ', f))) : null,
    readOnly ? (chosen ? h('p', { class: 'pw-lo-done' }, 'Your builder') : null)
      : h('button', { type: 'button', class: `btn ${bid.id === 'b' ? 'btn-primary' : 'btn-secondary'}`, dataset: { pick: bid.id },
        onClick: () => onPick(bid.id) }, `Choose ${bid.label}`));
}

export default {
  id: 'contractor-bids',
  title: 'Contractor bids',
  kind: 'choice',
  /** Three bid cards; onDone({contractorId}) picks one. */
  mount(container, { store, status, onDone }) {
    const s = store.getState();
    const readOnly = status === 'done' || status === 'skipped';
    const tier = tierOf(s.paperwork.options.buildTier ?? BUILD.defaultTier);
    const chosen = s.paperwork.options.contractorId;
    const risk = s.paperwork.options.contractorRisk;
    container.append(h('section', { class: 'pw-bids card' },
      h('p', { class: 'pw-kind' }, 'Choice'),
      h('h2', { class: 'pw-step-title', tabindex: '-1' }, 'Contractor bids'),
      h('p', { class: 'pw-lo-intro' }, `Three builders bid on your ${tier.label.toLowerCase()} house `
        + `(${tier.sqft.toLocaleString('en-US')} sq ft). The price is for the building only; your lot and site work stay the same.`),
      h('div', { class: 'pw-pick-grid' }, ...bidsFor(s).map((b) => bidCard(s, b, { chosen: b.id === chosen, readOnly,
        onPick: (id) => onDone({ contractorId: id }) }))),
      h('div', { class: 'fm-info fm-info-teach' }, h('h4', null, 'The cheapest bid isn’t always the best'),
        h('p', null, 'A slow builder means more months paying rent and construction interest. No warranty means you pay '
          + 'for anything they get wrong. Banks look at your builder too.')),
      readOnly && risk ? h('p', { class: 'fm-info fm-info-warn' }, `Your builder is running late: about ${risk.extraMonths} extra `
        + `month${risk.extraMonths > 1 ? 's' : ''} of temporary housing are now in your costs.`) : null));
    return () => {};
  },
  /** Store the chosen bid (and Bid A's seeded risk), then re-snapshot the project. */
  complete(state, values, now = 0) {
    const bid = bidsFor(state).find((b) => b.id === values.contractorId);
    if (!bid) throw new Error(`Unknown bid "${values.contractorId}"`);
    const o = state.paperwork.options;
    o.contractorId = bid.id;
    o.bid = { id: bid.id, company: bid.company, priceCents: bid.priceCents, adjPct: bid.adjPct, months: bid.months,
      stars: bid.stars, warrantyYears: bid.warrantyYears };
    if (bid.risky) o.contractorRisk = contractorRisk(state);
    else delete o.contractorRisk;
    refreshBuildSnapshot(state);
    setStep(state, 'contractor-bids', 'done', { contractorId: bid.id }, now);
    return { ok: true, shortfallCents: 0 };
  },
};
