// Location record validator (03 §2). Pure. Errors break the game; warnings are 03 §5 sanity misses that the data
// task either fixes or justifies with a source in docs/DATA_SOURCES.md.
import {
  REGIONS, SETTLEMENTS, BIOMES, STYLE_FAMILIES, STYLE_VARIANTS, LANDMARKS, HAZARDS, COVERAGE_TYPES,
  WATER_KINDS, SEWER_KINDS, TRANSPORT_MODES, HOME_TYPES,
} from './enums.js';
import { SANITY, GENERAL } from './sanity.js';

const HOUSING_FIELDS = {
  apartment: ['rentCents', 'bedrooms'],
  shared: ['roomRentCents', 'housemates'],
  condo: ['priceCents', 'hoaMonthlyCents', 'sqft', 'bedrooms'],
  house: ['priceCents', 'sqft', 'bedrooms', 'lotAcres'],
  build: ['lotPriceCents', 'lotAcres', 'lotWidthFt', 'lotDepthFt', 'buildCostPerSqftCents', 'siteWorkCents',
    'permitCents', 'monthsToBuild'],
};
const METRICS_1_5 = ['schoolQuality', 'transit', 'noise', 'gardenPotential', 'gymAccess', 'natureAccess'];
const SEASON_KEYS = ['snowMonths', 'rainyMonths', 'hurricaneMonths', 'fallColorMonths'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isCents = (v) => Number.isSafeInteger(v) && v >= 0;
const isMonths = (v) => Array.isArray(v) && v.every((m) => Number.isInteger(m) && m >= 0 && m <= 11);

/** Validate one location record → `{ errors: string[], warnings: string[] }` (each message starts with the id). */
export function validateLocation(loc) {
  const errors = [];
  const warnings = [];
  const id = isObj(loc) && isStr(loc.id) ? loc.id : '(no id)';
  const err = (m) => errors.push(`${id}: ${m}`);
  const warn = (m) => warnings.push(`${id}: ${m}`);
  if (!isObj(loc)) { err('record must be an object'); return { errors, warnings }; }

  // Identity and display
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(loc.id ?? '')) err('id must be kebab-case');
  for (const k of ['name', 'fullName', 'state', 'country', 'hook', 'blurb']) if (!isStr(loc[k])) err(`${k} is required`);
  if (!REGIONS.includes(loc.region)) err(`unknown region "${loc.region}"`);
  if (!SETTLEMENTS.includes(loc.settlement)) err(`unknown settlement "${loc.settlement}"`);
  if (!BIOMES.includes(loc.biome)) err(`unknown biome "${loc.biome}"`);
  if (!STYLE_FAMILIES.includes(loc.styleFamily)) err(`unknown styleFamily "${loc.styleFamily}"`);
  if (!('styleVariant' in loc)) err('styleVariant is required (null for the base family)');
  else if (loc.styleVariant !== null && !(STYLE_VARIANTS[loc.styleFamily] ?? []).includes(loc.styleVariant)) {
    err(`styleVariant "${loc.styleVariant}" is not a variant of ${loc.styleFamily}`);
  }
  if (!LANDMARKS.includes(loc.landmark)) err(`unknown landmark "${loc.landmark}"`);
  if (!Number.isInteger(loc.population) || loc.population < GENERAL.population[0]) err('population must be a positive integer');
  if (isStr(loc.hook) && loc.hook.trim().split(/\s+/).length > GENERAL.hookMaxWords) err(`hook is over ${GENERAL.hookMaxWords} words`);
  if (isStr(loc.blurb)) {
    const sentences = loc.blurb.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length;
    if (sentences < 2 || sentences > 3) warn(`blurb should be 2–3 sentences (has ${sentences})`);
  }
  for (const k of ['name', 'fullName', 'hook', 'blurb']) {
    if (isStr(loc[k]) && /Hawai'i|Hawaii\b|O'ahu|Oahu|Pahoa|Kilauea|lanai\b/.test(loc[k])) err(`${k} is missing an ʻokina or kahakō`);
  }
  const cur = loc.currency;
  if (!isObj(cur) || !isStr(cur.code) || !isNum(cur.usdPerUnit) || cur.usdPerUnit <= 0) err('currency { code, usdPerUnit } is required');
  else if (cur.code !== 'USD' && !/^\d{4}-\d{2}$/.test(cur.asOf ?? '')) err('non-USD currency needs asOf "YYYY-MM"');

  // Housing: all five entries, each available with numbers or unavailable with a reason.
  if (!isObj(loc.housing)) err('housing is required');
  else {
    for (const type of HOME_TYPES) {
      const hEntry = loc.housing[type];
      if (!isObj(hEntry)) { err(`housing.${type} is missing`); continue; }
      if (hEntry.available === false) { if (!isStr(hEntry.naReason)) err(`housing.${type} is unavailable without a naReason`); continue; }
      if (hEntry.available !== true) { err(`housing.${type}.available must be true or false`); continue; }
      for (const f of HOUSING_FIELDS[type]) {
        const v = hEntry[f];
        const ok = f.endsWith('Cents') ? isCents(v) : isNum(v) && v > 0;
        if (!ok) err(`housing.${type}.${f} must be ${f.endsWith('Cents') ? 'non-negative integer cents' : 'a positive number'}`);
      }
      if (!isStr(hEntry.notes)) err(`housing.${type}.notes is required`);
    }
    const mtb = loc.housing.build?.monthsToBuild;
    if (loc.housing.build?.available && isNum(mtb) && (mtb < GENERAL.monthsToBuild[0] || mtb > GENERAL.monthsToBuild[1])) {
      warn(`build.monthsToBuild ${mtb} is outside ${GENERAL.monthsToBuild.join('–')}`);
    }
  }

  // Ownership
  const own = loc.ownership;
  if (!isObj(own)) err('ownership is required');
  else {
    if (!isNum(own.propertyTaxRate) || own.propertyTaxRate < 0 || own.propertyTaxRate > 0.05) err('propertyTaxRate must be a decimal 0–0.05');
    for (const k of ['homeInsuranceAnnualCents', 'condoInsuranceAnnualCents', 'rentersInsuranceMonthlyCents']) {
      if (!isCents(own[k])) err(`ownership.${k} must be non-negative integer cents`);
    }
    if (!Array.isArray(own.hazardCoverage)) err('ownership.hazardCoverage must be an array');
    else own.hazardCoverage.forEach((c, i) => {
      if (!isObj(c) || !COVERAGE_TYPES.includes(c.type)) err(`hazardCoverage[${i}] has an unknown type`);
      else {
        if (!isCents(c.annualCents)) err(`hazardCoverage[${i}].annualCents must be non-negative integer cents`);
        if (typeof c.requiredForMortgage !== 'boolean') err(`hazardCoverage[${i}].requiredForMortgage must be boolean`);
        if (!isStr(c.note)) err(`hazardCoverage[${i}].note is required`);
      }
    });
    if (!('lavaZone' in own)) err('ownership.lavaZone is required (null outside Hawaiʻi Island)');
    else if (own.lavaZone !== null && !(Number.isInteger(own.lavaZone) && own.lavaZone >= 1 && own.lavaZone <= 9)) err('lavaZone must be 1–9 or null');
  }

  // Living costs
  const liv = loc.living;
  if (!isObj(liv)) err('living is required');
  else {
    for (const k of ['utilitiesMonthlyCents', 'internetMonthlyCents', 'phoneMonthlyCents', 'groceriesMonthlyCents',
      'gymMonthlyCents', 'socialHourCents']) if (!isCents(liv[k])) err(`living.${k} must be non-negative integer cents`);
    const us = liv.utilitiesSeasonal;
    if (!isObj(us) || !isMonths(us.heatMonths) || !isMonths(us.coolMonths) || !isCents(us.heatExtraCents) || !isCents(us.coolExtraCents)) {
      err('living.utilitiesSeasonal needs heatMonths/coolMonths (0–11) and heatExtraCents/coolExtraCents');
    }
    const tr = liv.transport;
    if (!isObj(tr) || !TRANSPORT_MODES.includes(tr.mode) || !isCents(tr.monthlyCents)) err('living.transport needs mode and monthlyCents');
    else for (const t of HOME_TYPES) {
      const m = tr.commuteMinutesOneWay?.[t];
      if (!(isNum(m) && m >= 0)) err(`living.transport.commuteMinutesOneWay.${t} must be a number of minutes`);
    }
    const util = liv.utilitiesMonthlyCents / 100;
    if (isCents(liv.utilitiesMonthlyCents) && (util < GENERAL.utilitiesMonthly[0] || util > GENERAL.utilitiesMonthly[1])) warn(`utilities $${util} is outside the general band`);
    const groc = liv.groceriesMonthlyCents / 100;
    if (isCents(liv.groceriesMonthlyCents) && (groc < GENERAL.groceriesMonthly[0] || groc > GENERAL.groceriesMonthly[1])) warn(`groceries $${groc} is outside the general band`);
  }

  // Hazards, water, seasons
  if (!Array.isArray(loc.hazards) || loc.hazards.some((k) => !HAZARDS.includes(k))) err('hazards must be known hazard keys');
  if (typeof loc.hazardNotes !== 'string') err('hazardNotes is required');
  if (!WATER_KINDS.includes(loc.water)) err(`unknown water kind "${loc.water}"`);
  if (!SEWER_KINDS.includes(loc.sewer)) err(`unknown sewer kind "${loc.sewer}"`);
  if (!isObj(loc.seasons)) err('seasons is required');
  else for (const k of SEASON_KEYS) if (!isMonths(loc.seasons[k])) err(`seasons.${k} must be months 0–11`);

  // Metrics
  const met = loc.metrics;
  if (!isObj(met)) err('metrics is required');
  else {
    for (const k of METRICS_1_5) if (!(isNum(met[k]) && met[k] >= 1 && met[k] <= 5)) err(`metrics.${k} must be 1–5`);
    for (const k of ['movieTheaterMiles', 'concertHallMiles']) if (!(isNum(met[k]) && met[k] >= 0)) err(`metrics.${k} must be ≥ 0`);
    if (!(isNum(met.medianAge) && met.medianAge >= GENERAL.medianAge[0] && met.medianAge <= GENERAL.medianAge[1])) err('metrics.medianAge is out of range');
  }
  if (!Array.isArray(loc.sources) || loc.sources.length === 0 || !loc.sources.every(isStr)) err('sources must list at least one reference');

  // 03 §5 sanity bands (warnings only)
  const band = SANITY[loc.id];
  if (band && isObj(loc.housing) && isObj(own)) {
    const check = (label, value, range) => {
      if (!range || !isNum(value)) return;
      if (value < range[0] || value > range[1]) warn(`${label} ${value} is outside the 03 §5 band ${range[0]}–${range[1]}`);
    };
    const hs = loc.housing;
    if (hs.apartment?.available) check('1BR rent $', hs.apartment.rentCents / 100, band.rent1br);
    if (hs.house?.available) check('house price $', hs.house.priceCents / 100, band.house);
    if (hs.condo?.available) check('condo price $', hs.condo.priceCents / 100, band.condo);
    if (hs.build?.available) check('build $/sq ft', hs.build.buildCostPerSqftCents / 100, band.buildSqft);
    check('property tax rate', own.propertyTaxRate, band.taxRate);
  }
  return { errors, warnings };
}

/** Validate a list of records, adding duplicate-id errors → `{ errors, warnings }`. */
export function validateLocations(list) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  for (const loc of list) {
    const r = validateLocation(loc);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (seen.has(loc?.id)) errors.push(`${loc.id}: duplicate id`);
    seen.add(loc?.id);
  }
  return { errors, warnings };
}
