// Itemized upfront and first-year monthly housing costs for one table cell (04 §2–§3). Pure, integer cents, every
// line rounded on its own (half away from zero) and the totals are the plain sums of the lines.
import { FINANCE } from '../config.js';
import { homeType } from '../data/homeTypes.js';
import { mulRate, sumCents, formatMoney } from './money.js';
import { pmt, pmiMonthly, constructionInterestReserve } from './loans.js';

/** "6.5%" from 0.065 (up to two decimals, no trailing zeros). */
export const pctText = (rate) => `${+(rate * 100).toFixed(2)}%`;

const line = (key, label, cents, note) => ({ key, label, cents, note });
const monthlyOf = (annualCents) => mulRate(annualCents, 1 / 12);

const NOTES = {
  deposit: 'Money the landlord holds in case of damage. You get it back when you move out if the place is in good shape.',
  firstMonth: 'Rent is paid at the start of the month, so the first month is due when you sign the lease.',
  application: 'A fee for the landlord to check your credit and references. You pay it even if you are turned down.',
  rent: 'What you pay the landlord every month.',
  renters: 'Renters insurance (HO-4) covers your own belongings and liability. The landlord insures the building.',
  utilities: 'Electricity, water and any heating fuel, scaled to the size of the home.',
  down: 'The part of the price you pay in cash. The bank lends you the rest.',
  closing: 'One-time fees to finish the purchase: loan fees, title, escrow and recording.',
  inspection: 'A professional checks the home for problems before you buy.',
  appraisal: 'The bank pays an appraiser to confirm the home is worth the price. You cover the fee.',
  pi: 'Your mortgage payment: interest to the bank plus a little of the loan paid back each month.',
  pmi: 'Extra insurance the lender makes you pay when you put down less than 20%.',
  tax: 'Yearly property tax to the county, split into monthly payments.',
  ho6: 'Condo insurance (HO-6) covers the inside of your unit. The HOA master policy covers the building.',
  hoa: 'Monthly dues to the condo association for the roof, halls, grounds and the building insurance.',
  ho3: 'Homeowners insurance (HO-3) covers the house and your liability. The lender requires it.',
  hazard: 'Regular homeowners insurance leaves this risk out here, so the lender makes you buy extra coverage.',
  buildDown: 'Construction lenders want 20% of the whole project in cash: the lot, building and site work.',
  buildClosing: 'Fees to set up the construction-to-permanent loan, 3% of the loan.',
  permit: 'County fees to approve your plans and inspect the work as it is built.',
  temp: 'You still need somewhere to live while the house is built.',
  reserve: 'Interest you owe on the loan money already spent while the house is being built.',
  buildPI: 'Your loan payment once the house is finished and you move in.',
  buildTax: 'Property tax on the full project cost, once the house is finished.',
  buildIns: 'Homeowners insurance (HO-3), scaled to what your new house cost compared with a typical house here.',
};

/** Hazard policies a lender requires for a mortgage here (03 §2 `requiredForMortgage`). */
export function requiredHazards(location) {
  return (location.ownership.hazardCoverage || []).filter((h) => h.requiredForMortgage);
}

function hazardLine(location) {
  const req = requiredHazards(location);
  if (!req.length) return null;
  const cents = monthlyOf(sumCents(req.map((h) => h.annualCents)));
  return line('hazard', `Required ${req.map((h) => h.type).join(' + ')} coverage`, cents, NOTES.hazard);
}

/** Build project cost (04 §3): lot + build cost per sq ft × sq ft × (1 + contingency) + site work, in cents. */
export function buildProjectCost(build, config = FINANCE) {
  const construction = mulRate(build.buildCostPerSqftCents * config.build.sqft, 1 + config.build.contingencyPct);
  return { constructionCents: construction, projectCents: build.lotPriceCents + construction + build.siteWorkCents };
}

