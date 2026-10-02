# Home & Life Sim — working guide

A browser game for the Life Skills course (grades 7–8, Pāhoa, Hawaiʻi Island). Students enter their class job's net
income and savings, pick a home from 20 places × 5 home types, do the real paperwork, design the home, then live
month by month from January 2033. Vanilla ES modules with an import map, no build step. It runs fully in local mode
(localStorage); Firebase is optional and teacher-configured. The spec is in `docs/spec/` (start with `00-overview.md`).
**Every task run follows [`docs/TASK_PROTOCOL.md`](docs/TASK_PROTOCOL.md).**

## Commands
- Serve: `python3 tools/serve.py` → http://127.0.0.1:1270 (`python3 tools/serve.py 8080` for another port)
- Test: `npm test` (= `node --test "tests/unit/*.test.js"`; Node 25 rejects a bare directory, see DEVIATIONS)
- Train the letter model: `npm run train:letters` (corpus → `app/src/letters/model.json`; `--dry` reports only)
- Check: `npm run check` (= `bash tools/check.sh`): syntax → unit tests → data imports → smoke. Run it before every commit.
- Shoot: `node tools/shoot.mjs --path /index.html --out tools/shots/x.png --wait-ready` (see Verification below)
- Stop the server with `pkill -f 'python3 tools/serve.py'` from a *separate* command (a pkill pattern that matches your
  own shell line kills the shell too).

## Key rules (01 §3–§4)
- **Pure modules** (`util/ data/ finance/ letters/ life/`, `state/{schema,migrate,summary}.js`, `phases/plan/preview2d/`,
  `phases/design/blueprint/{model,validate,cost,templates}.js`): no DOM, `window`, `localStorage`, `three` or network;
  relative imports only; importable from Node tests.
- three.js, the spelling dictionary and Firebase load lazily with `import()`; login, intake and the plan table never pull them in.
- Money is integer cents (format only at the UI edge with `util/format.js`); rates are decimals.
- Randomness is always seeded (`util/rng.js`, `seedFor(state.meta.seed, purpose, index)`). No `Math.random()` in game logic.
- `monthIndex` 0 = January 2033. IDs are kebab-case.
- State changes only through `store.update(fn, {checkpoint?})`.
- Build DOM with `h()` from `ui/dom.js`. Never put student-typed text into `innerHTML`; use `escapeHtml()` for SVG/HTML strings.
- Tokens live in `app/styles/tokens.css`; component classes are prefixed per area (`plan-`, `pw-`, `life-`…).
- Every tunable number lives in `app/src/config.js`, commented with its spec section.
- Storage keys start with `homesim:v1:`. Files stay under ~400 lines; exported functions get a JSDoc line.
- Every screen sets `document.body.dataset.ready = "1"` when rendered and clears it on unmount.
- Every new screen gets a seed in `app/src/dev/seeds.js` and a line in `tools/smoke.txt` (from task 02/04 on).
- Hawaiian words use the ʻokina and kahakō. All businesses and people are fictional.

## Verification (01 §8)
- **`tools/shoot.mjs`** drives headless Chromium over CDP with zero npm deps (plumbing in `tools/lib/cdp.mjs`). It starts
  its own static server on a free port, so you don't need `serve.py` running. Exit 1 on any console error, uncaught
  exception, `Log` error, same-origin 4xx/5xx or failed request, failed assert, or timeout.
  - Flags: `--path <url path>`, `--out <png>`, `--size WxH` (1366x768), `--wait-ready`, `--timeout <ms>` (20000, per wait),
    `--steps <json>`, `--allow-errors`, `--base <url>` (use a running server), `--keep-open` (leave the browser up; Ctrl+C),
    `--smoke <file>`.
  - Steps (JSON array): `{"click":css}` (real mouse at the center; `el.click()` when covered/zero-size), `{"type":[css,text]}`,
    `{"press":"Enter"}`, `{"wait":ms}`, `{"waitFor":css}`, `{"waitReady":true}`, `{"eval":js}` (prints JSON),
    `{"assert":js}`, `{"shot":png}`, `{"goto":path}`. `tests/e2e/example.json` uses every one.
  - Relative `--out`/`shot` paths resolve against the cwd; smoke shots always go to `HS/tools/shots/smoke-<name>.png`.
- **Readiness**: shoot waits for `body[data-ready="1"]` with `--wait-ready`, `waitReady` and in every smoke line. A screen
  that never sets it times out.
- **Smoke**: `node tools/shoot.mjs --smoke tools/smoke.txt` runs one browser, fresh tab + fresh browser context (empty
  storage) per `<name> <path>` line, and reports every failing line. Add a line for every new screen/seed.
- **Look at screenshots**: open the PNG with the Read tool and describe what you saw in PROGRESS.
- **WebGL**: the spec flags (`--use-angle=swiftshader --enable-unsafe-swiftshader`) give WebGL2 on SwiftShader
  (renderer "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))"). No extra flags are needed.
- External requests (Google Fonts, gstatic) never fail a run; only same-origin failures count.

