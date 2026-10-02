// The signed document behind an agreement, for the portfolio's read-only view (05 §9, task 18).
// Paperwork steps register their real schema here by agreement docType (or type); anything else gets a generic
// schema built from the agreement's terms and docValues. Import step schemas statically: the drawer renders synchronously.
import { humanKey, valueText } from './parts.js';

const DOC_SCHEMAS = {};

/** Register the schema for an agreement type: fn(agreement, state) → FormSchema (values come from agreement.docValues). */
export function registerAgreementDoc(type, fn) {
  DOC_SCHEMAS[type] = fn;
}

const SIGNED_KEY = /^(signature|.*Signature)$/;

/** The schema to show an agreement read-only: the registered one, else terms + filled-in values as a generic document. */
export function agreementSchema(agreement, state) {
  const custom = DOC_SCHEMAS[agreement.docType ?? agreement.type];
  if (custom) return custom(agreement, state);
  const asField = (prefix) => ([k, v]) => (SIGNED_KEY.test(k)
    ? { id: k, kind: 'signature', label: 'Signature' }
    : { id: `${prefix}-${k}`, kind: 'computed', label: humanKey(k.replace(/Cents$/, '')), width: 'half', compute: () => valueText(k, v) });
  const terms = Object.entries(agreement.terms || {}).map(asField('term'));
  const filled = Object.entries(agreement.docValues || {}).map(asField('doc'));
  return {
    id: `agreement-${agreement.id}`,
    title: agreement.title || humanKey(agreement.type),
    intro: agreement.summary,
    sections: [
      terms.length ? { id: 'terms', title: 'Terms', fields: terms } : null,
      filled.length ? { id: 'filled', title: 'What you filled in', fields: filled } : null,
    ].filter(Boolean),
  };
}
