// Underwriting decisions and the paperwork commit (05 §7–§8, task 29).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../../app/src/dev/seeds.js';
import { decide, drawFor, letterFactor, homeApproved, letterFor } from '../../app/src/finance/underwriting.js';
import { commitPaperwork } from '../../app/src/phases/paperwork/commit.js';
import { cash, unpaidUpfront } from '../../app/src/finance/ledger.js';
import { validateState } from '../../app/src/state/schema.js';
import { UNDERWRITING } from '../../app/src/config.js';

const ready = (type) => buildSeed(`paperwork-ready-${type}`, 1);
const home = (s) => decide(s).find((d) => d.required);
const product = (d) => d.factors.reduce((p, f) => p * f.value, 1);
const hardFail = (s, re) => {
  const d = home(s);
  assert.equal(d.approved, false);
  assert.equal(d.probability, 0);
  assert.ok(d.hardFail);
  assert.ok(d.reasons.some((r) => re.test(r)), `${re} in ${JSON.stringify(d.reasons)}`);
};

test('letterFactor and the factor product', () => {
  assert.equal(letterFactor(0), 0.55);
  assert.equal(letterFactor(1), 1);
  assert.equal(letterFactor(0.5), 0.775);
  for (const t of ['apartment', 'shared', 'condo', 'house', 'build']) {
    for (const d of decide(ready(t))) {
      if (!d.hardFail) assert.ok(Math.abs(d.probability - Math.min(1, product(d))) < 1e-3, `${t} ${d.kind}`);
      assert.equal(d.approved, d.draw < d.probability);
    }
  }
});

test('lease factors: ratio tiers, credit tiers, cover letter', () => {
  const s = ready('apartment');
  const d = home(s);
  const L = letterFor(s, 'rental-cover').likelihood / 100;
  const f = (label) => d.factors.find((x) => x.label === label).value;
  assert.equal(f('Finances'), 0.85);                       // $4,200 ÷ $1,550 = 2.7× rent
  assert.equal(f('Credit'), 1);
  assert.ok(Math.abs(f('Letter') - letterFactor(L)) < 1e-4);
  s.finances.credit.score = 620;
  assert.equal(home(s).factors.find((x) => x.label === 'Credit').value, 0.9);
  s.finances.credit.score = 590;
  assert.equal(home(s).factors.find((x) => x.label === 'Credit').value, 0.75);
  s.player.netMonthlyIncomeCents = 500000;                 // 3.2× rent
  assert.equal(home(s).factors.find((x) => x.label === 'Finances').value, 1);
});