## Folder map
```
app/index.html admin.html      entry pages (import map: three → vendor/, firebase/* → gstatic 12.19.0)
app/styles/                    tokens.css base.css components.css (+ one file per area: login.css intake.css plan.css portfolio.css forms.css paperwork.css letters.css)
app/src/main.js                boot (01 §5); error boundary; ?theme=light|dark
app/src/config.js              all tunables · firebase-config.js placeholder · types.js typedefs
app/src/util/                  escape.js format.js rng.js dates.js (pure)
app/src/finance/               money.js loans.js costs.js affordability.js grid.js · ledger.js (+ ledgerRecords.js
                               ledgerTotals.js) creditScore.js loanOptions.js buying.js build.js insurance.js creditCard.js underwriting.js (pure; see Finance helpers, Plan numbers, Ledger)
app/src/state/                 schema.js migrate.js summary.js (pure) · store.js · persistence.js (save policy)
app/src/persistence/local.js   localStorage adapter (homesim:v1:save:<uid>, …summary:<uid>)
app/src/ui/                    dom.js (h, clear, qs) · screens.js (registerScreen, renderPhase) · header.js · saveStatus.js ·
                               letterReport.js (renderLetterReport) · modal.js (openModal, confirmDialog) · icons.js · drawer.js (openDrawer) ·
                               portfolio/ (index.js openPortfolio + tabs; portfolioModel.js pure; settings.js applySettings;
                               agreementDoc.js registerAgreementDoc/agreementSchema)
app/src/forms/                 engine.js (renderForm) · fields.js (field kinds) · validate.js (pure rules + helpers)
app/src/dev/                   flags.js (devAllowed, getFlag) · galleries.js (?dev=<name> registry) · vendorCheck.js
                               seeds.js (fixtures) · sampleLetters.js · devPanel.js (?dev=1) · gallery2d.js (?dev=gallery2d) · formsGallery.js (?dev=forms) · lettersGallery.js (?dev=letters) · sceneGallery.js (?dev=scene)
app/src/three/                 scene.js sky.js terrain.js landmarks.js materials.js (browser only, import() lazily; see 3D scene)
app/vendor/                    three/ (+addons/) nspell/ dictionary-en/ vader/ · VERSIONS.md (pinned, licensed)
app/src/phases/<phase>/        one screen per phase (placeholders until their tasks)
                               paperwork/: paperworkScreen.js · flow.js (pure) · steps/ (index.js registry, one module per step)
app/src/accounts/              provider.js (AccountError, validation, selectProvider) · local.js (PBKDF2, homesim:v1:accounts/session)
                               ui/login.js (welcome screen: Log in / Create account tabs)
app/src/content/names.js       fictional people/businesses per region (pure, seeded)
app/src/letters/               types.js send.js score.js text.js allowlist.js spell.js grammar.js sentiment.js features.js
                               (pure) · model.json (task 27) · loadSpeller.js (browser, lazy dictionary)
app/src/data/                  enums.js sanity.js (03 §5 bands) validate.js homeTypes.js metrics.js styleFamilies.js ·
                               locations/{hawaii,cities,towns,index}.js (pure)
app/src/admin/adminMain.js     placeholder (task 52)
tests/unit/                    node --test files importing ../../app/src/…
app/favicon.svg                tab icon (also keeps /favicon.ico 404s out of shoot reports)
tests/e2e/                     shoot.mjs step scripts (example, persist, register, intake, plan-keys, choose-home, paperwork-flow …)
tools/serve.py                 static server, port 1270 · tools/shots/ (gitignored)
tools/shoot.mjs lib/cdp.mjs    headless harness · check.sh · smoke.txt
tools/letter-model/            corpus/<type>.json · logreg.mjs (pure LR math) · train.mjs (npm run train:letters)
docs/                          TASK_PROTOCOL, PROGRESS, OPEN_ITEMS, spec/
```

## Vendor (`app/vendor/`, see `VERSIONS.md`)
- Import `three` and `three/addons/…` by bare specifier (browser modules only). Pure modules import
  `../../vendor/nspell/nspell.js` and `../../vendor/vader/vader.js` by relative path; both also load in Node tests.
- nspell: `nspell(affText, dicText)`; the browser fetches `vendor/dictionary-en/index.{aff,dic}` (~550 KB), Node reads them with `fs`.
- VADER: `polarityScores(text) → {neg, neu, pos, compound}`.
- **Upgrading**: in a temp dir, `npm i three nspell dictionary-en vader-sentiment`, then
  - three: `npx -y esbuild node_modules/three/build/three.module.js --bundle --format=esm --minify --legal-comments=inline
    --outfile=app/vendor/three/three.module.min.js` (r186 has no prebuilt `.min.js`), and copy the two addons + LICENSE;
  - nspell / VADER: esbuild a one-line entry (`export { default } from 'nspell'`; VADER wraps
    `SentimentIntensityAnalyzer.polarity_scores` from `vader-sentiment/src/vaderSentiment.js`) with
    `--bundle --format=esm --platform=browser`; grep the output for `require(`/`node:` to be sure no Node built-ins remain;
  - Firebase: bump `<ver>` in the import maps of **both** `index.html` and `admin.html`.
  - Update `VERSIONS.md`, run `npm test` and the `?dev=vendor` shot.
- Dev galleries: add `name: () => import('./x.js')` to `dev/galleries.js`; the module exports `mount(root)` (sets ready,
  may return a cleanup) and gets a `tools/smoke.txt` line `<name> /index.html?dev=<name>`.

## Finance helpers (`app/src/finance/`, pure, integer cents, rates are annual decimals)
- `money.js`: `dollarsToCents(input)` (numbers, "3,200", "$3,200.50", "-$45"; null when unparseable) · `assertCents` ·
  `mulRate(cents, rate)` (the one rounding rule: half away from zero) · `sumCents(arr | ...n)` · `pctOf(part, whole)` →
  decimal ratio (0 if whole is 0) · `clampCents(c, min?, max?)` · `formatMoney(cents, {showCents})` (single source;
  `util/format.js` re-exports it; the old `{cents: true}` still works).
- `loans.js`: `pmt(p, rate, months)` (0% → ceil(p ÷ n)) · `amortizationSchedule` → `[{month, paymentCents, interestCents,
  principalCents, balanceCents}]` (last row absorbs rounding, ends at 0) · `totalInterest` · `pmiMonthly(loan, rate?)` ·
  `fhaLoan({priceCents, downPct?, annualRate?, months?})` (`config.FINANCE.fha`) · `constructionInterestReserve({loanCents,
  rate?, months, avgDrawnPct?})` · `cardPayoff({balanceCents, apr, minRule?})` → `{months, interestCents}`
  (`DEFAULT_MIN_RULE` = max($25, 1% + interest); Infinity if the minimum never covers interest).

