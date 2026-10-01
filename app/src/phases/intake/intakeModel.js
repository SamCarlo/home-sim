// Intake rules (04 §1): parse and check the five fields, the live per-year / per-hour line, and the Continue write.
// Pure module: no DOM. The screen (intakeScreen.js) only wires these to inputs.
import { INTAKE } from '../../config.js';
import { dollarsToCents, formatMoney } from '../../finance/money.js';

const NAME_CHARS = /^[\p{L}\p{M} '’ʻ-]+$/u;
const money = (c) => formatMoney(c);

/** Student-facing error text, one place to edit. */
export const INTAKE_MESSAGES = {
  nameLength: `Use ${INTAKE.nameMin} to ${INTAKE.nameMax} letters.`,
  nameChars: 'Use only letters, spaces, apostrophes and dashes.',
  jobTitleLength: `Keep it to ${INTAKE.jobTitleMax} characters or fewer.`,
  incomeMissing: 'Type your monthly take-home pay, like 3,200.',
  incomeBad: 'That doesn’t look like a dollar amount. Try something like 3,200.',
  incomeRange: `Take-home pay must be between ${money(INTAKE.incomeMinCents)} and ${money(INTAKE.incomeMaxCents)} a month.`,
  hoursBad: 'Type a whole number of hours, like 40.',
  hoursRange: `Hours must be between ${INTAKE.hoursMin} and ${INTAKE.hoursMax} a week.`,
  savingsMissing: 'Type how much you have saved. Type 0 if you have nothing saved.',
  savingsBad: 'That doesn’t look like a dollar amount. Try something like 8,000.',
  savingsRange: `Savings must be between ${money(INTAKE.savingsMinCents)} and ${money(INTAKE.savingsMaxCents)}.`,
};

/** Tidy a name: trim and collapse runs of spaces. */
export function cleanName(text) {
  return String(text ?? '').trim().replace(/\s+/g, ' ');
}

/** Check a character name → error text or null. */
export function checkName(text) {
  const name = cleanName(text);
  if (name.length < INTAKE.nameMin || name.length > INTAKE.nameMax) return INTAKE_MESSAGES.nameLength;
  if (!NAME_CHARS.test(name)) return INTAKE_MESSAGES.nameChars;
  return null;
}

/** Check an optional job title → error text or null. */
export function checkJobTitle(text) {
  return cleanName(text).length > INTAKE.jobTitleMax ? INTAKE_MESSAGES.jobTitleLength : null;
}

/** Parse a money field → { cents, error }. kind = 'income' | 'savings'. */
export function parseMoneyField(text, kind) {
  const M = INTAKE_MESSAGES;
  const [min, max] = kind === 'income'
    ? [INTAKE.incomeMinCents, INTAKE.incomeMaxCents]
    : [INTAKE.savingsMinCents, INTAKE.savingsMaxCents];
  if (String(text ?? '').trim() === '') return { cents: null, error: kind === 'income' ? M.incomeMissing : M.savingsMissing };
  const cents = dollarsToCents(String(text));
  if (cents == null) return { cents: null, error: kind === 'income' ? M.incomeBad : M.savingsBad };
  if (cents < min || cents > max) return { cents, error: kind === 'income' ? M.incomeRange : M.savingsRange };
  return { cents, error: null };
}

/** Parse weekly hours → { hours, error }. Whole numbers only. */
export function parseHours(text) {
  const s = String(text ?? '').trim();
  if (!/^\d{1,3}$/.test(s)) return { hours: null, error: INTAKE_MESSAGES.hoursBad };
  const hours = Number(s);
  if (hours < INTAKE.hoursMin || hours > INTAKE.hoursMax) return { hours, error: INTAKE_MESSAGES.hoursRange };
  return { hours, error: null };
}

/**
 * Validate every field. values = { characterName, jobTitle, income, hours, savings } (raw strings).
 * → { ok, errors: {field → text}, player } where player is ready for state.player when ok.
 */
export function validateIntake(values) {
  const errors = {};
  const nameErr = checkName(values.characterName);
  if (nameErr) errors.characterName = nameErr;
  const jobErr = checkJobTitle(values.jobTitle);
  if (jobErr) errors.jobTitle = jobErr;
  const income = parseMoneyField(values.income, 'income');
  if (income.error) errors.income = income.error;
  const hours = parseHours(values.hours);
  if (hours.error) errors.hours = hours.error;
  const savings = parseMoneyField(values.savings, 'savings');
  if (savings.error) errors.savings = savings.error;
  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    player: ok ? {
      characterName: cleanName(values.characterName),
      jobTitle: cleanName(values.jobTitle),
      netMonthlyIncomeCents: income.cents,
      weeklyJobHours: hours.hours,
      startingSavingsCents: savings.cents,
    } : null,
  };
}

/** Take-home per year and per hour (cents, rounded) for the live one-liner. hours defaults to 40. */
export function payRates(netMonthlyIncomeCents, weeklyHours = INTAKE.hoursDefault) {
  const yearCents = netMonthlyIncomeCents * 12;
  const hourCents = weeklyHours > 0 ? Math.round(yearCents / (weeklyHours * INTAKE.weeksPerYear)) : 0;
  return { yearCents, hourCents };
}

/** The live one-liner text, or null when income isn't a valid number yet. */
export function payLine(incomeText, hoursText) {
  const { cents, error } = parseMoneyField(incomeText, 'income');
  if (cents == null || error) return null;
  const h = parseHours(hoursText);
  const { yearCents, hourCents } = payRates(cents, h.error ? INTAKE.hoursDefault : h.hours);
  return `That's about ${formatMoney(yearCents)} per year take-home, or ${formatMoney(hourCents, { showCents: true })} per hour.`;
}

/**
 * Apply a validated player to a state draft (mutates and returns it): player.*, savings (first time only),
 * phase → 'plan'. Intake runs once, so savings land only while the phase is still 'intake'.
 */
export function applyIntake(s, player) {
  const firstTime = s.phase === 'intake';
  s.player = { ...s.player, ...player };
  if (firstTime) s.finances.savingsCents = player.startingSavingsCents;
  s.phase = 'plan';
  return s;
}
