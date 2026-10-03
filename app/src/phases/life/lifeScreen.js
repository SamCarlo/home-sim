// Phase 4: Life (09 §1–§2, task 42). Money strip on top; the student's home in rotatable 3D on the left with the
// wellbeing card over it; the right panel runs the month state machine (life/monthFlow.js): welcome → plan → live →
// summary → next month. Each stage change saves a checkpoint. The plan stage holds the questions + time budget (task 43,
// questions.js + timeBudgetView.js); the live stage plays "Live this month" (task 45, animation.js) over the 3D view and
// runs finishLive when it ends, with the water-and-feed button's counts (careButton.js, task 46); the summary and, after
// each December, the year in review come from summary.js and yearReview.js (task 47).
import { h } from '../../ui/dom.js';
import { byId } from '../../data/locations/index.js';
import { monthLabel, monthName } from '../../util/dates.js';
import { describeHome } from '../../life/homeDescription.js';
import {
  currentStage, welcomeTitle, recap, canLive, startPlan, setChoice, startLive, finishLive, nextMonth, isYearEnd, finishReview,
} from '../../life/monthFlow.js';
import { renderWellbeingCard } from './wellbeingCard.js';
import { renderMoneyStrip } from './moneyStrip.js';
import { renderQuestions } from './questions.js';
import { renderTimeBudget } from './timeBudgetView.js';
import { timeBudget } from '../../life/timeBudget.js';
import { createAnimation } from './animation.js';
import { createCareGame } from './careButton.js';
import { renderSummary } from './summary.js';
import { renderYearReview } from './yearReview.js';
import { getFlag } from '../../dev/flags.js';

/**
 * The panel for each stage: `(ctx) → Node[]`. ctx = {state, go(fn, checkpoint), store, onUpdate(fn)}. A panel that
 * registers `onUpdate(fn)` is built once per stage/month and gets `fn(state)` on every later store change.
 */
const PANELS = {
  welcome({ state, go }) {
    const mi = state.life.monthIndex;
    const { line, warnings } = recap(state);
    return [
      h('p', { class: 'life-eyebrow' }, monthLabel(mi)),
      h('h1', { class: 'life-title' }, welcomeTitle(mi)),
      h('p', { class: 'life-recap' }, line),
      warnings.length ? h('ul', { class: 'life-warnings', role: 'list' }, ...warnings.map((w) => h('li', null, w))) : null,
      h('p', { class: 'muted life-note' }, 'Each month you decide how to spend your time, then live it one day at a time. '
        + 'Your choices change your money and your wellbeing.'),
      h('button', { class: 'btn btn-primary btn-lg life-go', type: 'button', onClick: () => go(startPlan, 'life-plan') }, 'Plan my month'),
    ];
  },
  plan({ state, go, store, onUpdate }) {
    const mi = state.life.monthIndex;
    const choices = state.life.current?.choices ?? {};
    const questions = renderQuestions({ state, choices,
      onChoose: (key, value) => store.update((s) => { setChoice(s, key, value); }) });
    const budget = renderTimeBudget(timeBudget(state, choices));
    const live = h('button', { class: 'btn btn-primary btn-lg life-go', type: 'button', disabled: !canLive(choices),
      onClick: () => go(startLive, 'life-live') }, 'Live this month');
    onUpdate((s) => {
      const c = s.life.current?.choices ?? {};
      questions.update(c);
      budget.update(timeBudget(s, c));
      live.disabled = !canLive(c);
    });
    return [
      h('p', { class: 'life-eyebrow' }, `Plan · ${monthLabel(mi)}`),
      h('h1', { class: 'life-title' }, welcomeTitle(mi)),
      questions.el,
      // The bar and the button stay pinned at the bottom of the panel so the bar is in view while answering.
      h('div', { class: 'life-plan-foot' }, budget.el, live),
    ];
  },
  live({ state, go }) {
    return [
      h('p', { class: 'life-eyebrow' }, `Living · ${monthLabel(state.life.monthIndex)}`),
      h('h1', { class: 'life-title' }, `Living ${monthName(state.life.monthIndex)}…`),
      h('p', { class: 'muted life-note' }, 'Watch your month play out day by day. Bills, paychecks and surprises land on '
        + 'their day; the summary comes at the end.'),
      // The animation's controls mount here once the 3D view is ready (startAnimation below).
      h('div', { class: 'life-slot', dataset: { slot: 'live' } }),
    ];
  },
  summary({ state, go }) {
    const mi = state.life.monthIndex;
    return [
      h('p', { class: 'life-eyebrow' }, 'Month summary'),
      h('h1', { class: 'life-title' }, `${monthLabel(mi)} — how it went`),
      h('div', { class: 'life-summary', dataset: { slot: 'summary' } }, ...renderSummary(state)),
      h('div', { class: 'life-plan-foot' },
        h('button', { class: 'btn btn-primary btn-lg life-go', type: 'button', onClick: () => go(nextMonth, 'life-month') },
          isYearEnd(mi) ? 'See your year in review' : `Continue to ${monthName(mi + 1)}`)),
    ];
  },
  review({ state, go }) {
    return renderYearReview(state, { onContinue: (text) => go((s) => finishReview(s, text, Date.now()), 'life-month') });
  },
};