## Ledger and credit (02 §2–§3, §6; 09 §6; `app/src/finance/`, pure)
**Money moves only through `finance/ledger.js`.** Every function mutates the state it's given (a `store.update` draft)
and returns a result, never a new state. Accounts `'checking' | 'savings' | 'card'`; a transaction's `amountCents` is +in /
−out, and on the card −amount = a purchase (balance owed up), +amount = a payment. Paperwork money uses month −1
(`PAPERWORK_MONTH`). Ids: transactions `t<n>`, recurring `r<n>`, loans `loan<n>`, agreements `ag<n>`, applications `app<n>`.
- Money: `post(s, {month, day?, label, amountCents, account, category})` → txn (never refuses; balances may go negative) ·
  `charge(s, account | [accounts], cents, {month, day?, label, category})` → `{ok, shortfallCents, txns}`; 'checking' draws
  checking → savings, 'savings' savings → checking, 'card' only the unused limit, or pass an order like
  `['checking', 'savings', 'card']`; **all or nothing** (short → nothing changes) · `transfer(s, from, to, cents, meta)` →
  `{ok, shortfallCents}` (category 'transfer'; to 'card' = card payment; from 'card' throws) · `available(s, account)` ·
  `accountValue(s, account)`.
- Recurring: `addRecurring(s, {label, amountCents, category, source, startsMonth, endsMonth?})` → item ·
  `updateRecurring(s, id, patch)` · `removeRecurring(s, id)` · `recurringFor(s, month)`.
- Loans: `openLoan(s, {kind, label, lender, principalCents, rate, termMonths, startMonth, priceCents, pmiCents?, escrow?})`
  (payment = `pmt`, `pmiUntilBalanceCents` = 78% of priceCents) · `payLoan(s, loanId, month)` → `{paymentCents,
  interestCents, principalCents, balanceCents, pmiDropped, paidOff}` or null; it only amortizes, **the cash is charged by
  the caller** (the housing recurring item). PMI drops at ≤ 78% and removes recurring items with `source: pmiSource(loanId)`
  (= `pmi:<loanId>`), so commit should tag the PMI line that way. The last scheduled payment clears rounding (matches
  `amortizationSchedule`). `closeLoan(s, id, month, reason)` (foreclosure).
- Records (`ledgerRecords.js`, re-exported): `addAgreement` (status 'pending') · `setAgreementStatus(s, id, status)` ·
  `addApplication(s, {kind, target, feeCents, at})` (pending; charge the fee separately) · `resolveApplication(s, id,
  {approved, reasons})` · `markUpfrontPaid(s, lineKey, cents)` (cellCost line keys: 'application', 'inspection',
  'appraisal', 'permit'…; stored in `paperwork.paidUpfront`) · `unpaidUpfront(s)` → snapshot upfront lines minus paid.
