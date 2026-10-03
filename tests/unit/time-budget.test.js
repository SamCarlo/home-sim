// Time budget, chores rules and the question money hints (09 §3–§4, task 43).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIFE } from '../../app/src/config.js';
import { byId } from '../../app/src/data/locations/index.js';
import { seeds } from '../../app/src/dev/seeds.js';
import { validateState } from '../../app/src/state/schema.js';
import { canLive, defaultChoices } from '../../app/src/life/monthFlow.js';
import {
  timeBudget, freeTimeRating, commuteHours, choresHours, hoursText, hourlyNetCents, overtimePayCents, socialCostCents,
  homeGardenOptions, SEGMENTS,
} from '../../app/src/life/timeBudget.js';

const NOW = Date.UTC(2026, 9, 2);
// 09 §4 worked example: 40 h job, 30 min each way (Pāhoa apartment = 5 h), plain chores.
const calib = (home = {}) => ({
  player: { weeklyJobHours: 40, netMonthlyIncomeCents: 320000 },
  home: { kind: 'apartment', locationId: 'pahoa', plants: [], animals: [], lifestyle: {}, ...home },
});
const MAX = { exercise: 7, extraWork: 32, social: 20, deepPractice: 7 };

test('the free-time rating table, first match wins (09 §4)', () => {
  const at = (h) => freeTimeRating(h).key;
  assert.equal(at(-0.1), 'overbooked');
  assert.equal(at(0), 'burnout');
  assert.equal(at(4.9), 'burnout');
  assert.equal(at(5), 'stretched');
  assert.equal(at(11.9), 'stretched');
  assert.equal(at(12), 'balanced');
  assert.equal(at(25), 'balanced');
  assert.equal(at(30), 'balanced');
  assert.equal(at(30.1), 'restless');
  assert.equal(at(40), 'restless');
  assert.equal(at(40.1), 'adrift');
  const r = freeTimeRating(25);
  assert.deepEqual([r.label, r.color, r.mentalDelta, r.note], ['Balanced', 'green', 3, 'good for your mental health']);
  const o = freeTimeRating(-3);
  assert.deepEqual([o.color, o.mentalDelta, o.physicalDelta], ['red', -8, -2]);
  assert.equal(freeTimeRating(45).color, 'orange');
  assert.equal(freeTimeRating(35).color, 'yellow');
});

test('calibration: the default plan is Balanced, no choices is Adrift, the maximum is Overbooked', () => {
  const s = calib();
  const none = timeBudget(s, {});
  assert.equal(none.waking, 112);
  assert.deepEqual(none.segments.map((x) => x.key), SEGMENTS.map((x) => x.key));
  assert.equal(none.segments.find((x) => x.key === 'commute').hours, 5);
  assert.equal(none.rating.key, 'adrift');
  const def = timeBudget(s, LIFE.defaults); // 4 / 0 / 7 / 7
  assert.equal(def.freeHours, none.freeHours - 18);
  assert.equal(def.rating.key, 'balanced');
  const max = timeBudget(s, MAX);
  assert.ok(max.freeHours < 0, `max leaves ${max.freeHours}`);
  assert.equal(max.rating.key, 'overbooked');
  assert.ok(Math.abs(max.usedHours + max.freeHours - 112) < 1e-9);
  // Extra work is monthly hours ÷ 4.33.
  const ot = timeBudget(s, { extraWork: 16 });
  assert.ok(Math.abs(ot.segments.find((x) => x.key === 'extraWork').hours - 16 / 4.33) < 1e-9);
  // A stretched month: training hard + plenty of social + a few shifts.
  assert.equal(timeBudget(s, { exercise: 7, extraWork: 8, social: 20, deepPractice: 7 }).rating.key, 'stretched');
});

