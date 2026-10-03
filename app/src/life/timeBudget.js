// The weekly time budget (09 §4, task 43). Pure: no DOM. 112 waking hours a week, split into the job, the commute,
// personal care, chores, the month's choices (exercise, extra work, social, deep practice) and whatever free time is
// left; the free hours pick a rating from `LIFE.freeTime` (first match wins). Also the money hints the questions show
// (overtime pay, social cost) so task 44's planMonth charges exactly what the buttons promised.
import { LIFE } from '../config.js';
import { byId } from '../data/locations/index.js';

/** Segment order, labels and color tokens (09 §4 table order; the view reads `var(--<color>)`). */
export const SEGMENTS = [
  { key: 'job', label: 'Job', color: 'tb-job' },
  { key: 'commute', label: 'Commute', color: 'tb-commute' },
  { key: 'care', label: 'Personal care & meals', color: 'tb-care' },
  { key: 'chores', label: 'Chores & errands', color: 'tb-chores' },
  { key: 'exercise', label: 'Exercise', color: 'tb-exercise' },
  { key: 'extraWork', label: 'Extra work', color: 'tb-extra' },
  { key: 'social', label: 'Social, family & leisure', color: 'tb-social' },
  { key: 'deepPractice', label: 'Deep practice', color: 'tb-deep' },
];

const num = (v) => (Number.isFinite(v) ? v : 0);

/** The rating row for a number of free hours (09 §4 table; first match wins). */
export function freeTimeRating(freeHours) {
  const row = LIFE.freeTime.find((r) => ('below' in r ? freeHours < r.below : freeHours <= r.atMost));
  const { key, label, color, mentalDelta, physicalDelta, note } = row;
  return { key, label, color, mentalDelta, physicalDelta, note };
}

/** Commute hours per week: 2 × one-way minutes for the home type × 5 days ÷ 60 (09 §4). */
export function commuteHours(location, homeTypeId) {
  const min = location?.living?.transport?.commuteMinutesOneWay?.[homeTypeId] ?? 0;
  return (2 * min * 5) / 60;
}

/** Distinct kinds of animals still at home, plus a pending adoption from the home & garden answer. */
function animalKinds(home, pick) {
  const kinds = new Set((home?.animals ?? []).filter((a) => a.present !== false).map((a) => a.kind));
  if (pick === 'cat') kinds.add('cat');
  if (pick === 'chickens') kinds.add('chicken');
  return kinds.size;
}

/** True when the home has a living garden bed, or the student is planting one this month (house/build only). */
function hasGardenBeds(home, pick) {
  if ((home?.plants ?? []).some((p) => p.kind === 'garden-bed' && p.alive !== false)) return true;
  return pick === 'garden' && hasYard(home);
}

/** Houses and built homes have a yard (chickens, garden beds); apartments, condos and rooms don't. */
export function hasYard(home) {
  return home?.kind === 'house' || home?.kind === 'build';
}

/**
 * Chores & errands per week (09 §4): base + home type, +1 per animal kind, +1 with garden beds, +0.5 for a walk-up
 * (`lifestyle.stairs`), roommate traits ±1 (`lifestyle.choresHours`). → `{hours, parts [{label, hours}]}`.
 */
export function choresHours(home, choices = {}) {
  const c = LIFE.chores;
  const pick = choices.homeGarden;
  const parts = [{ label: 'Base', hours: c.base }];
  const byType = c.byHomeType[home?.kind] ?? 0;
  if (byType) parts.push({ label: 'Home type', hours: byType });
  const kinds = animalKinds(home, pick);
  if (kinds) parts.push({ label: 'Animals', hours: kinds * c.perAnimalKind });
  if (hasGardenBeds(home, pick)) parts.push({ label: 'Garden beds', hours: c.gardenBeds });
  if (home?.lifestyle?.stairs > 0) parts.push({ label: 'Walk-up stairs', hours: c.walkUp });
  const mates = Math.max(-c.roommateTraitMax, Math.min(c.roommateTraitMax, num(home?.lifestyle?.choresHours)));
  if (mates) parts.push({ label: 'Roommates', hours: mates });
  return { hours: parts.reduce((s, p) => s + p.hours, 0), parts };
}

