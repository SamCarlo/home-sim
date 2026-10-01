// Cost engine, affordability colors, lifestyle metrics and the plan grid (04 §3–§6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINANCE } from '../../app/src/config.js';
import { byId, LOCATIONS } from '../../app/src/data/locations/index.js';
import { HOME_TYPE_LIST } from '../../app/src/data/homeTypes.js';
import { HOME_TYPES } from '../../app/src/data/enums.js';
import { cellCost, buildProjectCost, tableAssumptions } from '../../app/src/finance/costs.js';
import { classify, STATUSES } from '../../app/src/finance/affordability.js';
import { cellMetrics } from '../../app/src/data/metrics.js';
import { buildGrid, gridCells, cashOf } from '../../app/src/finance/grid.js';
import { buildSeed } from '../../app/src/dev/seeds.js';

const lines = (c, side) => Object.fromEntries(c[side].map((l) => [l.key, l.cents]));

test('home types: five, in enum order, with explainers and utility factors from config', () => {
  assert.deepEqual(HOME_TYPE_LIST.map((t) => t.id), HOME_TYPES);
  for (const t of HOME_TYPE_LIST) {
    assert.ok(t.header && t.explainer && t.designMode);
    assert.equal(t.utilityFactor, FINANCE.utilityFactor[t.id]);
  }
});

// Hand-calculated (P&I cross-checked with the closed-form formula in Python).
test('apartment, Hilo: deposit + first month + $50 fee; rent + HO-4 + utilities × 1.0', () => {
  const c = cellCost(byId.hilo, 'apartment');
  assert.deepEqual(lines(c, 'upfront'), { deposit: 155000, 'first-month': 155000, application: 5000 });
  assert.deepEqual(lines(c, 'monthly'), { rent: 155000, 'renters-insurance': 1500, utilities: 19000 });
  assert.equal(c.upfrontCents, 315000);
  assert.equal(c.monthlyCents, 175500);
});

test('shared, Hilo: room rent, $25 fee, utilities × 0.5', () => {
  const c = cellCost(byId.hilo, 'shared');
  assert.equal(c.upfrontCents, 80000 + 80000 + 2500);
  assert.deepEqual(lines(c, 'monthly'), { rent: 80000, 'renters-insurance': 1500, utilities: 9500 });
});

test('condo, Hilo: 10% down, 3% closing, P&I, PMI, tax, HO-6, HOA, utilities × 1.1', () => {
  const c = cellCost(byId.hilo, 'condo');
  assert.deepEqual(lines(c, 'upfront'), { 'down-payment': 3500000, closing: 1050000, inspection: 50000, appraisal: 60000 });
  assert.deepEqual(lines(c, 'monthly'), {
    'principal-interest': 199101, // $315,000 at 6.5% for 30 years = 1991.0143
    pmi: 15750, // 315,000 × 0.6% ÷ 12
    'property-tax': 16042, // 350,000 × 0.55% ÷ 12 = 160.4167
    insurance: 4167, // $500 ÷ 12
    hoa: 55000,
    utilities: 20900,
  });
  assert.equal(c.monthlyCents, 310960);
});

test('house, Pāhoa: required HPIA lava coverage is its own line; optional hurricane is not', () => {
  const c = cellCost(byId.pahoa, 'house');
  assert.equal(c.upfrontCents, 4000000 + 1200000 + 50000 + 60000);
  assert.deepEqual(lines(c, 'monthly'), {
    'principal-interest': 227544, pmi: 18000, 'property-tax': 18000, insurance: 9167, hazard: 33333, utilities: 29600,
  });
  assert.match(c.monthly.find((l) => l.key === 'hazard').label, /lava/);
});

