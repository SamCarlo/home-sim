import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState } from '../../app/src/state/schema.js';
import { initialCredit, utilization, adjustScore, recordInquiry, monthlyUpdate } from '../../app/src/finance/creditScore.js';
import { CREDIT } from '../../app/src/config.js';

const fresh = (score) => {
  const s = createInitialState({ uid: 'u1', now: 0 });
  if (score != null) s.finances.credit.score = score;
  return s;
};

test('starts from config', () => {
  assert.equal(initialCredit().score, CREDIT.startingScore);
  assert.deepEqual(fresh().finances.credit, initialCredit());
});

test('on time: +3, only +1 above 750, capped at 850', () => {
  const s = fresh(700);
  const e = monthlyUpdate(s, { allOnTime: true, month: 0 });
  assert.deepEqual([e.delta, e.score, s.finances.credit.onTimeStreak], [3, 703, 1]);
  assert.match(e.reasons[0], /on time/);
  const hi = fresh(751);
  assert.equal(monthlyUpdate(hi, { allOnTime: true, month: 0 }).delta, 1);
  const top = fresh(850);
  const t = monthlyUpdate(top, { allOnTime: true, month: 0 });
  assert.deepEqual([t.delta, t.score], [0, 850]);
});

test('missed payments: −60 each, streaks, never below 300', () => {
  const s = fresh(680);
  s.finances.credit.onTimeStreak = 4;
  const e = monthlyUpdate(s, { allOnTime: false, missedCount: 2, month: 3, housingMissed: true });
  assert.deepEqual([e.delta, e.score], [-120, 560]);
  const cr = s.finances.credit;
  assert.deepEqual([cr.missedPayments, cr.onTimeStreak, cr.lateHousingStreak], [2, 0, 1]);
  monthlyUpdate(s, { allOnTime: false, missedCount: 1, month: 4, housingMissed: true });
  assert.equal(cr.lateHousingStreak, 2);
  monthlyUpdate(s, { allOnTime: true, month: 5 });
  assert.equal(cr.lateHousingStreak, 0);
  const low = fresh(320);
  const l = monthlyUpdate(low, { allOnTime: false, missedCount: 3, month: 0 });
  assert.deepEqual([l.score, l.delta], [300, -20]);
  // allOnTime with a missed count is not on time
  assert.equal(monthlyUpdate(fresh(700), { allOnTime: true, missedCount: 1, month: 0 }).delta, -60);
});

test('utilization: > 30% −10, > 60% −25 (not both)', () => {
  assert.equal(monthlyUpdate(fresh(700), { allOnTime: true, utilization: 0.30, month: 0 }).delta, 3);
  assert.equal(monthlyUpdate(fresh(700), { allOnTime: true, utilization: 0.31, month: 0 }).delta, 3 - 10);
  assert.equal(monthlyUpdate(fresh(700), { allOnTime: true, utilization: 0.61, month: 0 }).delta, 3 - 25);
  const s = fresh();
  assert.equal(utilization(s), 0);
  s.finances.creditCard = { limitCents: 100000, balanceCents: 45000 };
  assert.equal(utilization(s), 0.45);
});

test('hard inquiries: −5 now, +5 back once after 12 months', () => {
  const s = fresh(680);
  const e = recordInquiry(s, 'mortgage', -1);
  assert.deepEqual([e.delta, e.score, e.month], [-5, 675, -1]);
  assert.match(e.reasons[0], /mortgage/);
  recordInquiry(s, 'card', 2);
  assert.equal(s.finances.credit.score, 670);
  assert.equal(monthlyUpdate(s, { allOnTime: false, month: 11 }).delta, 0);   // −1 is 12 months old: not older yet
  const back = monthlyUpdate(s, { allOnTime: false, month: 12 });
  assert.equal(back.delta, 5);
  assert.match(back.reasons.join(' '), /mortgage/);
  assert.equal(monthlyUpdate(s, { allOnTime: false, month: 13 }).delta, 0);
  assert.equal(monthlyUpdate(s, { allOnTime: false, month: 15 }).delta, 5);  // the card inquiry
  assert.equal(monthlyUpdate(s, { allOnTime: false, month: 40 }).delta, 0);
});

test('every change is logged with reasons; adjustScore clamps', () => {
  const s = fresh(400);
  const e = adjustScore(s, -CREDIT.foreclosureCost, 'Foreclosure', 9);
  assert.deepEqual(e, { month: 9, delta: -100, score: 300, reasons: ['Foreclosure'] });
  monthlyUpdate(s, { allOnTime: false, month: 10 });
  const h = s.finances.credit.history;
  assert.equal(h.length, 2);
  assert.deepEqual(h[1].reasons, ['No change']);
  for (const x of h) assert.ok(x.score >= 300 && x.score <= 850 && x.reasons.length);
});