test('lease hard fails: under 1.5× rent, under 2.5× with no co-signer, short of move-in cash', () => {
  const s = ready('apartment');
  s.player.netMonthlyIncomeCents = 200000;                 // 1.3×
  hardFail(s, /less than 1\.5× the rent/);
  const c = buildSeed('paperwork-apartment-cosigner', 1);
  const ds = decide(c);
  const cos = ds.find((d) => d.kind === 'cosigner');
  assert.ok(cos, 'co-signer decision when income < 2.5× rent');
  const lease = ds.find((d) => d.kind === 'lease');
  if (cos.approved) assert.equal(lease.factors[0].value, UNDERWRITING.lease.cosignerF);
  else assert.match(lease.reasons[0], /don't have a co-signer/);
  const broke = ready('apartment');
  broke.finances.savingsCents = 1000;
  hardFail(broke, /move-in costs/);
});

test('co-signer and roommates formulas', () => {
  const c = buildSeed('paperwork-apartment-cosigner', 1);
  const cos = decide(c).find((d) => d.kind === 'cosigner');
  assert.equal(cos.probability, 0.35);                     // no co-signer letter yet → L = 0
  const s = ready('shared');
  const d = home(s);
  const L = letterFor(s, 'roommate-intro').likelihood / 100;
  assert.deepEqual(d.factors.map((f) => f.label), ['Finances', 'Intro letter', 'Roommate agreement']);
  assert.ok(Math.abs(d.factors[1].value - (0.5 + 0.5 * L)) < 1e-4);
  assert.equal(d.factors[2].value, 1 + UNDERWRITING.roommates.agreementBonus);
});

test('mortgage hard fails: DTI, credit floor, program rules, cash, Lava Zone down payment', () => {
  const tight = ready('house');
  tight.player.netMonthlyIncomeCents = 300000;
  hardFail(tight, /Lenders stop at 50%/);
  const low = ready('house');
  low.finances.credit.score = 570;
  hardFail(low, /need at least 580/);
  const conv = ready('house');
  conv.finances.credit.score = 600;                        // conventional needs 620
  hardFail(conv, /Conventional loans need a credit score of 620/);
  const poor = ready('condo');
  poor.finances.savingsCents = 100000;
  poor.finances.checkingCents = 0;
  hardFail(poor, /to close but only have/);
  const lava = buildSeed('paperwork-pahoa-house-options', 1);
  Object.assign(lava.paperwork.options, { program: 'conventional', downPaymentPct: 0.1, termYears: 30 });
  hardFail(lava, /Lava Zones 1–2, lenders want at least 20% down/);
  const fha = buildSeed('paperwork-pahoa-house-options', 1);
  Object.assign(fha.paperwork.options, { program: 'fha', downPaymentPct: 0.035, termYears: 30 });
  hardFail(fha, /FHA won’t insure/);
});

test('mortgage factors: back-ratio tiers, credit tier rate, closing final rate', () => {
  const s = ready('house');
  const d = home(s);
  const back = d.terms.backRatio;
  const tier = UNDERWRITING.mortgage.backTiers.find((t) => back <= t.max);
  assert.equal(d.factors[0].value, tier.f);
  assert.equal(d.factors.find((f) => f.label === 'Credit').value, 0.9);   // 675 after the inquiry
  assert.equal(d.terms.rate, +(0.065 + 0.00375).toFixed(6));
  assert.ok(d.terms.upfrontCents > 0 && d.terms.principalCents > 0 && d.terms.paymentCents > 0);
  const rich = ready('house');
  rich.player.netMonthlyIncomeCents = 2000000;
  assert.equal(home(rich).factors[0].value, 1);
});

test('construction hard fails and the contractor factor', () => {
  const base = ready('build');
  assert.equal(home(base).hardFail, false, 'a fresh 680 player can build (score pulled before the inquiry)');
  const low = ready('build');
  low.paperwork.options.pulledScore = 670;
  hardFail(low, /need a credit score of 680/);
  const dti = ready('build');
  dti.player.netMonthlyIncomeCents = 450000;
  hardFail(dti, /Construction lenders stop at 45%/);
  const noC = ready('build');
  delete noC.paperwork.options.contractorId;
  hardFail(noC, /hired a contractor/);
  const noP = ready('build');
  noP.paperwork.options.permit.approved = false;
  hardFail(noP, /building permit/);
  const down = ready('build');
  down.paperwork.options.project = { ...down.paperwork.options.project, loanCents: down.paperwork.options.project.projectCents * 0.85 };
  hardFail(down, /need 20% down/);
  const cashless = ready('build');
  cashless.finances.savingsCents = 0;
  hardFail(cashless, /to start building/);
  const a = ready('build');
  a.paperwork.options.contractorId = 'a';
  assert.equal(home(a).factors.find((f) => f.label === 'Contractor').value, 0.9);
});

test('credit card: tiers at 600+, secured below', () => {
  const s = ready('house');
  const card = () => decide(s).find((d) => d.kind === 'credit-card');
  assert.deepEqual([card().approved, card().terms.limitCents, card().terms.secured], [true, 100000, false]);
  s.finances.credit.score = 710;
  assert.equal(card().terms.limitCents, 150000);
  s.finances.credit.score = 590;
  assert.deepEqual([card().approved, card().terms.secured, card().terms.depositCents], [true, true, 30000]);
  s.paperwork.options.card.accepted = false;
  assert.equal(card(), undefined);
});

test('determinism: same state → same draw; a new attempt index → a new draw', () => {
  const s = ready('condo');
  assert.deepEqual(decide(s), decide(structuredClone(s)));
  const before = drawFor(s, 'mortgage');
  s.plan.attempts.push({ locationId: 'hilo', homeTypeId: 'apartment', outcome: 'denied', reasons: [], at: 0 });
  assert.notEqual(drawFor(s, 'mortgage'), before);
  assert.equal(home(s).id, 'mortgage-1');
});

test('commit (approved house): charges exactly the unpaid upfront, opens the loan, bills, agreements, card', () => {
  const s = ready('house');
  const ds = decide(s);
  ds.find((d) => d.required).approved = true;
  const h = ds.find((d) => d.required);
  const before = cash(s);
  const pending = s.finances.agreements.filter((a) => a.status === 'pending').length;
  const r = commitPaperwork(s, ds, 5);
  assert.equal(r.approved, true);
  assert.equal(before - cash(s), h.terms.upfrontCents);
  assert.equal(r.chargedCents, h.terms.upfrontCents);
  assert.equal(s.finances.loans.length, 1);
  const loan = s.finances.loans[0];
  assert.deepEqual([loan.kind, loan.principalCents, loan.rate, loan.paymentCents],
    ['mortgage', h.terms.principalCents, h.terms.rate, h.terms.paymentCents]);
  const src = (x) => s.finances.recurring.filter((i) => i.source === x);
  assert.equal(src(`loan:${loan.id}`)[0].amountCents, loan.paymentCents);
  assert.equal(src(`pmi:${loan.id}`).length, 1);
  assert.equal(src('insurance')[0].amountCents, s.paperwork.options.insurance?.monthlyCents ?? src('insurance')[0].amountCents);
  assert.deepEqual(src('living').map((i) => i.category).sort(), ['food', 'transportation', 'utilities', 'utilities']);
  assert.ok(s.finances.recurring.every((i) => i.amountCents > 0));
  assert.ok(pending > 0 && s.finances.agreements.every((a) => a.status === 'active'));
  assert.ok(s.finances.applications.every((a) => a.status === 'approved'));
  assert.equal(s.finances.creditCard.limitCents, 100000);
  assert.deepEqual([s.phase, s.home.kind, s.home.label, s.plan.attempts.at(-1).outcome], ['design', 'house', 'To be chosen', 'approved']);
  assert.equal(s.home.purchasePriceCents, h.terms.priceCents);
  assert.deepEqual(validateState(s), []);
});

test('commit (approved apartment and build): renter upfront = unpaid lines; build bills start after construction', () => {
  const a = ready('apartment');
  const ds = decide(a);
  ds.find((d) => d.required).approved = true;
  const owed = unpaidUpfront(a).reduce((t, l) => t + l.cents, 0);
  const before = cash(a);
  commitPaperwork(a, ds, 5);
  assert.equal(before - cash(a), owed);
  assert.equal(a.finances.loans.length, 0);
  assert.equal(a.finances.recurring.find((r) => r.source === 'lease').amountCents, 155000);
  const b = ready('build');
  const bd = decide(b);
  const months = bd[0].terms.buildMonths;
  const bOwed = unpaidUpfront(b).reduce((t, l) => t + l.cents, 0);
  const bBefore = cash(b);
  commitPaperwork(b, bd, 5);
  assert.equal(bBefore - cash(b), bOwed);
  assert.equal(b.finances.loans[0].kind, 'construction-perm');
  assert.equal(b.finances.loans[0].startMonth, months);
  assert.equal(b.finances.recurring.find((r) => r.source.startsWith('loan:')).startsMonth, months);
  assert.equal(b.finances.recurring.find((r) => r.label === 'Groceries').startsMonth, 0);
  assert.deepEqual(validateState(b), []);
});

test('commit (denied): letters and fees kept, agreements void, attempt recorded, back to plan; card still opens', () => {
  const s = ready('apartment');
  const ds = decide(s);
  ds.find((d) => d.required).approved = false;
  const letters = structuredClone(s.letters);
  const fees = s.finances.transactions.filter((t) => t.category === 'fees');
  const before = cash(s);
  const r = commitPaperwork(s, ds, 9);
  assert.equal(r.approved, false);
  assert.equal(homeApproved(ds), false);
  assert.deepEqual(s.letters, letters);
  assert.ok(fees.length > 0);
  assert.deepEqual(s.finances.transactions.filter((t) => t.category === 'fees'), fees);
  assert.equal(cash(s), before, 'nothing charged, nothing refunded (no secured deposit)');
  assert.ok(s.finances.agreements.every((a) => a.status === 'void'));
  assert.ok(s.finances.applications.every((a) => a.status === 'denied'));
  assert.deepEqual([s.phase, s.choice, s.plan.attempts.at(-1).outcome], ['plan', null, 'denied']);
  assert.deepEqual(s.plan.attempts.at(-1).reasons, ds.find((d) => d.required).reasons);
  assert.deepEqual(s.paperwork.steps, {});
  assert.equal(s.finances.loans.length, 0);
  assert.equal(s.finances.recurring.length, 0);
  assert.equal(s.finances.creditCard.limitCents, 100000, 'the card is separate from the home');
  assert.deepEqual(validateState(s), []);
});

test('commit (denied build): earnest money back only with the financing contingency', () => {
  for (const contingency of [true, false]) {
    const s = ready('build');
    s.paperwork.options.land.contingency = contingency;
    const ds = decide(s);
    ds[0].approved = false;
    const before = cash(s);
    commitPaperwork(s, ds, 9);
    assert.equal(cash(s) - before, contingency ? 100000 : 0);
  }
});