test('build, Pāhoa: project cost, every upfront line, and the after-move-in monthly lines', () => {
  const h = byId.pahoa.housing.build;
  const { constructionCents, projectCents } = buildProjectCost(h);
  assert.equal(constructionCents, 41250000); // $375 × 1,000 sq ft × 1.10
  assert.equal(projectCents, 4500000 + 41250000 + 4500000);
  const c = cellCost(byId.pahoa, 'build');
  assert.equal(c.project.loanCents, 40200000);
  assert.deepEqual(lines(c, 'upfront'), {
    'down-payment': 10050000, // 20% of $502,500
    closing: 1206000, // 3% of the $402,000 loan
    permits: 500000,
    'temporary-housing': 900000, // 12 months × $750 room
    'interest-reserve': 1407000, // 402,000 × 50% × 7% ÷ 12 × 12
  });
  assert.deepEqual(lines(c, 'monthly'), {
    'principal-interest': 267452, // $402,000 at 7% for 30 years = 2674.516
    'property-tax': 22613, // 502,500 × 0.54% ÷ 12 = 226.125
    insurance: 11516, // $1,100 × (502,500 ÷ 400,000 = 1.25625) ÷ 12
    hazard: 33333,
    utilities: 24050,
  });
  assert.match(c.upfront.find((l) => l.key === 'temporary-housing').label, /12 months in a rented room/);
});

test('build: temporary housing falls back to apartment rent when shared living is unavailable', () => {
  const loc = structuredClone(byId.hilo);
  loc.housing.shared = { available: false, naReason: 'none' };
  const c = cellCost(loc, 'build');
  assert.equal(lines(c, 'upfront')['temporary-housing'], 155000 * loc.housing.build.monthsToBuild);
});

test('PMI is on at 10% down and off at exactly 20% down', () => {
  assert.ok(lines(cellCost(byId.hilo, 'house'), 'monthly').pmi > 0);
  const c20 = cellCost(byId.hilo, 'house', { ...FINANCE, downPaymentPct: 0.20 });
  assert.equal(lines(c20, 'monthly').pmi, undefined);
  assert.equal(lines(c20, 'upfront')['down-payment'], 11300000);
  assert.ok(c20.assumptions.some((a) => a.startsWith('No PMI')));
});

test('N/A cells: available false, the location reason, zero totals', () => {
  for (const [id, type] of [['pahoa', 'condo'], ['brooklyn', 'build'], ['yellow-pine', 'apartment']]) {
    const c = cellCost(byId[id], type);
    assert.equal(c.available, false);
    assert.equal(c.naReason, byId[id].housing[type].naReason);
    assert.equal(c.upfrontCents + c.monthlyCents, 0);
    assert.equal(classify(c, { cashCents: 1e9, incomeCents: 1e9 }).status, 'na');
  }
});

test('every cell: integer lines with notes that add up to the totals', () => {
  for (const loc of LOCATIONS) {
    for (const t of HOME_TYPE_LIST) {
      const c = cellCost(loc, t.id);
      if (!c.available) continue;
      for (const l of [...c.upfront, ...c.monthly]) {
        assert.ok(Number.isSafeInteger(l.cents) && l.cents >= 0, `${loc.id}/${t.id}/${l.key}`);
        assert.ok(l.label && l.note, `${loc.id}/${t.id}/${l.key} needs a label and note`);
      }
      assert.equal(c.upfront.reduce((s, l) => s + l.cents, 0), c.upfrontCents);
      assert.equal(c.monthly.reduce((s, l) => s + l.cents, 0), c.monthlyCents);
      assert.ok(c.assumptions.length > 0);
    }
  }
  assert.match(tableAssumptions(), /^Assumes 10% down, a 30-year fixed loan at 6\.5%/);
});

