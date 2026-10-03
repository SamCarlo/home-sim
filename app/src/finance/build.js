// Builder paperwork numbers (05 §4 land-purchase … site-utilities, 04 §3 project cost, 07 §5 design budget; task 23).
// Pure, integer cents. The project cost per tier reuses costs.js (cellCost with the tier's sq ft, the bid's price per
// sq ft and the bid's months), so the plan table, the loan application and commit all agree on one formula.
import { FINANCE, BUILD } from '../config.js';
import { byId } from '../data/locations/index.js';
import { mulRate, sumCents } from './money.js';
import { cellCost } from './costs.js';
import { buyingRng } from './buying.js';

/** Budget tier `id` from BUILD.tiers ({id, label, sqft, blurb}); throws on unknown ids. */
export function tierOf(id, cfg = BUILD) {
  const t = cfg.tiers.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown build tier "${id}"`);
  return t;
}

/** Contractor bid `id` from BUILD.bids, or null. */
export const bidOf = (id, cfg = BUILD) => cfg.bids.find((b) => b.id === id) ?? null;

/** Design budget (05 §4): tier sq ft × local cost per sq ft × 1.10, in cents. What the blueprint may spend. */
export function designBudgetCents(location, tierId, cfg = BUILD) {
  return mulRate(tierOf(tierId, cfg).sqft * location.housing.build.buildCostPerSqftCents, cfg.designBudgetFactor);
}

/** Months a bid takes here: the bid's months scaled by this location's monthsToBuild ÷ 12 (at least 4). */
export function bidMonths(location, bid) {
  return Math.max(4, Math.round(bid.months * location.housing.build.monthsToBuild / 12));
}

/**
 * The whole project for a tier (04 §3 with the tier's sq ft): cellCost(…'build') plus {tier, sqft, months,
 * designBudgetCents, cashNeededCents}. `bidId` applies the bid's price change to the cost per sq ft and its months;
 * `extraMonths` adds delay (Bid A's risk) to temporary housing and construction interest.
 */
export function projectCost(location, { tierId = BUILD.defaultTier, bidId = null, extraMonths = 0 } = {}, config = FINANCE, cfg = BUILD) {
  const tier = tierOf(tierId, cfg);
  const b = location.housing.build;
  const bid = bidOf(bidId, cfg);
  const months = (bid ? bidMonths(location, bid) : b.monthsToBuild) + extraMonths;
  const cps = bid ? mulRate(b.buildCostPerSqftCents, 1 + bid.adjPct) : b.buildCostPerSqftCents;
  const loc = { ...location, housing: { ...location.housing, build: { ...b, buildCostPerSqftCents: cps, monthsToBuild: months } } };
  const cost = cellCost(loc, 'build', { ...config, build: { ...config.build, sqft: tier.sqft } });
  return { ...cost, tier, sqft: tier.sqft, months, designBudgetCents: designBudgetCents(location, tierId, cfg),
    cashNeededCents: cost.upfrontCents };
}

/** All three tiers side by side for the loan application: [{tier, cost}] (cost = projectCost). */
export function tierTable(location, opts = {}, config = FINANCE, cfg = BUILD) {
  return cfg.tiers.map((tier) => ({ tier, cost: projectCost(location, { ...opts, tierId: tier.id }, config, cfg) }));
}

/** The project as the player has set it up so far (tier, bid, Bid A delay), or the default tier. */
export function projectFor(state, config = FINANCE, cfg = BUILD) {
  const o = state.paperwork?.options ?? {};
  return projectCost(byId[state.choice.locationId], { tierId: o.buildTier ?? cfg.defaultTier, bidId: o.contractorId ?? null,
    extraMonths: o.contractorRisk?.extraMonths ?? 0 }, config, cfg);
}

/**
 * Rewrite choice.snapshot from projectFor(state) so commit (task 31) and underwriting (task 29) see the chosen tier and
 * bid, with the site-utilities monthly effect folded into the utilities line. Mutates the draft; returns the project.
 */
export function refreshBuildSnapshot(state, config = FINANCE, cfg = BUILD) {
  const p = projectFor(state, config, cfg);
  const o = state.paperwork.options;
  const copy = (lines) => lines.map(({ key, label, cents, note }) => ({ key, label, cents, note }));
  const monthly = copy(p.monthly);
  const delta = o.siteUtilities?.monthlyDeltaCents ?? 0;
  const util = monthly.find((l) => l.key === 'utilities');
  if (util && delta) {
    util.cents = Math.max(0, util.cents + delta);
    util.label = `${util.label}, ${o.siteUtilities.summary}`;
  }
  const snap = state.choice.snapshot;
  snap.breakdown = { upfront: copy(p.upfront), monthly };
  snap.upfrontCents = sumCents(p.upfront.map((l) => l.cents));
  snap.monthlyCents = sumCents(monthly.map((l) => l.cents));
  o.project = { ...p.project, sqft: p.sqft, months: p.months };
  return p;
}

// ---------- Land purchase ----------

/**
 * The seeded lot listing (05 §4 land-purchase): {priceCents, acres, widthFt, depthFt, zoning, lavaZone, floodZone,
 * water, power, powerFt, sewer, septicRequired, road}. Pāhoa's lava zone is 1 or 2.
 */
export function lotListing(state, cfg = BUILD) {
  const location = byId[state.choice.locationId];
  const b = location.housing.build;
  const rng = buyingRng(state, 'lot');
  const [lo, hi] = cfg.lot.acresScale;
  const acres = Math.max(0.1, Math.round(b.lotAcres * rng.float(lo, hi) * 100) / 100);
  const rural = location.settlement === 'rural';
  const lavaZone = location.id === 'pahoa' ? rng.int(1, 2) : (location.ownership.lavaZone ?? null);
  const flood = rng.chance(cfg.lot.floodChance);
  const powerFt = Math.round(rng.int(...cfg.lot.powerFt) / 10) * 10;
  const septicRequired = location.sewer !== 'municipal';
  const road = rural && rng.chance(cfg.lot.gravelChance) ? 'Gravel road, shared upkeep with neighbors' : 'Paved county road';
  return {
    priceCents: b.lotPriceCents, acres, widthFt: b.lotWidthFt, depthFt: b.lotDepthFt,
    zoning: rural ? (acres >= 1 ? 'Agricultural (A-1a): a house and farming allowed' : 'Residential (RS-10)') : 'Residential (RS-7.5)',
    lavaZone, floodZone: flood ? 'AE: floods in heavy storms (flood insurance advised)' : 'X: low flood risk',
    water: WATER_TEXT[location.water] ?? WATER_TEXT.municipal, powerFt,
    power: `Grid power: the nearest pole is ${powerFt.toLocaleString('en-US')} ft away`,
    sewer: septicRequired ? (location.sewer === 'cesspool' && location.region === 'hawaii'
      ? 'No county sewer. A new home needs a septic system (new cesspools are not allowed in Hawaiʻi).'
      : 'No county sewer. A new home needs a septic system.') : 'County sewer at the street',
    septicRequired, road,
  };
}

const WATER_TEXT = {
  municipal: 'County water line at the street',
  community: 'A small community water system',
  catchment: 'No county water. Homes collect rain in a catchment tank.',
  well: 'No county water. Homes use a private well.',
};

// ---------- Contractor bids ----------

/**
 * Three bids for the tier (05 §4): [{id, label, company, adjPct, priceCents, deltaCents, months, stars, warrantyYears,
 * risky, flags[]}]. priceCents = tier sq ft × local cost per sq ft × (1 + adjPct).
 */
export function contractorBids(state, companies = [], cfg = BUILD) {
  const location = byId[state.choice.locationId];
  const tier = tierOf(state.paperwork.options.buildTier ?? cfg.defaultTier, cfg);
  const base = tier.sqft * location.housing.build.buildCostPerSqftCents;
  return cfg.bids.map((bid, i) => {
    const priceCents = mulRate(base, 1 + bid.adjPct);
    const months = bidMonths(location, bid);
    const flags = [];
    if (bid.risky) flags.push('No warranty', `Low reviews (${bid.stars}★)`, `Slow: ${months} months`, 'The bank may hesitate');
    if (bid.adjPct > 0) flags.push(`${Math.round(bid.adjPct * 100)}% over the local price: it uses up your contingency`);
    return { ...bid, company: companies[i] ?? bid.label, priceCents, deltaCents: priceCents - base, months, flags };
  });
}

/** Bid A's seeded risk (05 §4): {extraMonths, defect: {month, label, cents}}. */
export function contractorRisk(state, cfg = BUILD) {
  const rng = buyingRng(state, 'contractor-risk');
  const label = rng.pick(['Leaking roof flashing', 'Cracked shower pan', 'Bad wiring in one circuit', 'Sagging lānai beam',
    'Windows that leak in heavy rain']);
  return { extraMonths: rng.int(...cfg.risk.extraMonths),
    defect: { month: rng.int(...cfg.risk.defectMonths), label, cents: Math.round(rng.int(...cfg.risk.defectCents) / 1000) * 1000 } };
}

// ---------- Building permit ----------

/** The county checklist (05 §4): [{id, label, why}]; Hawaiʻi adds the solar water heater, no county water adds catchment. */
export function permitChecklist(location, cfg = BUILD) {
  const s = cfg.setbacksFt;
  const items = [
    { id: 'site-plan', label: 'Site plan showing the house, driveway and property lines', why: 'The county checks where everything goes.' },
    { id: 'setbacks', label: `Setbacks: ${s.front} ft from the front, ${s.side} ft from the sides, ${s.rear} ft from the back`,
      why: 'Space between houses for fire safety, light and neighbors.' },
  ];
  if (location.sewer !== 'municipal') items.push({ id: 'septic', label: 'Septic system approval from the Department of Health',
    why: 'Waste has to be treated so it doesn’t pollute the ground water.' });
  items.push({ id: 'energy', label: location.region === 'hawaii'
    ? 'Energy code, including a solar water heater (Hawaiʻi requires one on new houses)'
    : 'Energy code: insulation, windows and efficient lights', why: 'New homes must use less energy.' });
  if (location.water === 'catchment' || location.water === 'well') items.push({ id: 'catchment', label: location.water === 'well'
    ? 'Well permit and water test' : 'Catchment tank approval (size, cover and filters)', why: 'Your drinking water has to be safe.' });
  return items;
}

// ---------- Site utilities ----------

/**
 * What site-utilities offers here (05 §4): {water, power, sewer}, each [{id, label, upgradeCents, monthlyDeltaCents,
 * note}]. The base option of each (upgrade $0) is already in the site-work price; upgrades come out of the design budget.
 */
export function utilityOptions(location, config = FINANCE, cfg = BUILD) {
  const u = cfg.utilities;
  const bill = mulRate(location.living.utilitiesMonthlyCents, config.utilityFactor.build);
  const electric = mulRate(bill, u.electricShare);
  const countyWater = mulRate(bill, u.waterShare);
  const native = location.water;
  const waterCost = { county: countyWater, catchment: u.catchmentMonthlyCents, well: u.wellMonthlyCents };
  const nativeKey = native === 'catchment' ? 'catchment' : native === 'well' ? 'well' : 'county';
  const wd = (k) => waterCost[k] - waterCost[nativeKey];
  const water = [];
  if (native === 'municipal' || native === 'community') {
    water.push({ id: 'county', label: native === 'community' ? 'Community water hookup' : 'County water hookup', upgradeCents: 0,
      monthlyDeltaCents: 0, note: 'Treated water from the pipe. You pay a monthly water bill.' });
  }
  if (location.region === 'hawaii' || native === 'catchment') {
    water.push({ id: 'catchment', label: `Rain catchment, ${u.catchmentGallons.toLocaleString('en-US')} gal`,
      upgradeCents: native === 'catchment' ? 0 : u.catchmentUpgradeCents, monthlyDeltaCents: wd('catchment'),
      note: 'No water bill, but about $20 a month for filters and a UV light. Dry spells can run it low.' });
  }
  if (native !== 'municipal') {
    water.push({ id: 'well', label: 'Drill a well', upgradeCents: native === 'well' ? 0 : u.wellUpgradeCents,
      monthlyDeltaCents: wd('well'), note: 'Deep wells are expensive to drill. Then the pump uses a little power.' });
  }
  const power = [
    { id: 'grid', label: 'Grid power', upgradeCents: 0, monthlyDeltaCents: 0, note: 'A line from the nearest pole. You pay the electric bill.' },
    { id: 'grid-solar', label: `Grid + ${u.rooftopSolarKw} kW rooftop solar`, upgradeCents: u.rooftopSolarKw * u.solarPerKwCents,
      monthlyDeltaCents: -mulRate(electric, u.solarCutPct), note: 'Panels cut the electric bill about 60%. The grid covers cloudy days.' },
    { id: 'off-grid', label: `Off-grid: ${u.offGridKw} kW solar + batteries`, upgradeCents: u.offGridUpgradeCents,
      monthlyDeltaCents: u.batteryMonthlyCents - electric, note: 'No electric bill at all, but batteries need upkeep and cloudy weeks mean saving power.' },
  ];
  const sewer = location.sewer === 'municipal'
    ? [{ id: 'county', label: 'County sewer hookup', upgradeCents: 0, monthlyDeltaCents: 0, note: 'Waste goes to the county plant.' }]
    : [{ id: 'septic', label: 'Septic tank and leach field', upgradeCents: 0, monthlyDeltaCents: 0,
      note: 'Treats waste on your own lot. It needs pumping every few years.' }];
  return { water, power, sewer };
}

/**
 * The plan for chosen ids {water, power, sewer} (05 §4): {water, power, sewer, upgradeCents, monthlyDeltaCents,
 * solarKw, catchmentGallons, summary}. Throws if an id isn't offered here.
 */
export function siteUtilityPlan(location, choice, config = FINANCE, cfg = BUILD) {
  const opts = utilityOptions(location, config, cfg);
  const pick = (kind) => {
    const o = opts[kind].find((x) => x.id === choice[kind]);
    if (!o) throw new Error(`"${choice[kind]}" isn't a ${kind} option here`);
    return o;
  };
  const w = pick('water'); const p = pick('power'); const s = pick('sewer');
  const u = cfg.utilities;
  const extras = [w.id === 'catchment' ? 'catchment' : w.id === 'well' ? 'well' : null,
    p.id === 'grid-solar' ? 'rooftop solar' : p.id === 'off-grid' ? 'off-grid solar' : null].filter(Boolean);
  return { water: w.id, power: p.id, sewer: s.id,
    upgradeCents: w.upgradeCents + p.upgradeCents + s.upgradeCents,
    monthlyDeltaCents: w.monthlyDeltaCents + p.monthlyDeltaCents + s.monthlyDeltaCents,
    solarKw: p.id === 'grid-solar' ? u.rooftopSolarKw : p.id === 'off-grid' ? u.offGridKw : 0,
    catchmentGallons: w.id === 'catchment' ? u.catchmentGallons : 0,
    summary: extras.length ? extras.join(' + ') : 'county services' };
}

/** Default choice ids for a location: the $0 option of each kind. */
export function defaultUtilities(location, config = FINANCE, cfg = BUILD) {
  const o = utilityOptions(location, config, cfg);
  const first = (list) => (list.find((x) => x.upgradeCents === 0) ?? list[0]).id;
  return { water: first(o.water), power: first(o.power), sewer: first(o.sewer) };
}
