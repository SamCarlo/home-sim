// "Live this month" timeline (09 §9, task 45): day labels, routines, events on their day, momentAt, placeAt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds } from '../../app/src/dev/seeds.js';
import { LIFE } from '../../app/src/config.js';
import { startLive } from '../../app/src/life/monthFlow.js';
import { buildTimeline, shortDayLabel, eventToast, routineFor, momentAt, placeAt } from '../../app/src/life/timeline.js';

const NOW = Date.UTC(2026, 9, 2);

test('shortDayLabel matches the real 2033 calendar', () => {
  assert.equal(shortDayLabel(0, 1), 'Sat, January 1');
  assert.equal(shortDayLabel(0, 14), 'Fri, January 14');
  assert.equal(shortDayLabel(1, 28), 'Mon, February 28');
});

test('eventToast shows the signed amount with a real minus sign', () => {
  assert.equal(eventToast({ label: 'Car repair', amountCents: -45000 }), 'Car repair −$450');
  assert.equal(eventToast({ label: 'Tax refund', amountCents: 36300 }), 'Tax refund +$363');
  assert.equal(eventToast({ label: 'Community cleanup', amountCents: 0 }), 'Community cleanup');
});

test('routines: weekdays go out, weekends stay home unless social ≥ 7', () => {
  const r = LIFE.routine;
  assert.deepEqual(routineFor(0, 3, { social: 3 }), { weekend: false, out: [r.leave, r.home] }); // Monday
  assert.deepEqual(routineFor(0, 1, { social: 3 }), { weekend: true, out: null });               // Saturday
  assert.deepEqual(routineFor(0, 2, { social: 7 }), { weekend: true, out: [r.weekendOut, r.weekendHome] });
});

test('buildTimeline has one entry per day and puts every planned event and care moment on its day', () => {
  const s = seeds['life-plan-filled'].build(NOW);
  startLive(s);
  const plan = s.life.current.plan;
  const tl = buildTimeline(plan, s.life.current.choices);
  assert.equal(tl.days.length, plan.days);
  assert.deepEqual(tl.days.map((d) => d.day), Array.from({ length: plan.days }, (_, i) => i + 1));
  assert.equal(tl.days.flatMap((d) => d.events).length, plan.events.length);
  assert.equal(tl.days.flatMap((d) => d.care).length, plan.care.schedule.length);
  for (const d of tl.days) for (const e of d.events) assert.equal(e.day, d.day);
  const fake = buildTimeline({ ...plan, events: [{ day: 14, id: 'car-repair', label: 'Car repair', amountCents: -45000 }] });
  assert.equal(fake.days[13].events[0].toast, 'Car repair −$450');
});

test('momentAt walks through the days and reports done at the end', () => {
  const tl = { days: Array.from({ length: 31 }, (_, i) => ({ day: i + 1 })) };
  assert.deepEqual(momentAt(tl, 0, 1200), { index: 0, day: 1, t: 0, done: false });
  const m = momentAt(tl, 1200 * 13.5, 1200);
  assert.equal(m.day, 14); assert.ok(Math.abs(m.t - 0.5) < 1e-9);
  assert.equal(momentAt(tl, 1200 * 31, 1200).done, true);
  assert.equal(momentAt(tl, 1e9, 1200).day, 31);
});

test('placeAt: inside at night, out during the weekday, yard on a quiet weekend', () => {
  const weekday = { weekend: false, out: [0.3, 0.72] };
  const quiet = { weekend: true, out: null };
  assert.equal(placeAt(weekday, 0.1), 'inside');
  assert.equal(placeAt(weekday, 0.28), 'home');
  assert.equal(placeAt(weekday, 0.5), 'out');
  assert.equal(placeAt(weekday, 0.8), 'home');
  assert.equal(placeAt(weekday, 0.95), 'inside');
  assert.equal(placeAt(quiet, 0.5), 'yard');
});