/** Mount the life screen; returns unmount. */
export async function mount(container, { store }) {
  let state = store.getState();
  if (!state.home) {
    container.append(h('section', { class: 'placeholder card' }, h('h1', null, 'Phase 4: Live'), h('p', { class: 'muted' }, 'No home yet.')));
    document.body.dataset.ready = '1';
    return () => { delete document.body.dataset.ready; };
  }
  if (!state.life.current) store.update((s) => { s.life.current = { stage: 'welcome' }; });
  state = store.getState();
  const loc = byId[state.home.locationId];

  const money = renderMoneyStrip(state);
  const wb = renderWellbeingCard(state);
  const desc = h('p', { class: 'sr-only', id: 'life-3d-desc' }, describeHome(state));
  const stage = h('div', { class: 'life-stage', role: 'img', 'aria-describedby': 'life-3d-desc',
    'aria-label': `Your home in ${loc.name}. Drag to rotate, scroll to zoom.` });
  const dayLabel = h('div', { class: 'life-daybar', hidden: true, 'aria-hidden': 'true' }); // calendar strip + day (task 45)
  const panel = h('section', { class: 'life-panel', 'aria-live': 'polite', 'aria-label': 'This month' });
  const root = h('div', { class: 'life' },
    money.el,
    h('div', { class: 'life-main' },
      h('div', { class: 'life-stage-wrap' }, stage, desc, dayLabel, wb.el,
        h('p', { class: 'life-hint' }, 'Drag to look around, scroll to zoom.')),
      panel));
  container.append(root);

  let shownStage = null, shownMonth = null, panelUpdate = null, anim = null, care = null, viewReady = false, view = null;
  /** Start the month's animation once the live panel and the 3D view (or its failure) are both ready. */
  function startAnimation(s) {
    if (anim || !viewReady || currentStage(s) !== 'live' || !s.life.current.plan) return;
    const slot = panel.querySelector('[data-slot=live]');
    if (!slot) return;
    const reduced = !!s.settings?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    anim = createAnimation({
      plan: s.life.current.plan, choices: s.life.current.choices, view, wrap: stage.parentElement, dayBar: dayLabel, reduced,
      speed: s.settings?.animationSpeed ?? 1, speedFlag: Number(getFlag('speed')) || 1,
      onSpeed: (sp) => store.update((d) => { d.settings.animationSpeed = sp; }),
      onEnd: () => go((d) => { d.life.current.care = care.result(); finishLive(d); }, 'life-summary'),
    });
    care = createCareGame({ plan: s.life.current.plan, anim, wrap: stage.parentElement, settings: s.settings,
      seed: s.meta.seed, flag: getFlag('care') });
    root.dataset.anim = reduced ? 'calendar' : '3d';
    slot.replaceChildren(...[anim.el, care.el].filter(Boolean));
  }
  function stopAnimation() {
    care?.dispose();
    care = null;
    anim?.dispose();
    anim = null;
    delete root.dataset.anim;
  }
  function go(fn, checkpoint) {
    store.update((s) => { fn(s); }, { checkpoint });
  }
  function render(s) {
    if (s.phase !== 'life' || !s.life.current) return;
    money.update(s);
    wb.update(s);
    const st = currentStage(s);
    root.dataset.stage = st;
    if (st === shownStage && s.life.monthIndex === shownMonth) {
      panelUpdate?.(s);
      return;
    }
    if (s.life.monthIndex !== shownMonth && shownMonth !== null) view?.scene.setSeason(s.life.monthIndex);
    shownStage = st; shownMonth = s.life.monthIndex; panelUpdate = null;
    stopAnimation();
    if (st !== 'live') view?.syncHome(s); // wilted plants, departed or new animals (care game, home & garden answer)
    panel.replaceChildren(...PANELS[st]({ state: s, go, store, onUpdate: (fn) => { panelUpdate = fn; } }).filter(Boolean));
    panel.scrollTop = 0;
    startAnimation(s);
  }
  render(state);
  const unsub = store.subscribe((s) => render(s));

  stage.append(h('p', { class: 'life-loading muted' }, 'Loading your home…'));
  try {
    const { createLifeView } = await import('./lifeView.js');
    view = await createLifeView(stage, { state });
  } catch (err) {
    console.warn('3D life view failed', err);
  }
  stage.querySelector('.life-loading')?.remove();
  if (view) await view.firstFrame();
  viewReady = true;
  window.__life = { view: () => view, info: () => view?.info, description: () => desc.textContent, animation: () => anim,
    care: () => care };
  if (view && currentStage(store.getState()) !== 'live') view.syncHome(store.getState());
  startAnimation(store.getState());
  document.body.dataset.ready = '1';
  return () => {
    unsub();
    stopAnimation();
    view?.dispose();
    delete window.__life;
    delete document.body.dataset.ready;
  };
}
