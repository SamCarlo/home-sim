// Signed paperwork documents for the portfolio's read-only view (05 §9). Registers each step's real schema with
// ui/portfolio/agreementDoc.js by docType; the schema is rebuilt from the agreement's stored terms (defaults fill
// older or seeded agreements that lack them). Later paperwork tasks add their documents here.
import { LEASE } from '../../config.js';
import { registerAgreementDoc } from '../../ui/portfolio/agreementDoc.js';
import { leaseSchema } from './steps/lease.js';
import { roommateSchema } from './steps/roommate-agreement.js';
import { hoaSchema } from './steps/hoa-review.js';
import { landSchema } from './steps/land-purchase.js';

/** Renter terms from an agreement, with defaults for anything missing. */
export function termsFromAgreement(a) {
  return { variant: 'apartment', place: '', placeName: '', landlord: a.counterparty || 'The landlord',
    landlordContact: a.counterparty || 'The landlord', landlordPhone: '', unit: 'Unit to be chosen in Phase 3',
    rentCents: 0, depositCents: 0, firstMonthCents: 0, applicationFeeCents: 0, termMonths: LEASE.termMonths,
    startLabel: LEASE.startLabel, roommates: [], ...(a.terms || {}) };
}

registerAgreementDoc('lease', (a) => leaseSchema(termsFromAgreement(a)));
registerAgreementDoc('roommate-agreement', (a) => roommateSchema(termsFromAgreement(a)));
registerAgreementDoc('hoa-review', (a, state) => hoaSchema(a.terms, state));
registerAgreementDoc('land-purchase', (a) => landSchema(a.terms));
