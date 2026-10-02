// Insurance shopping (05 §5, task 24). Pure, integer cents. Three quotes (Basic / Standard / Premium) per policy kind,
// hazard add-ons from the location's ownership.hazardCoverage (required ones locked for buyers and builders), the HPIA
// lava-zone case, the Florida hurricane deductible note, and the "what you'd pay" calculator. choosePolicy stores the
// chosen policy (a recurring-expense draft + deductible) and a pending policy agreement.
import { FINANCE, INSURANCE } from '../config.js';
import { byId } from '../data/locations/index.js';
import { mulRate, sumCents, formatMoney } from './money.js';
import { buildProjectCost } from './costs.js';
import { addAgreement } from './ledgerRecords.js';

const monthlyOf = (annualCents) => mulRate(annualCents, 1 / 12);

export const HAZARD_LABELS = { hurricane: 'Hurricane', flood: 'Flood', lava: 'Lava and fire', wildfire: 'Wildfire',
  earthquake: 'Earthquake', windstorm: 'Windstorm' };

const KIND_INFO = {
  renters: { title: 'Renters insurance', code: 'HO-4', covers: 'your belongings and your liability. The landlord insures the building.' },
  condo: { title: 'Condo insurance', code: 'HO-6', covers: 'the inside of your unit, your belongings and your liability. The HOA insures the building.' },
  home: { title: 'Homeowners insurance', code: 'HO-3', covers: 'the house, your belongings and your liability.' },
};

/** Policy kind for a home type: 'renters' (apartment, shared), 'condo', or 'home' (house, build). */
export function policyKind(typeId) {
  if (typeId === 'apartment' || typeId === 'shared') return 'renters';
  return typeId === 'condo' ? 'condo' : 'home';
}

/** What the policy protects, in cents: the price paid (house), project cost (build), condo price; 0 for renters. */
export function insuredValueCents(state, location = byId[state.choice.locationId]) {
  const type = state.choice.homeTypeId;
  const o = state.paperwork?.options ?? {};
  if (type === 'house') return o.purchase?.priceCents ?? location.housing.house.priceCents;
  if (type === 'condo') return o.purchase?.priceCents ?? location.housing.condo.priceCents;
  if (type === 'build') return o.project?.projectCents ?? buildProjectCost(location.housing.build).projectCents;
  return 0;
}

/** Monthly base premium before the quote factor (05 §5; house/build scaled to the value like 04 §3). */
export function basePremiumMonthlyCents(location, typeId, valueCents = 0, config = FINANCE) {
  const o = location.ownership;
  const kind = policyKind(typeId);
  if (kind === 'renters') return o.rentersInsuranceMonthlyCents;
  if (kind === 'condo') return monthlyOf(o.condoInsuranceAnnualCents);
  const house = location.housing.house;
  const median = house.available ? house.priceCents : valueCents;
  const b = config.build;
  const scale = median > 0 && valueCents > 0 ? Math.min(b.insuranceScaleMax, Math.max(b.insuranceScaleMin, valueCents / median)) : 1;
  return monthlyOf(mulRate(o.homeInsuranceAnnualCents, scale));
}

/** The three quotes (05 §5 table): premium = base × factor; deductible by kind ('home' for condo/house/build). */
export function quotes(location, typeId, valueCents = 0, cfg = INSURANCE) {
  const kind = policyKind(typeId);
  const base = basePremiumMonthlyCents(location, typeId, valueCents);
  return cfg.quotes.map((q) => ({ id: q.id, label: q.label, premiumMonthlyCents: mulRate(base, q.factor),
    deductibleCents: q.deductibleCents[kind === 'renters' ? 'renters' : 'home'], liabilityCents: q.liabilityCents,
    coverage: q.coverage, extras: [...q.extras] }));
}

/** True when lava coverage here only comes from HPIA (Lava Zones 1–2). */
export function hpiaOnly(location, cfg = INSURANCE) {
  const z = location.ownership.lavaZone;
  return z != null && z <= cfg.hpiaMaxLavaZone;
}

/**
 * Hazard add-ons for this policy kind: {type, label, monthlyCents, annualCents, required, locked, note, provider}.
 * Required (`requiredForMortgage`) ones are locked on for buyers and builders; renters may pick any of them.
 */
export function addOns(location, typeId, cfg = INSURANCE) {
  const kind = policyKind(typeId);
  const hpia = hpiaOnly(location, cfg);
  return (location.ownership.hazardCoverage || []).map((hz) => {
    const annualCents = mulRate(hz.annualCents, cfg.addOnFactor[kind]);
    const required = kind !== 'renters' && !!hz.requiredForMortgage;
    return { type: hz.type, label: HAZARD_LABELS[hz.type] ?? hz.type, annualCents, monthlyCents: monthlyOf(annualCents),
      required, locked: required, note: hz.note,
      provider: hz.type === 'lava' && hpia ? cfg.hpiaName : null };
  });
}

/** Florida's separate hurricane deductible (2–5% of the dwelling), or null where it doesn't apply. */
export function hurricaneDeductible(location, typeId, valueCents, cfg = INSURANCE) {
  if (policyKind(typeId) === 'renters' || !cfg.hurricaneDeductibleStates.includes(location.state) || !valueCents) return null;
  const [lo, hi] = cfg.hurricaneDeductiblePct;
  return { lowPct: lo, highPct: hi, lowCents: mulRate(valueCents, lo), highCents: mulRate(valueCents, hi) };
}

