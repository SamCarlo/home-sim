// Fictional people and businesses by region (05 §10, 12 §7). Pure, seeded. Every name here is made up; if one ever
// turns out to sound like a real, well-known local company, replace it. HPIA is the one real organization the game
// names, and only in explanatory text (insurance tasks), so it isn't listed here.
import { createRng, seedFor } from '../util/rng.js';
import { byId } from '../data/locations/index.js';

/** Name pools per region (data/enums.js REGIONS). Business kinds: landlords lenders insurers inspectors contractors hoas. */
export const NAMES = {
  hawaii: {
    landlords: ['Kīpuka Property Management', 'Hale Pono Rentals', 'Makana Hale Management', 'Pua Kenikeni Rentals',
      'Lehua Lane Properties', 'ʻĀina Kai Rental Group'],
    lenders: ['Lauaʻe Home Loans', 'Ala Nui Mortgage', 'Kahiko Bay Credit Union', 'Uluwehi Savings Bank'],
    insurers: ['Mauna Shield Insurance', 'Hōkū Mutual Insurance', 'Koaʻe Insurance Group'],
    inspectors: ['Puʻu Home Inspections', 'Ke Ala Inspection Co.', 'Kilo Hale Inspections'],
    contractors: ['ʻŌhiʻa Ridge Builders', 'Kanoa Brothers Construction', 'Pōhaku Hale Builders'],
    hoas: ['Hale Kaʻulu Owners Association', 'Laʻi Gardens Association'],
    first: ['Keʻala', 'Mele', 'Kawika', 'Leilani', 'Noe', 'Kai', 'Malia', 'Ikaika', 'Pua', 'Kekoa', 'Hiro', 'Grace',
      'Marisol', 'Dylan', 'Analyn', 'Joseph'],
    last: ['Kahananui', 'Akana', 'Nakamura', 'Santos', 'Kealoha', 'Fujimoto', 'Domingo', 'Kaʻai', 'Lee', 'Mahoe',
      'Silva', 'Tanaka'],
  },
  cities: {
    landlords: ['Brightline Property Management', 'Parkview Leasing Group', 'Harbor & Vine Rentals',
      'Cornerlight Residential', 'Tall Maple Property Co.'],
    lenders: ['Evergreen Home Loans', 'Northgate Home Lending', 'Bluepoint Savings Bank', 'Lamplight Credit Union'],
    insurers: ['Granite Shield Insurance', 'Lantern Mutual Insurance', 'Brightwater Insurance Group'],
    inspectors: ['ClearSight Home Inspections', 'Level & Plumb Inspections'],
    contractors: ['Brick & Beam Builders', 'Summitline Construction', 'Greenway Home Builders'],
    hoas: ['Bayview Tower Owners Association', 'Linden Court Condominium Association'],
    first: ['Maya', 'Jordan', 'Priya', 'Marcus', 'Elena', 'Tyler', 'Aaliyah', 'Diego', 'Hannah', 'Kevin', 'Sofia',
      'Andre', 'Mei', 'Samir'],
    last: ['Rivera', 'Chen', 'Johnson', 'Patel', 'Okafor', 'Nguyen', 'Brooks', 'Ramirez', 'Kowalski', 'Greene',
      'Haddad', 'Murphy'],
  },
  towns: {
    landlords: ['Prairie Wind Rentals', 'Old Mill Property Co.', 'Cedar Hollow Rentals', 'Bluestem Property Management'],
    lenders: ['Juniper Flats Bank', 'Hearthstone Community Bank', 'Big Meadow Savings', 'Sagebrush Credit Union'],
    insurers: ['Prairie Hearth Mutual', 'Tall Pine Insurance', 'Long Road Insurance Co.'],
    inspectors: ['Plumb Line Inspections', 'Square Nail Home Inspections'],
    contractors: ['Timber & Stone Builders', 'Ridgeback Construction', 'Fencepost Home Builders'],
    hoas: ['Willow Creek Owners Association'],
    first: ['Wyatt', 'Emma', 'Cody', 'Lily', 'Rosa', 'Hank', 'Jolene', 'Luis', 'Ada', 'Silas', 'Nora', 'Tom'],
    last: ['Miller', 'Begay', 'Hart', 'Lindqvist', 'Delgado', 'Pruitt', 'Yazzie', 'Boone', 'Hollis', 'Carver',
      'Mendez', 'Shaw'],
  },
};

/** The pool for a region (unknown regions fall back to 'cities'). */
export function namesFor(region) {
  return NAMES[region] ?? NAMES.cities;
}

/** The region of the chosen home (or 'cities' with no choice). */
export function regionOf(state) {
  return byId[state?.choice?.locationId]?.region ?? 'cities';
}

/** A seeded generator for one naming purpose in this attempt: same save + place + attempt → same names. */
export function nameRng(state, purpose) {
  const c = state.choice ?? {};
  return createRng(seedFor(state.meta.seed, 'name', purpose, c.locationId ?? '', c.homeTypeId ?? '',
    state.plan?.attempts?.length ?? 0));
}

/** A business of `kind` (landlords, lenders, insurers, inspectors, contractors, hoas) for this attempt. */
export function businessFor(state, kind, purpose = kind) {
  const list = namesFor(regionOf(state))[kind];
  if (!list) throw new Error(`Unknown business kind "${kind}"`);
  return nameRng(state, purpose).pick(list);
}

/** `n` distinct "First Last" people for this attempt (never the player's own name). */
export function peopleFor(state, purpose, n = 1) {
  const pool = namesFor(regionOf(state));
  const rng = nameRng(state, purpose);
  const firsts = rng.shuffle(pool.first);
  const lasts = rng.shuffle(pool.last);
  const own = String(state.player?.characterName ?? '').split(/\s+/)[0];
  return firsts.filter((f) => f !== own).slice(0, n).map((f, i) => `${f} ${lasts[i % lasts.length]}`);
}

/** A fictional phone number in the 555-01xx range for a contact, e.g. "(808) 555-0147". */
export function phoneFor(state, purpose) {
  const rng = nameRng(state, `phone-${purpose}`);
  const area = regionOf(state) === 'hawaii' ? '808' : rng.pick(['314', '406', '503', '612', '719', '802']);
  return `(${area}) 555-01${String(rng.int(10, 99))}`;
}
