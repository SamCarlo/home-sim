// Buyer documents (05 §4 hoa-review, home-inspection, appraisal, closing-disclosure; task 22). Pure, integer cents.
// Everything is seeded by save + place + attempt, so a reload shows the same report, value and seller answers.
import { BUYING } from '../config.js';
import { byId } from '../data/locations/index.js';
import { createRng, seedFor } from '../util/rng.js';
import { mulRate, sumCents } from './money.js';
import { pmt } from './loans.js';

const SEVERITY_RANK = { minor: 0, moderate: 1, major: 2 };

/** A seeded generator for one purpose in this attempt (same save + place + attempt → same numbers). */
export function buyingRng(state, purpose) {
  const c = state.choice ?? {};
  return createRng(seedFor(state.meta.seed, 'buying', purpose, c.locationId ?? '', c.homeTypeId ?? '',
    state.plan?.attempts?.length ?? 0));
}

const pickRange = (rng, [lo, hi]) => rng.int(lo, hi);
const byLocation = (table, id) => table[id] ?? table.default;
const roundTo = (cents, step) => Math.round(cents / step) * step;

// ---------- HOA review ----------

/**
 * The condo's HOA documents (05 §4 hoa-review): {hoaCents, covers[], reservePct, reserveHealthy, assessment, history[],
 * rules[]}. `assessment` is null or {reason, monthlyCents, months, totalCents}. Miami's chance is highest (post-2021
 * building-safety repairs).
 */
export function hoaReport(state, cfg = BUYING.hoa) {
  const { locationId, homeTypeId } = state.choice;
  const location = byId[locationId];
  const hoaCents = location.housing[homeTypeId]?.hoaMonthlyCents ?? 0;
  const rng = buyingRng(state, 'hoa');
  const pending = rng.chance(byLocation(cfg.assessmentChance, locationId));
  const low = rng.chance(pending ? cfg.lowChanceWithAssessment : cfg.lowChance);
  const reservePct = pickRange(rng, low ? cfg.lowPct : cfg.healthyPct);
  let assessment = null;
  if (pending) {
    const monthlyCents = roundTo(pickRange(rng, byLocation(cfg.assessmentMonthlyCents, locationId)), 500);
    const months = pickRange(rng, byLocation(cfg.assessmentMonths, locationId));
    const reason = locationId === 'miami'
      ? 'Fixing concrete and balconies. A 2022 Florida safety law requires it'
      : rng.pick(['Roof replacement', 'Elevator replacement', 'Repaving the parking lot', 'New fire-alarm system']);
    assessment = { reason, monthlyCents, months, totalCents: monthlyCents * months };
  }
  const water = rng.chance(0.5);
  const covers = ['Insurance on the building (not your unit’s inside)', 'Repairs to the roof, halls, elevators and grounds',
    'Trash pickup', ...(water ? ['Water and sewer'] : [])];
  const history = [rng.chance(0.4) ? 'Five years ago: $1,500 per unit to repaint the outside.' : 'No special assessments in the last 10 years.'];
  const rules = ['Pets: up to 2 cats or 1 dog under 40 pounds, registered with the office.',
    'Rentals: you can’t rent your unit out for less than 6 months at a time.',
    'Noise: quiet hours 10 pm to 7 am.',
    'Parking: one assigned space per unit; guests use visitor spots.'];
  return { hoaCents, covers, water, reservePct, reserveHealthy: !low, assessment, history, rules };
}

// ---------- Home inspection ----------

