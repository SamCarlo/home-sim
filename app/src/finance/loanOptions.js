// Loan options for a condo or house (05 §4 loan-options, 05 §7 program rules and credit tiers). Pure, integer cents.
// Every program × down payment × term the student can compare, with the monthly cost, the lifetime interest, the cash
// needed to close and, when an option can't be chosen, the plain-language reason why.
import { FINANCE, UNDERWRITING } from '../config.js';
import { byId } from '../data/locations/index.js';
import { cellCost } from './costs.js';
import { cashOf } from './grid.js';
import { mulRate, sumCents, formatMoney } from './money.js';
import { pmt, pmiMonthly, totalInterest, fhaLoan } from './loans.js';

/** The rows of the comparison (05 §4): FHA 3.5%, conventional 5/10/20%, each at 15 and 30 years. */
export const LOAN_CHOICES = [
  { program: 'fha', downPaymentPct: 0.035 },
  { program: 'conventional', downPaymentPct: 0.05 },
  { program: 'conventional', downPaymentPct: 0.10 },
  { program: 'conventional', downPaymentPct: 0.20 },
];
export const LOAN_TERMS = [30, 15];

export const PROGRAM_LABELS = { fha: 'FHA', conventional: 'Conventional' };

/** Monthly housing lines that don't depend on the loan: property tax, insurance, required hazard coverage, HOA. */
const FIXED_KEYS = ['property-tax', 'insurance', 'hazard', 'hoa', 'special-assessment'];
/** Upfront lines other than the down payment and closing that are still owed at closing. */
const FEE_KEYS = ['inspection', 'appraisal'];

/** "fha-3.5-30" for an option. */
export const optionKey = ({ program, downPaymentPct, termYears }) =>
  `${program}-${+(downPaymentPct * 100).toFixed(1)}-${termYears}`;

/** The 05 §7 credit tier for a score ({min, f, rateAdj, fhaOnly?}) or null below every tier. */
export function creditTier(score, uw = UNDERWRITING.mortgage) {
  return uw.creditTiers.find((t) => score >= t.min) ?? null;
}

/** Lava Zones 1–2 (05 §4): no FHA, conventional needs 20% down. */
export const strictLavaZone = (location) => {
  const z = location?.ownership?.lavaZone;
  return z === 1 || z === 2;
};

/** Why this program/down payment can't be used here, before money is considered; null when it can. */
export function programBlock({ program, downPaymentPct }, { score, location }, uw = UNDERWRITING.mortgage) {
  const lava = strictLavaZone(location);
  if (program === 'fha' && lava) return 'FHA won’t insure homes in Lava Zones 1–2.';
  if (lava && downPaymentPct < uw.lavaZoneMinDownPct) {
    return `In Lava Zones 1–2, lenders want at least ${Math.round(uw.lavaZoneMinDownPct * 100)}% down.`;
  }
  if (program === 'fha' && score < uw.fhaMinCredit) {
    return `FHA loans need a credit score of ${uw.fhaMinCredit} or more. Yours is ${score}.`;
  }
  if (program === 'conventional' && score < uw.conventionalMinCredit) {
    return `Conventional loans need a credit score of ${uw.conventionalMinCredit} or more. Yours is ${score}.`;
  }
  return null;
}

/**
 * One option's numbers: {key, program, downPaymentPct, termYears, termMonths, rate, priceCents, downCents,
 * baseLoanCents, upfrontMipCents, loanCents, piCents, insuranceKind ('pmi'|'mip'|null), mortgageInsuranceCents,
 * fixedCents, housingCents, totalInterestCents, closingCents, feesCents, reservesCents, cashToCloseCents,
 * shortCents, disabledReason}.
 */
