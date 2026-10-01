// Named fixtures (01 §7): each returns a full, valid state that jumps straight to a screen.
// Naming: <phase>-<situation>. Later tasks append with addSeed() below or by adding entries to `seeds`.
// Every seed must pass validateState (tests/unit/seeds.test.js checks them all). Pure module.
import { createInitialState } from '../state/schema.js';

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