test('chores modifiers by home type, animals, garden, walk-up and roommates', () => {
  const base = LIFE.chores.base;
  assert.equal(choresHours({ kind: 'apartment' }).hours, base);
  assert.equal(choresHours({ kind: 'condo' }).hours, base);
  assert.equal(choresHours({ kind: 'shared' }).hours, base - 2);
  assert.equal(choresHours({ kind: 'house' }).hours, base + 3);
  assert.equal(choresHours({ kind: 'build' }).hours, base + 4);
  const animals = [{ kind: 'chicken', present: true }, { kind: 'chicken', present: true }, { kind: 'cat', present: true },
    { kind: 'dog', present: false }];
  assert.equal(choresHours({ kind: 'house', animals }).hours, base + 3 + 2, 'two kinds still at home');
  const plants = [{ kind: 'garden-bed', alive: true }];
  assert.equal(choresHours({ kind: 'house', plants }).hours, base + 3 + 1);
  assert.equal(choresHours({ kind: 'house', plants: [{ kind: 'garden-bed', alive: false }] }).hours, base + 3);
  assert.equal(choresHours({ kind: 'apartment', lifestyle: { stairs: 1 } }).hours, base + 0.5);
  assert.equal(choresHours({ kind: 'shared', lifestyle: { choresHours: 1 } }).hours, base - 2 + 1);
  assert.equal(choresHours({ kind: 'shared', lifestyle: { choresHours: -3 } }).hours, base - 2 - 1, 'roommates clamp to ±1');
  // Pending home & garden answers count this month.
  assert.equal(choresHours({ kind: 'apartment' }, { homeGarden: 'cat' }).hours, base + 1);
  assert.equal(choresHours({ kind: 'house' }, { homeGarden: 'garden' }).hours, base + 3 + 1);
  assert.equal(choresHours({ kind: 'apartment' }, { homeGarden: 'garden' }).hours, base, 'pots are not garden beds');
});

test('commute math: 2 × one-way minutes × 5 ÷ 60 per home type', () => {
  const pahoa = byId.pahoa;
  assert.equal(commuteHours(pahoa, 'apartment'), 5);
  assert.equal(commuteHours(pahoa, 'build'), 7.5);
  assert.equal(commuteHours(pahoa, 'house'), (2 * 40 * 5) / 60);
  assert.equal(commuteHours(null, 'house'), 0);
});

test('money hints: overtime at 1.5 × hourly net, social cost at half the hours', () => {
  const s = calib();
  const hourly = Math.round(320000 / ((40 * 52) / 12));
  assert.equal(hourlyNetCents(s), hourly);
  assert.equal(overtimePayCents(s, 8), Math.round(8 * hourly * 1.5));
  assert.equal(overtimePayCents(s, 0), 0);
  const per = byId.pahoa.living.socialHourCents;
  assert.equal(socialCostCents(s, 7), Math.round(7 * 4.33 * per * 0.5));
  assert.equal(hoursText(25), '25 h');
  assert.equal(hoursText(-3), '−3 h');
  assert.equal(hoursText(7.39), '7.4 h');
});

test('home & garden question: shown when something is missing, chickens only with a yard', () => {
  assert.deepEqual(homeGardenOptions({ kind: 'apartment', plants: [{ kind: 'pot', alive: true }], animals: [] }).map((o) => o.value),
    ['garden', 'cat', 'none']);
  const full = { kind: 'house', plants: [{ kind: 'garden-bed', alive: true }], animals: [{ kind: 'cat', present: true }] };
  assert.deepEqual(homeGardenOptions(full), []);
  assert.deepEqual(homeGardenOptions({ ...full, animals: [{ kind: 'cat', present: false }] }).map((o) => o.value),
    ['garden', 'cat', 'chickens', 'none']);
});

test('life-plan-filled is a valid plan-stage save with every core answer', () => {
  const s = seeds['life-plan-filled'].build(NOW);
  assert.deepEqual(validateState(s), []);
  assert.equal(s.life.current.stage, 'plan');
  assert.ok(canLive(s.life.current.choices));
  const b = timeBudget(s, s.life.current.choices);
  assert.ok(b.freeHours > 0 && b.freeHours < 112);
  assert.equal(defaultChoices(s).homeGarden, 'none');
});
