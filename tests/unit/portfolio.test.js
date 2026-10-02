// Portfolio view model (task 17): grouping, loan progress, letters, credit gauge and bands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupRecurring, loanProgress, letterList, creditGauge, creditHistory, whenLabel } from '../../app/src/ui/portfolio/portfolioModel.js';
import { creditBand } from '../../app/src/finance/creditScore.js';
import { buildSeed } from '../../app/src/dev/seeds.js';

test('groupRecurring groups by category in summary order and totals', () => {
  const rec = [
    { id: 'r1', label: 'Gas', amountCents: 100, category: 'transportation', startsMonth: 0 },
    { id: 'r2', label: 'Rent', amountCents: 1000, category: 'housing', startsMonth: 0 },
    { id: 'r3', label: 'Old loan', amountCents: 50, category: 'debt', startsMonth: 0, endsMonth: 2 },
    { id: 'r4', label: 'Mystery', amountCents: 7, category: 'zzz', startsMonth: 0 },
  ];
  const all = groupRecurring(rec);
  assert.deepEqual(all.groups.map((g) => g.category), ['housing', 'transportation', 'debt', 'zzz']);
  assert.equal(all.totalCents, 1157);
  const later = groupRecurring(rec, 5);
  assert.equal(later.totalCents, 1107);
  assert.ok(!later.groups.some((g) => g.category === 'debt'));
});

test('loanProgress', () => {
  assert.deepEqual(loanProgress({ principalCents: 1000, balanceCents: 750, termMonths: 12, paymentsMade: 3 }),
    { paidCents: 250, paidPct: 0.25, monthsLeft: 9 });
  assert.equal(loanProgress({ principalCents: 0, balanceCents: 0 }).paidPct, 0);
});

test('creditBand covers 300–850 without gaps', () => {
  assert.equal(creditBand(300).key, 'poor');
  assert.equal(creditBand(579).key, 'poor');
  assert.equal(creditBand(580).key, 'fair');
  assert.equal(creditBand(669).label, 'Fair');
  assert.equal(creditBand(670).key, 'good');
  assert.equal(creditBand(740).key, 'very-good');
  assert.deepEqual([creditBand(850).key, creditBand(850).maxScore], ['excellent', 850]);
  assert.deepEqual([creditBand(700).minScore, creditBand(700).maxScore], [670, 739]);
});

test('creditGauge maps 300 → −90° and 850 → +90°, segments span the arc', () => {
  assert.equal(creditGauge(300).angle, -90);
  assert.equal(creditGauge(850).angle, 90);
  assert.equal(creditGauge(575).angle, 0);
  const segs = creditGauge(700).segments;
  assert.equal(segs[0].fromDeg, -90);
  assert.equal(segs[segs.length - 1].toDeg, 90);
  for (let i = 1; i < segs.length; i++) assert.equal(segs[i].fromDeg, segs[i - 1].toDeg);
});

test('portfolio-demo seed: letters newest first, history newest first, labels', () => {
  const s = buildSeed('portfolio-demo', 1_000_000_000_000);
  assert.deepEqual(letterList(s).map((l) => l.id), ['L1', 'L2']);
  const hist = creditHistory(s);
  assert.equal(hist[0].month, 2);
  assert.equal(whenLabel(-1), 'Paperwork');
  assert.equal(whenLabel(3), 'April 2033');
  assert.ok(s.finances.loans[0].balanceCents < s.finances.loans[0].principalCents);
});
