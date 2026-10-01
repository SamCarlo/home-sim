// All locations in table order (03 §1), plus lookups. Pure.
import { HAWAII } from './hawaii.js';
import { CITIES } from './cities.js';
import { TOWNS } from './towns.js';

/** Every location record, in the exact 03 §1 table order. */
export const LOCATIONS = [...HAWAII, ...CITIES, ...TOWNS];

/** Location records keyed by id. */
export const byId = Object.freeze(Object.fromEntries(LOCATIONS.map((l) => [l.id, l])));

/** Table group headings (03 §1). */
export const REGION_LABELS = Object.freeze({
  hawaii: 'Hawaiʻi',
  cities: 'Cities & suburbs',
  towns: 'Small towns & rural',
});

/** Bump whenever any location figure changes, so memoized grids (finance/grid.js) recompute. */
export const DATA_VERSION = 1;
