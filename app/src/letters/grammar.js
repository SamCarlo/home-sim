// Grammar rules (06 §3 step 3): the mistakes middle schoolers really make. Pure. Each rule is
// `{id, message, suggestion, weight, test(text, tokens, ctx) → [{index, length, message, suggestion}]}`, where `text` is
// normalizeText(letter), `tokens` = tokenize(text) and ctx = {type, sentences, lines, paragraphs}. Weight 1 = a normal
// mistake, 0.5 = minor. checkGrammar runs them all and returns the hits with the rule id and weight attached.
import { normalizeText, tokenize, splitSentences, splitLines, splitParagraphs } from './text.js';

const RUN_ON_WORDS = 40;
const LONG_BLOCK_WORDS = 150;
const TEXT_SPEAK = ['u', 'ur', 'r', 'pls', 'plz', 'thx', 'lol', 'idk', 'omg', 'btw', 'gonna', 'wanna', 'kinda'];
const ACRONYMS = new Set(['HOA', 'PMI', 'MIP', 'APR', 'FHA', 'USDA', 'DTI', 'HPIA', 'ADU', 'ATM', 'ID', 'USA', 'TV', 'OK']);
const GREETING = /^(dear|hello|hi|hey|to|aloha|greetings|good (morning|afternoon|evening))\b/i;
const CLOSING = /\b(sincerely|thank you|thanks|best regards|kind regards|warm regards|regards|best wishes|respectfully|mahalo|yours truly|with respect|with gratitude|warmly|a hui hou)\b/i;
const PARENT_CLOSING = /^(love|with love|lots of love|love you)\b/i;

/** Every regex match in `text` as a hit. */
function hits(text, re, message, suggestion) {
  return [...text.matchAll(re)].map((m) => ({ index: m.index, length: m[0].length, message,
    suggestion: typeof suggestion === 'function' ? suggestion(m) : suggestion }));
}

/** Keep the original capital when suggesting a replacement word. */
const keepCase = (orig, repl) => (/^\p{Lu}/u.test(orig) ? repl[0].toUpperCase() + repl.slice(1) : repl);

