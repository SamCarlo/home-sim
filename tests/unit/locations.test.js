import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCATIONS, byId, REGION_LABELS } from '../../app/src/data/locations/index.js';
import { validateLocation, validateLocations } from '../../app/src/data/validate.js';
import { STYLE_FAMILIES, LANDMARKS, HOME_TYPES, REGIONS } from '../../app/src/data/enums.js';
import { SANITY } from '../../app/src/data/sanity.js';

// 03 §1 table order.
const ORDER = ['pahoa', 'hilo', 'kailua-kona', 'waimea', 'honolulu', 'seattle', 'brooklyn', 'miami', 'katy', 'las-vegas',
  'chattanooga', 'halifax', 'yellow-pine', 'marquette', 'montpelier', 'elkins', 'clarksdale', 'bisbee', 'valentine', 'homer'];

test('every location record has zero validation errors (warnings printed)', () => {
  const { errors, warnings } = validateLocations(LOCATIONS);
  for (const w of warnings) console.log(`  warning: ${w}`);
  assert.deepEqual(errors, []);
});

test('ids are unique and byId matches', () => {
  const ids = LOCATIONS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const l of LOCATIONS) assert.equal(byId[l.id], l);
});

test('order follows the 03 §1 table', () => {
  const ids = LOCATIONS.map((l) => l.id);
  assert.deepEqual(ids, ORDER.slice(0, ids.length));
  assert.deepEqual(ids.slice(0, 5), ['pahoa', 'hilo', 'kailua-kona', 'waimea', 'honolulu']);
  assert.deepEqual(Object.keys(REGION_LABELS), REGIONS);
});

test('enums: 16 style families, 20 landmarks, 5 home types, a sanity band per place', () => {
  assert.equal(STYLE_FAMILIES.length, 16);
  assert.equal(LANDMARKS.length, 20);
  assert.deepEqual(HOME_TYPES, ['apartment', 'shared', 'condo', 'house', 'build']);
  assert.deepEqual(Object.keys(SANITY), ORDER);
});

test('Hawaiʻi specifics: Pāhoa condo unavailable, HPIA lava coverage required, lava zones set', () => {
  assert.equal(byId.pahoa.housing.condo.available, false);
  const lava = byId.pahoa.ownership.hazardCoverage.find((c) => c.type === 'lava');
  assert.ok(lava && lava.requiredForMortgage && /HPIA/.test(lava.note));
  assert.equal(byId.pahoa.water, 'catchment');
  for (const id of ['pahoa', 'hilo', 'kailua-kona', 'waimea']) assert.ok(Number.isInteger(byId[id].ownership.lavaZone));
  assert.equal(byId.honolulu.ownership.lavaZone, null);
  for (const l of LOCATIONS.slice(0, 5)) assert.deepEqual(l.seasons.hurricaneMonths, [5, 6, 7, 8, 9, 10]);
});

test('validator catches broken records', () => {
  const bad = structuredClone(byId.hilo);
  bad.housing.condo = { available: false };
  bad.housing.house.priceCents = -5;
  bad.styleFamily = 'castle';
  bad.metrics.noise = 7;
  bad.seasons.rainyMonths = [12];
  bad.ownership.hazardCoverage.push({ type: 'meteor', annualCents: 1 });
  bad.hook = 'Hilo, Hawaii';
  delete bad.living.gymMonthlyCents;
  const { errors } = validateLocation(bad);
  for (const frag of ['naReason', 'house.priceCents', 'styleFamily', 'noise', 'rainyMonths', 'unknown type',
    'ʻokina', 'gymMonthlyCents']) {
    assert.ok(errors.some((e) => e.includes(frag)), `expected an error about ${frag}: ${errors.join(' | ')}`);
  }
  assert.ok(validateLocations([byId.hilo, byId.hilo]).errors.some((e) => e.includes('duplicate')));
});

test('validator warns (not errors) outside a sanity band', () => {
  const odd = structuredClone(byId.hilo);
  odd.housing.apartment.rentCents = 500000; // $5,000
  const { errors, warnings } = validateLocation(odd);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('1BR rent')));
});

test('cities & suburbs: 12 records present in 03 §1 order, zero errors', () => {
  assert.ok(LOCATIONS.length >= 12);
  assert.deepEqual(LOCATIONS.slice(0, 12).map((l) => l.id), ORDER.slice(0, 12));
  const cities = LOCATIONS.filter((l) => l.region === 'cities');
  assert.deepEqual(cities.map((l) => l.id), ORDER.slice(5, 12));
  assert.deepEqual(validateLocations(LOCATIONS.slice(0, 12)).errors, []);
});

test('city specifics: Brooklyn build n/a, Halifax CAD, Katy MUD + flood, Vegas Ninth Island, Chattanooga fiber', () => {
  assert.equal(byId.brooklyn.housing.build.available, false);
  assert.equal(byId.brooklyn.living.transport.mode, 'transit');
  const h = byId.halifax;
  assert.equal(h.country, 'CA');
  assert.equal(h.currency.code, 'CAD');
  assert.match(h.currency.asOf, /^\d{4}-\d{2}$/);
  assert.ok(h.currency.usdPerUnit > 0.5 && h.currency.usdPerUnit < 1);
  assert.match(h.blurb, /Canadian dollar/);
  assert.match(byId.katy.housing.house.notes, /MUD/);
  assert.ok(byId.katy.ownership.hazardCoverage.some((c) => c.type === 'flood'));
  assert.match(byId['las-vegas'].hook, /Ninth Island/);
  assert.ok(byId['las-vegas'].living.utilitiesSeasonal.coolMonths.length >= 3);
  assert.match(byId.chattanooga.blurb, /fiber/);
  assert.match(byId.miami.housing.condo.notes, /special assessment/);
  // Cross-place sanity (task 08 Verify)
  assert.ok(byId.brooklyn.housing.apartment.rentCents > byId.honolulu.housing.apartment.rentCents);
  assert.ok(byId.katy.ownership.propertyTaxRate > byId['las-vegas'].ownership.propertyTaxRate);
  assert.ok(byId.miami.ownership.homeInsuranceAnnualCents > byId.seattle.ownership.homeInsuranceAnnualCents);
});
