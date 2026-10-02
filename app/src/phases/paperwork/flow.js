// Phase 2 step orchestrator (05 §2–§3): which steps apply to the chosen home, their order and status, the fees they
// pay, and the way back to planning. Pure: no DOM; step modules (steps/index.js) supply titles and UI only.
import { UNDERWRITING } from '../../config.js';
import { freshPaperwork } from '../../state/schema.js';
import { charge, markUpfrontPaid, setAgreementStatus, resolveApplication, PAPERWORK_MONTH } from '../../finance/ledger.js';

/** Step ids per home type, exactly as in the 05 §3 table. Letter steps are plain ids (see LETTER_STEPS). */
export const STEP_ORDER = {
  apartment: ['rental-application', 'rental-cover', 'cosigner-request', 'renters-insurance', 'lease', 'move-in-payment',
    'credit-card-offer', 'results'],
  shared: ['room-application', 'roommate-intro', 'cosigner-request', 'renters-insurance', 'roommate-agreement', 'lease',
    'move-in-payment', 'credit-card-offer', 'results'],
  condo: ['mortgage-application', 'loan-options', 'loan-purpose', 'credit-explanation', 'hoa-review', 'home-inspection',
    'appraisal', 'condo-insurance', 'closing-disclosure', 'credit-card-offer', 'results'],
  house: ['mortgage-application', 'loan-options', 'loan-purpose', 'credit-explanation', 'home-inspection', 'appraisal',
    'home-insurance', 'closing-disclosure', 'credit-card-offer', 'results'],
  build: ['land-purchase', 'construction-loan-application', 'construction-purpose', 'credit-explanation', 'contractor-bids',
    'building-permit', 'site-utilities', 'home-insurance', 'credit-card-offer', 'results'],
};

/** Letter steps (05 §1: "can be done any time after their prerequisites") → the steps they need first. */
export const LETTER_STEPS = {
  'rental-cover': ['rental-application'],
  'roommate-intro': ['room-application'],
  'cosigner-request': ['rental-application', 'room-application'],
  'loan-purpose': ['mortgage-application'],
  'construction-purpose': ['construction-loan-application'],
  'credit-explanation': ['mortgage-application', 'construction-loan-application'],
};

/** Statuses (02 §2 paperwork.steps[id].status) with the checklist icon and label. */
export const STATUS_INFO = {
  locked: { icon: '🔒', label: 'Locked' },
  todo: { icon: '○', label: 'To do' },
  draft: { icon: '✎', label: 'Draft' },
  done: { icon: '✓', label: 'Done' },
  skipped: { icon: '⤼', label: 'Skipped' },
};

const FINISHED = new Set(['done', 'skipped']);

/** The monthly rent the co-signer rule compares against (room rent for shared), in cents; 0 if none. */
export function rentOf(state) {
  const lines = state.choice?.snapshot?.breakdown?.monthly ?? [];
  return lines.find((l) => l.key === 'rent')?.cents ?? 0;
}

/** Does step `id` apply to this attempt? (05 §3 footnotes: co-signer below 2.5× rent, credit letter below 660.) */
export function appliesTo(state, id) {
  if (id === 'cosigner-request') {
    const rent = rentOf(state);
    return rent > 0 && state.player.netMonthlyIncomeCents < UNDERWRITING.cosignerBelowRatio * rent;
  }
  if (id === 'credit-explanation') return state.finances.credit.score < UNDERWRITING.creditExplanationBelow;
  return true;
}

/** Applicable step ids for the chosen home, in order (results last). [] when nothing is chosen. */
export function stepsFor(state) {
  const order = STEP_ORDER[state.choice?.homeTypeId];
  return order ? order.filter((id) => appliesTo(state, id)) : [];
}

/** Steps that must be finished before `id` (in this attempt's list). */
export function prerequisites(state, id, steps = stepsFor(state)) {
  const i = steps.indexOf(id);
  if (i < 0) return [];
  if (id === 'results') return steps.slice(0, i);
  if (LETTER_STEPS[id]) return LETTER_STEPS[id].filter((p) => steps.includes(p));
  // Other steps unlock in order: every earlier non-letter step (letters never block the form steps).
  return steps.slice(0, i).filter((p) => !LETTER_STEPS[p]);
}

