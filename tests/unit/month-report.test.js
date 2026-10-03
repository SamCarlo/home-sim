// Month summary and year in review numbers (09 §11, task 47).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds } from '../../app/src/dev/seeds.js';
import { validateState } from '../../app/src/state/schema.js';
import { LIFE } from '../../app/src/config.js';
import { startPlan, startLive, finishLive, nextMonth, finishReview, currentStage, isYearEnd } from '../../app/src/life/monthFlow.js';
import { moneyRows, wellbeingRows, housingNotice, isHousingWarning, yearReview, sparkPoints } from '../../app/src/life/monthReport.js';
import { TIPS, tipFor } from '../../app/src/content/tips.js';

const NOW = Date.UTC(2026, 9, 2);
const sum = (rows) => rows.reduce((t, r) => t + r.cents, 0);

/** Live `n` months on a seed, collecting each month's {plan, result}. */
function live(name, n, tweak = () => {}) {
  const s = seeds[name].build(NOW);
  tweak(s);
  const out = [];
  for (let i = 0; i < n && s.phase === 'life'; i++) {
    if (i) nextMonth(s);
    startPlan(s);
    startLive(s);
    s.life.current.care = { shown: 4, hits: 3 };
    const plan = s.life.current.plan;
    out.push({ plan, result: finishLive(s) });
  }
  return { s, out };
}

test('money rows always add up to the result totals', () => {
  for (const name of ['life-month1-house', 'life-month1-apartment', 'life-month1-build']) {
    const { out } = live(name, 12);
    for (const { plan, result } of out) {
      const m = moneyRows(result, plan);
      assert.equal(sum(m.income), result.incomeCents, `${name} ${result.label} income`);
      assert.equal(sum(m.expenses), result.expenseCents, `${name} ${result.label} expenses`);
      assert.equal(m.netCents, result.incomeCents - result.expenseCents);
      assert.equal(m.income[0].key, 'paycheck');
      for (const r of [...m.income, ...m.expenses]) assert.ok(Number.isInteger(r.cents) && r.cents > 0, `${name} ${r.key} ${r.cents}`);
    }
  }
});

test('paid event costs move into "Surprises & events"', () => {
  const { out } = live('life-month1-house', 12);
  const withEvent = out.find(({ result }) => result.events.some((e) => e.amountCents < 0));
  assert.ok(withEvent, 'some month has a cost event');
  const m = moneyRows(withEvent.result, withEvent.plan);
  const paid = withEvent.result.events.filter((e) => e.amountCents < 0).reduce((t, e) => t - e.amountCents, 0);
  assert.equal(m.expenses.find((r) => r.key === 'events').cents, paid);
});

test('wellbeing rows follow the card order and carry reason chips', () => {
  const { out } = live('life-month1-house', 1);
  const rows = wellbeingRows(out[0].result);
  assert.deepEqual(rows.map((r) => r.key), ['physical', 'purpose', 'financial', 'social', 'mental']);
  for (const r of rows) assert.equal(r.change, r.after - r.before);
  assert.ok(rows.some((r) => r.chips.length && r.chips.every((c) => c.text && c.delta)));
});

test('housing notice: none, first miss, then a kind final notice', () => {
  assert.equal(housingNotice({ missed: [] }, 0, 'apartment'), null);
  const missed = { missed: [{ kind: 'housing', label: 'Housing payment', cents: 100000 }] };
  const first = housingNotice(missed, 1, 'apartment');
  assert.equal(first.level, 'first');
  assert.match(first.title, /rent/);
  const final = housingNotice(missed, LIFE.finalNoticeStreak, 'house');
  assert.equal(final.level, 'final');
  assert.match(final.text, /mortgage/);
  assert.ok(final.tryNext.length >= 2);
  assert.ok(isHousingWarning('Final notice: miss one more housing payment and you will lose your home.'));
  assert.ok(!isHousingWarning('Money ran out, so you went without: groceries.'));
});

test('life-overdue is a valid February summary with the final notice', () => {
  const s = seeds['life-overdue'].build(NOW);
  assert.deepEqual(validateState(s), []);
  assert.equal(currentStage(s), 'summary');
  assert.equal(s.life.monthIndex, 1);
  assert.equal(s.finances.credit.lateHousingStreak, LIFE.finalNoticeStreak);
  assert.equal(housingNotice(s.life.current.result, s.finances.credit.lateHousingStreak, s.home.kind).level, 'final');
});

test('December leads to the year in review; the reflection is saved, a blank one is not', () => {
  assert.ok(isYearEnd(11) && isYearEnd(23) && !isYearEnd(0) && !isYearEnd(12));
  const s = seeds['life-year-review'].build(NOW);
  assert.deepEqual(validateState(s), []);
  assert.equal(currentStage(s), 'review');
  assert.equal(s.life.monthIndex, 12);
  assert.equal(s.life.history.length, 12);
  const blank = structuredClone(s);
  finishReview(blank, '   ', NOW);
  assert.equal(blank.life.reflections.length, 0);
  assert.equal(currentStage(blank), 'welcome');
  finishReview(s, `  Save more in spring.${'x'.repeat(2000)}`, NOW);
  assert.equal(s.life.reflections.length, 1);
  assert.equal(s.life.reflections[0].year, 2033);
  assert.equal(s.life.reflections[0].monthIndex, 11);
  assert.equal(s.life.reflections[0].text.length, LIFE.reflectionMax);
  assert.ok(s.life.reflections[0].text.startsWith('Save more'));
  assert.deepEqual(validateState(s), []);
  assert.throws(() => finishReview(s, 'again'));
});

test('year review totals, net worth, best/worst month and 13-point trends', () => {
  const s = seeds['life-year-review'].build(NOW);
  const y = yearReview(s.life.history, 2033);
  const res = s.life.history.map((m) => m.result);
  assert.equal(y.months, 12);
  assert.equal(y.incomeCents, res.reduce((t, r) => t + r.incomeCents, 0));
  assert.equal(y.expenseCents, res.reduce((t, r) => t + r.expenseCents, 0));
  assert.equal(y.netWorthStartCents, res[0].netWorthBeforeCents);
  assert.equal(y.netWorthEndCents, res[11].netWorthCents);
  const nets = res.map((r) => r.incomeCents - r.expenseCents);
  assert.equal(y.best.netCents, Math.max(...nets));
  assert.equal(y.worst.netCents, Math.min(...nets));
  for (const k of ['physical', 'purpose', 'financial', 'social', 'mental']) {
    assert.equal(y.trends[k].length, 13);
    assert.equal(y.trends[k][12], Math.round(res[11].wellbeingAfter[k]));
  }
  assert.equal(yearReview(s.life.history, 2034).months, 0);
});

test('sparkPoints stays inside its box; tips rotate', () => {
  const pts = sparkPoints([0, 50, 100], 120, 28, 3).split(' ').map((p) => p.split(',').map(Number));
  assert.deepEqual(pts[0], [3, 25]);
  assert.deepEqual(pts[2], [117, 3]);
  assert.equal(sparkPoints([], 120, 28), '');
  assert.ok(TIPS.length >= 20 && TIPS.length <= 30);
  assert.ok(TIPS.every((t) => !t.includes('—')), 'no em dashes in tips');
  assert.equal(tipFor(0), TIPS[0]);
  assert.equal(tipFor(TIPS.length + 2), TIPS[2]);
});