/** Possible findings (05 §4): {id, label, severity, cents: [min, max], types, weight(location), specialty?}. */
export const FINDINGS = [
  { id: 'termites', label: 'Termite damage in the wood framing', severity: 'major', cents: [150000, 450000], types: ['house', 'condo'],
    specialty: 'termite', weight: (l) => (l.region === 'hawaii' ? 4 : l.hazards.includes('hurricane') ? 1.5 : 0.6) },
  { id: 'roof', label: 'Roof near the end of its life (missing shingles, soft spots)', severity: 'major', cents: [400000, 900000],
    types: ['house'], weight: (l) => (l.hazards.includes('hurricane') ? 3 : 1) },
  { id: 'sewer', label: 'Cracked sewer pipe under the yard', severity: 'major', cents: [300000, 700000], types: ['house'],
    specialty: 'sewer', weight: () => 1 },
  { id: 'foundation', label: 'Settling crack in the foundation', severity: 'moderate', cents: [150000, 400000], types: ['house'],
    weight: (l) => (l.hazards.includes('earthquake') ? 2 : 0.8) },
  { id: 'water-heater', label: 'Water heater is 14 years old and rusting', severity: 'moderate', cents: [120000, 220000],
    types: ['house', 'condo'], weight: () => 2 },
  { id: 'ac', label: 'Air conditioner barely cools', severity: 'moderate', cents: [80000, 300000], types: ['house', 'condo'],
    weight: (l) => (l.living?.utilitiesSeasonal?.coolMonths?.length ? 2 : 0.5) },
  { id: 'furnace', label: 'Furnace has a cracked part', severity: 'moderate', cents: [150000, 400000], types: ['house', 'condo'],
    weight: (l) => (l.seasons?.snowMonths?.length ? 2 : 0.2) },
  { id: 'electrical', label: 'Old wiring and an outlet with no ground', severity: 'moderate', cents: [60000, 250000],
    types: ['house', 'condo'], weight: () => 1.5 },
  { id: 'mold', label: 'Mold under the bathroom sink', severity: 'moderate', cents: [50000, 200000], types: ['house', 'condo'],
    weight: (l) => (/tropical|coastal|rain/.test(l.biome) ? 2 : 0.8) },
  { id: 'leak', label: 'Slow leak under the kitchen sink', severity: 'minor', cents: [15000, 40000], types: ['house', 'condo'], weight: () => 2 },
  { id: 'gutters', label: 'Gutters clogged and pulling loose', severity: 'minor', cents: [20000, 60000], types: ['house'], weight: () => 1.5 },
  { id: 'windows', label: 'Two windows don’t seal (drafts, foggy glass)', severity: 'minor', cents: [30000, 90000], types: ['house', 'condo'], weight: () => 1.5 },
  { id: 'smoke', label: 'Smoke detectors missing or dead', severity: 'minor', cents: [5000, 15000], types: ['house', 'condo'], weight: () => 1.5 },
  { id: 'railing', label: 'Loose railing on the steps or lānai', severity: 'minor', cents: [20000, 80000], types: ['house', 'condo'], weight: () => 1 },
];

function weightedPick(rng, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let u = rng.next() * total;
  for (let i = 0; i < items.length; i++) { u -= weights[i]; if (u < 0) return i; }
  return items.length - 1;
}

/**
 * Every problem this home really has (3–6, seeded): [{id, label, severity, cents, specialty, hidden}]. `hidden` = a
 * quick walk-through misses it; `specialty` ('termite' | 'sewer') = only the thorough inspector checks for it.
 */
export function inspectionFindings(state, cfg = BUYING.inspection) {
  const { locationId, homeTypeId } = state.choice;
  const location = byId[locationId];
  const rng = buyingRng(state, 'inspection');
  let pool = FINDINGS.filter((f) => f.types.includes(homeTypeId));
  const n = Math.min(pool.length, pickRange(rng, cfg.findings));
  const out = [];
  for (let k = 0; k < n; k++) {
    const i = weightedPick(rng, pool, pool.map((f) => f.weight(location)));
    const f = pool[i];
    pool = pool.filter((_, j) => j !== i);
    out.push({ id: f.id, label: f.label, severity: f.severity, cents: roundTo(pickRange(rng, f.cents), 500),
      specialty: f.specialty ?? null, hidden: rng.chance(cfg.hiddenChance) });
  }
  return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.cents - a.cents);
}

/** Does this inspector find the finding? Thorough finds all; standard misses specialty checks; budget also misses hidden ones. */
export function inspectorFinds(inspectorId, finding) {
  if (inspectorId === 'thorough') return true;
  if (finding.specialty) return false;
  return inspectorId === 'standard' || !finding.hidden;
}

/**
 * The report for an inspector: {inspector, found[], missed[], missedFindings[{month, label, cents}]}. Each miss
 * becomes a surprise repair in monthIndex 1–7 (life months 2–8) for task 44's events.
 */
export function inspectionReport(state, inspectorId, cfg = BUYING.inspection) {
  const inspector = cfg.inspectors.find((x) => x.id === inspectorId);
  if (!inspector) throw new Error(`Unknown inspector "${inspectorId}"`);
  const all = inspectionFindings(state, cfg);
  const found = all.filter((f) => inspectorFinds(inspectorId, f));
  const missed = all.filter((f) => !inspectorFinds(inspectorId, f));
  const rng = buyingRng(state, `missed-${inspectorId}`);
  const missedFindings = missed.map((f) => ({ month: pickRange(rng, cfg.missMonths), label: f.label, cents: f.cents }));
  return { inspector, found, missed, missedFindings };
}

/** What a repair-credit request asks for: moderate + major items (all items if only minor ones were found). */
export function creditAsk(found) {
  const serious = found.filter((f) => f.severity !== 'minor');
  const items = serious.length ? serious : found;
  return { items, cents: sumCents(items.map((f) => f.cents)) };
}