export function loanOption(choice, termYears, ctx, config = FINANCE, uw = UNDERWRITING.mortgage) {
  const { priceCents, score, cashCents, fixedCents, feesCents } = ctx;
  const { program, downPaymentPct } = choice;
  const termMonths = termYears * 12;
  const tier = creditTier(score, uw);
  const rate = (termYears === 15 ? config.mortgageRate15 : config.mortgageRate) + (tier?.rateAdj ?? 0);
  let downCents, baseLoanCents, upfrontMipCents = 0, loanCents, piCents, mortgageInsuranceCents = 0, insuranceKind = null;
  if (program === 'fha') {
    const f = fhaLoan({ priceCents, downPct: downPaymentPct, annualRate: rate, months: termMonths });
    ({ downCents, baseLoanCents, upfrontMipCents, loanCents } = f);
    piCents = f.monthlyPICents;
    mortgageInsuranceCents = f.monthlyMipCents;
    insuranceKind = 'mip';
  } else {
    downCents = mulRate(priceCents, downPaymentPct);
    baseLoanCents = loanCents = priceCents - downCents;
    piCents = pmt(loanCents, rate, termMonths);
    if (downPaymentPct < config.pmiThresholdPct) {
      mortgageInsuranceCents = pmiMonthly(loanCents, config.pmiAnnualPct);
      insuranceKind = 'pmi';
    }
  }
  const housingCents = sumCents(piCents, mortgageInsuranceCents, fixedCents);
  const closingCents = mulRate(priceCents, config.closingPct);
  const reservesCents = housingCents * uw.reserveMonths;
  const cashToCloseCents = sumCents(downCents, closingCents, feesCents, reservesCents);
  const shortCents = Math.max(0, cashToCloseCents - cashCents);
  const disabledReason = programBlock(choice, ctx, uw)
    ?? (shortCents > 0 ? `You need ${formatMoney(shortCents)} more in savings and checking to close.` : null);
  return {
    key: optionKey({ program, downPaymentPct, termYears }), program, downPaymentPct, termYears, termMonths, rate,
    priceCents, downCents, baseLoanCents, upfrontMipCents, loanCents, piCents, insuranceKind, mortgageInsuranceCents,
    fixedCents, housingCents, totalInterestCents: totalInterest(loanCents, rate, termMonths), closingCents, feesCents,
    reservesCents, cashToCloseCents, shortCents, disabledReason,
  };
}

/**
 * Every loan option for the chosen condo/house (05 §4): {priceCents, score, tier, cashCents, grossCents, lavaZone,
 * strictLava, fixedLines, fixedCents, feesCents, options[], cheapestMonthlyKey, leastInterestKey}. The two "best"
 * keys only consider options that can be chosen (null if none can).
 */
export function loanOptions(state, config = FINANCE, uw = UNDERWRITING.mortgage) {
  const { locationId, homeTypeId, snapshot } = state.choice;
  const location = byId[locationId];
  const priceCents = location.housing[homeTypeId].priceCents;
  const breakdown = snapshot?.breakdown ?? cellCost(location, homeTypeId, config);
  const fixedLines = breakdown.monthly.filter((l) => FIXED_KEYS.includes(l.key));
  const fixedCents = sumCents(fixedLines.map((l) => l.cents));
  const paid = state.paperwork.paidUpfront ?? {};
  const feesCents = sumCents(breakdown.upfront.filter((l) => FEE_KEYS.includes(l.key))
    .map((l) => Math.max(0, l.cents - (paid[l.key] ?? 0))));
  const cashCents = cashOf(state);
  const score = state.finances.credit.score;
  const ctx = { priceCents, score, cashCents, fixedCents, feesCents, location };
  const options = LOAN_CHOICES.flatMap((c) => LOAN_TERMS.map((t) => loanOption(c, t, ctx, config, uw)));
  const open = options.filter((o) => !o.disabledReason);
  const best = (by) => (open.length ? open.reduce((a, b) => (by(b) < by(a) ? b : a)).key : null);
  return {
    priceCents, score, tier: creditTier(score, uw), cashCents,
    grossCents: Math.round((state.player.netMonthlyIncomeCents ?? 0) / config.netToGross),
    lavaZone: location.ownership.lavaZone ?? null, strictLava: strictLavaZone(location),
    fixedLines, fixedCents, feesCents, options,
    cheapestMonthlyKey: best((o) => o.housingCents),
    leastInterestKey: best((o) => o.totalInterestCents),
  };
}

/** The option for stored paperwork.options ({program, downPaymentPct, termYears}) or null. */
export function findOption(result, sel) {
  if (!sel?.program) return null;
  return result.options.find((o) => o.key === optionKey(sel)) ?? null;
}

/** "FHA · 3.5% down · 30 years" */
export const optionLabel = (o) =>
  `${PROGRAM_LABELS[o.program]} · ${+(o.downPaymentPct * 100).toFixed(1)}% down · ${o.termYears} years`;
