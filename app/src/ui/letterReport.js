// "How your letter was scored" (06 §5): the report students see on Results (task 31) and in the portfolio's Letters tab.
// Everything the student typed is rendered with text nodes through h(), never as HTML.
import { h } from './dom.js';
import { LETTERS } from '../config.js';
import { bandFor, issueExcerpt } from '../letters/score.js';

const TONE = {
  warm: ['Warm', 'Your letter sounds warm and friendly. Readers like that.'],
  positive: ['Positive', 'Your letter sounds positive and polite.'],
  neutral: ['Neutral', 'Your letter sounds neutral. A friendly word or a thank-you can help the reader warm up to you.'],
  negative: ['Negative', 'Your letter sounds upset or negative. Readers respond better to a calm, friendly tone, even when things are hard.'],
};

const EXPLAINER = 'A small computer model scored your letter. It learned from example letters. It checks your '
  + 'spelling and looks for common grammar mistakes. It reads your tone with a tool called VADER. It also checks that you '
  + "covered what the reader needs to know. It's not a person and it's not an AI chatbot, but real readers care about "
  + 'the same things.';

/** A kind next step for the lower bands. Every letter can be rewritten. */
const ENCOURAGE = {
  fair: 'A good start. Fix one or two things under "What hurt" and it gets stronger.',
  weak: 'This letter can get a lot better. Start with the first thing under "What hurt".',
  'needs-work': 'Every writer rewrites. Start with the first thing under "What hurt", then fix the spelling and grammar below.',
};

/** A titled part of the report. */
const part = (title, ...children) => h('section', { class: 'lr-part' }, h('h4', { class: 'lr-title' }, title), ...children);

/** "…and 4 more" after a capped list. */
const more = (n) => (n > 0 ? h('p', { class: 'lr-more muted' }, `…and ${n} more.`) : null);

/** The 0–100 meter with the band name, its color and an icon (never color alone). */
function meter(score) {
  const band = bandFor(score.likelihood);
  const icon = { green: '✓', cyan: '◎', yellow: '⚠', red: '✕' }[band.status] ?? '•';
  return h('div', { class: `lr-meter st-${band.status}` },
    h('div', { class: 'lr-meter-head' },
      h('span', { class: 'lr-num' }, String(score.likelihood), h('span', { class: 'lr-of' }, ' / 100')),
      h('span', { class: 'lr-band' }, h('span', { 'aria-hidden': 'true' }, icon), ' ', band.label)),
    h('div', { class: 'lr-bar', role: 'meter', 'aria-label': 'Letter score', 'aria-valuemin': '0', 'aria-valuemax': '100',
      'aria-valuenow': String(score.likelihood), 'aria-valuetext': `${score.likelihood} out of 100, ${band.label}` },
    h('span', { class: 'lr-fill', style: { width: `${Math.max(2, score.likelihood)}%` } })),
    h('p', { class: 'lr-meter-note muted' }, 'How likely your letter is to help the reader say yes.'),
    ENCOURAGE[band.key] ? h('p', { class: 'lr-encourage' }, ENCOURAGE[band.key]) : null);
}

/** What helped (↑) and what hurt (↓). */
function reasons(score) {
  const list = (items, mark, cls, none) => (items.length
    ? h('ul', { class: `lr-reasons ${cls}` }, items.map((c) => h('li', null, h('span', { class: 'lr-mark', 'aria-hidden': 'true' }, mark), ' ', c.message)))
    : h('p', { class: 'muted lr-none' }, none));
  const helped = score.contributions.filter((c) => c.effect > 0);
  const hurt = score.contributions.filter((c) => c.effect < 0);
  return h('div', { class: 'lr-cols' },
    part('What helped', list(helped, '↑', 'lr-up', 'Nothing stood out yet. The tips below show where to start.')),
    part('What hurt', list(hurt, '↓', 'lr-down', 'Nothing hurt this letter. Nice work!')));
}