function rentCells(location, id, h, config) {
  const rent = id === 'shared' ? h.roomRentCents : h.rentCents;
  const app = config.applicationFeeCents[id] ?? 0;
  return {
    upfront: [
      line('deposit', id === 'shared' ? 'Deposit (one month of room rent)' : 'Security deposit', rent * config.depositMonths, NOTES.deposit),
      line('first-month', "First month's rent", rent, NOTES.firstMonth),
      line('application', 'Application fee', app, NOTES.application),
    ],
    monthly: [
      line('rent', id === 'shared' ? 'Room rent' : 'Rent', rent, NOTES.rent),
      line('renters-insurance', 'Renters insurance', location.ownership.rentersInsuranceMonthlyCents, NOTES.renters),
    ],
    assumptions: [`Deposit of ${config.depositMonths} month's rent`, `${formatMoney(app)} application fee`],
  };
}

function buyCells(location, id, h, config) {
  const down = mulRate(h.priceCents, config.downPaymentPct);
  const loan = h.priceCents - down;
  const o = location.ownership;
  const monthly = [line('principal-interest', 'Principal & interest', pmt(loan, config.mortgageRate, config.mortgageTermMonths), NOTES.pi)];
  if (config.downPaymentPct < config.pmiThresholdPct) monthly.push(line('pmi', 'PMI (mortgage insurance)', pmiMonthly(loan, config.pmiAnnualPct), NOTES.pmi));
  monthly.push(line('property-tax', 'Property tax', mulRate(h.priceCents, o.propertyTaxRate / 12), NOTES.tax));
  if (id === 'condo') {
    monthly.push(line('insurance', 'Condo insurance (HO-6)', monthlyOf(o.condoInsuranceAnnualCents), NOTES.ho6));
    monthly.push(line('hoa', 'HOA dues', h.hoaMonthlyCents, NOTES.hoa));
  } else {
    monthly.push(line('insurance', 'Homeowners insurance (HO-3)', monthlyOf(o.homeInsuranceAnnualCents), NOTES.ho3));
    const hz = hazardLine(location);
    if (hz) monthly.push(hz);
  }
  return {
    upfront: [
      line('down-payment', `Down payment (${pctText(config.downPaymentPct)})`, down, NOTES.down),
      line('closing', 'Closing costs', mulRate(h.priceCents, config.closingPct), NOTES.closing),
      line('inspection', 'Home inspection', config.inspectionCents, NOTES.inspection),
      line('appraisal', 'Appraisal', config.appraisalCents, NOTES.appraisal),
    ],
    monthly,
    assumptions: [
      `${pctText(config.downPaymentPct)} down on ${formatMoney(h.priceCents)}`,
      `${config.mortgageTermMonths / 12}-year fixed loan at ${pctText(config.mortgageRate)}`,
      `Closing costs ${pctText(config.closingPct)} of the price`,
      config.downPaymentPct < config.pmiThresholdPct
        ? `PMI ${pctText(config.pmiAnnualPct)} a year of the loan (under ${pctText(config.pmiThresholdPct)} down)`
        : `No PMI (${pctText(config.pmiThresholdPct)} or more down)`,
    ],
  };
}

