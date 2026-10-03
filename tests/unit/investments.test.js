// Investments (10 §6, task 48): maxInvest, buy/sell, the typical-year range, deterministic paths and their statistics.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seeds } from '../../app/src/dev/seeds.js';
import { validateState } from '../../app/src/state/schema.js';
import { INVEST } from '../../app/src/config.js';
import { gbmPath, marketPaths, portfolio } from '../../app/src/life/market.js';
import { startPlan, startLive, finishLive } from '../../app/src/life/monthFlow.js';
import { ledgerSums, monthTotalsOf } from '../../app/src/finance/ledger.js';
import {
  checkUnlock, maxInvest, buy, sell, validateBuy, validateSell, parseDollars, typicalYearRange, pathAt, valueAt,
  monthSeries, totalInvested, neverInvested, sparkLine, historySeries,
} from '../../app/src/life/investments.js';

const NOW = Date.UTC(2026, 9, 2);
const house = () => seeds['life-month1-house'].build(NOW);
const withCash = (checking, savings) => {
  const s = house();
  s.finances.checkingCents = checking;
  s.finances.savingsCents = savings;
  return s;
};

test('maxInvest keeps the $2,000 reserve and clamps at 0', () => {
  assert.equal(maxInvest(withCash(100000, 100000)), 0, 'exactly $2,000 → $0');
  assert.equal(maxInvest(withCash(50000, 50000)), 0, 'below the reserve clamps to 0');
  assert.equal(maxInvest(withCash(-30000, 10000)), 0, 'negative cash clamps to 0');
  assert.equal(maxInvest(withCash(150000, 300000)), 250000);
  assert.equal(validateBuy(withCash(100000, 100000), 'low', '1').ok, false);
  assert.match(validateBuy(withCash(100000, 100000), 'low', '1').error, /more than \$2,000/);
});

test('unlock happens at the plan stage once cash reaches $5,000 and stays unlocked', () => {
  const s = withCash(0, INVEST.unlockCents - 100);
  assert.equal(checkUnlock(s), false);
  s.finances.savingsCents = INVEST.unlockCents;
  assert.equal(checkUnlock(s), true);
  s.finances.savingsCents = 0;
  assert.equal(checkUnlock(s), true, 'stays unlocked when cash drops');
  const t = house();
  startPlan(t);
  assert.equal(t.life.investUnlocked, true, 'startPlan runs the check');
});

test('typed amounts: whole dollars only, > 0, ≤ max', () => {
  assert.equal(parseDollars('1,500'), 150000);
  assert.equal(parseDollars('$20.00'), 2000);
  for (const bad of ['', '0', '-5', '12.50', 'abc', '1e3']) assert.equal(parseDollars(bad), null, bad);
  const s = withCash(100000, 400000);
  assert.equal(validateBuy(s, null, '100').ok, false, 'needs a portfolio');
  assert.equal(validateBuy(s, 'low', '3000').ok, true);
  assert.equal(validateBuy(s, 'low', '3001').ok, false);
  assert.equal(validateBuy(s, 'low', '10.5').ok, false);
});

test('buy takes savings first, then checking, and adds value and basis', () => {
  const s = withCash(300000, 200000);
  const before = ledgerSums(s);
  assert.equal(buy(s, 'medium', 250000).ok, true);
  assert.equal(s.finances.savingsCents, 0);
  assert.equal(s.finances.checkingCents, 250000);
  assert.deepEqual(s.finances.investments.medium, { valueCents: 250000, basisCents: 250000 });
  assert.equal(totalInvested(s), 250000);
  assert.equal(neverInvested(s), false);
  const after = ledgerSums(s);
  assert.equal(s.finances.checkingCents - after.checking, 300000 - before.checking, 'ledger stays balanced');
  const t = monthTotalsOf(s.life.monthIndex, s.finances.transactions.filter((x) => x.month === s.life.monthIndex));
  assert.equal(t.expenseCents, 0, 'a buy is not spending');
  assert.equal(buy(s, 'medium', 100000).ok, false, 'over the max is refused');
  assert.equal(buy(s, 'medium', 1050).ok, false, 'not whole dollars');
  assert.equal(s.finances.checkingCents, 250000, 'a refused buy changes nothing');
});

