// The five home types (04 §3, §5, §6; design modes from 07 §1). Pure data, in table column order.
import { FINANCE } from '../config.js';

/**
 * @typedef {object} HomeType
 * @property {string} id
 * @property {string} label           lower-case noun for sentences ("an apartment in Hilo")
 * @property {string} title           capitalized noun ("Apartment in Hilo")
 * @property {string} header          column header (04 §5)
 * @property {string} explainer       one-line column tooltip
 * @property {boolean} buying         true when the player takes out a mortgage
 * @property {number} utilityFactor   × the location's 1-bedroom utilities (04 §3)
 * @property {object} metrics         04 §6 adjustments: noise (added), gardenFactor (×), garage (0–3), ageDelta (added)
 * @property {string} designMode      07 §1
 */

/** @type {HomeType[]} */
export const HOME_TYPE_LIST = [
  {
    id: 'apartment', label: 'apartment', title: 'Apartment', header: 'Apartment (rent)', buying: false,
    explainer: 'Rent a one-bedroom apartment of your own. The landlord fixes things; you pay rent every month.',
    utilityFactor: FINANCE.utilityFactor.apartment,
    metrics: { noise: 1, gardenFactor: 0.4, gardenNote: 'pots on the {porch}', garage: 0, garageLabel: 'none', ageDelta: -4 },
    designMode: 'apartment-picker',
  },
  {
    id: 'shared', label: 'shared room', title: 'Shared room', header: 'Shared living (rent a room)', buying: false,
    explainer: 'Rent a bedroom in a house and share the kitchen and bills with housemates. The cheapest way to live.',
    utilityFactor: FINANCE.utilityFactor.shared,
    metrics: { noise: 1, gardenFactor: 0.6, gardenNote: 'a corner of the shared yard', garage: 1, garageLabel: 'shared storage', ageDelta: -6 },
    designMode: 'shared-picker',
  },
  {
    id: 'condo', label: 'condo', title: 'Condo', header: 'Condo (buy)', buying: true,
    explainer: 'Buy a unit in a building. You own it, pay a mortgage, and pay HOA dues for the shared parts.',
    utilityFactor: FINANCE.utilityFactor.condo,
    metrics: { noise: 0.5, gardenFactor: 0.4, gardenNote: 'pots on the {porch}', garage: 1, garageLabel: 'storage + parking', ageDelta: 0 },
    designMode: 'apartment-picker',
  },
  {
    id: 'house', label: 'house', title: 'House', header: 'House (buy)', buying: true,
    explainer: 'Buy a house on its own lot. More space and a yard, and every repair is yours to pay for.',
    utilityFactor: FINANCE.utilityFactor.house,
    metrics: { noise: 0, gardenFactor: 0.9, gardenNote: 'your own yard', garage: 2, garageLabel: 'garage', ageDelta: 3 },
    designMode: 'house-picker',
  },
  {
    id: 'build', label: 'new house you build', title: 'New house', header: 'Build a house', buying: true,
    explainer: 'Buy a lot and build a cozy 1,000 sq ft house you design. Takes months, and you need somewhere to live meanwhile.',
    utilityFactor: FINANCE.utilityFactor.build,
    metrics: { noise: -1, gardenFactor: 1.0, gardenNote: 'a whole lot to plan', garage: 3, garageLabel: 'garage + workshop (if you design one)', ageDelta: 2 },
    designMode: 'blueprint',
  },
];

/** Home types keyed by id. */
export const HOME_TYPES_BY_ID = Object.freeze(Object.fromEntries(HOME_TYPE_LIST.map((t) => [t.id, t])));

/** The home type with this id (throws for unknown ids). */
export function homeType(id) {
  const t = HOME_TYPES_BY_ID[id];
  if (!t) throw new RangeError(`Unknown home type "${id}"`);
  return t;
}