/** Everything the shop screen needs for the current choice. */
export function insuranceOffer(state) {
  const location = byId[state.choice.locationId];
  const typeId = state.choice.homeTypeId;
  const kind = policyKind(typeId);
  const valueCents = insuredValueCents(state, location);
  return { location, typeId, kind, ...KIND_INFO[kind], valueCents, quotes: quotes(location, typeId, valueCents),
    addOns: addOns(location, typeId), hpia: hpiaOnly(location),
    hurricaneDeductible: hurricaneDeductible(location, typeId, valueCents),
    requiredBy: kind === 'renters' ? 'lease' : 'lender' };
}

/** The add-on types that end up on the policy: the picked ones plus every locked one, in data order. */
export function chosenAddOns(list, picked = []) {
  return list.filter((a) => a.locked || picked.includes(a.type));
}

/** Monthly total for a quote with these add-ons. */
export function policyMonthlyCents(quote, list, picked = []) {
  return sumCents(quote.premiumMonthlyCents, ...chosenAddOns(list, picked).map((a) => a.monthlyCents));
}

/** The mini calculator: for a loss of `lossCents`, you pay up to the deductible and insurance pays the rest. */
export function outOfPocket(lossCents, quote) {
  const loss = Math.max(0, Math.round(lossCents));
  const youPayCents = Math.min(loss, quote.deductibleCents);
  return { lossCents: loss, youPayCents, insurerPaysCents: loss - youPayCents };
}

/** Rewrite choice.snapshot's insurance lines to the chosen policy (base → 'insurance'/'renters-insurance', add-ons → 'hazard'). */
function applyToSnapshot(state, policy) {
  const snap = state.choice.snapshot;
  if (!snap?.breakdown) return;
  const monthly = snap.breakdown.monthly.filter((l) => l.key !== 'hazard');
  const key = policy.kind === 'renters' ? 'renters-insurance' : 'insurance';
  const base = monthly.find((l) => l.key === key);
  const label = `${policy.title} (${policy.quoteLabel})`;
  if (base) Object.assign(base, { cents: policy.premiumMonthlyCents, label });
  else monthly.push({ key, label, cents: policy.premiumMonthlyCents, note: '' });
  if (policy.addOnMonthlyCents > 0) {
    const i = monthly.indexOf(monthly.find((l) => l.key === key)) + 1;
    monthly.splice(i, 0, { key: 'hazard', label: `${policy.addOns.map((a) => a.label).join(' + ')} coverage`,
      cents: policy.addOnMonthlyCents, note: 'Hazard coverage you added to your policy.' });
  }
  snap.breakdown.monthly = monthly;
  snap.monthlyCents = sumCents(monthly.map((l) => l.cents));
}

/**
 * Choose a quote + add-ons (05 §5). Stores `paperwork.options.insurance` (the policy, with a `recurring` draft for
 * commit) and `options.deductibleCents`, updates the snapshot's insurance lines and adds a pending policy agreement
 * with docType `stepId`. Mutates the draft; returns the policy.
 */
export function choosePolicy(state, { quoteId = INSURANCE.defaultQuote, addOns: picked = [] } = {}, { stepId, insurer = '', now = 0 } = {}) {
  const offer = insuranceOffer(state);
  const quote = offer.quotes.find((q) => q.id === quoteId);
  if (!quote) throw new Error(`Unknown insurance quote "${quoteId}"`);
  const chosen = chosenAddOns(offer.addOns, picked);
  const addOnMonthlyCents = sumCents(...chosen.map((a) => a.monthlyCents));
  const monthlyCents = quote.premiumMonthlyCents + addOnMonthlyCents;
  const policy = {
    kind: offer.kind, title: offer.title, code: offer.code, insurer, quoteId: quote.id, quoteLabel: quote.label,
    premiumMonthlyCents: quote.premiumMonthlyCents, addOnMonthlyCents, monthlyCents,
    deductibleCents: quote.deductibleCents, liabilityCents: quote.liabilityCents, coverage: quote.coverage, extras: quote.extras,
    addOns: chosen.map((a) => ({ type: a.type, label: a.label, monthlyCents: a.monthlyCents, provider: a.provider })),
    valueCents: offer.valueCents, hurricaneDeductible: offer.hurricaneDeductible,
    recurring: { label: `${offer.title} (${quote.label})`, amountCents: -monthlyCents, category: 'insurance', source: 'insurance' },
  };
  const o = state.paperwork.options;
  o.insurance = policy;
  o.deductibleCents = policy.deductibleCents;
  applyToSnapshot(state, policy);
  const extra = policy.addOns.length ? ` + ${policy.addOns.map((a) => a.label.toLowerCase()).join(', ')}` : '';
  addAgreement(state, {
    type: 'insurance', docType: stepId, title: `${offer.title}: ${quote.label} policy`, counterparty: insurer, signedAt: now,
    summary: `${quote.label} ${offer.code}${extra}: ${formatMoney(monthlyCents, { showCents: true })} a month, `
      + `${formatMoney(quote.deductibleCents)} deductible. Starts when your paperwork is approved.`,
    terms: { ...policy, recurring: undefined }, docValues: { quoteId: quote.id, addOns: chosen.map((a) => a.type) },
  });
  return policy;
}
