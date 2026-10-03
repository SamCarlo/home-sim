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
- 2026-10-02, task 26, letter text helpers: normalization and splitting live in a separate `letters/text.js` (06 §3 puts
  them in features.js) so spell.js and grammar.js can share them without importing features.js. Sentences split on
  `.!?` and also at line breaks, since a textarea newline is deliberate (greeting, closing and signature lines). Short
  lines (≤ 4 words) with no end punctuation are treated as greeting/closing/signature lines: capitalized words there are
  names (not spell-checked) and the missing-end-punctuation rule ignores them. The `paragraphs` feature counts lines of
  8+ words, so students who separate paragraphs with a single Enter still get credit. `extractFeatures` returns
  `issues`, `sentiment`, `wordCount` and `groupsHit` alongside `{vector, named}` for task 28. Where: `app/src/letters/`.
- 2026-10-02, task 27, letter corpus size: 14 letters per type (4 strong, 4 middling, 6 weak; 84 total), not ~13. The
  extra weak letter in each type has grammar mistakes all through but complete content. Without it, grammar errors only
  appeared alongside spelling and text-speak, and the grammar weight came out with the wrong sign. Where: `tools/letter-model/corpus/`.
- 2026-10-02, task 27, model training details: cross-validation is **stratified** (positives and negatives dealt
  round-robin into 5 seeded folds), and each fold standardizes on its own training part. The final model trains on the
  non-test letters only, so the held-out accuracy is honest. `model.json` adds `cv.k`, `test.logloss`, `test.n`, `corpus`
  and `hyper` (λ 0.05, rate 0.3, 3000 iterations, seed 27) to the 06 §4 fields. `version` is `letters-lr-<hash>` of the
  feature names, corpus and hyperparameters, so it changes exactly when the model can. Where: `tools/letter-model/`.
- 2026-10-02, task 28, score contract extras: `scoreLetter` also returns `bandLabel` and `spellChecked`. Without a speller
  (the dictionary not loaded yet) it still scores, with `spellChecked: false`, and `rescorePending` upgrades it once the
  dictionary loads (main.js `rescoreLetters` on boot). Old `{likelihood: null, pending: true}` stubs are scored the same
  way. Bands carry a `status` (st-* color) in config. The report merges grammar issues at the same spot and shows a
  part-word suggestion as the whole word ("Try: Hi"), and adds one encouraging line for Fair/Weak/Needs work.
  Where: `app/src/letters/score.js`, `app/src/ui/letterReport.js`, `app/src/main.js`.
- 2026-10-02, task 29, construction credit floor: the 680 floor (05 §7) is checked against the score the lender pulled,
  stored as `paperwork.options.pulledScore` by the construction loan application just before its own hard inquiry (the
  application already says "Yours is N before this check"). Otherwise every fresh 680 player would be denied at 675.
  The credit *factor* and rate use the current score through the mortgage credit tiers, as for mortgages. Resolves the
  OPEN_ITEMS entry. Where: `finance/underwriting.js` `constructionDecision`, `steps/construction-loan-application.js`.
- 2026-10-02, task 29, cash hard fails for every home: 05 §7 lists "cash < cash to close" only for mortgages. Leases,
  rooms and builds also hard-fail when cash can't cover what commit charges (move-in costs, or the build's down payment,
  closing, temporary housing and interest reserve), so commit never runs short. Mortgage "cash needed to close" is the
  down payment + closing + unpaid fees + appraisal gap − repair credit (the reserves are checked by the reserves factor,
  not charged). Where: `finance/underwriting.js`.
