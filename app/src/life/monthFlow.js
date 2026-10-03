// The Phase 4 month state machine (09 §1–§2, task 42). Pure: no DOM. `life.current.stage` runs
// welcome → plan → live → summary, then the next month's welcome. Each transition mutates a store draft; the screen saves
// a checkpoint per stage. Tasks 43–47 fill in the plan (questions, time budget), live (planMonth + animation + care) and
// summary (finalizeMonth result); a finished month is pushed onto `life.history` as `{monthIndex, choices, result}`.
import { LIFE } from '../config.js';
import { LIFE_STAGES } from '../state/schema.js';
import { monthName, yearMonth } from '../util/dates.js';
import { accountValue } from '../finance/ledger.js';
import { netWorth } from '../finance/ledgerTotals.js';
import { planMonth } from './planMonth.js';
import { finalizeMonth } from './finalizeMonth.js';

export const STAGES = LIFE_STAGES;
/** The four core questions that must be answered before "Live this month" (09 §2–§3). */
export const CORE_CHOICES = ['exercise', 'extraWork', 'social', 'deepPractice'];
/** 09 §1 wellbeing card order and labels. */
export const WELLBEING_DOMAINS = [
  { key: 'physical', label: 'Physical health' },
  { key: 'purpose', label: 'Sense of purpose' },
  { key: 'financial', label: 'Financial' },
  { key: 'social', label: 'Social fulfillment' },
  { key: 'mental', label: 'Mental health' },
];

/** The current stage ('welcome' when life hasn't started a month yet). */
export function currentStage(state) {
  return state.life?.current?.stage ?? 'welcome';
}

/** "Welcome to January, 2033." for a monthIndex (09 §1). */
export function welcomeTitle(monthIndex) {
  return `Welcome to ${monthName(monthIndex)}, ${yearMonth(monthIndex).year}.`;
}

/** The last finished month's history entry, or null. */
export function lastMonth(state) {
  return state.life?.history?.at(-1) ?? null;
}

/**
 * Choices to pre-select in the plan stage: last month's answers, else `LIFE.defaults` (09 §2). The home & garden answer
 * is a one-time purchase, so it always starts at 'none'.
 */
export function defaultChoices(state) {
  const prev = lastMonth(state)?.choices;
  return { ...LIFE.defaults, ...(prev ?? {}), homeGarden: 'none' };
}

/** True once all four core questions have an answer (09 §2). */
export function canLive(choices) {
  return CORE_CHOICES.every((k) => Number.isFinite(choices?.[k]));
}

/**
 * The welcome recap (09 §2): `{line, warnings[]}`. Month 0 gets the move-in line; later months summarize last month's
 * result (income, spending, warnings) when there is one.
 */
export function recap(state) {
  const prev = lastMonth(state);
  const r = prev?.result;
  if (!prev) return { line: 'You just moved in. Plan your first month, then live it one day at a time.', warnings: [] };
  if (!r) return { line: `${monthName(prev.monthIndex)} is behind you.`, warnings: [] };
  const fmt = (c) => `$${Math.round(Math.abs(c) / 100).toLocaleString('en-US')}`;
  const net = (r.incomeCents ?? 0) - (r.expenseCents ?? 0);
  const line = `In ${monthName(prev.monthIndex)} you brought in ${fmt(r.incomeCents ?? 0)} and spent ${fmt(r.expenseCents ?? 0)}`
    + (net >= 0 ? `, so you kept ${fmt(net)}.` : `, so you went ${fmt(net)} into your savings.`);
  return { line, warnings: [...(r.warnings ?? [])] };
}

/**
 * The wellbeing card rows: `[{key, label, value, change}]`. `change` is last month's after − before for the domain
 * (null before the first month is lived).
 */
export function wellbeingBars(state) {
  const wb = state.life?.wellbeing ?? {};
  const r = lastMonth(state)?.result;
  return WELLBEING_DOMAINS.map(({ key, label }) => {
    const value = Math.round(wb[key] ?? LIFE.wellbeing.start);
    const before = r?.wellbeingBefore?.[key], after = r?.wellbeingAfter?.[key];
    const change = Number.isFinite(before) && Number.isFinite(after) ? Math.round(after - before) : null;
    return { key, label, value, change };
  });
}

