// The screen-reader description of the Phase 4 3D home (09 §1, 12 §4, task 42). Pure: builds one sentence from
// state.home, e.g. "A two-story Hawaiʻi plantation house in Hilo with a garden bed and three chickens."
import { byId } from '../data/locations/index.js';
import { styleFamily } from '../data/styleFamilies.js';
import { planBuilding } from '../phases/design/buildingPlan.js';
import { planHouse } from '../phases/design/housePlan.js';
import { SHARED_BEDROOMS } from '../phases/design/sharedModel.js';
import { listings } from '../phases/design/houseModel.js';

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const STORY = ['', 'one-story', 'two-story', 'three-story'];
const FORMS = { walkup: 'walk-up', lowrise: 'low-rise', tower: 'tower', glass: 'glass tower', townhomes: 'townhome row' };
const PLANT_NOUNS = { potted: ['potted plant', 'potted plants'], 'garden-bed': ['garden bed', 'garden beds'] };
const ANIMAL_NOUNS = { chicken: ['chicken', 'chickens'], cat: ['cat', 'cats'], dog: ['dog', 'dogs'], goat: ['goat', 'goats'] };

const count = (n, [one, many]) => `${n === 1 ? (/^[aeiou]/.test(one) ? 'an' : 'a') : NUM[n] ?? n} ${n === 1 ? one : many}`;
const article = (word) => (/^[aeiouAEIOU]/.test(word) ? 'An' : 'A');

/** "a garden bed, a mango tree and three chickens" for the home's living plants and present animals ('' if none). */
export function livingThings(home) {
  const groups = new Map();
  for (const p of (home?.plants ?? []).filter((x) => x.alive !== false)) {
    const noun = PLANT_NOUNS[p.kind] ?? [`${p.kind} tree`, `${p.kind} trees`];
    groups.set(noun[0], { noun, n: (groups.get(noun[0])?.n ?? 0) + 1 });
  }
  for (const a of (home?.animals ?? []).filter((x) => x.present !== false)) {
    const noun = ANIMAL_NOUNS[a.kind] ?? [a.kind, `${a.kind}s`];
    groups.set(noun[0], { noun, n: (groups.get(noun[0])?.n ?? 0) + 1 });
  }
  const parts = [...groups.values()].map(({ noun, n }) => count(n, noun));
  if (parts.length < 2) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/** One sentence describing the 3D view of `state.home` for screen readers (09 §1). */
export function describeHome(state) {
  const home = state.home;
  if (!home) return 'No home yet.';
  const loc = byId[home.locationId];
  const fam = styleFamily(loc.styleFamily, loc.styleVariant);
  const style = fam.label;
  const things = livingThings(home);
  const tail = things ? ` with ${things}` : '';
  if (home.kind === 'apartment' || home.kind === 'condo') {
    const b = home.building ?? {};
    const plan = planBuilding({ style: loc.styleFamily, variant: loc.styleVariant, seed: b.seed ?? 0, kind: home.kind, settlement: loc.settlement });
    const form = FORMS[plan.form] ?? 'building';
    const where = b.unitName ? `Unit ${b.unitName}, on floor ${b.floor} of` : 'A home in';
    return `${where} ${b.name ?? 'a building'}, a ${NUM[plan.floors] ?? plan.floors}-story ${style} ${form} in ${loc.name}. `
      + `Your ${home.kind} glows${things ? `; on the balcony: ${things}` : ''}.`;
  }
  if (home.kind === 'shared') {
    const plan = planHouse({ style: loc.styleFamily, styleVariant: loc.styleVariant, seed: home.shared?.seed ?? 0, variant: 'shared', bedrooms: SHARED_BEDROOMS });
    const story = STORY[plan.main.stories] ?? `${plan.main.stories}-story`;
    return `${article(story)} ${story} house in ${loc.name}, shared with two roommates${things ? `, and ${things}` : ''}.`;
  }
  if (home.kind === 'house') {
    const l = listings(state)[home.house?.listingIndex ?? 0];
    const story = STORY[l.plan.main.stories] ?? `${l.plan.main.stories}-story`;
    return `${article(story)} ${story} ${style} house in ${loc.name}${tail}.`;
  }
  const rooms = home.blueprint?.rooms?.length ?? 0;
  const roomText = `${NUM[rooms] ?? rooms} room${rooms === 1 ? '' : 's'}`;
  return `The ${style} house you designed in ${loc.name}: ${things ? `${roomText}, ${things}` : roomText}.`;
}