- Totals (`ledgerTotals.js`, re-exported; `state/summary.js` uses them): `cash(s)`, `netWorth(s)` (equity uses
  `home.purchasePriceCents`, else `choice.snapshot.priceCents`, else the open loans' `priceCents`) ·
  `ledgerSums(s)` (per-account sum of raw + compacted txns; `accountValue − ledgerSums` never changes) ·
  `compactHistory(s, {currentMonth?, keep = 24})` folds older lived months into `monthTotals` `{month, incomeCents,
  expenseCents, byCategory, byAccount}` (transfers excluded from income/expense); month −1 is always kept.
- `creditScore.js` (mutates `finances.credit`; each change logs `{month, delta, score, reasons}` in `history`, clamped
  300–850): `initialCredit()` · `recordInquiry(s, kind, month)` (−5; +5 back once it's > 12 months old) ·
  `monthlyUpdate(s, {allOnTime, missedCount, utilization, month, housingMissed?})` (+3 / +1 above 750, −10 / −25
  utilization, −60 per miss, streaks incl. `lateHousingStreak`) · `adjustScore(s, delta, reasons, month)` (e.g. foreclosure
  −150) · `utilization(s)`.

## Location data (03, `app/src/data/`, pure)
- `locations/index.js`: `LOCATIONS` (03 §1 order), `byId`, `REGION_LABELS`. Records follow 03 §2 exactly; money is cents
  (`usd(d)` helper inside each data file). All 20 records exist (`HAWAII`, `CITIES`, `TOWNS`). Unavailable cells: Pāhoa condo, Brooklyn build, Yellow Pine apartment +
  condo, and condo in Elkins, Clarksdale, Bisbee and Valentine. Montpelier's house price prints one cited sanity warning by design.
  Halifax money is stored in USD (CAD × `CAD_USD` 0.71, exported from `cities.js`); its `currency` is for display only.
  Don't write "U.S." in a blurb: the validator's sentence counter splits on ". ".
- `enums.js`: regions, settlements, biomes, `STYLE_FAMILIES` (16), `STYLE_VARIANTS`, `LANDMARKS` (20), `HAZARDS`,
  `COVERAGE_TYPES`, water/sewer/transport kinds, `HOME_TYPES`.
- `validate.js`: `validateLocation(loc)` / `validateLocations(list)` → `{errors, warnings}`; sanity-band misses
  (`sanity.js` `SANITY[id]`) are warnings. Every figure's source and verified/unverified status: `docs/DATA_SOURCES.md`.

## Plan numbers (04 §3–§6, pure)
- `data/homeTypes.js`: `HOME_TYPE_LIST` (column order: id, label, title, header, explainer, buying, utilityFactor, metrics
  adjustments, designMode), `HOME_TYPES_BY_ID`, `homeType(id)` (throws on unknown).
- `finance/costs.js`: `cellCost(location, typeId, config = FINANCE)` → `{available, naReason?, upfrontCents, monthlyCents,
  upfront: Line[], monthly: Line[], assumptions, project?}`; `Line = {key, label, cents, note}`; totals are the line sums.
  Pass `{...FINANCE, downPaymentPct: 0.2}` for other down payments. Also `buildProjectCost`, `requiredHazards`,
  `tableAssumptions()`, `pctText`. Required (`requiredForMortgage`) hazard premiums are a separate `hazard` line.
- `finance/affordability.js`: `classify(cost, {cashCents, incomeCents})` → `{status, icon, label, reasons}`; `STATUSES` = legend.
- `data/metrics.js`: `cellMetrics(location, typeId)` → 10 metrics `{key, label, icon, kind, value, max?, display, meaning}`.
- `finance/grid.js`: `buildGrid(state)` → `{incomeCents, cashCents, assumptions, groups[{region, label, rows[{location,
  cells[{locationId, homeTypeId, cost, status, metrics}]}]}]}`, memoized (same object) on income, cash, `DATA_VERSION`;
  `gridCells(grid)` flattens; `cashOf(state)` = checking + savings. Bump `DATA_VERSION` (locations/index.js) on data edits.

## State and seeds (02)
- New save: `createInitialState({uid, username, classCode, now})`; check with `validateState(s) → string[]`.
  A shape change bumps `STATE_VERSION` and adds `STEPS[oldVersion]` in `state/migrate.js` plus a test.
- Seeds: `dev/seeds.js` `seeds[name] = { phase, description, build(now) → state }` (or `addSeed`). Start from
  `baseState(now)`; `afterIntake(s, {netMonthlyIncomeCents, startingSavingsCents})` gives a plan-phase player.
  `tests/unit/state.test.js` validates every registered seed automatically. Current: `fresh`, `plan-comfortable`,
  `plan-tight`, `plan-rich`, `plan-after-denial` (denied Hilo apartment, $50 fee spent), `plan-detail-open` (same, Hilo
  apartment panel open), `portfolio-demo` (phase life, April 2033: Hilo house, mortgage with PMI, card, 11 bills,
  4 agreements, 2 scored letters, 3 applications, credit history), `paperwork-{apartment,shared,condo,house,build}-start`
  and `paperwork-apartment-cosigner` (built with `paperworkStart(now, {locationId, homeTypeId, income, savings})`),
  `paperwork-apartment-lease`, `paperwork-shared-agreement`, `paperwork-house-options`, `paperwork-pahoa-house-options`, the task 22 buyer seeds (earlier steps done via `finishSteps(s, ids, values)`;
  `SAMPLE_APPLICATION` = valid application answers for "Kai Mana").
- Calendar: `util/dates.js` `monthLabel/monthName/daysInMonth/weekday (0 = Sunday)/dayLabel`. Jan 1, 2033 is a Saturday.
- Save indicator: `renderSaveStatus(persistence.status)` from `ui/saveStatus.js`; the header shows it.
- Intake (04 §1): rules in `phases/intake/intakeModel.js` (pure, DOM-free; limits in `config.INTAKE`); `applyIntake(s, player)`
  writes player.*, savings (only while phase is 'intake') and phase 'plan'. e2e: `tests/e2e/intake.json` with `?seed=fresh`.
- Header: `renderHeader(phase, {user, onLogout, persistence, onPortfolio})`; main.js passes `onPortfolio` in every phase
  except intake. main.js calls `header.destroy()` before re-rendering it.
- Portfolio (task 17): `ui/portfolio/index.js` `openPortfolio({store, user, tab?, onClose?})` opens `ui/drawer.js`
  `openDrawer({label, title, content})` (left slide-over on the modal stack: focus trap, Esc, opener refocused).
  Tabs `accounts expenses agreements letters applications credit settings`; the open tab re-renders on every store
  change. Pure helpers in `portfolioModel.js` (`groupRecurring`, `loanProgress`, `letterList`, `creditGauge`,
  `creditHistory`, `whenLabel`); bands are `CREDIT.bands` / `creditBand(score)`. Settings write `state.settings` and
  `applySettings` mirrors them as `html[data-theme]` (absent = OS) and `html[data-reduced-motion]`; a dev `?theme=` wins
  until the player picks a theme. Restart = two `confirmDialog`s → `store.replace(createInitialState(user))` keeping settings.
  Dev: `?seed=portfolio-demo&open=portfolio&tab=<id>`; e2e `tests/e2e/portfolio.json`, `portfolio-restart.json`.

- Plan table (04 §5): `phases/plan/table.js` `createTable(grid, {onOpen, onClose})` → `{el, update(grid, {hideUnaffordable,
  denied, expanded, detail}), focusCell(key)}`; builds DOM once, recolors via `st-<status>` classes (plan.css sets
  `--st-accent/-bg/-line/-ink` per class; reuse them for status chips elsewhere). Pure rules in `tableModel.js`.
  e2e: `tests/e2e/plan-keys.json`, `tests/e2e/choose-home.json`. `lookup(key)` → the cell entry.
- Detail panel (04 §6): `phases/plan/detail.js` `renderDetail({cell, location, homeType, denied, mode, onClose, onChoose})`;
  pure rules + `applyChoice(s, cell, now)` (choice + snapshot, `freshPaperwork()`, phase 'paperwork') in `detailModel.js`.
  planScreen shows it inline when `(min-width: 900px) and (min-height: 720px)`, otherwise in a modal sheet. Seed `plan-detail-open`.
- Modals: `ui/modal.js` `openModal({label, content, className?, onClose?, initialFocus?})` → `{el, panel, close}` (focus
  trap, Esc/backdrop close, opener refocused, stacked so only the top modal handles keys); `confirmDialog({title, message,
  confirmLabel, cancelLabel})` → Promise<boolean>. Inline SVG icons: `ui/icons.js` `icon(key)`.
- 2D previews (04 §7, pure): `phases/plan/preview2d/index.js` `renderPreviewSVG({location, homeTypeId, seed?})` → SVG string
  (480×270, title/desc, caption chip, muted + "Not available here" for n/a cells). Layers: `backgrounds.js` `sky(biome, uid)`,
  `landmark(key)` (drawings in `landmarks.js`), `terrain/vegetation(biome, rng)`, props `mailbox fence car busStop
  catchmentTank people`; palettes in `palette.js`. The home: `buildings.js` `drawHome({location, homeTypeId, seed})`
  (apartment walk-up/mid-rise/tower, condo townhomes/low-rise/glass tower, shared = house + 3 figures, build lot), houses
  per family in `houses.js` `drawHouse(family, palette, opts)` → `{svg, porch}`, primitives + `GROUND` (238) in `shapes.js`.
  Gallery: `?dev=gallery2d&region=<r>&type=<id|all>` (default all 100); shoot at `--size 1600x1800` per region.
- Style families (08 §4, pure): `data/styleFamilies.js` `STYLE_FAMILY_DATA`/`STYLE_FAMILY_LIST`, `styleFamily(key, variant)`
  (merges `hillside`/`alaska`): palettes {wall, trim, roof, accent}, house traits, apartment + condo floorsBySettlement
  and traits, vegetation, props. Shared by 2D and 3D (task 34 adds 3D params).

## Forms (05 §2/§4, task 18; `app/src/forms/`)
A paperwork document is a schema. `renderForm(container, schema, {values, state, onChange, onSubmit, readOnly})` →
`{el, values(), validate(), submit(), destroy()}`. `onChange(values)` fires on every edit (the caller throttles drafts);
`onSubmit(values)` only fires when `validateForm` is empty (otherwise errors show, a "N fields need fixing" line appears and
the first bad field gets focus). Errors show on blur and on submit, tied with `aria-describedby` + `aria-invalid`. The header
shows "3 of 8 required done". `readOnly` renders values as text (the portfolio's Agreements tab uses it).
```js
{ id: 'rental-application', title: 'Rental application', intro: '…', submitLabel: 'Sign and submit',
  sections: [{ id: 'you', title: 'About you', intro?, fields: [
    { id: 'employer', kind: 'text', label: 'Employer', required: true, width: 'half', maxLength: 40, hint: '…' },
    { id: 'move-in', kind: 'month', label: 'Move-in month', from: 0, to: 5, required: true },
    { id: 'rent', kind: 'computed', label: 'Rent', format: 'money', compute: (values, state) => cents },
    { id: 'landlord', kind: 'text', label: '…', required: true, when: (values, state) => values.history === 'rented' },
    { id: 'init', kind: 'initials', label: 'Initial each clause', required: true, clauses: [{ id: 'c1', text: '…' }] },
    { id: 'q1', kind: 'question', label: '…?', answer: 'c', choices: [{ value: 'a', label: '$75', why: 'shown when wrong' }, …],
      explanation: 'shown when right', required: true },
    { id: 'signature', kind: 'signature', label: 'Signature', required: true },
  ] }] }
```
- Value kinds: `text textarea number currency(cents) select radio checkbox month(monthIndex) phone signature initials question`.
  Display kinds: `computed` (`compute`, `format`: 'money' | 'money-cents' | 'percent' | 'month' | fn), `info` (`text` string or
  array, `tone` note/teach/warn), `clauses` (`items`), `table` (`columns [{key, label, align, format}]`, `rows` array or fn).
- Rules on any value field: `required`, `requiredMessage`, `pattern` + `patternMessage`, `minLength/maxLength`, `min/max`
  (cents for currency, monthIndex for month), `validate(value, values, state) → message|null`, `default` (value or fn(state)),
  `when(values, state)` (hidden fields skip validation). Values: question = `{choice, tries, correct, firstTry, wrong[]}`,
  initials = `{clauseId: 'KM'}`, unparseable number/currency input = the raw string (fails validation).
- Signatures check against `state.player.characterName`, forgiving ʻokina/apostrophes, kahakō, case and spacing (students
  can't always type an ʻokina); dated `FORMS.signDate` ("December 2032"). Initials = `deriveInitials(name)` (every word and
  hyphen part: "Keʻala Kahananui-Akana" → KKA). Phones must be fictional 555-01xx (`PHONE_RE`).
- Pure helpers in `validate.js`: `validateField/validateForm/requiredProgress`, `computeField`, `formatValue`, `displayValue`,
  `deriveInitials`, `initialsMatch`, `sameName`, `visibleFields`, `initialValues`.
- Agreements: `ui/portfolio/agreementDoc.js` `registerAgreementDoc(type, (agreement, state) → schema)`; the portfolio renders
  `agreement.docType ?? agreement.type`'s schema read-only with `agreement.docValues`, else a generic Terms / What you filled
  in document. Paperwork steps (19+) should store `docType: <step id>` and register their schema there (static import).
- Gallery `?dev=forms` (`&fill=1`, `&mode=readonly`); e2e `tests/e2e/forms.json`, `tests/e2e/portfolio-agreement.json`.

## Paperwork (05 §1–§3, task 19; `app/src/phases/paperwork/`)
- `flow.js` (pure): `STEP_ORDER[type]` (05 §3 table), `appliesTo(s, id)` (co-signer letter when income < 2.5 × rent,
  credit letter when score < 660; `UNDERWRITING` in config), `stepsFor(s)`, `stepStatus(s, id)` (stored done/skipped/draft,
  else locked/todo), `checklist(s)`, `nextStep(s)`, `allDone(s)`. Non-letter steps unlock in order; `LETTER_STEPS` only
  need their prerequisite; results needs everything. `completeStep(s, id, {values, upfrontKey})` pays the snapshot's
  upfront line (`payFee` → `charge('savings')` month −1 + `markUpfrontPaid`, all or nothing) then marks done.
  `withdraw(s, now)` = attempt `withdrawn`, pending records voided/denied, choice null, phase plan (fees stay spent).
- `steps/index.js` `STEPS`/`step(id)`; each `steps/<id>.js` default-exports `{id, title, kind, upfrontKey?, schema?, mount?,
  complete?}`. Placeholders come from `steps/placeholder.js` ("Mark done" only with `?dev=1`). The screen renders
  'form' + `schema` with `renderForm` (drafts on change, read-only when done), otherwise `mount(container, {store, config,
  state, status, values, onDone, onDraft})`. e2e `tests/e2e/paperwork-flow.json`.
- A step's `complete(s, values, now)` pays its own fees (`payFee`/`completeStep`), calls `setStep(s, id, 'done', …)` and
  returns `{ok, shortfallCents}`. Signed documents: store `docType: <step id>` + full `terms` on the agreement and register
  the schema builder in `phases/paperwork/docs.js` (the portfolio imports it), so the doc rebuilds from the agreement alone.
- Renter steps (task 20): `steps/renterTerms.js` `renterTerms(s)` (landlord, contact, phone, unit, rent, deposit, first month,
  fee, roommates; seeded) + `gameIdField` / `partiesFields`. `lease.js` `lateFee(day)` (config `LEASE`), `leaseClauses`
  (10 apartment / 8 room), `trapQuestions`, `trapScore` → `options.leaseTrapScore`. `roommate-agreement.js`
  `roommateComfort(values)` → `options.roommateComfort` (−1…1). `move-in-payment.js` → `options.moveIn` (no charge).
  Applications: kinds 'rental' / 'room'. e2e `tests/e2e/renter-apartment.json` (on paperwork-apartment-start),
  `renter-shared.json` (on paperwork-shared-agreement).
- Buyer steps (task 21): `mortgage-application.js` (`mortgageSchema`, `estimatedGross`; complete = `recordInquiry` −5 +
  pending application kind 'mortgage', no money). `finance/loanOptions.js` (pure) `loanOptions(state)` → `{priceCents, score,
  tier, cashCents, grossCents, lavaZone, strictLava, fixedLines, fixedCents, feesCents, options[8], cheapestMonthlyKey,
  leastInterestKey}`; each option has rate (credit tier applied), down/loan/upfront MIP, P&I, PMI/MIP, housing, total
  interest, closing, fees, reserves, cash to close, `disabledReason`. `findOption(r, paperwork.options)`, `optionKey`,
  `programBlock` (lava/FHA/credit rules). `loan-options.js` (kind 'choice', mount) stores `paperwork.options.{program,
  downPaymentPct, termYears}`. Seeds `paperwork-house-options` (Katy), `paperwork-pahoa-house-options` (Lava Zone 1);
  `SAMPLE_MORTGAGE_APPLICATION`. e2e `tests/e2e/mortgage-house.json` (on paperwork-house-start).
- Buyer documents (task 22): pure `finance/buying.js` (`config.BUYING`): `hoaReport`, `inspectionFindings`/`inspectionReport`
  (`inspectorFinds`: thorough finds all, standard misses termite/sewer specialty items, budget also misses `hidden` ones),
  `creditAsk`/`repairCreditDecision`, `appraisalResult`/`canPayGap`/`sellerLowersDecision`/`resolvePurchase`,
  `closingDisclosure`/`flagRow`/`closingOutcome`; all seeded by `buyingRng(state, purpose)` (save + place + attempt).
  Stored in `paperwork.options`: `hoa`, `specialAssessment` (+ a 'special-assessment' line pushed into the snapshot's
  monthly breakdown, so `loanOptions` counts it), `inspection {inspectorId, feeCents, company, found, decision, credit}`,
  `missedFindings [{month, label, cents}]` (task 44 surprise repairs), `repairCreditCents`, `appraisal`, `purchase
  {priceCents, appraisedCents, gapCents, resolution}` (`loanOptions` lends on min(price, value), adds the gap, subtracts the
  credit), `closing {agreedRate, finalRate, errorFlagged, wrongFlags, extraMonthlyCents}`. Walking away calls
  `withdraw(s, now, reason)`. Seeds `paperwork-condo-hoa` (Miami), `paperwork-house-{inspection,appraisal,appraisal-low,closing}`
  (Katy). e2e `tests/e2e/buyer-house.json` (on paperwork-house-inspection).
- Builder steps (task 23): pure `finance/build.js` (`config.BUILD`): `tierOf`, `designBudgetCents(loc, tier)` (sq ft × cost/sq ft
  × 1.10), `projectCost(loc, {tierId, bidId, extraMonths})` (= cellCost with the tier's sq ft and the bid's price/months),
  `tierTable`, `projectFor(state)`, `refreshBuildSnapshot(state)` (rewrites `choice.snapshot` for tier/bid/utilities),
  `lotListing`, `contractorBids`/`contractorRisk`/`bidMonths`, `permitChecklist`, `utilityOptions`/`siteUtilityPlan`/
  `defaultUtilities`. Stored in `paperwork.options`: `land` (listing, seller, earnestCents, contingency; earnest paid →
  `paidUpfront['down-payment']`), `buildTier`, `designBudgetCents` (minus utility upgrades) + `designBudgetBaseCents`,
  `project`, `contractorId`, `bid`, `contractorRisk` (Bid A only), `permit`, `siteUtilities`. Application kind 'construction'.
  Seeds `paperwork-build-{loan,bids,permit,utilities}` (Pāhoa, Cozy, Bid B), `SAMPLE_BUILD_VALUES`. e2e
  `tests/e2e/builder-pahoa.json` (on paperwork-build-start). Form display fields have no `data-field`: assert on `.fm-form` text.
- Insurance (task 24): pure `finance/insurance.js` (`config.INSURANCE`): `policyKind(type)` renters/condo/home,
  `insuredValueCents`, `basePremiumMonthlyCents`, `quotes` (Basic/Standard/Premium), `addOns` (required = locked for
  buyers/builders; renters/condo pay `addOnFactor` of the dwelling price; `provider` = HPIA in Lava Zones 1–2), `hurricaneDeductible`
  (FL), `insuranceOffer(state)`, `policyMonthlyCents`, `outOfPocket(loss, quote)`, `choosePolicy(state, {quoteId, addOns},
  {stepId, insurer})` → `options.insurance` (+ `recurring` draft) and `options.deductibleCents`, snapshot insurance/hazard
  lines rewritten, pending agreement type 'insurance'. UI: `phases/paperwork/insuranceShop.js` `insuranceStep({id, title})`
  (the three steps are one-liners), `policySchema` (registered in docs.js). Seeds `paperwork-{renters,condo,house,build}-insurance`
  (Hilo, Miami, Katy, Pāhoa build). e2e `tests/e2e/insurance-katy.json`.
- Letters (task 25, 06 §1–§2): pure `letters/types.js` `LETTER_TYPES[id]` / `letterType(id)` (ids = the six letter step ids:
  prompt, tips, greeting/closing examples, `groups[{id, label, keywords, patterns?}]`, `targetWords {min, max}`, recipientRole),
  `letters/send.js` (`wordCount`, `lengthStatus` empty/short/ok/long, `recipientFor(s, id)` → `{name, org, line}` seeded,
  `sendLetter(s, {type, text}, now, {speller})` → `letters['L<n>']` + `paperwork.letterIds`), `letters/score.js` `scoreLetter`
  (real since task 28, see Letter scores below). UI `phases/paperwork/letterBox.js` `letterStep(id)` (the six
  step files are one-liners; complete = send + `setStep` done with `{letterId}`). Steps with `stayOnDone: true` stay on
  their done view after `onDone`; mount ctx has `onNext()`. `finishSteps` sends `dev/sampleLetters.js` text for letter
  steps. Seed `paperwork-letter` (Hilo cover letter). e2e `tests/e2e/letter.json`.
- Letter checks (task 26, 06 §3 steps 1–5, all pure but loadSpeller): `letters/text.js` `normalizeText` (NFC, curly
  apostrophes, ‘ between letters → ʻokina; length-preserving, every index points into it), `foldKey` (lowercase, no
  ʻokina/apostrophes/kahakō), `tokenize`, `splitLines`, `splitParagraphs`, `splitSentences` (lines split at `.!?`, keeps
  Mr./Dr./a.m./initials). `allowlist.js` `isAllowed(word)`. `spell.js` `createSpeller({aff, dic, extraWords})` → `{correct,
  suggest, check(text) → {misspelled [{word, index, suggestions ≤3}], rate, words}}` (skips numbers, URLs, ≤4-letter
  acronyms, capitals mid-sentence and on short greeting/signature lines). `grammar.js` `GRAMMAR_RULES` (19, each `{id,
  message, suggestion, weight, test}`) + `checkGrammar(text, {type})`. `sentiment.js` `analyzeSentiment(text)` →
  `{compound, label, sentences, negSentenceRate}`. `features.js` `FEATURE_NAMES` (15) / `FEATURE_RANGES` /
  `extractFeatures(text, type, {speller})` → `{vector, named, issues, sentiment, wordCount, groupsHit}`. Browser:
  `loadSpeller()` (promise, fetches `vendor/dictionary-en` once) / `loadedSpeller()` (sync, null until loaded); the
  letter box preloads it on mount. Node: `createSpeller` with `fs` (see `tests/unit/letterChecks.test.js`). e2e
  `tests/e2e/letter-checks.json` (on paperwork-letter).
- Letter model (task 27, 06 §4): `tools/letter-model/corpus/<type>.json` (14 per type, `{id, type, label, note, text,
  split?}`, one object per line) → `train.mjs` (same `extractFeatures`, fs speller, z-scored, L2 batch GD, stratified
  5-fold CV) → `app/src/letters/model.json` `{version, trainedAt, features, mean, std, weights, bias, cv, test, corpus,
  hyper}`. Retraining is deterministic. `tests/unit/letterModel.test.js` retrains and fails if model.json is stale, so
  rerun `npm run train:letters` after changing features, grammar rules or the corpus. A wrong required sign or CV < 0.80
  writes nothing (exit 1); fix the corpus, not the math.
- Letter scores (task 28, 06 §3 steps 6–7, §5): `letters/score.js` `scoreLetter(text, type, {speller})` → `{likelihood
  0–100, band, bandLabel, sentiment, wordCount, issues, features, contributions[{feature, value, effect, message}],
  modelVersion, spellChecked}`; `predict(vector)`, `bandFor(likelihood)` (`LETTERS.bands`, each with an st-* `status`),
  `needsScore`/`rescorePending(s, {speller})` (main.js rescores stubs and speller-less scores on boot), `issueExcerpt`.
  Messages live in score.js `MESSAGES` (negSentenceRate and lexicalVariety never show). UI `ui/letterReport.js`
  `renderLetterReport({text, score})` (text nodes only). Portfolio Letters tab shows it, hidden by
  `portfolioModel.letterRevealed` for the paperwork attempt in progress until `paperwork.lettersRevealed` or Results done.
  Gallery `?dev=letters` (strong/middling/weak `REPORT_SAMPLES`).
- Underwriting (task 29, 05 §7, pure): `finance/underwriting.js` `decide(state, {speller})` → decision records `{id
  (<kind>-<attempt>), kind lease|cosigner|roommates|mortgage|construction|credit-card, label, required, approved, probability,
  draw, hardFail, factors[{label, value, note}], reasons, terms}`; `terms.upfront`/`upfrontCents` is exactly what commit
  charges. Draw = `drawFor(state, kind)` (seedFor(meta.seed, 'decision', kind, plan.attempts.length)). Mortgages reuse
  `loanOptions`/`findOption` + `options.closing.finalRate`; construction's 680 floor uses `options.pulledScore`. The card
  offer is read from `paperwork.options.card = {accepted, autopay, pulledScore}` (the tier uses pulledScore). `homeApproved(decisions)`, `letterFor(state, stepId)`.
- Commit (task 29, 05 §8, pure): `phases/paperwork/commit.js` `commitPaperwork(state, decisions, now)` → `{approved,
  chargedCents, loan, recurring, card}`; approved → upfront charged (month −1), loan opened, bills added (`recurringFor`,
  living costs with source 'living'), agreements active, applications approved, attempt 'approved', `home` set, phase
  'design'; denied → agreements void, applications denied, earnest refunded if `options.land.contingency`, attempt
  'denied', choice null, `freshPaperwork()` (letters and fee transactions stay), phase 'plan'. The card opens either way.
  Seeds `paperwork-ready-{apartment,shared,condo,house,build}` (Results next; apartment draws a denial, the rest approve).
- Results (task 31, 05 §8): `steps/results.js` (mount) decides once after `loadSpeller()` → `paperwork.decisions` +
  `lettersRevealed` (checkpoint 'paperwork-results'), shows decision cards (chance, factors, reasons, letter reports in
  `<details>`), then the money; Continue/Back to planning runs `commitPaperwork`. Pure numbers in `resultsModel.js`
  `resultsSummary(state, decisions, {letters})` → `{approved, receive, payNow, monthly, loan, lease, insurance, cardTerms,
  ifYouDontPay, nextSteps}` (reuses commit's `recurringFor`; `tests/unit/results.test.js` checks it against commit). Seeds
  `results-approved-house`, `results-denied-apartment` (decisions pre-stored). e2e `tests/e2e/paperwork-apartment-full.json`
  (on paperwork-apartment-start; sets `meta.seed = 5` for an approving draw), `results-denied.json`.
- Credit card (task 30, 05 §6, 09 §6): pure `finance/creditCard.js` `offerFor(state, {score?})` (tiers in `CREDIT.card`; secured
  under 640 or 600), `minimumPayment(balance, interest)`, `cycle(card, {chargesCents, payFrom, autopay?})` → `{statementCents,
  interestCents, minimumCents, paidCents, carried, lateFeeCents, missed, balanceCents}` (interest only when
  `carriedLastMonth`; pure, the ledger moves are the caller's), `applyCycle`, `payoffExample(offer)`, `durationText`. Step
  `steps/credit-card-offer.js` (form; `cardSchema(terms)` also registered in docs.js): accept = inquiry −5 + pending
  'credit-card' application + pending agreement (docType 'credit-card-offer', `terms.attempt`) + `options.card = {accepted,
  autopay, pulledScore}`; decline = void agreement; one-time via `priorAnswer`. Seeds `paperwork-card-offer(-secured)`,
  `CARD_ACCEPT` values; e2e `tests/e2e/card-offer.json`.
- Names (05 §10): `content/names.js` (pure) `NAMES[region]` pools; `businessFor(s, kind)`, `peopleFor(s, purpose, n)`,
  `phoneFor(s, purpose)`, all seeded by save + place + attempt.

## 3D scene (08 §1–§3, task 32; `app/src/three/`, browser only)
- `scene.js` `createScene(container, {location?, biome?, landmark?, monthIndex, timeOfDay, interactive, seasons?, coastal?,
  homeTypeId?, seed?})` → `{scene, camera, renderer, controls, sky, terrain, info {calls, triangles}, nightFactor, season,
  setTimeOfDay(t), setSeason(mi), add, remove, frame(box3, {padding}), requestRender, start(fn(dt, s)), stop, dispose,
  firstFrame()}` or **null** when WebGL fails (the 2D preview + "3D isn't available" note is shown). Render on demand
  (controls, ResizeObserver, `requestRender`); the loop pauses when the tab is hidden. `frame` keeps the view direction, sets
  zoom limits (0.5–2.5×) and fits the sun's shadow camera. Pan is clamped to ±`SCENE3D.lotHalf`. Tunables: `config.SCENE3D`.
- `sky.js` `createSky({biome})`: gradient dome (ShaderMaterial), 700 stars, sun/moon discs, hemisphere + shadow-casting sun +
  moon light; `paletteAt(t, biome)` blends night/dawn/day (biome sky from preview2d `BIOME_PALETTE`)/dusk.
- `terrain.js` `createTerrain({biome, landmark, seasons, coastal, monthIndex, seed})` → `{group, setSeason, heightAt}`:
  per-biome `RECIPES` (ground, rolling, vegetation, extras urban/fence/lava/rocks/peaks), lot pad, water on the −X edge,
  landmark backdrop. Snow = white ground + hidden deciduous crowns; fall = recolored leaf materials.
- `landmarks.js` `addLandmark(batch, key, ctx)` for all 20 `LANDMARKS` (`LANDMARK_KEYS`).
- `materials.js`: `mat(color, opts)` (cached, flat-shaded), `ownMat` (uncached, for recoloring), `canvasTexture('siding'|'brick'|
  'shingle'|'metal')`, `texturedMat`, `createBatch()` → `add(geo, material, {x,y,z,rx,ry,rz,s,sx,sy,sz})` / `build({castShadow,
  receiveShadow})` (one merged mesh per material), `disposeMaterials()` (called by `dispose`).
- Gallery `?dev=scene&biome=&t=&month=&landmark=&loc=` shows calls/triangles vs the budget; `window.__scene` is the handle.
  Current scenes: 9–18 draw calls, ≤ 13.5k triangles.

## Gotchas
- `ui/screens.js` `renderPhase(container, ctx)` mounts `ctx.phase` if given (e.g. `'login'`), otherwise the store's phase.
- `main.js`: `?seed=` → `local-dev` user + fixture (saved at once, no login); otherwise `accounts.current()` or the login
  screen, and `accounts.onChange` starts the game on sign-in. Log out (header) flushes, detaches, signs out, shows login.
  `ctx` also carries `user`. `window.__homesim` = `{store, getState, update, seeds, version, persistence, accounts, user}`.
- A fresh profile lands on login: e2e scripts that need a player register through the UI first (see `tests/e2e/persist.json`).
- Accounts: `AccountError {code, message, field}`; friendly text lives in `accounts/provider.js` `MESSAGES`. The local
  provider takes `{local, session, crypto}` so Node tests use `globalThis.crypto` and a Map-backed storage shim.
- Checkpoints within 5 s of the last one are *queued*, not dropped; a reload in that window still saves through the
  `pagehide` flush. In unit tests pass `attach(store, adapter, {clock, events})` (see `tests/unit/persistence.test.js`'s fake clock).
- `store.replace(state)` swaps the whole state (seed load, reset) as a checkpoint. Listeners get `(state, {checkpoint, prev})`.
- `shoot.mjs` uses a top-level `await`: module-level `const`s it needs must be declared *above* that block (TDZ).
- three r186 has no `PCFSoftShadowMap` (warns and falls back); use `PCFShadowMap`.
- The OS on this machine prefers dark, so plain headless shots come out dark; pass `?theme=light` for light.

## Current status
See `docs/PROGRESS.md`.
