# Home & Life Sim — working guide

A browser game for the Life Skills course (grades 7–8, Pāhoa, Hawaiʻi Island). Students enter their class job's net
income and savings, pick a home from 20 places × 5 home types, do the real paperwork, design the home, then live
month by month from January 2033. Vanilla ES modules with an import map, no build step. It runs fully in local mode
(localStorage); Firebase is optional and teacher-configured. The spec is in `docs/spec/` (start with `00-overview.md`).
**Every task run follows [`docs/TASK_PROTOCOL.md`](docs/TASK_PROTOCOL.md).**

## Commands
- Serve: `python3 tools/serve.py` → http://127.0.0.1:1270 (`python3 tools/serve.py 8080` for another port)
- Test: `npm test` (= `node --test "tests/unit/*.test.js"`; Node 25 rejects a bare directory, see DEVIATIONS)
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
app/styles/                    tokens.css base.css components.css (+ one file per area: login.css intake.css)
app/src/main.js                boot (01 §5); error boundary; ?theme=light|dark
app/src/config.js              all tunables · firebase-config.js placeholder · types.js typedefs
app/src/util/                  escape.js format.js rng.js dates.js (pure)
app/src/finance/               money.js loans.js costs.js affordability.js grid.js (pure; see Finance helpers, Plan numbers)
app/src/state/                 schema.js migrate.js summary.js (pure) · store.js · persistence.js (save policy)
app/src/persistence/local.js   localStorage adapter (homesim:v1:save:<uid>, …summary:<uid>)
app/src/ui/                    dom.js (h, clear, qs) · screens.js (registerScreen, renderPhase) · header.js · saveStatus.js
app/src/dev/                   flags.js (devAllowed, getFlag) · galleries.js (?dev=<name> registry) · vendorCheck.js
                               seeds.js (fixtures) · devPanel.js (?dev=1)
app/vendor/                    three/ (+addons/) nspell/ dictionary-en/ vader/ · VERSIONS.md (pinned, licensed)
app/src/phases/<phase>/        one screen per phase (placeholders until their tasks)
app/src/accounts/              provider.js (AccountError, validation, selectProvider) · local.js (PBKDF2, homesim:v1:accounts/session)
                               ui/login.js (welcome screen: Log in / Create account tabs)
app/src/data/                  enums.js sanity.js (03 §5 bands) validate.js homeTypes.js metrics.js ·
                               locations/{hawaii,cities,towns,index}.js (pure)
app/src/admin/adminMain.js     placeholder (task 52)
tests/unit/                    node --test files importing ../../app/src/…
app/favicon.svg                tab icon (also keeps /favicon.ico 404s out of shoot reports)
tests/e2e/                     shoot.mjs step scripts (example.json, persist.json, register.json, intake.json)
tools/serve.py                 static server, port 1270 · tools/shots/ (gitignored)
tools/shoot.mjs lib/cdp.mjs    headless harness · check.sh · smoke.txt
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
  `tests/unit/state.test.js` validates every registered seed automatically. Current: `fresh`, `plan-comfortable`.
- Calendar: `util/dates.js` `monthLabel/monthName/daysInMonth/weekday (0 = Sunday)/dayLabel`. Jan 1, 2033 is a Saturday.
- Save indicator: `renderSaveStatus(persistence.status)` from `ui/saveStatus.js`; the header shows it.
- Intake (04 §1): rules in `phases/intake/intakeModel.js` (pure, DOM-free; limits in `config.INTAKE`); `applyIntake(s, player)`
  writes player.*, savings (only while phase is 'intake') and phase 'plan'. e2e: `tests/e2e/intake.json` with `?seed=fresh`.
- Header: `renderHeader(phase, {user, onLogout, persistence, onPortfolio})`; Portfolio stays disabled until `onPortfolio`
  is passed (task 17). main.js calls `header.destroy()` before re-rendering it.

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
- The OS on this machine prefers dark, so plain headless shots come out dark; pass `?theme=light` for light.

## Current status
See `docs/PROGRESS.md`.