- 2026-10-02, task 29, buyer upfront at commit: condo/house commit charges the chosen loan option's down payment and
  closing (not the snapshot's 10% lines), plus unpaid inspection/appraisal, the appraisal gap and minus a repair credit.
  Renters and builders are charged `unpaidUpfront(state)`. Where: `terms.upfront` on each decision; `commit.js`.
- 2026-10-02, task 29, recurring categories: 05 §8 says the location's living costs use category `living`; the portfolio's
  categories (task 17) are food/transportation/utilities, so groceries → food, transport → transportation, phone and
  internet → utilities, all with `source: 'living'` (as in the portfolio-demo seed). Gym and social costs are left to the
  life phase. Where: `phases/paperwork/commit.js` `recurringFor`.
- 2026-10-02, task 29, build timing: the construction-to-permanent loan opens with `startMonth` = the build months, and its
  housing bills (P&I, tax, insurance, utilities) start then; the upfront interest reserve and temporary housing cover the
  months before. Living costs start at month 0. Where: `commit.js`.
- 2026-10-02, task 29, roommate bonus: `UNDERWRITING.roommates.agreementBonus` is 0.05 (05 §4's ±5%), not the earlier 0.1.
  Factor = 1 + comfort (−1…1) × 0.05. A co-signer decision is still drawn for a shared room when the co-signer letter
  applied, but only the lease uses it (05 §7's roommates formula has no co-signer term).
- 2026-10-02, task 30, card tier from the pulled score: accepting the offer records the card's hard inquiry (−5), so a
  700 student would be offered $1,500 but decided at 695 ($1,000). The step stores `paperwork.options.card.pulledScore`
  (the score before its own inquiry) and `cardDecision` uses it, so the card that opens matches the offer. Where:
  `finance/underwriting.js`, `steps/credit-card-offer.js`.
- 2026-10-02, task 30, decline noted as a void agreement: 05 §6 says a decline is "noted in the portfolio". Agreements only
  have pending/active/void, so a decline is a void 'credit-card' agreement (summary "You declined this offer.", the offer
  document read-only). No inquiry, no application. The offer is one-time: later attempts show "Already answered" when a card
  is open or an earlier attempt answered. Where: `steps/credit-card-offer.js` `priorAnswer`.
- 2026-10-02, task 30, worked example wording: 05 §6 says "$1,000 paid at the $25 minimum". The real minimum on $1,000 is
  $31.66 at 25.99% (1% + interest), so the example pays the card's actual minimum ("starts at $31.66 and never drops under
  $25") with `cardPayoff`, and adds a $100/month contrast and "pay in full = $0". Where: `finance/creditCard.js` `payoffExample`.
- 2026-10-02, task 32, shadow filter: three r186 removed `PCFSoftShadowMap` (it logs a warning and falls back), so the
  renderer uses `PCFShadowMap` (08 §2 asks for soft). Where: `three/scene.js`.
- 2026-10-02, task 32, createScene options: besides 08 §2's `{biome, landmark, monthIndex, timeOfDay, interactive}` it takes
  `location` (supplies biome, landmark, seasons, coastal and the fallback preview), `seasons`, `coastal`, `homeTypeId` and
  `seed`, because snow/fall months and the water plane come from the location record. When WebGL fails it shows the
  fallback and returns null instead of a handle. Where: `three/scene.js`.
- 2026-10-02, task 32, terrain size: decorations fill the 400 × 400 ft area of 08 §3, but the plain ground plane is
  1,800 ft so the horizon never shows an edge; landmarks are merged backdrops scaled by `SCENE3D.backdrop` and turned to
  sit behind the lot in the default view. Landmark builders live in their own `three/landmarks.js`. Where: `three/terrain.js`.
- 2026-10-02, task 33, character height: 08 §7 says "~1.7 units = 5.6 ft", but 08 §1 sets 1 unit = 1 ft, so the
  figure is 5.6 units tall (1.7 is the height in metres). Where: `three/character.js`.
- 2026-10-02, task 33, props gallery draw calls: `?dev=props` shows ~40 props at once (one mesh per material each), so the
  gallery scene runs ~200–290 draw calls, over the 150 whole-scene budget. Each prop is 1–6 calls; a home scene uses a few
  props and should instance repeats with `instanceProp`. The gallery hides the terrain's own trees (`&decor=1` keeps them).
  Where: `dev/propsGallery.js`.
- 2026-10-02, task 33, prop extras: besides 08 §6, `createAnimal(kind, {color})` takes a coat color, `setTreeSeason(tree,
  season)` recolors/bares a tree after creation, and the windmill (`idle`) and street lamp (`setNight`) have hooks.
  Where: `three/animals.js`, `three/props.js`, `three/yard.js`.
- 2026-10-02, task 34, 3D style parameters: 08 §4 gives the family table but no 3D fields, so `data/styleFamilies.js`
  adds a `look` record per family (roof shape incl. `aframe`/`saltbox`/`barrel`, pitch as rise/run, eave, ridge axis, wall and
  roof texture, window kind + extra, porch, base incl. `raised` for the brownstone stoop, rails, rooftop, tree kinds,
  extras). Variants (`hillside`, `alaska`) carry their own `look` overrides. Where: `data/styleFamilies.js`, `three/styles.js`.
- 2026-10-02, task 34, styles gallery draw calls: `?dev=styles` shows all 16 swatch houses at once (~480 draw calls, ~65k
  triangles), over the 150-call whole-scene budget; one house (`&family=`) is 29–49 calls including terrain. Where:
  `dev/stylesGallery.js`.
- 2026-10-02, task 35, buildingGen extras: besides 08 §5's contract, `generate()` takes `unit` ({floor, unit}, default the
  lowest home floor's unit 0) and `season`, and returns `plan` (phases/design/buildingPlan.js), `floorBands`, `units`
  and `setUnit(floor, unit)` (moves plantSpots/animalSpots to that unit's balcony). Floors are 1-based, units 0-based
  (row 0 = street side). Townhome condos count as one floor with whole-townhome units. Where: `three/buildingGen.js`.
- 2026-10-02, task 35, buildings gallery: `?dev=buildings&all=1` shows 20 buildings at once (~510 draw calls, ~270k
  triangles), over the whole-scene budget; the three-building view per location stays within it (≤ 135 calls, ≤ 82k
  triangles). The gallery also takes `kind=apartment|condo`, `hl=<floor>[,<unit>]` and `seed=`. Where: `dev/buildingsGallery.js`.
- 2026-10-02, task 36, extra home fields: besides 02 §2's `building {seed, index, name, floor, unit, traits}`, Move in stores
  `building.form/unitName/amenities`, `traits.lotsOfStairs` and `home.address` ("Unit 4B · Kaiko Terrace · Hilo", the 07 §1
  summary label). `home.lifestyle` has `stairs` and `gym` (07 §2 "stairs" and "+1 gym access") besides noise/view/nature/
  social. Potted plants are charged at month −1 (`PAPERWORK_MONTH`, checking then savings, category 'lifestyle') because
  life hasn't started. Where: `phases/design/apartmentModel.js` `moveIn`.
- 2026-10-02, task 36, picker camera: the scene clamps pan to ±60 ft and the look-at height to 40 ft, but three buildings
  span ~600 ft and towers reach 300 ft. The picker slides the building row so the chosen one sits at the lot center, and
  `three/scene.js` gained `setPanLimits({half, yMax})` (defaults unchanged) so it can look up at a tall tower's chosen floor.
  On buildings over 80 ft, choosing a floor frames that floor and a few around it. Where: `phases/design/pickerView.js`.
- 2026-10-02, task 37, houseGen options: besides 08 §5's `{style, seed, variant, palette, extras}`, `generate()` takes
  `styleVariant` (hillside/alaska; buildingGen calls this `variant`, but here `variant` is 'house'|'shared' per the spec),
  `biome` (lawn color, fruit tree kind), `season`, `snow`, and `sqft`/`bedrooms` (a listing's target size), and returns
  `plan`, `kit` and `info`. The seeded numbers live in pure `phases/design/housePlan.js` so pickers get beds/baths/sq ft
  without three. Where: `three/houseGen.js`, `phases/design/housePlan.js`.
- 2026-10-02, task 37, house yards: Kona's lava-rock wall and the desert block wall act as the yard fence (with gaps for
  the path and driveway) instead of the swatch's short front wall; Hawaiʻi plantation and Miami use flowering hedges;
  Texas has an open lawn. Brownstones get the two neighbours in the row (other palettes) and no fire escape. Where:
  `three/houseYard.js`, `three/houseGen.js`.
- 2026-10-02, task 38, extra house fields: besides 02 §2's `house {seed, listingIndex, address, palette, extras}`, Move in
  stores `house.quirk/sqft/beds/baths/lotAcres/yearBuilt/gardenBeds/fruitTrees/coop/pet`, `home.address`, and
  `home.modifiers {roofLeakMultiplier, electricFactor, kitchenRepairs}` (the quirk effects for the life tasks).
  `extras` holds strings like `garden-beds:2`, `coop`, `pet:dog`. `lifestyle` adds `garden`. Customization is charged
  line by line from savings then checking (month −1, category 'lifestyle'); Move in refuses if the total exceeds cash.
  Where: `phases/design/houseModel.js`.
- 2026-10-02, task 38, shared living: 07 §4 allows houseGen or buildingGen "depending on the style"; the picker always
  uses houseGen (`variant: 'shared'`), so Honolulu's highrise family still gets a house. `home.shared` adds `address`,
  `room {id, label, sqft, view, closet, bath, noise}`, `effects {social, noise, choresHours, softened}` and roommate
  `age`; `lifestyle` adds `choresHours`. Roommate noise is 0, 0.5 or 1 before softening. Where: `phases/design/sharedModel.js`.