function buildCells(location, h, config) {
  const b = config.build;
  const { constructionCents, projectCents } = buildProjectCost(h, config);
  const down = mulRate(projectCents, b.downPaymentPct);
  const loan = projectCents - down;
  const { shared, apartment, house } = location.housing;
  const tempRent = shared.available ? shared.roomRentCents : apartment.available ? apartment.rentCents : 0;
  const tempWhat = shared.available ? 'a rented room' : 'an apartment';
  const o = location.ownership;
  const median = house.available ? house.priceCents : projectCents;
  const scale = Math.min(b.insuranceScaleMax, Math.max(b.insuranceScaleMin, projectCents / median));
  const monthly = [
    line('principal-interest', 'Principal & interest', pmt(loan, b.rate, b.termMonths), NOTES.buildPI),
    line('property-tax', 'Property tax', mulRate(projectCents, o.propertyTaxRate / 12), NOTES.buildTax),
    line('insurance', 'Homeowners insurance (HO-3)', monthlyOf(mulRate(o.homeInsuranceAnnualCents, scale)), NOTES.buildIns),
  ];
  const hz = hazardLine(location);
  if (hz) monthly.push(hz);
  return {
    upfront: [
      line('down-payment', `Down payment (${pctText(b.downPaymentPct)} of the project)`, down, NOTES.buildDown),
      line('closing', 'Loan closing costs', mulRate(loan, config.closingPct), NOTES.buildClosing),
      line('permits', 'Permit fees', h.permitCents, NOTES.permit),
      line('temporary-housing', `Temporary housing (${h.monthsToBuild} months in ${tempWhat})`, tempRent * h.monthsToBuild, NOTES.temp),
      line('interest-reserve', 'Construction interest', constructionInterestReserve({ loanCents: loan, rate: b.rate,
        months: h.monthsToBuild, avgDrawnPct: b.avgDrawnPct }), NOTES.reserve),
    ],
    monthly,
    project: { lotCents: h.lotPriceCents, constructionCents, siteWorkCents: h.siteWorkCents, projectCents, loanCents: loan },
    assumptions: [
      `A ${b.sqft.toLocaleString('en-US')} sq ft house with a ${pctText(b.contingencyPct)} contingency`,
      `Project cost ${formatMoney(projectCents)} (lot + building + site work)`,
      `${pctText(b.downPaymentPct)} down, a ${b.termMonths / 12}-year construction-to-permanent loan at ${pctText(b.rate)}`,
      `${h.monthsToBuild} months to build; monthly costs start after you move in`,
    ],
  };
}

/**
 * Itemized costs of one cell (04 §3): { available, naReason?, upfrontCents, monthlyCents, upfront: Line[],
 * monthly: Line[], assumptions: string[], project? }. config is the FINANCE shape (override downPaymentPct etc.).
 */
export function cellCost(location, homeTypeId, config = FINANCE) {
  const type = homeType(homeTypeId);
  const h = location.housing[homeTypeId];
  if (!h || !h.available) {
    return { available: false, naReason: h?.naReason || 'Not available here.', upfrontCents: 0, monthlyCents: 0,
      upfront: [], monthly: [], assumptions: [] };
  }
  const parts = homeTypeId === 'build' ? buildCells(location, h, config)
    : type.buying ? buyCells(location, homeTypeId, h, config) : rentCells(location, homeTypeId, h, config);
  const factor = config.utilityFactor[homeTypeId];
  parts.monthly.push(line('utilities', `Utilities (× ${factor})`, mulRate(location.living.utilitiesMonthlyCents, factor), NOTES.utilities));
  return {
    available: true,
    upfrontCents: sumCents(parts.upfront.map((l) => l.cents)),
    monthlyCents: sumCents(parts.monthly.map((l) => l.cents)),
    ...parts,
  };
}

/** The note under the table (04 §3): "Assumes 10% down, a 30-year fixed loan at 6.5%, …". */
export function tableAssumptions(config = FINANCE) {
  const b = config.build;
  return `Assumes ${pctText(config.downPaymentPct)} down, a ${config.mortgageTermMonths / 12}-year fixed loan at `
    + `${pctText(config.mortgageRate)}, closing costs of ${pctText(config.closingPct)}, and PMI of `
    + `${pctText(config.pmiAnnualPct)} a year under ${pctText(config.pmiThresholdPct)} down. Building assumes a `
    + `${b.sqft.toLocaleString('en-US')} sq ft house, ${pctText(b.downPaymentPct)} down and a ${pctText(b.rate)} `
    + 'construction loan. Monthly costs are housing only: rent or mortgage, insurance and utilities.';
}
