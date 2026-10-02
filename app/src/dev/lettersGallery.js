// ?dev=letters (task 28): the "How your letter was scored" report for a strong, a middling and a weak sample letter,
// scored live with the real model and the spelling dictionary.
import { h, clear } from '../ui/dom.js';
import { loadSpeller } from '../letters/loadSpeller.js';
import { scoreLetter } from '../letters/score.js';
import { renderLetterReport } from '../ui/letterReport.js';
import { REPORT_SAMPLES } from './sampleLetters.js';

/** Render the three reports side by side, each above its letter text. */
export async function mount(root) {
  const speller = await loadSpeller();
  clear(root);
  root.append(h('main', { class: 'lr-gallery', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '24px', padding: '24px', alignItems: 'start' } },
  REPORT_SAMPLES.map((sample) => {
    const letter = { text: sample.text, score: scoreLetter(sample.text, sample.type, { speller }) };
    return h('section', { class: 'card', dataset: { sample: sample.id, likelihood: String(letter.score.likelihood) },
      style: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' } },
    h('h2', { style: { margin: 0 } }, sample.title),
    renderLetterReport(letter),
    h('details', null, h('summary', null, 'The letter'), h('div', { class: 'pf-letter' }, sample.text)));
  })));
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
