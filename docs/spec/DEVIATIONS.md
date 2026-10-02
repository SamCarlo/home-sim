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
- **2026-10-01, task 19**: `plan.attempts[].outcome` gains `'withdrawn'` ("Choose a different home", as the task asks;
  the plan table only flags `'denied'`). Withdrawing also voids pending agreements and resolves pending applications as
  denied ("You withdrew this application.") so nothing stays pending forever. The 05 §2 contract puts `appliesTo` and
  `requires` on each step module; they live in `phases/paperwork/flow.js` instead (`appliesTo`, `LETTER_STEPS`,
  `prerequisites`) so the flow stays pure and testable in one place. Non-letter steps unlock in order; letters need only
  their own prerequisite and never block form steps; Results needs everything.
- **2026-10-01, task 20**: renter paperwork. 05 §4 lists a "move-in month" on the application; the lease starts January 1,
  2033 for everyone, so it's shown read-only instead of a pick. Move-in payment only records the authorization
  (`paperwork.options.moveIn`); the deposit and first month are charged at commit as unpaid upfront lines ("charged only if
  approved"). The roommate agreement stores housemates' comfort as −1…1 (`paperwork.options.roommateComfort`); task 29
  scales it to the ± bonus. `addAgreement` now keeps an optional `docType`. Step `complete(state, values, now)` gets the
  time as a third argument from the paperwork screen. Signed documents register in `phases/paperwork/docs.js`, which the
  portfolio imports. Code: `phases/paperwork/steps/{rental-application,room-application,lease,roommate-agreement,move-in-payment,renterTerms}.js`.
- **2026-10-01, task 21**: loan options. The 05 §7 credit tiers' rate adjustments are applied to every option's rate on
  the comparison table (a fresh player's 680 drops to 675 after the hard inquiry, so 6.5% shows as 6.875%), so the numbers
  the student picks from match what underwriting will use. FHA uses the same base rates as conventional. Cash to close
  includes the 2 months' reserves, so an option whose total exceeds checking + savings is disabled ("You need $X more…").
  Monthly housing on the table = P&I + PMI/MIP + tax + insurance + required hazard + HOA (no utilities). The mortgage
  application adds a bankruptcy declaration that must be "No" (the character has none). Code: `finance/loanOptions.js`,
  `phases/paperwork/steps/{mortgage-application,loan-options}.js`.
- **2026-10-01, task 22**: buyer documents. The inspector's fee is what that inspector charges ($300/$500/$750), and
  hiring settles the snapshot's whole 'inspection' upfront line so commit doesn't charge it again. A repair-credit request
  asks for the moderate + major items (all items if only minor ones were found); the acceptance chance is set by the worst
  severity asked (`BUYING.inspection.creditChance`), one try. Lenders lend on the lower of price and appraised value, so a
  paid gap lowers the loan and adds the gap to cash to close; "ask the seller" is one seeded try. A pending HOA special
  assessment is pushed into the snapshot's monthly breakdown as a 'special-assessment' line (no state version bump). The
  closing disclosure's escrow row is property tax + insurance + required hazard (HOA dues aren't escrowed); each row has its
  own "Flag an error" button and wrong flags are counted (`options.closing.wrongFlags`). Code: `finance/buying.js`,
  `finance/loanOptions.js`, `phases/paperwork/steps/{hoa-review,home-inspection,appraisal,closing-disclosure}.js`.
- **2026-10-01, task 23**: builder paperwork. Earnest money ($1,000, `BUILD.earnestMoneyCents`) is charged when the land
  offer is signed and recorded as paid toward the 'down-payment' upfront line (commit charges only the rest); the
  contingency refund on denial is left to task 31. A contractor bid changes the price per sq ft (A −8%, C +10%) and the
  months to build (14/9/8 scaled by the location's monthsToBuild ÷ 12), so it changes project cost, loan and cash; the
  design budget stays tier sq ft × local cost per sq ft × 1.10 because the blueprint is priced at local cost. Bid A's seeded
  delay adds 1–4 months of temporary housing and construction interest. The loan application blocks a tier whose cash
  needed exceeds the player's cash. Site utilities offers only what the location supports; the base option is in site
  work, upgrades (well $25,000, 5 kW rooftop solar $15,000, off-grid $40,000) come out of `options.designBudgetCents`, and
  the monthly effect is folded into the snapshot's utilities line. Tier, bid and utilities rewrite `choice.snapshot`
  (`finance/build.js refreshBuildSnapshot`). Code: `finance/build.js`,
  `phases/paperwork/steps/{land-purchase,construction-loan-application,contractor-bids,building-permit,site-utilities}.js`.
- 2026-10-02, task 24, insurance add-ons on contents-only policies: 05 §5 prices hazard add-ons from
  `ownership.hazardCoverage`, which is a dwelling price. Renters pay `INSURANCE.addOnFactor.renters` (10%) and condo owners
  25% of it, since their policy covers belongings or the unit interior only; renters may pick any add-on and none are
  locked. Only house/build pay the full price. Where: `finance/insurance.js` `addOns`, `config.INSURANCE`.
- 2026-10-02, task 24, insurance scaling: house and build premiums scale by insured value ÷ the local median house
  price (clamped 0.5–1.5, the same rule `costs.js` uses for build), with the value = final purchase price for houses and
  `options.project.projectCents` for builds. Add-ons don't scale. The unused task-01 `INSURANCE` stub in config.js was replaced.
- 2026-10-02, task 24, Pāhoa home-insurance screenshot: taken on the Pāhoa **build** path (`paperwork-build-insurance`),
  which uses the same `home-insurance` step and HPIA rule as a Pāhoa house; reaching it on the house path takes
  inspection + appraisal seeds that don't exist for Pāhoa.
- 2026-10-02, task 25, letter box: after Send the step stays on a sent view ("Sent! …", the recipient and the letter
  text) with a **Next step** button, instead of jumping to the next step, so students see the confirmation 06 §2 asks for.
  Step modules opt in with `stayOnDone: true`; `paperworkScreen.js` passes `onNext` in the mount context. The confirm
  dialog also mentions the word count when it's outside the target. The spelling dictionary is not preloaded yet,
  since the score is a stub; task 26 adds the lazy load when the box mounts. Where: `phases/paperwork/letterBox.js`.