/** Rules in report order. */
export const GRAMMAR_RULES = [
  {
    id: 'lowercase-start', weight: 1, message: 'Start each sentence with a capital letter.', suggestion: 'Capitalize the first word.',
    test: (text, tokens, { sentences }) => sentences.flatMap((s) => {
      const m = s.text.match(/^[^\p{L}\p{N}]*(\p{Ll})/u);
      if (!m) return [];
      return [{ index: s.index + m[0].length - 1, length: 1, message: 'This sentence starts with a lowercase letter.',
        suggestion: m[1].toUpperCase() }];
    }),
  },
  {
    id: 'lowercase-i', weight: 1, message: 'Write "I" as a capital letter.', suggestion: 'I',
    test: (text) => hits(text, /(?<![\p{L}\p{N}ʻ'-])i(?=('(m|ll|ve|d))?(?![\p{L}\p{N}ʻ'-])(?!\.\p{L}))/gu,
      'Write "I" as a capital letter.', 'I'),
  },
  {
    id: 'missing-end-punctuation', weight: 1, message: 'End each sentence with a period, question mark or exclamation point.',
    suggestion: 'Add a period.',
    test: (text, tokens, { lines }) => lines
      .filter((l) => l.words >= 5 && !/[.!?…]["')\]”]*$/.test(l.text) && !/[,:;]$/.test(l.text))
      .map((l) => ({ index: l.index + l.text.length - 1, length: 1, message: 'This sentence has no end punctuation.',
        suggestion: 'Add a period.' })),
  },
  {
    id: 'repeated-word', weight: 1, message: 'A word is repeated.', suggestion: 'Delete the extra word.',
    test: (text, tokens) => tokens.slice(1).flatMap((t, i) => {
      const prev = tokens[i];
      const gap = text.slice(prev.index + prev.word.length, t.index);
      if (t.word.toLowerCase() !== prev.word.toLowerCase() || !/^\s+$/.test(gap) || /^(had|that)$/i.test(t.word)) return [];
      return [{ index: prev.index, length: t.index + t.word.length - prev.index,
        message: `"${t.word}" is written twice.`, suggestion: prev.word }];
    }),
  },
  {
    id: 'double-space', weight: 0.5, message: 'Use one space between words.', suggestion: 'Delete the extra space.',
    test: (text) => hits(text, /(?<=\S) {2,}(?=\S)/g, 'There are two spaces here.', ' '),
  },
  {
    id: 'your-youre', weight: 1, message: 'Mix-up of "your" and "you\'re".', suggestion: '"You\'re" means "you are"; "your" means it belongs to you.',
    test: (text) => [
      ...hits(text, /\b(your)(?= (welcome|going|gonna|not|being|doing|coming|getting|so|very|too|really|always|never|a|an|the best)\b)/gi,
        'This should be "you\'re" (you are).', (m) => keepCase(m[1], "you're")),
      ...hits(text, /\b(you're)(?= (house|home|car|apartment|family|name|money|rent|help|time|kindness|support|own)\b)/gi,
        'This should be "your" (belongs to you).', (m) => keepCase(m[1], 'your')),
    ],
  },
  {
    id: 'their-there', weight: 1, message: 'Mix-up of "their", "there" and "they\'re".',
    suggestion: '"There" is a place, "their" means it belongs to them, "they\'re" means "they are".',
    test: (text) => [
      ...hits(text, /\b(there)(?= (going|coming|doing|not|being|very|so|really|always|house|home|car|family|names?|own|rent|kids|dog|cat)\b)/gi,
        'Check "there": did you mean "their" or "they\'re"?', (m) => keepCase(m[1], /^(going|coming|doing|not|being|very|so|really|always)/i
          .test(text.slice(m.index + m[1].length + 1)) ? "they're" : 'their')),
      ...hits(text, /\b(their)(?= (is|are|was|were|will|going|not)\b)/gi,
        'Check "their": did you mean "there" or "they\'re"?', (m) => keepCase(m[1], /^ (going|not)/i
          .test(text.slice(m.index + m[1].length)) ? "they're" : 'there')),
      ...hits(text, /\b(they're)(?= (is|was|house|home|car|own|family|names?|rent)\b)/gi,
        'Check "they\'re": did you mean "their" or "there"?', (m) => keepCase(m[1], /^ (is|was)\b/i
          .test(text.slice(m.index + m[1].length)) ? 'there' : 'their')),
    ],
  },
  {
    id: 'its-its', weight: 1, message: 'Mix-up of "its" and "it\'s".', suggestion: '"It\'s" means "it is"; "its" means it belongs to it.',
    test: (text) => [
      ...hits(text, /\b(it's)(?= own\b)/gi, 'This should be "its" (belongs to it).', (m) => keepCase(m[1], 'its')),
      ...hits(text, /\b(its)(?= (a|an|the|not|very|so|really|going|been|my|our|your|nice|great|hard|important|close|easy|ok|okay|time)\b)/gi,
        'This should be "it\'s" (it is).', (m) => keepCase(m[1], "it's")),
    ],
  },
  {
    id: 'should-of', weight: 1, message: 'Write "should have", not "should of".', suggestion: 'have',
    test: (text) => hits(text, /\b(should|could|would|must|might) of\b/gi, 'Use "have" here, not "of".',
      (m) => `${m[1]} have`),
  },
  {
    id: 'alot', weight: 1, message: '"A lot" is two words.', suggestion: 'a lot',
    test: (text) => hits(text, /\balot\b/gi, '"A lot" is two words.', (m) => keepCase(m[0], 'a lot')),
  },
  {
    id: 'then-than', weight: 1, message: 'Use "than" to compare.', suggestion: 'than',
    test: (text) => hits(text, /\b(more|less|better|worse|rather|bigger|smaller|higher|lower|cheaper|other|fewer|larger|faster|easier|harder|older|younger|safer|closer|nicer|quieter) (then)\b/gi,
      'Comparisons use "than", not "then".', (m) => `${m[1]} than`),
  },
  {
    id: 'to-too', weight: 1, message: 'Use "too" for "also" or "very".', suggestion: 'too',
    test: (text) => [
      ...hits(text, /(?<=\b(?:me|you|us|them|it|him|her|that|this) )to(?=[.!?,])/gi, 'Did you mean "too" (also)?', 'too'),
      ...hits(text, /(?<=\b(?:is|was|are|were|be|it's|got|get|very|way|much) )to(?= (much|many|late|early|expensive|big|small|far|hard|high|low|long|loud|busy|tired|young|old|cold|hot)\b)/gi,
        'Did you mean "too" (more than enough)?', 'too'),
    ],
  },
  {
    id: 'run-on', weight: 1, message: `A sentence over ${RUN_ON_WORDS} words is hard to follow.`, suggestion: 'Split it into two sentences.',
    test: (text, tokens, { sentences }) => sentences.filter((s) => s.words > RUN_ON_WORDS)
      .map((s) => ({ index: s.index, length: s.text.length, message: `This sentence has ${s.words} words.`,
        suggestion: 'Split it into two sentences.' })),
  },
  {
    id: 'shouting', weight: 1, message: 'Writing in ALL CAPS reads like shouting.', suggestion: 'Use normal capitals.',
    test: (text, tokens) => {
      const out = [];
      let run = [];
      const flush = () => {
        if (run.length >= 3 && run.filter((t) => t.word.length >= 2).length >= 2) {
          const last = run[run.length - 1];
          out.push({ index: run[0].index, length: last.index + last.word.length - run[0].index,
            message: 'These words are all capitals.', suggestion: 'Use normal capitals.' });
        }
        run = [];
      };
      for (const t of tokens) {
        const caps = /\p{Lu}/u.test(t.word) && t.word === t.word.toUpperCase() && !ACRONYMS.has(t.word.replace(/'S$/, ''));
        if (caps) run.push(t); else flush();
      }
      flush();
      return out;
    },
  },
  {
    id: 'exclamations', weight: 1, message: 'One exclamation point is enough.', suggestion: '!',
    test: (text) => hits(text, /[!?]*![!?]*!+[!?]*/g, 'Too many exclamation points.', '!')
      .filter((x) => (text.slice(x.index, x.index + x.length).match(/!/g) ?? []).length >= 2),
  },
  {
    id: 'text-speak', weight: 1, message: 'Text-speak doesn\'t belong in a formal letter.', suggestion: 'Write the full words.',
    test: (text, tokens) => tokens.filter((t) => {
      const w = t.word.toLowerCase();
      if (!TEXT_SPEAK.includes(w)) return false;
      return w.length > 1 || t.word === w; // "U" and "R" are initials; "u" and "r" are text-speak
    }).map((t) => ({ index: t.index, length: t.word.length, message: `"${t.word}" is text-speak.`,
      suggestion: { u: 'you', ur: 'your', r: 'are', pls: 'please', plz: 'please', thx: 'thanks', lol: '(remove it)',
        idk: "I don't know", omg: '(remove it)', btw: 'by the way', gonna: 'going to', wanna: 'want to',
        kinda: 'kind of' }[t.word.toLowerCase()] })),
  },
  {
    id: 'missing-greeting', weight: 1, message: 'Start with a greeting, like "Dear Ms. Kahale,".', suggestion: 'Dear …,',
    test: (text, tokens, { lines }) => (!lines.length || GREETING.test(lines[0].text.replace(/^[^\p{L}]+/u, '')) ? []
      : [{ index: lines[0].index, length: 0, message: 'The letter has no greeting.', suggestion: 'Dear …,' }]),
  },
  {
    id: 'missing-closing', weight: 1, message: 'End with a closing, like "Sincerely,".', suggestion: 'Sincerely,',
    test: (text, tokens, { lines, type }) => {
      const tail = lines.slice(-3);
      const ok = tail.some((l) => CLOSING.test(l.text) || (type === 'cosigner-request' && PARENT_CLOSING.test(l.text)));
      if (ok || !lines.length) return [];
      const last = lines[lines.length - 1];
      return [{ index: last.index + last.text.length, length: 0, message: 'The letter has no closing.', suggestion: 'Sincerely,' }];
    },
  },
  {
    id: 'long-block', weight: 0.5, message: `Break up text over ${LONG_BLOCK_WORDS} words into paragraphs.`,
    suggestion: 'Press Enter twice between paragraphs.',
    test: (text, tokens, { paragraphs }) => paragraphs.filter((p) => p.words > LONG_BLOCK_WORDS && !/\n/.test(p.text))
      .map((p) => ({ index: p.index, length: p.text.length, message: `This paragraph has ${p.words} words and no breaks.`,
        suggestion: 'Press Enter twice between paragraphs.' })),
  },
];

/** Rule ids in report order. */
export const GRAMMAR_RULE_IDS = GRAMMAR_RULES.map((r) => r.id);

/** Run every rule → `[{rule, index, length, message, suggestion, weight}]`, sorted by position. */
export function checkGrammar(text, { type = null } = {}) {
  const s = normalizeText(text);
  const tokens = tokenize(s);
  const ctx = { type, sentences: splitSentences(s), lines: splitLines(s), paragraphs: splitParagraphs(s) };
  const out = [];
  for (const rule of GRAMMAR_RULES) {
    for (const hit of rule.test(s, tokens, ctx)) out.push({ rule: rule.id, weight: rule.weight, ...hit });
  }
  return out.sort((a, b) => a.index - b.index || GRAMMAR_RULE_IDS.indexOf(a.rule) - GRAMMAR_RULE_IDS.indexOf(b.rule));
}