test('classify boundaries (04 §4)', () => {
  const at = (up, mo, cash, income) => classify({ available: true, upfrontCents: up, monthlyCents: mo }, { cashCents: cash, incomeCents: income });
  assert.equal(at(0, 100000, 0, 300000).status, 'green'); // exactly ⅓
  assert.equal(at(0, 100001, 0, 300000).status, 'yellow');
  assert.equal(at(0, 100000, 0, 500000).status, 'cyan'); // exactly ⅕
  assert.equal(at(0, 100001, 0, 500000).status, 'green');
  assert.equal(at(800000, 0, 800000, 300000).status, 'cyan'); // upfront = cash is affordable
  assert.equal(at(800001, 0, 800000, 300000).status, 'red');
  assert.equal(at(0, 320000, 0, 320000).status, 'yellow'); // monthly = income is a stretch, not red
  assert.equal(at(0, 320001, 0, 320000).status, 'red');
});

test('classify reasons carry formatted dollars; legend has five statuses', () => {
  const r = classify({ available: true, upfrontCents: 1240000, monthlyCents: 390000 }, { cashCents: 800000, incomeCents: 320000 });
  assert.deepEqual(r.reasons, ['Upfront $12,400 is more than your $8,000 in savings.', 'Monthly $3,900 is more than your $3,200 income.']);
  assert.equal(r.icon, '✕');
  const y = classify({ available: true, upfrontCents: 0, monthlyCents: 200000 }, { cashCents: 0, incomeCents: 320000 });
  assert.equal(y.reasons[0], 'Housing would take more than ⅓ of your income ($1,067).');
  const c = classify({ available: true, upfrontCents: 0, monthlyCents: 60000 }, { cashCents: 0, incomeCents: 320000 });
  assert.equal(c.reasons[0], 'Housing would take ⅕ of your income or less ($640).');
  assert.deepEqual(STATUSES.map((s) => s.status), ['cyan', 'green', 'yellow', 'red', 'na']);
});

test('cellMetrics: ten metrics in order, with home-type adjustments', () => {
  const keys = ['schools', 'transit', 'venues', 'noise', 'garden', 'garage', 'gym', 'nature', 'neighbor-age', 'commute'];
  const apt = cellMetrics(byId.pahoa, 'apartment');
  assert.deepEqual(apt.map((m) => m.key), keys);
  const get = (list, k) => list.find((m) => m.key === k);
  const base = byId.pahoa.metrics;
  assert.equal(get(apt, 'noise').value, Math.min(5, base.noise + 1));
  assert.equal(get(apt, 'garden').value, Math.round(base.gardenPotential * 0.4 * 2) / 2);
  assert.match(get(apt, 'garden').meaning, /lānai/);
  assert.match(get(cellMetrics(byId.seattle, 'condo'), 'garden').meaning, /balcony/);
  assert.equal(get(apt, 'neighbor-age').value, base.medianAge - 4);
  assert.equal(get(cellMetrics(byId.pahoa, 'build'), 'noise').value, 1); // 1 − 1 clamps to 1
  assert.equal(get(cellMetrics(byId.pahoa, 'build'), 'garage').value, 3);
  assert.equal(get(cellMetrics(byId.pahoa, 'house'), 'commute').value, byId.pahoa.living.transport.commuteMinutesOneWay.house);
  assert.deepEqual(get(apt, 'venues').value, { movieTheaterMiles: base.movieTheaterMiles, concertHallMiles: base.concertHallMiles });
  for (const m of apt) assert.ok(m.label && m.display && m.meaning && m.icon, m.key);
});

test('buildGrid: 3 groups, 20 rows, 100 cells; memoized on income and cash', () => {
  const s = buildSeed('plan-comfortable');
  const g = buildGrid(s);
  assert.deepEqual(g.groups.map((x) => x.rows.length), [5, 7, 8]);
  assert.equal(gridCells(g).length, 100);
  assert.equal(g.cashCents, cashOf(s));
  assert.equal(buildGrid(structuredClone(s)), g); // same numbers → same object
  const poorer = structuredClone(s);
  poorer.finances.savingsCents = 0;
  const g2 = buildGrid(poorer);
  assert.notEqual(g2, g);
  assert.ok(gridCells(g2).filter((c) => c.status.status === 'red').length > gridCells(g).filter((c) => c.status.status === 'red').length);
});
