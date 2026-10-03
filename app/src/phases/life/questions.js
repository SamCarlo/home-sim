// The month-planning questions (09 §3, task 43): four core questions plus the optional home & garden question, each a
// group of big toggle buttons with radio semantics (role=radiogroup/radio, roving tabindex, arrow keys, Space/Enter).
// Extra work shows the expected pay and socializing a rough monthly cost. The DOM is built once per month; `update`
// only moves the checked state, so keyboard focus survives every answer.
import { h } from '../../ui/dom.js';
import { formatMoney } from '../../util/format.js';
import { LIFE } from '../../config.js';
import { overtimePayCents, socialCostCents, homeGardenOptions } from '../../life/timeBudget.js';

/** The four core questions, exact wording and options (09 §3). `sub` is the option's parenthetical. */
export const QUESTIONS = [
  { key: 'exercise', text: 'How much time do you want to spend on exercise each week this month?',
    options: [['None', '0 h'], ['A little', '2 h'], ['Regular', '4 h'], ['Training hard', '7 h']] },
  { key: 'extraWork', text: 'Do you want to pick up any extra work at your job for extra money?',
    options: [['No extra work', null], ['A few shifts', '8 h this month'], ['Busy month', '16 h this month'],
      ['Maximum hustle', '32 h this month']] },
  { key: 'social', text: 'How much time per week do you want to spend on socializing, family, and leisure?',
    options: [['A little', '3 h'], ['Some', '7 h'], ['Plenty', '12 h'], ['Lots', '20 h']] },
  { key: 'deepPractice', text: 'Can you commit 1 hour per day to something deep and timeless — like philosophy, religion, '
    + 'a spiritual practice, art, or writing?',
    options: [['Yes, every day', '7 h/week'], ['Most days', '4 h/week'], ['Not this month', '0 h']] },
];
export const HOME_GARDEN_TEXT = 'Anything for your home and garden?';

/** The option list for one core question: `[{value, label, sub, hint}]` with the money hints (09 §3). */
export function coreOptions(q, state) {
  return q.options.map(([label, sub], i) => {
    const value = LIFE.choices[q.key][i];
    let hint = null;
    if (q.key === 'extraWork' && value > 0) hint = `+${formatMoney(overtimePayCents(state, value))} pay`;
    if (q.key === 'social') hint = `about ${formatMoney(socialCostCents(state, value))}/mo`;
    return { value, label, sub, hint };
  });
}

function gardenOptions(home) {
  return homeGardenOptions(home).map((o) => ({
    value: o.value, label: o.label,
    sub: o.upfrontCents ? `${formatMoney(o.upfrontCents)}${o.value === 'garden' ? '' : `, then ${formatMoney(o.monthlyCents)}/mo`}` : null,
    hint: o.value === 'chickens' ? 'needs a yard' : null,
  }));
}

/** One radio group of toggle buttons. → `{el, set(value)}`. */
function toggleGroup({ key, text, optional, options, value, onChoose }) {
  const id = `lq-${key}`;
  const buttons = options.map((o) => h('button', {
    type: 'button', class: 'lq-opt', role: 'radio', dataset: { value: String(o.value) },
    'aria-label': [o.label, o.sub, o.hint].filter(Boolean).join(', '),
    onClick: () => onChoose(key, o.value),
  }, h('span', { class: 'lq-opt-label' }, o.label),
  o.sub ? h('span', { class: 'lq-opt-sub' }, o.sub) : null,
  o.hint ? h('span', { class: 'lq-opt-hint' }, o.hint) : null));
  const row = h('div', { class: 'lq-opts', role: 'radiogroup', 'aria-labelledby': id, dataset: { count: String(options.length) },
    onKeydown: (e) => {
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      let j = null;
      if (step) j = (i + step + buttons.length) % buttons.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = buttons.length - 1;
      if (j == null) return;
      e.preventDefault();
      buttons[j].focus();
      onChoose(key, options[j].value);
    } }, ...buttons);
  const el = h('div', { class: 'lq', dataset: { question: key } },
    h('p', { class: 'lq-text', id }, text, optional ? h('span', { class: 'lq-optional' }, ' (optional)') : null), row);
  function set(v) {
    const hit = options.findIndex((o) => o.value === v);
    buttons.forEach((b, i) => {
      b.setAttribute('aria-checked', String(i === hit));
      b.tabIndex = i === (hit < 0 ? 0 : hit) ? 0 : -1;
    });
  }
  set(value);
  return { el, set };
}

/**
 * Render the questions for the plan stage. `onChoose(key, value)` records an answer (the caller updates the store).
 * → `{el, update(choices)}`.
 */
export function renderQuestions({ state, choices = {}, onChoose }) {
  const groups = QUESTIONS.map((q) => toggleGroup({ key: q.key, text: `${QUESTIONS.indexOf(q) + 1}. ${q.text}`,
    options: coreOptions(q, state), value: choices[q.key], onChoose }));
  const garden = gardenOptions(state.home);
  if (garden.length) {
    groups.push(toggleGroup({ key: 'homeGarden', text: HOME_GARDEN_TEXT, optional: true, options: garden,
      value: choices.homeGarden ?? 'none', onChoose }));
  }
  const el = h('div', { class: 'lq-list' }, ...groups.map((g) => g.el));
  return {
    el,
    update(next = {}) {
      groups.forEach((g, i) => g.set(i < QUESTIONS.length ? next[QUESTIONS[i].key] : (next.homeGarden ?? 'none')));
    },
  };
}
