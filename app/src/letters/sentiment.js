// Sentiment (06 §3 step 4): VADER compound score for the whole letter and for each sentence, plus a label. Pure.
import { polarityScores } from '../../vendor/vader/vader.js';
import { normalizeText, splitSentences } from './text.js';

/** Label cut-offs on the compound score (06 §3 step 4). */
export const SENTIMENT_CUTS = { warm: 0.5, positive: 0.05, negative: -0.05 };

/** compound → 'warm' | 'positive' | 'neutral' | 'negative'. */
export function sentimentLabel(compound) {
  if (compound >= SENTIMENT_CUTS.warm) return 'warm';
  if (compound >= SENTIMENT_CUTS.positive) return 'positive';
  return compound <= SENTIMENT_CUTS.negative ? 'negative' : 'neutral';
}

const round4 = (x) => Math.round(x * 1e4) / 1e4;

/**
 * analyzeSentiment(text) → {compound, label, sentences: [{text, index, compound, label}], negSentenceRate}.
 * negSentenceRate = negative sentences ÷ sentences (0 for an empty letter).
 */
export function analyzeSentiment(text) {
  const s = normalizeText(text);
  const compound = s.trim() ? round4(polarityScores(s).compound) : 0;
  const sentences = splitSentences(s).map((x) => {
    const c = round4(polarityScores(x.text).compound);
    return { text: x.text, index: x.index, compound: c, label: sentimentLabel(c) };
  });
  const neg = sentences.filter((x) => x.label === 'negative').length;
  return { compound, label: sentimentLabel(compound), sentences, negSentenceRate: sentences.length ? neg / sentences.length : 0 };
}
