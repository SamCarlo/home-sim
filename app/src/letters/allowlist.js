// Words the speller always accepts (06 §3 step 2): Hawaiian words and places, all 20 game places, and game/finance
// terms. Written with diacritics; lookups go through foldKey, so "Pāhoa", "Pahoa", "Hawaiʻi", "Hawai'i" and "Hawaii"
// all match. Pure data.
import { foldKey } from './text.js';

/** Hawaiian words students use in letters. */
export const HAWAIIAN_WORDS = ['aloha', 'mahalo', 'ʻohana', 'kuleana', 'mālama', 'keiki', 'kupuna', 'kūpuna', 'lānai',
  'pau', 'pono', 'hale', 'ʻāina', 'mauka', 'makai', 'kōkua', 'kamaʻāina', 'malihini', 'ʻono', 'pūpū', 'lūʻau', 'lei',
  'hula', 'ʻukulele', 'ukulele', 'poke', 'tūtū', 'tutu', 'aunty', 'aunties', 'auntie', 'kāne', 'wahine', 'hana',
  'akamai', 'pilikia', 'kapu', 'hānai', 'puka', 'ʻae', 'ʻaʻole', 'holoholo', 'hoʻomaikaʻi', 'hui', 'aliʻi', 'mana',
  'moana', 'nani', 'lānais', 'haʻaheo'];

/** Hawaiian places beyond the five game locations. */
export const HAWAIIAN_PLACES = ['Hawaiʻi', 'Hilo', 'Pāhoa', 'Kona', 'Kailua', 'Kailua-Kona', 'Waimea', 'Kamuela',
  'Honolulu', 'Oʻahu', 'Puna', 'Maui', 'Kauaʻi', 'Molokaʻi', 'Lānaʻi', 'Niʻihau', 'Keaʻau', 'Kurtistown', 'Kīlauea',
  'Mauna Kea', 'Mauna Loa', 'Hāmākua', 'Kaʻū', 'Kohala', 'Waikīkī', 'Mānoa', 'Kalapana', 'Leilani', 'Kapoho',
  'Hōnaunau', 'Kealakekua', 'Waiākea', 'Keaukaha', 'Kaimukī', 'Kapolei', 'Kāneʻohe', 'Hāna', 'Lahaina', 'Kahului'];

/** The 20 game places (03 §1), as written in the location data. */
export const GAME_PLACES = ['Pāhoa', 'Hilo', 'Kailua-Kona', 'Waimea', 'Honolulu', 'Seattle', 'Brooklyn', 'Miami', 'Katy',
  'Las Vegas', 'Chattanooga', 'Halifax', 'Yellow Pine', 'Marquette', 'Montpelier', 'Elkins', 'Clarksdale', 'Bisbee',
  'Valentine', 'Homer'];

/** States, provinces and regions around the game places. */
export const REGIONS = ['Texas', 'Florida', 'Nevada', 'Tennessee', 'Nova Scotia', 'Idaho', 'Michigan', 'Vermont',
  'West Virginia', 'Mississippi', 'Arizona', 'Nebraska', 'Alaska', 'Washington', 'New York', 'Canada', 'Houston'];

/** Game and finance terms (some aren't in the en_US dictionary, the rest are listed so they never get flagged). */
export const GAME_TERMS = ['HOA', 'HOAs', 'PMI', 'MIP', 'APR', 'FHA', 'USDA', 'DTI', 'HPIA', 'ADU', 'HO-3', 'HO-4', 'HO-6',
  'co-signer', 'cosigner', 'co-signers', 'cosigners', 'co-sign', 'cosign', 'co-signing', 'cosigning', 'co-signed',
  'cosigned', 'roommate', 'roommates', 'autopay', 'auto-pay', 'paycheck', 'paychecks', 'payday', 'landlord', 'landlords',
  'lender', 'lenders', 'mortgage', 'escrow', 'pre-approved', 'preapproved', 'pre-approval', 'preapproval',
  'prequalified', 'homeowner', 'homeowners', 'catchment', 'upcountry', 'townhome', 'townhomes', 'walk-up', 'ok',
  'okay', 'email', 'emails', 'online', 'grandma', 'grandpa', 'carpool', 'carpooling', 'budgeting', 'rideshare', 'wifi',
  'Wi-Fi', 'internet', 'lava', 'subcontractor', 'subcontractors', 'contractor', 'contractors', 'blueprint', 'blueprints'];

/** Every allowed word as a foldKey (multi-word names add each word too). */
export const ALLOW_KEYS = new Set(
  [...HAWAIIAN_WORDS, ...HAWAIIAN_PLACES, ...GAME_PLACES, ...REGIONS, ...GAME_TERMS]
    .flatMap((w) => [w, ...w.split(/[\s-]+/)])
    .map(foldKey),
);

/** True when `word` is on the allowlist (any spelling of the ʻokina/kahakō, any case). */
export function isAllowed(word) {
  return ALLOW_KEYS.has(foldKey(word));
}
