// Named fixtures (01 §7): each returns a full, valid state that jumps straight to a screen.
// Naming: <phase>-<situation>. Later tasks append with addSeed() below or by adding entries to `seeds`.
// Every seed must pass validateState (tests/unit/seeds.test.js checks them all). Pure module.
import { createInitialState } from '../state/schema.js';
import { FINANCE } from '../config.js';

/** The dev account every seed runs as (01 §7). */
export const DEV_USER = { uid: 'local-dev', username: 'dev', classCode: 'DEMO' };

/** A fresh state for the dev user, the starting point for every seed. */
export function baseState(now = 0) {
  return createInitialState({ ...DEV_USER, now });
}

/** Intake finished: phase 'plan', with this income and savings (savings land in finances.savingsCents). */
export function afterIntake(s, { netMonthlyIncomeCents, startingSavingsCents, characterName = 'Kai Mana', jobTitle = '' }) {
  s.player = { ...s.player, characterName, jobTitle, netMonthlyIncomeCents, startingSavingsCents };
  s.finances.savingsCents = startingSavingsCents;
  s.phase = 'plan';
  return s;
}

/** name → { phase, description, build(now) → state }. */
export const seeds = {
  fresh: {
    phase: 'intake',
    description: 'Brand-new save: the intake screen.',
    build: (now) => baseState(now),
  },
  'plan-comfortable': {
    phase: 'plan',
    description: 'Intake done: $4,200/mo net, $20,000 savings (04 §8).',
    build: (now) => afterIntake(baseState(now), {
      netMonthlyIncomeCents: 420000, startingSavingsCents: 2000000, jobTitle: 'Dental assistant',
    }),
  },
  'plan-tight': {
    phase: 'plan',
    description: 'Intake done: $2,400/mo net, $3,000 savings; mostly red and yellow (04 §8).',
    build: (now) => afterIntake(baseState(now), {
      netMonthlyIncomeCents: 240000, startingSavingsCents: 300000, jobTitle: 'Cashier',
    }),
  },
  'plan-rich': {
    phase: 'plan',
    description: 'Intake done: $12,000/mo net, $250,000 savings; lots of cyan (04 §8).',
    build: (now) => afterIntake(baseState(now), {
      netMonthlyIncomeCents: 1200000, startingSavingsCents: 25000000, jobTitle: 'Surgeon',
    }),
  },
  'plan-after-denial': {
    phase: 'plan',
    description: 'Back on the plan after a denied Hilo apartment application; the $50 fee is gone (04 §8).',
    build: (now) => {
      const s = afterIntake(baseState(now), {
        netMonthlyIncomeCents: 360000, startingSavingsCents: 900000, jobTitle: 'Electrician apprentice',
      });
      const feeCents = FINANCE.applicationFeeCents.apartment;
      const reasons = ["Your income is less than 2.5× the rent and you don't have a co-signer."];
      s.plan.attempts.push({ locationId: 'hilo', homeTypeId: 'apartment', outcome: 'denied', reasons, at: now });
      s.finances.applications.push({
        id: 'app-1', kind: 'rental', target: 'hilo|apartment', status: 'denied', feeCents, at: now, reasons,
      });
      s.finances.transactions.push({
        id: 't-1', month: 0, day: 1, label: 'Rental application fee (Hilo)', amountCents: -feeCents,
        account: 'savings', category: 'fees',
      });
      s.finances.savingsCents -= feeCents;
      return s;
    },
  },
  'plan-detail-open': {
    phase: 'plan',
    description: 'plan-after-denial with the Hilo apartment detail panel open (04 §6, task 15).',
    build: (now) => {
      const s = seeds['plan-after-denial'].build(now);
      s.plan.expanded = { locationId: 'hilo', homeTypeId: 'apartment' };
      return s;
    },
  },
};

/** Register a seed (later tasks): addSeed('paperwork-apartment-start', { phase, description, build }). */
export function addSeed(name, def) {
  seeds[name] = def;
}

/** Build seed `name` (throws for unknown names). */
export function buildSeed(name, now = 0) {
  const def = seeds[name];
  if (!def) throw new Error(`Unknown seed "${name}". Known: ${Object.keys(seeds).join(', ')}`);
  return def.build(now);
}
