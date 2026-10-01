// Intake screen (04 §1, 12 §1, §4): character name, job, take-home pay, hours and savings. Continue writes
// player.*, puts the savings in the bank (first time only) and moves on to the Plan phase.
import { h } from '../../ui/dom.js';
import { INTAKE } from '../../config.js';
import { formatMoney } from '../../finance/money.js';
import {
  validateIntake, payLine, checkName, checkJobTitle, parseMoneyField, parseHours, applyIntake,
} from './intakeModel.js';

let uidSeq = 0;

/** Mount the intake screen; returns unmount. */
export function mount(container, ctx) {
  const state = ctx.store.getState();
  const p = state.player;
  const cents = (c) => (c ? (c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '');

  const fields = {
    characterName: field({
      name: 'characterName', label: 'Character name', value: p.characterName || state.account.username || '',
      hint: 'A made-up name for your character. It goes on your forms. Don\'t use your real name.',
      maxlength: INTAKE.nameMax + 10, autocomplete: 'off', check: (v) => checkName(v),
    }),
    jobTitle: field({
      name: 'jobTitle', label: 'Job title', optional: true, value: p.jobTitle || '',
      hint: 'The job your teacher assigned you (optional).', maxlength: INTAKE.jobTitleMax + 10, autocomplete: 'off',
      check: (v) => checkJobTitle(v),
    }),
    income: field({
      name: 'income', label: 'Net monthly income', money: true, value: cents(p.netMonthlyIncomeCents),
      hint: 'Your take-home pay each month: what\'s left after taxes. Your teacher gave you this number.',
      placeholder: '3,200', check: (v) => parseMoneyField(v, 'income').error,
    }),
    hours: field({
      name: 'hours', label: 'Hours you work per week', value: String(p.weeklyJobHours || INTAKE.hoursDefault),
      hint: 'Used to plan your time and to figure out overtime pay.', inputmode: 'numeric', suffix: 'hrs',
      check: (v) => parseHours(v).error,
    }),
    savings: field({
      name: 'savings', label: 'Savings in the bank', money: true, value: cents(p.startingSavingsCents),
      hint: 'How much money you have saved right now. (For now you type it in.)', placeholder: '8,000',
      check: (v) => parseMoneyField(v, 'savings').error,
    }),
  };

  const live = h('p', { class: 'intake-live', 'aria-live': 'polite' });
  const updateLive = () => {
    const line = payLine(fields.income.input.value, fields.hours.input.value);
    live.textContent = line || 'Type your take-home pay to see what it adds up to.';
    live.classList.toggle('is-empty', !line);
  };
  fields.income.input.addEventListener('input', updateLive);
  fields.hours.input.addEventListener('input', updateLive);
  updateLive();

  const summary = h('p', { class: 'intake-summary', role: 'alert', hidden: true });
  const button = h('button', { class: 'btn btn-primary btn-lg intake-continue', type: 'submit' }, 'Continue', h('span', { 'aria-hidden': 'true' }, '→'));
  const form = h('form', { class: 'intake-form', novalidate: true },
    h('div', { class: 'intake-grid' },
      fields.characterName.wrap, fields.jobTitle.wrap,
      fields.income.wrap, fields.hours.wrap,
      fields.savings.wrap, h('div', { class: 'intake-live-wrap' }, live),
    ),
    h('div', { class: 'intake-actions' }, summary, button),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.input.value]));
    const { ok, errors, player } = validateIntake(values);
    for (const [k, f] of Object.entries(fields)) f.setError(errors[k] || null);
    if (!ok) {
      const n = Object.keys(errors).length;
      summary.textContent = n === 1 ? 'One box needs a fix before you go on.' : `${n} boxes need a fix before you go on.`;
      summary.hidden = false;
      fields[Object.keys(fields).find((k) => errors[k])].input.focus();
      return;
    }
    summary.hidden = true;
    button.disabled = true;
    ctx.store.update((s) => applyIntake(s, player), { checkpoint: 'intake-complete' });
  });
  for (const f of Object.values(fields)) f.input.addEventListener('input', () => { if (!summary.hidden && !form.querySelector('.has-error')) summary.hidden = true; });

  container.append(
    h('section', { class: 'intake-screen' },
      h('div', { class: 'intake-card card' },
        h('p', { class: 'intake-kicker' }, 'Before you start · About you'),
        h('h1', { class: 'intake-title' }, 'Let\'s set up your character'),
        h('p', { class: 'intake-lead' }, 'Your teacher gave you a job and a paycheck. Type them in here. These numbers decide which homes you can afford.'),
        form,
      ),
      explainer(),
    ),
  );
  fields.characterName.input.focus({ preventScroll: true });
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}