/**
 * The money strip (09 §1): `[{key, label, cents}]` for checking, savings, the card (amount owed, only if there is a
 * card), investments (only when any are held) and net worth.
 */
export function moneyStrip(state) {
  const f = state.finances ?? {};
  const inv = Object.values(f.investments ?? {}).reduce((s, p) => s + (p?.valueCents ?? 0), 0);
  return [
    { key: 'checking', label: 'Checking', cents: accountValue(state, 'checking') },
    { key: 'savings', label: 'Savings', cents: accountValue(state, 'savings') },
    ...(f.creditCard ? [{ key: 'card', label: 'Credit card', cents: f.creditCard.balanceCents ?? 0 }] : []),
    ...(inv > 0 || state.life?.investUnlocked ? [{ key: 'investments', label: 'Investments', cents: inv }] : []),
    { key: 'net', label: 'Net worth', cents: netWorth(state) },
  ];
}

/** welcome → plan: pre-selects the choices. Mutates a store draft. */
export function startPlan(s) {
  s.life.current = { ...(s.life.current ?? {}), stage: 'plan', choices: defaultChoices(s) };
}

/** Record one answer during plan. Mutates a store draft. */
export function setChoice(s, key, value) {
  if (currentStage(s) !== 'plan') throw new Error('setChoice outside the plan stage');
  s.life.current.choices = { ...(s.life.current.choices ?? {}), [key]: value };
}

/** plan → live (refuses until canLive): runs planMonth and stores `current.plan`. Mutates a draft. */
export function startLive(s) {
  if (currentStage(s) !== 'plan') throw new Error('startLive outside the plan stage');
  if (!canLive(s.life.current.choices)) return false;
  const plan = planMonth(s, s.life.current.choices);
  s.life.current = { ...s.life.current, stage: 'live', plan, care: { shown: 0, hits: 0 } };
  return true;
}

/**
 * live → summary: runs finalizeMonth with the care counts and stores `current.result`. After an eviction/foreclosure
 * finalizeMonth has already moved the save to phase 'plan' (and pushed the month to history), so there's no summary.
 * Mutates a store draft.
 */
export function finishLive(s) {
  if (currentStage(s) !== 'live') throw new Error('finishLive outside the live stage');
  const c = s.life.current;
  const plan = c.plan ?? planMonth(s, c.choices);
  const { result } = finalizeMonth(s, plan, c.choices ?? {}, { careShown: c.care?.shown ?? 0, careHits: c.care?.hits ?? 0 });
  if (result.evicted) return result;
  s.life.current = { ...s.life.current, stage: 'summary', result };
  return result;
}

/** True when monthIndex is a December (09 §11: the year in review follows it). */
export function isYearEnd(monthIndex) {
  return monthIndex % 12 === 11;
}

/**
 * summary → next month's welcome: pushes `{monthIndex, choices, result}` onto history. After a December the next stage
 * is 'review' (the year in review, 09 §11), already in the new month. Mutates a store draft.
 */
export function nextMonth(s) {
  if (currentStage(s) !== 'summary') throw new Error('nextMonth outside the summary stage');
  const c = s.life.current;
  const finished = s.life.monthIndex;
  s.life.history.push({ monthIndex: finished, choices: { ...(c.choices ?? {}) }, result: c.result ?? null });
  s.life.monthIndex += 1;
  s.life.current = { stage: isYearEnd(finished) ? 'review' : 'welcome' };
}

/**
 * review → welcome: saves the optional reflection (09 §11) to `life.reflections` as `{year, monthIndex, text, savedAt}`
 * when it isn't blank (trimmed, at most `LIFE.reflectionMax` characters). Mutates a store draft.
 */
export function finishReview(s, text = '', now = 0) {
  if (currentStage(s) !== 'review') throw new Error('finishReview outside the review stage');
  const clean = String(text ?? '').trim().slice(0, LIFE.reflectionMax);
  const mi = s.life.monthIndex - 1;
  if (clean) {
    s.life.reflections ??= [];
    s.life.reflections.push({ year: yearMonth(mi).year, monthIndex: mi, text: clean, savedAt: now });
  }
  s.life.current = { stage: 'welcome' };
}
