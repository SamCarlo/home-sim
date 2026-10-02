// Portfolio tab: Credit score (02 §2 credit, 09 §6, task 17). A 300–850 gauge with a band label, then the history.
import { h } from '../dom.js';
import { CREDIT } from '../../config.js';
import { block, empty } from './parts.js';
import { creditGauge, creditHistory, whenLabel } from './portfolioModel.js';

const CX = 120;
const CY = 118;
const R = 96;

/** Point on the gauge arc; deg −90 = left end, 0 = top, +90 = right end. */
function pt(deg, r = R) {
  const a = (deg - 90) * (Math.PI / 180);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function arc(from, to) {
  const [x1, y1] = pt(from);
  const [x2, y2] = pt(to);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** SVG gauge (built with createElementNS; no strings from the player reach it). */
function gaugeSvg(g) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    return n;
  };
  const svg = el('svg', { viewBox: '0 0 240 140', class: 'pf-gauge-svg', 'aria-hidden': 'true' });
  for (const s of g.segments) {
    svg.append(el('path', { d: arc(s.fromDeg + 0.6, s.toDeg - 0.6), class: `pf-gauge-seg st-${s.status}`, fill: 'none', 'stroke-width': 16 }));
  }
  const [nx, ny] = pt(g.angle, R - 22);
  svg.append(el('line', { x1: CX, y1: CY, x2: nx.toFixed(1), y2: ny.toFixed(1), class: 'pf-gauge-needle', 'stroke-width': 4, 'stroke-linecap': 'round' }));
  svg.append(el('circle', { cx: CX, cy: CY, r: 7, class: 'pf-gauge-hub' }));
  const lo = el('text', { x: 14, y: 136, class: 'pf-gauge-end' });
  lo.textContent = String(CREDIT.minScore);
  const hi = el('text', { x: 226, y: 136, class: 'pf-gauge-end', 'text-anchor': 'end' });
  hi.textContent = String(CREDIT.maxScore);
  svg.append(lo, hi);
  return svg;
}

/** The credit tab. */
export function renderCredit(state) {
  const cr = state.finances.credit;
  const g = creditGauge(cr.score);
  const hist = creditHistory(state);
  return h('div', { class: 'pf-tab-credit' },
    h('div', { class: 'pf-gauge', role: 'img', 'aria-label': `Credit score ${g.score} out of ${CREDIT.maxScore}: ${g.band.label}` },
      gaugeSvg(g),
      h('div', { class: 'pf-gauge-read' },
        h('strong', { class: 'pf-gauge-score' }, String(g.score)),
        h('span', { class: `pf-chip st-${g.band.status}` }, `${g.band.label} (${g.band.minScore}–${g.band.maxScore})`))),
    h('p', { class: 'pf-note muted' },
      `On-time streak: ${cr.onTimeStreak} month${cr.onTimeStreak === 1 ? '' : 's'} · Missed payments: ${cr.missedPayments}`),
    block('History', hist.length
      ? h('ol', { class: 'pf-history' }, hist.map((e) => h('li', null,
        h('span', { class: `pf-delta ${e.delta > 0 ? 'is-up' : e.delta < 0 ? 'is-down' : ''}` },
          e.delta > 0 ? `▲ +${e.delta}` : e.delta < 0 ? `▼ −${-e.delta}` : '• 0'),
        h('span', { class: 'pf-history-main' },
          h('span', null, (e.reasons || []).join(' · ') || 'Score change'),
          h('span', { class: 'muted' }, `${whenLabel(e.month)} · score ${e.score}`)))))
      : empty(`No changes yet. You start at ${CREDIT.startingScore}.`)));
}
