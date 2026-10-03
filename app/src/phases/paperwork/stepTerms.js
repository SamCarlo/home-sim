// "Words to know" for each paperwork step (12 §5, task 55): glossary ids shown as term() tooltips above the step, so a
// money word is defined the first time a student meets it on paper.
import { wordsToKnow } from '../../ui/term.js';

/** Step id → glossary ids, in the order they come up in that step. */
export const STEP_TERMS = {
  'rental-application': ['credit-score', 'gross-net', 'security-deposit'],
  'room-application': ['credit-score', 'security-deposit'],
  'cosigner-request': ['co-signer'],
  'credit-explanation': ['credit-score', 'hard-inquiry'],
  lease: ['lease', 'security-deposit'],
  'roommate-agreement': ['lease', 'security-deposit'],
  'move-in-payment': ['security-deposit'],
  'renters-insurance': ['renters-insurance', 'premium', 'deductible'],
  'condo-insurance': ['homeowners-insurance', 'premium', 'deductible', 'hoa'],
  'home-insurance': ['homeowners-insurance', 'premium', 'deductible', 'flood-zone', 'lava-zone'],
  'mortgage-application': ['gross-net', 'dti', 'credit-score', 'hard-inquiry'],
  'loan-options': ['down-payment', 'principal', 'interest', 'amortization', 'pmi', 'fha-loan', 'closing-costs', 'escrow'],
  'hoa-review': ['hoa', 'special-assessment'],
  'home-inspection': ['home-inspection', 'contingency'],
  appraisal: ['appraisal', 'equity'],
  'closing-disclosure': ['closing-costs', 'escrow', 'apr', 'property-tax'],
  'land-purchase': ['earnest-money', 'contingency', 'escrow', 'lava-zone'],
  'construction-loan-application': ['gross-net', 'dti', 'hard-inquiry'],
  'site-utilities': ['catchment', 'septic'],
  'credit-card-offer': ['apr', 'credit-utilization', 'hard-inquiry'],
  results: ['credit-score', 'dti', 'emergency-fund'],
};

/** The "Words to know" line for a step, or null when it has none. */
export function stepWords(stepId) {
  const ids = STEP_TERMS[stepId];
  if (!ids?.length) return null;
  return wordsToKnow(ids, 'pw-words');
}