/** A labeled input with hint + inline error, wired with aria-describedby. Checks on blur once typed in. */
function field({ name, label, value = '', hint, optional, money, suffix, check, ...attrs }) {
  const id = `in-${name}-${++uidSeq}`;
  const hintEl = h('p', { class: 'hint', id: `${id}-hint` }, hint);
  const errEl = h('p', { class: 'error', id: `${id}-err`, hidden: true });
  const input = h('input', {
    id, name, type: 'text', class: 'input', spellcheck: 'false', value,
    inputmode: money ? 'decimal' : attrs.inputmode, maxlength: attrs.maxlength, placeholder: attrs.placeholder,
    autocomplete: attrs.autocomplete ?? 'off', 'aria-describedby': `${hintEl.id} ${errEl.id}`,
  });
  const control = money || suffix
    ? h('div', { class: `intake-affix${money ? ' has-prefix' : ''}${suffix ? ' has-suffix' : ''}` },
      money ? h('span', { class: 'intake-prefix', 'aria-hidden': 'true' }, '$') : null,
      input,
      suffix ? h('span', { class: 'intake-suffix', 'aria-hidden': 'true' }, suffix) : null)
    : input;
  const wrap = h('div', { class: 'field', dataset: { field: name } },
    h('label', { for: id }, label, optional ? h('span', { class: 'intake-optional' }, ' (optional)') : null),
    control, hintEl, errEl);
  const setError = (msg) => {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
    wrap.classList.toggle('has-error', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  };
  input.addEventListener('blur', () => { if (input.value.trim()) setError(check(input.value)); });
  input.addEventListener('input', () => { if (wrap.classList.contains('has-error')) setError(null); });
  return { wrap, input, setError };
}

/** Net vs gross, in plain words with a tiny worked example. */
function explainer() {
  const gross = 420000;
  const net = 320000;
  return h('aside', { class: 'intake-explain card card-warm', 'aria-labelledby': 'intake-explain-title' },
    h('h2', { id: 'intake-explain-title', class: 'intake-explain-title' }, 'Net pay vs gross pay'),
    h('p', null, h('strong', null, 'Gross pay'), ' is your pay before taxes. ',
      h('strong', null, 'Net pay'), ' is what actually lands in your account.'),
    h('div', { class: 'intake-paybar', role: 'img', 'aria-label': `Example: ${formatMoney(gross)} gross pay, ${formatMoney(gross - net)} taxes, ${formatMoney(net)} net pay` },
      h('div', { class: 'intake-paybar-net', style: { flexBasis: `${Math.round((net / gross) * 100)}%` } }, `Net ${formatMoney(net)}`),
      h('div', { class: 'intake-paybar-tax' }, `Taxes ${formatMoney(gross - net)}`),
    ),
    h('p', { class: 'intake-paybar-cap' }, `Example: a job that pays ${formatMoney(gross)} a month gross.`),
    h('p', null, 'Taxes pay for things like roads, schools and Social Security. You never see that money, so you plan with your ',
      h('strong', null, 'net'), ' pay.'),
    h('p', { class: 'intake-explain-tip' }, 'Type your net pay on the left.'),
  );
}
