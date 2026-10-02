// Step registry (05 §2): step id → module. Every id in flow.js STEP_ORDER has an entry. Tasks 20–31 swap a
// placeholder for the real module by editing its file; this map doesn't change.

import appraisal from './appraisal.js';
import buildingPermit from './building-permit.js';
import closingDisclosure from './closing-disclosure.js';
import condoInsurance from './condo-insurance.js';
import constructionLoanApplication from './construction-loan-application.js';
import constructionPurpose from './construction-purpose.js';
import contractorBids from './contractor-bids.js';
import cosignerRequest from './cosigner-request.js';
import creditCardOffer from './credit-card-offer.js';
import creditExplanation from './credit-explanation.js';
import hoaReview from './hoa-review.js';
import homeInspection from './home-inspection.js';
import homeInsurance from './home-insurance.js';
import landPurchase from './land-purchase.js';
import lease from './lease.js';
import loanOptions from './loan-options.js';
import loanPurpose from './loan-purpose.js';
import mortgageApplication from './mortgage-application.js';
import moveInPayment from './move-in-payment.js';
import rentalApplication from './rental-application.js';
import rentalCover from './rental-cover.js';
import rentersInsurance from './renters-insurance.js';
import results from './results.js';
import roomApplication from './room-application.js';
import roommateAgreement from './roommate-agreement.js';
import roommateIntro from './roommate-intro.js';
import siteUtilities from './site-utilities.js';

/** id → step module ({id, title, kind, upfrontKey?, schema?, mount?, complete?}). */
export const STEPS = {
  'appraisal': appraisal,
  'building-permit': buildingPermit,
  'closing-disclosure': closingDisclosure,
  'condo-insurance': condoInsurance,
  'construction-loan-application': constructionLoanApplication,
  'construction-purpose': constructionPurpose,
  'contractor-bids': contractorBids,
  'cosigner-request': cosignerRequest,
  'credit-card-offer': creditCardOffer,
  'credit-explanation': creditExplanation,
  'hoa-review': hoaReview,
  'home-inspection': homeInspection,
  'home-insurance': homeInsurance,
  'land-purchase': landPurchase,
  'lease': lease,
  'loan-options': loanOptions,
  'loan-purpose': loanPurpose,
  'mortgage-application': mortgageApplication,
  'move-in-payment': moveInPayment,
  'rental-application': rentalApplication,
  'rental-cover': rentalCover,
  'renters-insurance': rentersInsurance,
  'results': results,
  'room-application': roomApplication,
  'roommate-agreement': roommateAgreement,
  'roommate-intro': roommateIntro,
  'site-utilities': siteUtilities,
};

/** The module for step `id` (throws for unknown ids). */
export function step(id) {
  const s = STEPS[id];
  if (!s) throw new Error(`Unknown paperwork step "${id}"`);
  return s;
}
