# Deviations from the spec

When a task knowingly departs from `docs/spec`, it records the change here: date, task number, what changed, why,
and where in the code. Keep entries short. The teacher's intent in `99-original-request.md` still wins.

*(none yet)*

- **2026-09-30, task 01**: `node --test tests/unit/` fails on Node 25 (`Cannot find module …/tests/unit`; a directory
  argument is no longer treated as a test root). Use the quoted glob `node --test "tests/unit/*.test.js"` instead, in
  `package.json` and in `tools/check.sh` (task 02). Where the spec or a task says `node --test tests/unit/`, read it as the glob.
- **2026-09-30, task 03**: three r186 no longer ships `build/three.module.min.js` (only `three.module.js`, which imports
  `three.core.js`). `app/vendor/three/three.module.min.js` is an esbuild `--bundle --minify` of `three.module.js`, so the
  import-map path in 01 §1 is unchanged. Also, `vader-sentiment` is Apache-2.0 (not MIT as the task said); bundled as is
  with its LICENSE and NOTICE. See `app/vendor/VERSIONS.md`.
- **2026-10-01, task 15**: 04 §6 says the detail panel is inline at ≥ 900 px and a modal sheet below. The inline panel
  also needs ≥ 720 px of window height (`WIDE` media query in `phases/plan/planScreen.js`). Under that, the table frame is
  only ~350 px tall and the inline panel is cramped, so shorter windows get the sheet. 1366×768 and 1024×768 stay inline;
  the task's 900×700 check shows the sheet.
- **2026-10-01, task 16**: small additions to the 02 §2 shape, no version bump (all optional, created lazily):
  `paperwork.paidUpfront {lineKey: cents}` (which upfront lines were paid during paperwork, for `unpaidUpfront`);
  `monthTotals[].byAccount` (so compacted months still reconcile with balances); loans also carry `priceCents`,
  `paymentsMade`, `interestPaidCents`, `lastPaidMonth`, `paidOffMonth`, `pmiDroppedMonth`, `closedMonth/closedReason`;
  credit `inquiries[]` are `{kind, month, recovered}`. Code: `finance/ledger.js`, `ledgerRecords.js`, `ledgerTotals.js`,
  `creditScore.js`.
- **2026-10-01, task 17**: the spec asks for a credit gauge "with a band label" but names no bands. Added
  `CREDIT.bands` in `config.js` (FICO-style: Poor < 580, Fair 580–669, Good 670–739, Very good 740–799, Excellent 800+)
  and `creditBand(score)` in `finance/creditScore.js`. Restart (Settings) keeps the player's settings as well as the
  account, so a dark-mode or reduced-motion choice survives. A dev `?theme=` override lasts until the player picks a
  theme in Settings. The drawer is built on `ui/modal.js` (shared stack) rather than separate drawer code.
- **2026-10-01, task 18**: 05 §4 says a signature is "the character name typed exactly". The check forgives ʻokina/apostrophe
  variants, kahakō, case and extra spaces (students often can't type an ʻokina), but not spelling or missing words
  (`forms/validate.js` `sameName`). Agreements may carry an optional `docType` (the paperwork step id) so the portfolio can
  re-render the signed document with its real schema (`ui/portfolio/agreementDoc.js`); no state version bump.