test('sell sends proceeds to savings, cuts basis in proportion, refuses more than the value', () => {
  const s = withCash(0, 1200000);
  buy(s, 'high', 1000000);
  s.finances.investments.high.valueCents = 1200000; // grew 20%
  assert.equal(sell(s, 'high', 1200001).ok, false);
  assert.equal(validateSell(s, 'high', '12001').ok, false);
  assert.equal(validateSell(s, 'low', '1').ok, false, 'not held');
  assert.equal(sell(s, 'high', 300000).ok, true);
  assert.deepEqual(s.finances.investments.high, { valueCents: 900000, basisCents: 750000 });
  assert.equal(s.finances.savingsCents, 200000 + 300000);
  const all = validateSell(s, 'high', 'all');
  assert.equal(all.cents, 900000);
  sell(s, 'high', all.cents);
  assert.deepEqual(s.finances.investments.high, { valueCents: 0, basisCents: 0 });
  assert.deepEqual(validateState(s), []);
});

test('typical-year range is the computed 10th–90th percentile', () => {
  const low = typicalYearRange(portfolio('low')), high = typicalYearRange(portfolio('high'));
  assert.ok(low.lowCents > 95000 && low.lowCents < 100000 && low.highCents > 108000 && low.highCents < 110000, JSON.stringify(low));
  assert.ok(high.lowCents < 90000 && high.highCents > 130000, JSON.stringify(high));
  assert.ok(high.highCents - high.lowCents > low.highCents - low.lowCents);
});

test('market paths are deterministic for a seed', () => {
  const p = portfolio('medium');
  assert.deepEqual(gbmPath(p, 30, 42), gbmPath(p, 30, 42));
  assert.notDeepEqual(gbmPath(p, 30, 42), gbmPath(p, 30, 43));
  const s = withCash(0, 1000000);
  buy(s, 'low', 500000);
  assert.deepEqual(marketPaths(s, 0, 31), marketPaths(structuredClone(s), 0, 31));
  assert.deepEqual(Object.keys(marketPaths(s, 0, 31)), ['low']);
});

test('5,000 simulated months: log-return mean ≈ (μ − σ²/2)/12, std ≈ σ/√12', () => {
  for (const p of INVEST.portfolios) {
    const n = 5000, r = [];
    for (let i = 0; i < n; i++) r.push(Math.log(gbmPath(p, 30, 1000 + i).at(-1)));
    const mean = r.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const expMean = (p.mu - p.sigma ** 2 / 2) / 12, expSd = p.sigma / Math.sqrt(12);
    assert.ok(Math.abs(mean - expMean) < 4 * expSd / Math.sqrt(n), `${p.key} mean ${mean} vs ${expMean}`);
    assert.ok(Math.abs(sd / expSd - 1) < 0.05, `${p.key} sd ${sd} vs ${expSd}`);
  }
});

test('the live ticker ends exactly where finalizeMonth lands', () => {
  const s = withCash(0, 2000000);
  startPlan(s);
  buy(s, 'medium', 400000);
  buy(s, 'high', 600000);
  startLive(s);
  const { market, days } = s.life.current.plan;
  const start = valueAt(s, market, 0), end = valueAt(s, market, days);
  assert.equal(start.valueCents, 1000000);
  assert.equal(start.pct, 0);
  const mid = valueAt(s, market, 10.5);
  assert.equal(mid.byKey.high.valueCents, Math.round(600000 * pathAt(market.high, 10.5)));
  assert.equal(monthSeries(s, market, days).length, days + 1);
  s.life.current.care = { shown: 2, hits: 2 };
  const result = finishLive(s);
  assert.equal(result.investment.endCents, end.valueCents);
  assert.equal(totalInvested(s), end.valueCents);
  assert.ok(Math.abs(result.investment.pct - end.pct) < 1e-9);
});

test('pathAt tweens between days; sparkLine scales to the box', () => {
  assert.equal(pathAt([1, 2, 4], 0.5), 1.5);
  assert.equal(pathAt([1, 2, 4], 9), 4);
  const pts = sparkLine([10, 20, 30], 100, 20).split(' ').map((p) => p.split(',').map(Number));
  assert.equal(pts.length, 3);
  assert.ok(pts[0][1] > pts[2][1], 'higher value is drawn higher up');
});

test('historySeries starts at the first invested month and ends at today', () => {
  const s = seeds['life-invest-held'].build(NOW);
  const r = s.life.history.at(-1).result.investment;
  assert.deepEqual(historySeries(s), [r.startCents, r.endCents]);
  sell(s, 'high', 100000);
  assert.deepEqual(historySeries(s), [r.startCents, r.endCents, r.endCents - 100000]);
  assert.deepEqual(historySeries(seeds['life-invest'].build(NOW)), [0]);
});
