// Task 20: renter paperwork (05 §4, §10): names, late fee, lease clauses + initials, each complete()'s effects.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAMES, peopleFor, businessFor } from '../../app/src/content/names.js';
import { buildSeed, SAMPLE_APPLICATION } from '../../app/src/dev/seeds.js';
import { validateForm } from '../../app/src/forms/validate.js';
import { validateState } from '../../app/src/state/schema.js';
import { cash } from '../../app/src/finance/ledger.js';
import { stepStatus } from '../../app/src/phases/paperwork/flow.js';
import { renterTerms } from '../../app/src/phases/paperwork/steps/renterTerms.js';
import rentalApplication from '../../app/src/phases/paperwork/steps/rental-application.js';
import roomApplication from '../../app/src/phases/paperwork/steps/room-application.js';
import lease, { lateFee, leaseClauses, leaseSchema, trapQuestions, trapScore } from '../../app/src/phases/paperwork/steps/lease.js';
import roommate, { roommateComfort, ROOMMATE_CHOICES } from '../../app/src/phases/paperwork/steps/roommate-agreement.js';
import moveIn from '../../app/src/phases/paperwork/steps/move-in-payment.js';
import { termsFromAgreement } from '../../app/src/phases/paperwork/docs.js';
import { agreementSchema } from '../../app/src/ui/portfolio/agreementDoc.js';

const q = (choice, firstTry = true) => ({ choice, tries: firstTry ? 1 : 2, correct: true, firstTry, wrong: firstTry ? [] : ['flat'] });
const leaseValues = (clauses) => ({
  init: Object.fromEntries(clauses.map((c) => [c.id, 'KM'])),
  'q-date': q('renewal'), 'q-allowed': q('wear-and-tear'), 'q-late': q('right', false), signature: 'Kai Mana',
});

test('names: fictional pools per region, seeded and stable, never the player', () => {
  for (const pool of Object.values(NAMES)) {
    for (const k of ['landlords', 'lenders', 'insurers', 'inspectors', 'contractors', 'hoas', 'first', 'last']) {
      assert.ok(pool[k].length >= 1, k);
    }
  }
  const s = buildSeed('paperwork-shared-start', 1);
  assert.deepEqual(peopleFor(s, 'household', 4), peopleFor(s, 'household', 4));
  assert.equal(new Set(peopleFor(s, 'household', 4)).size, 4);
  assert.ok(!peopleFor(s, 'household', 4).some((n) => n.startsWith('Kai ')));
  assert.ok(NAMES.hawaii.landlords.includes(businessFor(s, 'landlords')));
});

test('late fee: nothing through the 5th, then $75 + $10 a day; the question uses it', () => {
  assert.equal(lateFee(1), 0);
  assert.equal(lateFee(5), 0);
  assert.equal(lateFee(6), 8500);
  assert.equal(lateFee(8), 10500);
  assert.equal(lateFee(8, { flatCents: 5000, perDayCents: 500, graceDay: 3 }), 7500);
  const late = trapQuestions(renterTerms(buildSeed('paperwork-apartment-lease', 1))).find((x) => x.id === 'q-late');
  assert.equal(late.choices.find((c) => c.value === late.answer).label, '$105');
  assert.equal(new Set(late.choices.map((c) => c.label)).size, 4);
  for (const c of late.choices) if (c.value !== late.answer) assert.ok(c.why, 'every wrong answer explains');
});

test('lease: 10 apartment / 8 room clauses, initials required on every one', () => {
  const apt = buildSeed('paperwork-apartment-lease', 1);
  const room = buildSeed('paperwork-shared-agreement', 1);
  const aClauses = leaseClauses(renterTerms(apt));
  const rClauses = leaseClauses(renterTerms(room));
  assert.equal(aClauses.length, 10);
  assert.equal(rClauses.length, 8);
  assert.ok(aClauses.some((c) => c.key === 'wear-and-tear') && rClauses.some((c) => c.key === 'renewal'));
  assert.match(aClauses[1].text, /\$1,550/);
  const schema = leaseSchema(renterTerms(apt));
  const good = leaseValues(aClauses);
  assert.deepEqual(validateForm(schema, good, apt), {});
  const missing = { ...good, init: { ...good.init, c4: '' } };
  assert.match(validateForm(schema, missing, apt).init, /Clause 4 needs your initials, KM/);
  const wrong = { ...good, init: { ...good.init, c1: 'XY' } };
  assert.ok(validateForm(schema, wrong, apt).init);
  const unanswered = { ...good, 'q-late': { choice: 'flat', tries: 1, correct: false, firstTry: false, wrong: ['flat'] } };
  assert.ok(validateForm(schema, unanswered, apt)['q-late']);
  assert.equal(trapScore(good), 2);
});

