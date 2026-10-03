// The time-budget bar (09 §4, task 43): "Waking hours per week available: 112", the free-time readout, one segmented
// bar like a computer's storage bar (legend + tooltips), a colored bracket and label over the free-time segment, a red
// striped overflow when overbooked, and the footnote. Built once; `update(budget)` resizes and recolors in place.
import { h } from '../../ui/dom.js';
import { SEGMENTS, hoursText } from '../../life/timeBudget.js';

export const FOOTNOTE = 'Real life is way more complicated than this — but it\'s true that balance is a virtue.';

const pct = (x) => `${(x * 100).toFixed(3)}%`;

/** Render the time budget. → `{el, update(budget)}` where budget = `timeBudget(state, choices)`. */
export function renderTimeBudget(budget) {
  const free = h('strong', { class: 'tb-free-num' });
  const segs = SEGMENTS.map((s) => h('span', { class: 'tb-seg', dataset: { key: s.key }, style: { background: `var(--${s.color})` } }));
  const freeSeg = h('span', { class: 'tb-seg tb-seg-free', dataset: { key: 'free' } });
  const over = h('span', { class: 'tb-over', 'aria-hidden': 'true' }, h('span', { class: 'tb-over-text' }));
  const bar = h('div', { class: 'tb-bar', role: 'img' }, ...segs, freeSeg);
  const bracketLabel = h('span', { class: 'tb-bracket-label' });
  const bracket = h('div', { class: 'tb-bracket', 'aria-hidden': 'true' }, bracketLabel, h('span', { class: 'tb-bracket-line' }));
  const legendItems = SEGMENTS.map((s) => h('li', { class: 'tb-leg', dataset: { key: s.key } },
    h('span', { class: 'tb-swatch', style: { background: `var(--${s.color})` } }), h('span', { class: 'tb-leg-label' }, s.label),
    h('span', { class: 'tb-leg-h' })));
  const freeLeg = h('li', { class: 'tb-leg', dataset: { key: 'free' } }, h('span', { class: 'tb-swatch tb-swatch-free' }),
    h('span', { class: 'tb-leg-label' }, 'Free time'), h('span', { class: 'tb-leg-h' }));
  const el = h('section', { class: 'tb', 'aria-label': 'Time budget' },
    h('div', { class: 'tb-head' },
      h('p', { class: 'tb-waking' }, 'Waking hours per week available: ', h('strong', { class: 'tb-waking-num' }, String(budget.waking))),
      h('p', { class: 'tb-free' }, 'Free time left: ', free)),
    h('div', { class: 'tb-chart' }, bracket, bar, over),
    h('ul', { class: 'tb-legend', role: 'list' }, ...legendItems, freeLeg),
    h('p', { class: 'tb-foot' }, h('em', null, FOOTNOTE)));

  function update(b) {
    const overHours = Math.max(0, -b.freeHours);
    const total = Math.max(b.waking, b.usedHours); // the width the chart represents
    // The bar is the 112 waking hours; segments are sized against it and clipped at its end. Past the end, the
    // overbooked hours stick out as a red striped overflow.
    let left = 0;
    b.segments.forEach((s, i) => {
      segs[i].style.width = pct(s.hours / b.waking);
      segs[i].title = `${s.label}: ${hoursText(s.hours)} a week`;
      legendItems[i].querySelector('.tb-leg-h').textContent = hoursText(s.hours);
      legendItems[i].hidden = s.hours <= 0;
      left += s.hours;
    });
    const freeH = Math.max(0, b.freeHours);
    freeSeg.style.width = pct(freeH / b.waking);
    freeSeg.title = `Free time: ${hoursText(freeH)} a week`;
    freeLeg.querySelector('.tb-leg-h').textContent = hoursText(b.freeHours);
    const color = b.rating.color;
    el.dataset.rating = b.rating.key;
    el.dataset.color = color;
    free.textContent = hoursText(b.freeHours);
    bar.style.width = pct(b.waking / total);
    el.classList.toggle('tb-is-over', overHours > 0);
    over.hidden = overHours <= 0;
    over.style.left = pct(b.waking / total);
    over.style.width = pct(overHours / total);
    over.firstChild.textContent = hoursText(-overHours);
    // The bracket spans the free time (or the overflow when overbooked).
    const start = overHours > 0 ? b.waking / total : left / total;
    const width = overHours > 0 ? overHours / total : freeH / total;
    bracket.style.setProperty('--tb-start', pct(start));
    bracket.style.setProperty('--tb-width', pct(width));
    bracketLabel.textContent = `${b.rating.label}: ${b.rating.note}`;
    const summary = `${b.waking} waking hours a week: ${b.segments.filter((s) => s.hours > 0).map((s) => `${s.label} ${hoursText(s.hours)}`).join(', ')}. `
      + `Free time left ${hoursText(b.freeHours)}. ${b.rating.label}: ${b.rating.note}.`;
    bar.setAttribute('aria-label', summary);
  }
  update(budget);
  return { el, update };
}
