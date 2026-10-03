// The "Live this month" timeline (09 §9, task 45). Pure: turns planMonth's output into one entry per day with the
// day label, the weekday/weekend routine (when the character leaves and comes back) and the events that land that day,
// plus `momentAt(timeline, ms, dayMs)` to find where an elapsed time falls. The animation (phases/life/animation.js)
// only plays this back; finalizeMonth charges the same events.
import { LIFE } from '../config.js';
import { weekday, yearMonth } from '../util/dates.js';
import { formatMoney } from '../finance/money.js';

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];

/** "Tue, January 14" (09 §9 day label). */
export function shortDayLabel(monthIndex, day) {
  return `${SHORT_DAYS[weekday(monthIndex, day)]}, ${MONTHS[yearMonth(monthIndex).month]} ${day}`;
}

/** Toast text for an event: "Car repair −$450", "Tax refund +$363", or just the label when no money moves. */
export function eventToast(ev) {
  const c = ev.amountCents ?? 0;
  if (!c) return ev.label;
  return `${ev.label} ${c < 0 ? '−' : '+'}${formatMoney(Math.abs(c))}`;
}

/**
 * The day's routine (09 §9): weekdays leave at `LIFE.routine.leave` and come home at `LIFE.routine.home`; weekends stay
 * home, unless social ≥ `LIFE.routine.socialOutHours` (then out 0.55 → 0.85). → `{weekend, out: [t0, t1] | null}`.
 */
export function routineFor(monthIndex, day, choices = {}) {
  const wd = weekday(monthIndex, day);
  const weekend = wd === 0 || wd === 6;
  const r = LIFE.routine;
  if (!weekend) return { weekend, out: [r.leave, r.home] };
  return { weekend, out: (choices.social ?? 0) >= r.socialOutHours ? [r.weekendOut, r.weekendHome] : null };
}

/**
 * buildTimeline(plan, choices) → `{monthIndex, days: [{day, label, weekday, weekend, out, events [{…event, toast}],
 * care [{index, fraction}]}]}`, one entry per day of the month.
 */
export function buildTimeline(plan, choices = {}) {
  const mi = plan.monthIndex;
  const days = [];
  for (let d = 1; d <= plan.days; d++) {
    const { weekend, out } = routineFor(mi, d, choices);
    days.push({
      day: d, label: shortDayLabel(mi, d), weekday: weekday(mi, d), weekend, out,
      events: (plan.events ?? []).filter((e) => e.day === d).map((e) => ({ ...e, toast: eventToast(e) })),
      care: (plan.care?.schedule ?? []).map((c, index) => ({ index, ...c })).filter((c) => c.day === d),
    });
  }
  return { monthIndex: mi, days };
}

/**
 * Where elapsed game time `ms` falls: `{index, day, t, done}` (index 0-based, t 0..1 through that day). `done` once the
 * whole month has played.
 */
export function momentAt(timeline, ms, dayMs) {
  const n = timeline.days.length;
  const raw = Math.max(0, ms) / dayMs;
  if (raw >= n) return { index: n - 1, day: n, t: 1, done: true };
  const index = Math.floor(raw);
  return { index, day: index + 1, t: raw - index, done: false };
}

/** Where the character should be at time t of a day: 'inside' | 'yard' | 'out' (walks happen between these). */
export function placeAt(dayEntry, t) {
  const r = LIFE.routine;
  if (t < r.wake || t >= r.bed) return 'inside';
  if (dayEntry.out && t >= dayEntry.out[0] && t < dayEntry.out[1]) return 'out';
  return dayEntry.weekend ? 'yard' : 'home';
}