/**
 * The weekly time budget (09 §4) → `{waking, segments [{key, label, hours, color}], usedHours, freeHours, rating, chores}`.
 * Missing answers count as 0 h. `opts.location` overrides the home's location (tests).
 */
export function timeBudget(state, choices = {}, opts = {}) {
  const home = state.home ?? {};
  const loc = opts.location ?? byId[home.locationId];
  const chores = choresHours(home, choices);
  const hours = {
    job: num(state.player?.weeklyJobHours),
    commute: commuteHours(loc, home.kind),
    care: LIFE.personalCareHours,
    chores: chores.hours,
    exercise: num(choices.exercise),
    extraWork: num(choices.extraWork) / LIFE.weeksPerMonth,
    social: num(choices.social),
    deepPractice: num(choices.deepPractice),
  };
  const segments = SEGMENTS.map((s) => ({ ...s, hours: hours[s.key] }));
  const usedHours = segments.reduce((s, x) => s + x.hours, 0);
  const freeHours = LIFE.wakingHoursPerWeek - usedHours;
  return { waking: LIFE.wakingHoursPerWeek, segments, usedHours, freeHours, rating: freeTimeRating(freeHours), chores };
}

/** "25 h", "7.4 h", "−3 h": whole hours when within 0.05, else one decimal; a real minus sign. */
export function hoursText(h) {
  const r = Math.abs(h - Math.round(h)) < 0.05 ? String(Math.round(Math.abs(h))) : Math.abs(h).toFixed(1);
  return `${h < 0 && r !== '0' ? '−' : ''}${r} h`;
}

/** Hourly net pay in cents: netMonthly ÷ (weeklyJobHours × 52 ÷ 12) (09 §6). 0 without a job. */
export function hourlyNetCents(state) {
  const weekly = num(state.player?.weeklyJobHours);
  if (weekly <= 0) return 0;
  return Math.round(num(state.player?.netMonthlyIncomeCents) / ((weekly * 52) / 12));
}

/** Overtime pay for `monthlyHours` extra hours: hours × hourly net × 1.5 (09 §3, §6), in cents. */
export function overtimePayCents(state, monthlyHours) {
  return Math.round(num(monthlyHours) * hourlyNetCents(state) * LIFE.overtimeMultiplier);
}

/** Rough monthly cost of `hours` social hours a week: hours × 4.33 × socialHourCents × 0.5 (09 §6), in cents. */
export function socialCostCents(state, hours, location = byId[state.home?.locationId]) {
  const per = num(location?.living?.socialHourCents);
  return Math.round(num(hours) * LIFE.weeksPerMonth * per * LIFE.socialPaidShare);
}

/**
 * Which home & garden options to offer (09 §3 question 5), or [] when the question is hidden. It's shown when the home
 * has no plants or no animals, or some have died or left. Chickens need a yard; a cat or hens already at home aren't
 * offered again. → `[{value, label, upfrontCents, monthlyCents}]` ending with "Not now".
 */
export function homeGardenOptions(home) {
  const plants = home?.plants ?? [], animals = home?.animals ?? [];
  const show = !plants.length || !animals.length || plants.some((p) => p.alive === false) || animals.some((a) => a.present === false);
  if (!show) return [];
  const has = (kind) => animals.some((a) => a.kind === kind && a.present !== false);
  const { adoptCents: a, petMonthlyCents: m, gardenMonthlyCents } = LIFE;
  return [
    { value: 'garden', label: 'Plant a garden bed or pots', upfrontCents: a.garden, monthlyCents: gardenMonthlyCents },
    ...(has('cat') ? [] : [{ value: 'cat', label: 'Adopt a cat', upfrontCents: a.cat, monthlyCents: m.cat }]),
    ...(hasYard(home) && !has('chicken') ? [{ value: 'chickens', label: 'Get 3 chickens', upfrontCents: a.chickens, monthlyCents: m.chickens }] : []),
    { value: 'none', label: 'Not now', upfrontCents: 0, monthlyCents: 0 },
  ];
}