/** Status of step `id`: the stored done/skipped/draft, or locked/todo from its prerequisites. */
export function stepStatus(state, id, steps = stepsFor(state)) {
  const stored = state.paperwork.steps[id]?.status;
  if (FINISHED.has(stored)) return stored;
  const ready = prerequisites(state, id, steps).every((p) => FINISHED.has(state.paperwork.steps[p]?.status));
  if (!ready) return 'locked';
  return stored === 'draft' ? 'draft' : 'todo';
}

/** [{id, status}] for the checklist. */
export function checklist(state) {
  const steps = stepsFor(state);
  return steps.map((id) => ({ id, status: stepStatus(state, id, steps) }));
}

/** The first open step (todo or draft) in order, or null when everything is finished. */
export function nextStep(state) {
  return checklist(state).find((x) => x.status === 'todo' || x.status === 'draft')?.id ?? null;
}

/** True when every applicable step except results is done or skipped (results can open). */
export function allDone(state) {
  return checklist(state).every((x) => x.id === 'results' || FINISHED.has(x.status));
}

/** Upfront line `key` from the chosen home's snapshot ({key, label, cents, note}) or null. */
export function upfrontLine(state, key) {
  return (state.choice?.snapshot?.breakdown?.upfront ?? []).find((l) => l.key === key) ?? null;
}

/**
 * Pay a paperwork fee now (05 §2): charge savings (then checking) in month −1, then mark the upfront line paid so
 * results only charge what's left. All or nothing → {ok, shortfallCents}. Fees are sunk: withdrawing never refunds them.
 */
export function payFee(state, { lineKey, cents, label }) {
  if (!(cents > 0)) return { ok: true, shortfallCents: 0 };
  const r = charge(state, 'savings', cents, { month: PAPERWORK_MONTH, label, category: 'fees' });
  if (r.ok && lineKey) markUpfrontPaid(state, lineKey, cents);
  return { ok: r.ok, shortfallCents: r.shortfallCents };
}

/** Set a step's stored status (draft/done/skipped) and values. Mutates the draft. */
export function setStep(state, id, status, values = state.paperwork.steps[id]?.values ?? {}, now = 0) {
  state.paperwork.steps[id] = { status, values, updatedAt: now };
  return state.paperwork.steps[id];
}

/**
 * Finish step `id`: pay its upfront fee if it has one (`upfrontKey`, amount from the snapshot), then mark it done.
 * Returns {ok, shortfallCents}; when the fee can't be paid nothing changes.
 */
export function completeStep(state, id, { values = {}, upfrontKey = null, feeLabel = null, now = 0 } = {}) {
  const line = upfrontKey ? upfrontLine(state, upfrontKey) : null;
  if (line) {
    const paid = state.paperwork.paidUpfront?.[upfrontKey] ?? 0;
    const r = payFee(state, { lineKey: upfrontKey, cents: line.cents - paid, label: feeLabel ?? line.label });
    if (!r.ok) return r;
  }
  setStep(state, id, 'done', values, now);
  return { ok: true, shortfallCents: 0 };
}

/**
 * "Choose a different home" (05 §1): record the attempt as withdrawn (fees stay spent), void this attempt's pending
 * agreements, close its pending applications, clear the choice and paperwork, and go back to Plan. Letters are kept.
 * Use with store.update(…, {checkpoint: 'paperwork-withdrawn'}).
 */
export function withdraw(state, now = 0) {
  const { choice } = state;
  if (choice) {
    state.plan.attempts.push({ locationId: choice.locationId, homeTypeId: choice.homeTypeId, outcome: 'withdrawn',
      reasons: ['You chose a different home before the paperwork was finished.'], at: now });
  }
  for (const a of state.finances.agreements) if (a.status === 'pending') setAgreementStatus(state, a.id, 'void');
  for (const a of state.finances.applications) {
    if (a.status === 'pending') resolveApplication(state, a.id, { approved: false, reasons: ['You withdrew this application.'] });
  }
  state.choice = null;
  state.paperwork = freshPaperwork();
  state.phase = 'plan';
  return state;
}
