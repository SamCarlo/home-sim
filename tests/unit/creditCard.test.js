// Credit card offer and card mechanics (05 §6, 09 §6, task 30).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../../app/src/dev/seeds.js';
import { tierFor, offerFor, minimumPayment, cycle, applyCycle, payoffExample, durationText } from '../../app/src/finance/creditCard.js';
import { cardPayoff } from '../../app/src/finance/loans.js';
import offerStep, { cardSchema, cardTerms, exampleText, CARD_EXPLANATION, priorAnswer } from '../../app/src/phases/paperwork/steps/credit-card-offer.js';
import { decide } from '../../app/src/finance/underwriting.js';
import { commitPaperwork } from '../../app/src/phases/paperwork/commit.js';
import { validateForm } from '../../app/src/forms/validate.js';
import { validateState } from '../../app/src/state/schema.js';
import { CARD_ACCEPT } from '../../app/src/dev/seeds.js';

const withScore = (score) => ({ finances: { credit: { score } } });

test('offer tiers follow 05 §6', () => {
  const cases = [[850, 'regular', 150000, 0.2299], [700, 'regular', 150000, 0.2299], [699, 'regular', 100000, 0.2599],
    [640, 'regular', 100000, 0.2599], [639, 'secured', 30000, 0.2799], [600, 'secured', 30000, 0.2799], [520, 'secured', 30000, 0.2799]];
  for (const [score, kind, limitCents, apr] of cases) {
    const o = offerFor(withScore(score));
    assert.deepEqual([o.kind, o.limitCents, o.apr], [kind, limitCents, apr], `score ${score}`);
    assert.equal(o.depositCents, kind === 'secured' ? 30000 : 0);
    assert.equal(o.penaltyApr, 0.2999);
    assert.equal(o.annualFeeCents, 0);
    assert.equal(o.graceDays, 25);
    assert.equal(o.lateFeeCents, 3000);
  }
  assert.equal(tierFor(599).kind, 'secured');
  assert.equal(offerFor(withScore(720), { score: 650 }).limitCents, 100000);
});

test('minimum payment: greater of $25 or 1% + interest, capped at the statement', () => {
  assert.equal(minimumPayment(0, 0), 0);
  assert.equal(minimumPayment(100000, 2166), 3166);   // $1,000 at 25.99%: $10 + $21.66
  assert.equal(minimumPayment(50000, 0), 2500);       // floor
  assert.equal(minimumPayment(1500, 0), 1500);        // never more than owed
  assert.equal(minimumPayment(2000, 30), 2030);       // statement $20.30 < $25 floor
});

test('cycle: paid in full means no interest next month', () => {
  const card = { balanceCents: 0, apr: 0.2599, carriedLastMonth: false, autopay: 'full' };
  const r = cycle(card, { chargesCents: 40000, payFrom: 100000 });
  assert.deepEqual([r.statementCents, r.interestCents, r.paidCents, r.carried, r.lateFeeCents, r.balanceCents],
    [40000, 0, 40000, false, 0, 0]);
  assert.equal(r.minimumCents, 2500);
  const next = cycle(applyCycle(card, r), { chargesCents: 10000 });
  assert.equal(next.interestCents, 0);
});

test('cycle: carrying a balance charges APR ÷ 12 on it the next month', () => {
  let card = { balanceCents: 0, apr: 0.2599, carriedLastMonth: false, autopay: 'minimum' };
  const m1 = cycle(card, { chargesCents: 100000, payFrom: 100000 });
  assert.equal(m1.interestCents, 0);                  // grace period: last month was paid in full
  assert.equal(m1.minimumCents, 2500);
  assert.equal(m1.paidCents, 2500);
  assert.equal(m1.carried, true);
  card = applyCycle(card, m1);
  assert.equal(card.balanceCents, 97500);
  const m2 = cycle(card, { chargesCents: 0, payFrom: 100000 });
  assert.equal(m2.interestCents, 2112);               // 97,500 × 0.2599 ÷ 12 = 2111.6
  assert.equal(m2.statementCents, 99612);
  assert.equal(m2.minimumCents, 975 + 2112);
});

test('cycle: paying less than the minimum is a missed payment with a $30 late fee', () => {
  const card = { balanceCents: 50000, apr: 0.2299, carriedLastMonth: true, autopay: 'minimum' };
  const r = cycle(card, { payFrom: 1000 });
  assert.equal(r.interestCents, 958);                 // 50,000 × 0.2299 ÷ 12
  assert.equal(r.minimumCents, 2500);
  assert.equal(r.paidCents, 1000);
  assert.equal(r.missed, true);
  assert.equal(r.lateFeeCents, 3000);
  assert.equal(r.balanceCents, 50000 + 958 - 1000 + 3000);
  const none = cycle({ ...card, autopay: 'none' }, {});
  assert.equal(none.paidCents, 0);
  assert.equal(none.missed, true);
  const zero = cycle({ balanceCents: 0, apr: 0.2299, carriedLastMonth: false }, { payFrom: 0 });
  assert.deepEqual([zero.minimumCents, zero.missed, zero.lateFeeCents], [0, false, 0]);
});