/** Misspelled words with up to 3 suggestions each. */
function spelling(score) {
  const max = LETTERS.reportMaxIssues;
  const words = score.issues.spelling;
  const body = words.length
    ? h('ul', { class: 'lr-spell' }, words.slice(0, max).map((w) => h('li', null,
      h('span', { class: 'lr-word' }, w.word), ' ',
      h('span', { class: 'muted' }, w.suggestions?.length ? `Try: ${w.suggestions.join(', ')}` : 'No suggestions. Check a dictionary.'))))
    : h('p', { class: 'lr-none' }, score.spellChecked === false ? 'Spelling was not checked for this letter.' : 'No spelling mistakes found.');
  return part('Spelling', body, more(words.length - max));
}

/**
 * A suggestion that replaces part of a word ("H" for the "h" in "hi") reads better as the whole word ("Hi").
 * Instructions ("Add a period.") have spaces and are left alone.
 */
export function wholeWordFix(text, { index, length = 0, suggestion }) {
  if (!suggestion || /\s/.test(suggestion) || !length) return suggestion;
  const isLetter = (ch) => /[\p{L}\p{M}'ʻ’]/u.test(ch ?? '');
  if (![...text.slice(index, index + length)].every(isLetter)) return suggestion;
  let a = index;
  let b = index + length;
  while (a > 0 && isLetter(text[a - 1])) a -= 1;
  while (b < text.length && isLetter(text[b])) b += 1;
  return text.slice(a, index) + suggestion + text.slice(index + length, b);
}

/** Issues at the same spot (a lowercase "i" starting a sentence trips two rules) become one entry with every message. */
export function groupBySpot(list) {
  const spots = new Map();
  for (const g of list) {
    const key = `${g.index}:${g.length ?? 0}`;
    if (!spots.has(key)) spots.set(key, { ...g, messages: [] });
    const spot = spots.get(key);
    if (!spot.messages.includes(g.message)) spot.messages.push(g.message);
  }
  return [...spots.values()];
}

/** Grammar issues: the excerpt with the problem part highlighted, the message(s) and a suggestion. */
function grammar(text, score) {
  const max = LETTERS.reportMaxIssues;
  const list = groupBySpot(score.issues.grammar);
  if (!list.length) return part('Grammar', h('p', { class: 'lr-none' }, 'No grammar mistakes found.'));
  return part('Grammar',
    h('ul', { class: 'lr-grammar' }, list.slice(0, max).map((g) => {
      const ex = issueExcerpt(text, g);
      const showExcerpt = (ex.before + ex.match + ex.after).trim().length > 0;
      const fix = wholeWordFix(text, g);
      return h('li', null,
        showExcerpt ? h('p', { class: 'lr-excerpt' }, ex.before,
          ex.match ? h('mark', null, ex.match) : h('mark', { class: 'lr-gap', 'aria-label': 'here' }, '‸'), ex.after) : null,
        h('p', { class: 'lr-msg' }, g.messages.join(' '), fix ? h('span', { class: 'muted' }, ` Try: ${fix}`) : null));
    })),
    more(list.length - max));
}

/** Tone: the sentiment label and one sentence. */
function tone(score) {
  const [label, text] = TONE[score.sentiment?.label] ?? TONE.neutral;
  return part('Tone', h('p', null, h('strong', null, `${label}. `), text));
}

/**
 * renderLetterReport(letter) → the report element for `{text, score}`. A pending score shows a short "still scoring"
 * note instead (the portfolio rescores on load).
 */
export function renderLetterReport(letter) {
  const score = letter?.score;
  if (!score || score.pending || score.likelihood == null) {
    return h('div', { class: 'lr lr-pending' }, h('p', { class: 'muted' }, 'This letter is still being scored.'));
  }
  return h('div', { class: 'lr' },
    h('h3', { class: 'lr-heading' }, 'How your letter was scored'),
    meter(score),
    reasons(score),
    spelling(score),
    grammar(letter.text ?? '', score),
    tone(score),
    h('details', { class: 'lr-how' }, h('summary', null, 'How was this scored?'), h('p', null, EXPLAINER)));
}