/** The seller's answer to a repair-credit request: {probability, draw, accepted, creditCents}. Bigger problems → likelier yes. */
export function repairCreditDecision(state, found, cfg = BUYING.inspection) {
  const { items, cents } = creditAsk(found);
  if (!items.length) return { probability: 0, draw: 1, accepted: false, creditCents: 0 };
  const worst = items.reduce((w, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[w] ? f.severity : w), 'minor');
  const probability = cfg.creditChance[worst];
  const draw = buyingRng(state, 'repair-credit').next();
  const accepted = draw < probability;
  return { probability, draw, accepted, creditCents: accepted ? cents : 0 };
}

// ---------- Appraisal ----------

/** The seeded appraisal: {priceCents, appraisedCents, gapCents} (gap = how far below the price, never negative). */
export function appraisalResult(state, priceCents, cfg = BUYING.appraisal) {
  const f = buyingRng(state, 'appraisal').float(cfg.low, cfg.high);
  const appraisedCents = roundTo(mulRate(priceCents, f), 100000);
  return { priceCents, appraisedCents, gapCents: Math.max(0, priceCents - appraisedCents) };
}

/** Can the buyer pay the gap? cash must cover the chosen loan's cash to close plus the gap. */
export const canPayGap = ({ cashCents, cashToCloseCents, gapCents }) => cashCents >= cashToCloseCents + gapCents;

/** Does the seller agree to lower the price to the appraisal? (seeded, 50%) → {probability, draw, agreed}. */
export function sellerLowersDecision(state, cfg = BUYING.appraisal) {
  const draw = buyingRng(state, 'seller-lowers').next();
  return { probability: cfg.sellerLowersChance, draw, agreed: draw < cfg.sellerLowersChance };
}

/**
 * The purchase after the appraisal (stored as paperwork.options.purchase): {priceCents, appraisedCents, gapCents,
 * resolution}. 'pay-gap': the price stays and the buyer pays the gap in cash; 'seller-lowered': price = appraisal.
 */
export function resolvePurchase(appraisal, resolution) {
  const { priceCents, appraisedCents, gapCents } = appraisal;
  if (resolution === 'seller-lowered') return { priceCents: appraisedCents, appraisedCents, gapCents: 0, resolution };
  if (resolution === 'pay-gap') return { priceCents, appraisedCents, gapCents, resolution };
  if (resolution === 'at-value') return { priceCents, appraisedCents, gapCents: 0, resolution };
  throw new Error(`Unknown appraisal resolution "${resolution}"`);
}

// ---------- Closing disclosure ----------

/** Closing-disclosure rows a student can flag; only 'rate' is wrong. */
export const CLOSING_ROWS = ['loan', 'rate', 'pi', 'mi', 'escrow', 'monthly', 'cash', 'prepay', 'balloon'];

/**
 * The closing disclosure for the chosen loan option (05 §4): {agreedRate, shownRate, rate, flagged, loanCents,
 * termMonths, piCents, agreedPiCents, miCents, escrowCents, monthlyCents, cashToCloseCents, creditCents, gapCents}.
 * The lender's form shows the rate `rateErrorPts` too high until the error is flagged.
 */
export function closingDisclosure(option, { flagged = false, escrowCents = 0, cfg = BUYING.closing } = {}) {
  const agreedRate = option.rate;
  const shownRate = +(agreedRate + cfg.rateErrorPts).toFixed(6);
  const rate = flagged ? agreedRate : shownRate;
  const piCents = pmt(option.loanCents, rate, option.termMonths);
  const miCents = option.mortgageInsuranceCents;
  const cashToCloseCents = Math.max(0, sumCents(option.downCents, option.closingCents, option.gapCents ?? 0)
    - (option.creditCents ?? 0));
  return { agreedRate, shownRate, rate, flagged, loanCents: option.loanCents, termMonths: option.termMonths, piCents,
    agreedPiCents: pmt(option.loanCents, agreedRate, option.termMonths), miCents, escrowCents,
    monthlyCents: sumCents(piCents, miCents, escrowCents), cashToCloseCents,
    creditCents: option.creditCents ?? 0, gapCents: option.gapCents ?? 0 };
}

/** Flag one row: {correct, message}. Only the rate is wrong; everything else matches the loan. */
export function flagRow(row) {
  if (!CLOSING_ROWS.includes(row)) throw new Error(`Unknown closing row "${row}"`);
  return row === 'rate'
    ? { correct: true, message: 'Good catch. The lender typed the wrong rate and fixed it.' }
    : { correct: false, message: 'The lender checked: that number matches your loan. Look again.' };
}

/** What signing records (paperwork.options.closing): the rate you'll really pay and whether the error was caught. */
export function closingOutcome(cd, wrongFlags = 0) {
  return { agreedRate: cd.agreedRate, finalRate: cd.rate, errorFlagged: cd.flagged, wrongFlags,
    extraMonthlyCents: cd.piCents - cd.agreedPiCents };
}