test('payoff example: $1,000 at the minimum, matched month by month by cycle()', () => {
  const o = offerFor(withScore(680));                 // 25.99%
  const ex = payoffExample(o);
  assert.equal(ex.firstMinimumCents, 3166);
  assert.deepEqual(ex.minimum, cardPayoff({ balanceCents: 100000, apr: 0.2599 }));
  assert.ok(ex.minimum.months > 60 && ex.minimum.months < 120, `${ex.minimum.months} months`);
  assert.ok(ex.minimum.interestCents > 80000, 'interest is most of the balance again');
  assert.equal(ex.fixed.months, 12);
  assert.ok(ex.fixed.interestCents < ex.minimum.interestCents / 5);
  // Same answer from the monthly card cycle with autopay 'minimum'.
  let card = { balanceCents: 100000, apr: 0.2599, carriedLastMonth: true, autopay: 'minimum' };
  let months = 0;
  let interest = 0;
  while (card.balanceCents > 0) {
    const r = cycle(card, {});
    interest += r.interestCents;
    card = applyCycle(card, r);
    months++;
  }
  assert.deepEqual({ months, interestCents: interest }, ex.minimum);
  assert.equal(durationText(78), '6 years 6 months');
  assert.equal(durationText(12), '1 year');
  assert.ok(exampleText(o)[0].includes(`${ex.minimum.months} months`));
});

test('offer step: explanation verbatim, Schumer box, accept records an inquiry and pending records', () => {
  const s = buildSeed('paperwork-card-offer', 1);
  const terms = cardTerms(s);
  const schema = cardSchema(terms);
  const fields = schema.sections.flatMap((x) => x.fields);
  assert.ok(fields.some((f) => f.text === CARD_EXPLANATION));
  assert.ok(CARD_EXPLANATION.startsWith('A credit card can help you build credit'));
  assert.ok(fields.find((f) => f.id === 'box').rows.some((r) => r.terms === '29.99%' || r.terms.includes('29.99%')));
  assert.ok(validateForm(schema, {}, s).decision, 'decision required');
  assert.deepEqual(Object.keys(validateForm(schema, { decision: 'accept' }, s)).sort(), ['auth', 'autopay', 'signature']);
  assert.deepEqual(validateForm(schema, { decision: 'decline' }, s), {});
  assert.deepEqual(validateForm(schema, CARD_ACCEPT, s), {});
  const before = s.finances.credit.score;
  offerStep.complete(s, CARD_ACCEPT, 5);
  assert.equal(s.finances.credit.score, before - 5);
  assert.deepEqual(s.paperwork.options.card, { accepted: true, autopay: 'full', pulledScore: before });
  assert.equal(s.finances.applications.at(-1).kind, 'credit-card');
  const ag = s.finances.agreements.at(-1);
  assert.deepEqual([ag.type, ag.docType, ag.status], ['credit-card', 'credit-card-offer', 'pending']);
  assert.deepEqual(validateState(s), []);
  // Underwriting uses the pulled score, so the card matches what was offered.
  const d = decide(s).find((x) => x.kind === 'credit-card');
  assert.equal(d.terms.limitCents, terms.limitCents);
  assert.equal(d.terms.apr, terms.apr);
});

test('offer step: decline is a void agreement, no inquiry; the offer is one-time', () => {
  const s = buildSeed('paperwork-card-offer', 1);
  const before = s.finances.credit.score;
  offerStep.complete(s, { decision: 'decline' }, 5);
  assert.equal(s.finances.credit.score, before);
  assert.equal(s.paperwork.options.card.accepted, false);
  assert.equal(s.finances.agreements.at(-1).status, 'void');
  assert.equal(priorAnswer(s), null, 'this attempt still shows its own offer');
  assert.ok(!decide(s).some((x) => x.kind === 'credit-card'));
  s.plan.attempts.push({ outcome: 'denied' });         // next attempt
  assert.equal(priorAnswer(s), 'declined');
  assert.equal(offerStep.schema(s).sections[0].id, 'done');
});

test('secured offer: deposit charged when the card opens at commit', () => {
  const s = buildSeed('paperwork-card-offer-secured', 1);
  assert.equal(cardTerms(s).secured, true);
  offerStep.complete(s, CARD_ACCEPT, 5);
  const decisions = decide(s);
  const card = decisions.find((x) => x.kind === 'credit-card');
  assert.equal(card.terms.depositCents, 30000);
  const r = commitPaperwork(s, decisions, 6);
  assert.equal(r.card.limitCents, 30000);
  assert.ok(s.finances.transactions.some((t) => t.amountCents === -30000 && /Secured card deposit/.test(t.label)));
  assert.equal(s.finances.agreements.find((a) => a.docType === 'credit-card-offer').status, 'active');
});
