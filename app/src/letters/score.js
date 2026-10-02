// Letter scoring entry point (06 §3). Stub until task 28: every letter is "pending" and the rating stays hidden until
// Results anyway (D11). Task 28 replaces the body with the real pipeline and keeps this signature.

/** scoreLetter(text, type, {speller}) → score. For now always {likelihood: null, pending: true}. */
export function scoreLetter(_text, _type, _opts = {}) {
  return { likelihood: null, pending: true };
}