test('rental application: fee charged once, pending application, step done; all or nothing when broke', () => {
  const s = buildSeed('paperwork-apartment-start', 1);
  const schema = rentalApplication.schema(s);
  assert.deepEqual(validateForm(schema, SAMPLE_APPLICATION, s), {});
  assert.ok(validateForm(schema, { ...SAMPLE_APPLICATION, 'ref1-phone': '(808) 555-1234' }, s)['ref1-phone']);
  const before = cash(s);
  assert.equal(rentalApplication.complete(s, SAMPLE_APPLICATION, 7).ok, true);
  assert.equal(before - cash(s), 5000);
  assert.equal(s.paperwork.paidUpfront.application, 5000);
  assert.deepEqual(s.finances.applications.map((a) => [a.kind, a.target, a.status, a.feeCents]),
    [['rental', 'hilo|apartment', 'pending', 5000]]);
  assert.equal(stepStatus(s, 'rental-application'), 'done');
  assert.deepEqual(validateState(s), []);

  const broke = buildSeed('paperwork-apartment-start', 1);
  broke.finances.savingsCents = 1000; broke.finances.checkingCents = 0;
  const r = rentalApplication.complete(broke, SAMPLE_APPLICATION, 7);
  assert.equal(r.ok, false);
  assert.equal(broke.finances.applications.length, 0);
  assert.equal(stepStatus(broke, 'rental-application'), 'todo');

  const room = buildSeed('paperwork-shared-start', 1);
  roomApplication.complete(room, SAMPLE_APPLICATION, 7);
  assert.deepEqual(room.finances.applications.map((a) => [a.kind, a.feeCents]), [['room', 2500]]);
});

test('lease complete: pending agreement with docType + terms, trap score, no money moves', () => {
  const s = buildSeed('paperwork-apartment-lease', 1);
  const before = cash(s);
  const values = leaseValues(leaseClauses(renterTerms(s)));
  lease.complete(s, values, 9);
  const ag = s.finances.agreements.at(-1);
  assert.equal(ag.type, 'lease');
  assert.equal(ag.docType, 'lease');
  assert.equal(ag.status, 'pending');
  assert.equal(ag.terms.rentCents, 155000);
  assert.equal(ag.docValues, values);
  assert.equal(s.paperwork.options.leaseTrapScore, 2);
  assert.equal(cash(s), before);
  assert.equal(stepStatus(s, 'lease'), 'done');
  assert.equal(stepStatus(s, 'move-in-payment'), 'todo');
  // The portfolio rebuilds the real document from the agreement alone.
  const doc = agreementSchema(ag, s);
  assert.equal(doc.id, 'lease');
  assert.equal(doc.sections[1].fields[0].clauses.length, 10);
  assert.equal(termsFromAgreement({ counterparty: 'X', terms: { rentCents: 1 } }).termMonths, 12);
});

test('roommate agreement: comfort from answers, pending agreement; move-in records authorization only', () => {
  assert.equal(roommateComfort({}), 0);
  const best = Object.fromEntries(Object.entries(ROOMMATE_CHOICES).map(([k, l]) => [k, l.reduce((a, b) => (b.comfort > a.comfort ? b : a)).value]));
  const worst = Object.fromEntries(Object.entries(ROOMMATE_CHOICES).map(([k, l]) => [k, l.reduce((a, b) => (b.comfort < a.comfort ? b : a)).value]));
  assert.equal(roommateComfort(best), 1);
  assert.ok(roommateComfort(worst) < 0);
  assert.ok(ROOMMATE_CHOICES.conflict.some((c) => c.value === 'hooponopono' && c.label.includes('hoʻoponopono')));

  const s = buildSeed('paperwork-shared-agreement', 1);
  const values = { ...best, thermostat: 'AC on above 85°F, set to 78°F', signature: 'Kai Mana' };
  assert.deepEqual(validateForm(roommate.schema(s), values, s), {});
  roommate.complete(s, values, 3);
  const ag = s.finances.agreements.at(-1);
  assert.deepEqual([ag.type, ag.docType, ag.status], ['roommate-agreement', 'roommate-agreement', 'pending']);
  assert.equal(ag.terms.roommates.length, 3);
  assert.equal(s.paperwork.options.roommateComfort, 1);

  lease.complete(s, leaseValues(leaseClauses(renterTerms(s))), 4);
  const before = cash(s);
  moveIn.complete(s, { 'only-if-approved': true, signature: 'Kai Mana' }, 5);
  assert.equal(cash(s), before, 'charged only at commit');
  assert.deepEqual(s.paperwork.options.moveIn, { authorized: true, account: 'savings', depositCents: 110000,
    firstMonthCents: 110000, totalCents: 220000 });
  assert.equal(stepStatus(s, 'move-in-payment'), 'done');
  assert.deepEqual(validateState(s), []);
});
