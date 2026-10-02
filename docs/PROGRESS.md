# Progress log

Append-only. Each task adds a `## Task NN — <title>` section with `attempt started` / `done` lines and notes
(see `TASK_PROTOCOL.md` §1 and §8). Newest at the bottom.

## Setup — spec and task queue (2026-09-27, interactive planning session)
- Wrote `docs/spec/` (00–12, 99, DEVIATIONS), `docs/TASK_PROTOCOL.md`, and `docs/OPEN_ITEMS.md`.
- Queued 57 tasks: `/home/sam/Documents/work/teaching/tasks/homesim_01_…_task.md` through `homesim_57_…_task.md`.
- Switched the scheduled task runner (`~/.local/bin/teaching-tasks-run.sh`) from Fable 5 to `claude-opus-5-5`.
- No code exists yet. Task 01 builds the scaffold around the existing `docs/` folder (keep it as is).

## Task 01 — Project scaffold
- attempt started 2026-09-30T13:28:32-10:00
- done 2026-09-30T13:32:52-10:00
- Added: `.gitignore`, `package.json`, `CLAUDE.md`; `app/index.html`, `app/admin.html`; `app/styles/{tokens,base,components}.css`;
  `app/src/{main,config,firebase-config,types}.js`; `app/src/util/{escape,format}.js`; `app/src/ui/{dom,screens,header}.js`;
  placeholder screens for intake/plan/paperwork/design/life/login; `app/src/admin/adminMain.js`; `tools/serve.py`;
  `tests/unit/format.test.js`.
- Verified:
  - `node --check` on every file under `app/src`: OK. `npm test`: 6/6 pass.
  - `python3 tools/serve.py` + `curl /` returned the shell HTML; `curl -I /src/main.js` → `text/javascript; charset=utf-8`;
    `/index.html` has `Cache-Control: no-store`.
  - `chromium --dump-dom` showed `data-ready="1"` and "Coming in task 11."; no console errors logged for `/` or `/admin.html`.
  - `t01-light.png` (`?theme=light`): light gray page, white header with Fraunces title and a 1–4 stepper
    (Plan · Paperwork · Design · Live), centered card with a blue INTAKE pill, "About you", "Coming in task 11."
  - `t01-dark.png` (`?theme=dark`) and `t01-osdark.png` (`--force-dark-mode`): the same layout on dark slate, readable
    ink, both identical, so the OS media query and data-theme blocks agree.
  - `t01-admin.png`: ADMIN pill and "Admin console — coming in task 52" (first shot wrapped as an h1, changed to h2, re-shot).
- Deviation: `node --test tests/unit/` fails on Node 25; `package.json` uses the glob `"tests/unit/*.test.js"` (DEVIATIONS.md).
- Notes for later tasks:
  - Firebase pinned to **12.19.0** (npm latest on 2026-09-30) in both import maps; task 03 only needs to vendor three.
  - Config values the spec left open, picked as reasonable defaults: `UNDERWRITING.roommates.agreementBonus` 0.1,
    `LIFE.defaults` exercise 4 / extra 0 / social 7 / deep 7 (the 09 §4 check: 25 h free), `LIFE.reducedMotionDayMs` 300.
    Gym and social-hour costs are per-location data (03), not config.
  - No `tools/check.sh` yet (task 02). It must use the test glob above.
  - The header stepper has no current step during intake (intake comes before Phase 1).

## Task 02 — Headless verification harness
- attempt started 2026-09-30T14:07:50-10:00
- done 2026-09-30T14:11:34-10:00
- Added: `tools/shoot.mjs` (CLI, steps, smoke, report), `tools/lib/cdp.mjs` (static server, Chromium launch with
  sandbox retry, CDP client with flattened sessions, page collector), `tools/check.sh`, `tools/smoke.txt`
  (boot, admin), `tests/e2e/example.json`, `app/favicon.svg`. Changed: `app/index.html` and `app/admin.html` (icon link),
  `CLAUDE.md` (Verification section, folder map, gotcha).
- Verified:
  - `node tools/shoot.mjs --path /index.html --out tools/shots/boot.png --wait-ready` → exit 0, about 2 s.
    `boot.png`: dark slate page, header with the Fraunces "Home & Life Sim" title and the 1–4 stepper (Plan · Paperwork ·
    Design · Live), centered card with the INTAKE pill, "About you", "Coming in task 11." Nothing clipped or overlapping.
  - `smoke-admin.png`: the same dark background, no header, a card with the ADMIN pill and "Admin console — coming in task 52".
  - `e2e-example.png` (from `tests/e2e/example.json`): the intake card with an injected probe input that reads "Pāhoa"
    and has a focus ring; click, type, Enter, change and the theme `goto` asserts all passed.
  - Broken page (temporary `app/dev-broken.html`, deleted afterwards):
    ```
    shoot /dev-broken.html @ 1366x768
      ✗ [exception] Error: deliberately broken page
        at http://127.0.0.1:34001/dev-broken.html:2:21 (/dev-broken.html:2)
      · [shot] tools/shots/broken.png
    ✗ FAIL: 1 error        (exit 1)
    ```
  - WebGL probe `{"eval":"!!document.createElement('canvas').getContext('webgl2')"}` → `true` with the spec flags as they
    are. The renderer is "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)…), SwiftShader driver)".
  - Failure paths: a failed assert exits 1 (and 0 with `--allow-errors`); `waitFor` a missing element times out and
    exits 1; a smoke file with a 404 line and a malformed line reports both, still runs the remaining lines, and prints
    "smoke: 2/4 passed … failed: missing, bad". No `/tmp/homesim-shoot-*` profiles or Chromium processes are left over.
  - `bash tools/check.sh` → "check: OK (syntax 18 files · tests · data skipped · smoke) in 4s".
- Deviations: none. (The favicon is an addition, not a departure: without it every page logged a same-origin 404 for
  `/favicon.ico`, which correctly fails the run.)
- Notes for later tasks:
  - `Log.entryAdded` lines with source `network` are dropped on purpose. Network failures come from the Network domain
    and count only on the same origin, so offline Google Fonts or gstatic never fail a run.
  - `--timeout` applies to each wait (load, readiness, waitFor) and to the Chromium launch, not to the whole run.
  - `goto` waits for readiness only when `--wait-ready` is set. Add `{"waitReady":true}` after it otherwise.
  - Smoke runs lines one after another (about 1 s each). If it gets slow with dozens of screens, run contexts in parallel
    inside `runSmoke`.
  - `click` falls back to `el.click()` when the center point hits another element (overlays, modals) and says so in
    the report. Treat that note as a hint that something may be covering the target.

## Task 03 — Vendor libraries and import maps
- attempt started 2026-09-30T16:07:50-10:00
- done 2026-09-30T16:09:55-10:00
- Added: `app/vendor/` (three 0.186.1 + OrbitControls + BufferGeometryUtils, nspell 2.1.5, dictionary-en 4.0.0,
  vader-sentiment 1.1.3, each with its license; `VERSIONS.md`), `app/src/dev/{flags,galleries,vendorCheck}.js`,
  `tests/unit/vendor.test.js`. Changed: `app/src/main.js` (`?dev=<gallery>` hook, uses `devAllowed()`),
  `app/styles/components.css` (`.dev-vendor*`), `tools/smoke.txt` (vendor line), `CLAUDE.md` (Vendor section, folder map),
  `docs/spec/DEVIATIONS.md`.
- Firebase: `npm view firebase version` is still 12.19.0, so both import maps were already correct; no change.
- Verified:
  - `npm test`: 8/8 pass (nspell: house ✓, hosue ✗ with "house" suggested; VADER compound 0.898 / −0.866).
  - `node tools/shoot.mjs --path "/index.html?dev=vendor" --wait-ready --out tools/shots/vendor.png` → OK, no console errors.
    `vendor.png`: dark card "Vendor check", left a navy WebGL canvas with an orange cube lit from above (three distinct face
    shades), right "three.js r186 · OrbitControls loaded", nspell list "Teh ✗ → Ten, Eh, Meh" in red and quick/brown/fox ✓
    in green, VADER lines with compound 0.898 and −0.866. `vendor-light.png` (`&theme=light`): same layout, readable.
  - `bash tools/check.sh` → "check: OK (syntax 21 files · tests · data skipped · smoke) in 5s" (smoke 3/3).
- Deviations: three r186 ships no `three.module.min.js`, so it's an esbuild minified bundle of `three.module.js` at the
  same path; vader-sentiment is Apache-2.0, not MIT (DEVIATIONS.md).
- Notes for later tasks:
  - Gallery contract: `dev/galleries.js` maps name → lazy import; module exports `mount(root)`, sets ready, may return cleanup.
    `main.js` treats `?dev=1` as the (future) dev panel, anything else as a gallery name; unknown names fall through to the game.
  - `main.js` statically imports `dev/galleries.js`, which only holds lazy loaders, so login/intake still don't pull in three.
  - nspell suggestions for "Teh" don't include "The" (Hunspell ranks by edit distance); task 26's spell checker may want
    a small common-typo map on top.
  - Loading the dictionary: `fetch(new URL('../../vendor/dictionary-en/index.aff', import.meta.url))` from a browser module.

## Task 04 — State, store, saving, seeds, dev panel
- attempt started 2026-09-30T18:07:50-10:00
- done 2026-09-30T18:12:27-10:00
- Added: `app/src/util/{rng,dates}.js`, `app/src/state/{schema,migrate,summary,store,persistence}.js`,
  `app/src/persistence/local.js`, `app/src/dev/{seeds,devPanel}.js`, `app/src/ui/saveStatus.js`,
  `tests/unit/{rng,dates,state,persistence}.test.js`, `tests/e2e/persist.json`. Changed: `app/src/main.js` (real store +
  local persistence, seed mode, `__homesim`, dev panel), `app/src/types.js` (State meta/account/player fields),
  `app/styles/components.css` (`.dev-panel`, `.btn-small`, save-indicator colors), `tools/smoke.txt` (fresh, devpanel), `CLAUDE.md`.
- Verified:
  - `npm test`: 22/22 pass (rng determinism + distribution of uniform/int/chance/normal; Jan 2033 = 31 days, Feb = 28,
    Jan 1 2033 = Saturday; initial state validates, broken state reports phase/cents/stage/array errors; every seed validates;
    migrate pass-through / future refused / chained steps; store clone + updatedAt + checkpoint flag; persistence with a fake
    clock: checkpoints 5 s apart with the newest replacing the queued one, drafts at 0 s and 30 s during 50 s of typing,
    pagehide and visibilitychange flush, summary only on the first save; local adapter round trip and quota → status `error`).
  - `node tools/shoot.mjs --path /index.html --steps tests/e2e/persist.json` → OK: update jobTitle/hours via `__homesim.update`,
    reload, both persisted in state and in `homesim:v1:save:local-anon` (saved by the pagehide flush inside the 5 s gap).
  - Dev panel actions (ad hoc steps): Load seed "fresh" → intake screen; Jump to life → Live placeholder, stepper ✓✓✓ + 4.
  - `bash tools/check.sh` → "check: OK (syntax 32 files · tests · data skipped · smoke) in 8s" (smoke 5/5).
  - `smoke-devpanel.png`: dark Plan placeholder, stepper on 1 Plan; bottom-left dashed-orange Dev panel with "Saved ✓" in green,
    phase/seed selects, Jump, Load seed, Download JSON, red Reset, info "local-dev · phase plan · month 0". Nothing overlaps.
  - `smoke-fresh.png`: About you intake placeholder, no dev panel. `t04-devpanel-light.png`: same panel readable in light theme.
- Deviations: none. (`summarize` also accepts `home.locationName` / `choice.locationName` if later tasks store them; it
  falls back to `choice.locationId`.)
- Notes for later tasks:
  - Task 05: replace `ANON_USER` in `main.js` with the account provider; call `persistence.saveNow('account-created')` for new saves.
  - Task 10–15: add the other 04 §8 seeds (`plan-tight`, `plan-rich`, `plan-after-denial`) with `afterIntake()`.
  - Task 11: put `renderSaveStatus(ctx.persistence.status)` into the header's `.save-indicator` slot (header still renders an empty span).
  - The persistence adapter may resolve `{ok:false, code, message}` instead of throwing; the policy treats it as a failure.
  - Net worth treats a home's price as `home.purchasePriceCents` (or `choice.snapshot.priceCents`); the ledger task should keep one of those.

## Task 05 — Login and registration (local mode)
- attempt started 2026-09-30T20:07:51-10:00
- done 2026-09-30T20:12:18-10:00
- Added: `app/src/accounts/{provider,local}.js`, `app/styles/login.css`, `tests/unit/accounts.test.js`, `tests/e2e/register.json`.
  Changed: `app/src/accounts/ui/login.js` (real welcome screen), `app/src/main.js` (provider → login → load/create save;
  logout; `ANON_USER` gone), `app/src/ui/header.js` ("Playing as" + Log out), `app/index.html` (login.css),
  `tests/e2e/persist.json` (registers first, save key from `__homesim.user.uid`), `tools/smoke.txt` (`boot` → `login`), `CLAUDE.md`.
- Verified:
  - `npm test` incl. 5 new account tests: `ab` rejected, `TestKid1` → `testkid1`, class code format, register/login/logout,
    remember → localStorage session restored by `init()`, duplicate username, wrong password, unknown user, bad class code.
  - `node tools/shoot.mjs --path "/index.html?theme=light" --steps tests/e2e/register.json` → OK (register testkid1 / password123 /
    demo → intake, save in localStorage, Log out → login, session cleared, log in again → intake, reload stays signed in).
  - `tests/e2e/persist.json` → OK. `bash tools/check.sh` → "check: OK (syntax 34 files · tests · data skipped · smoke) in 8s" (5/5).
  - `t05-login-1366.png`: centered card, left sunset illustration (sky gradient, sun, lava ridge, green hills, cream house,
    palm), right title, orange tagline, intro, pill tabs with Log in selected, two fields, Show toggle, keep-me checkbox, green
    Log in button, "Forgot your password?"; "Local mode" pill below. Nothing clipped.
  - `t05-register-1366-dark.png`: dark card, Create account tab selected, 2×2 grid (username/class code, password/confirm) with
    hints, green button. Readable.
  - `t05-register-errors-1024.png` (1024×640, light): "ab" + "short" + "NOPE" submitted → red borders and red-dot errors under
    username and password; everything fits with room to spare, no page scroll.
  - `t05-login-error-1024.png`: password shown via Hide/Show, red alert "Username or password doesn't match.", forgot-password
    text expanded. Fits 1024×640.
  - `e2e-register-intake.png`: header "Playing as testkid1" + Log out at right, About you placeholder.
- Deviations: none. `uid = 'local-' + first 16 hex of SHA-256("homesim:<username>")` (stable per username).
- Notes for later tasks:
  - `AccountError` also carries `field` (username/password/confirm/classCode or null); the login UI puts field errors inline
    and the rest in the alert box. Task 50's Firebase provider should set `field` too (e.g. taken username → 'username').
  - `selectProvider({firebaseMode})` always returns local for now; task 50 adds the Firebase branch there.
  - Login has no seed (no state); its smoke line is `login /index.html`. Seeds still bypass login as `local-dev`.
  - `window.__homesim` now also has `accounts` and `user`. e2e scripts that need a player should register through the UI
    (see persist.json) since a fresh profile lands on login.
  - Loose end for task 54/55: in headless shots the ʻokina in body text ("Hawaiʻi") renders with extra space around it,
    which looks like a fallback glyph (IBM Plex Sans may lack U+02BB). Worth checking on a Chromebook.
  - The "Log out" text sits a pixel or two low in its 44 px button; cosmetic.

## Task 06 — Money and loan math
- attempt started 2026-09-30T22:07:52-10:00
- done 2026-09-30T22:10:06-10:00
- Added: `app/src/finance/{money,loans}.js`, `tests/unit/{money,loans}.test.js`. Changed: `app/src/util/format.js`
  (re-exports `formatMoney` from `finance/money.js`), `app/src/config.js` (`FINANCE.fha`: 3.5% min down, 1.75% upfront
  MIP, 0.55%/yr MIP), `CLAUDE.md` (folder map + Finance helpers section).
- Verified:
  - `npm test`: 43/43 pass. New: $300,000 @ 6.5% / 360 = 189620 ($1,896.20); $100,000 @ 6% / 360 = 59955 ($599.55);
    0% = principal ÷ n (rounded up); schedules for four loans sum principal to the loan and end at balance 0, first-month
    interest $1,625.00; totalInterest = payments − principal; PMI $270,000 @ 0.6% = $135; FHA $400,000 → down $14,000,
    upfront MIP $6,755, loan $392,755, MIP $180.01/mo, 3.5% floor; construction reserve $400,000 @ 7% × 9 months = $10,500;
    card $1,000 @ 24.99% on minimums = 76 months, $947.90 interest; a $25-flat minimum on $10,000 @ 29.99% = Infinity;
    mulRate half-away rounding incl. 1005 × 0.1 → 101 and negatives; dollarsToCents on 12 good inputs, float drift
    (1.005 → 101) and 21 bad inputs → null; assertCents/sumCents/pctOf/clampCents; format.js delegates.
  - `bash tools/check.sh` → "check: OK (syntax 36 files · tests · data skipped · smoke) in 8s" (smoke 5/5). No screens, no shots.
- Deviations: none. `formatMoney` takes `{showCents}` per the task and keeps `{cents}` as an alias (existing tests use it).
- Notes for later tasks:
  - `pmt` rounds to the nearest cent, so the final amortization row is a few dollars larger than the rest; the life sim
    (task 44) should pay `min(payment, balance + interest)` the same way.
  - FHA annual MIP is on the full financed loan (base + upfront MIP), simplified per 05 §4.
  - `cardPayoff` with `minRule: {floorCents: 2500, pct: 0}` gives a pure "$25 minimum" example if task 30 wants 05 §6's wording;
    the default rule is max($25, 1% + interest) (09 §6).
  - `pctOf` returns a decimal ratio (for DTI/utilization), not cents; use `mulRate` for "x% of y cents".

## Task 07 — Location schema, validator, and the five Hawaiʻi places
- attempt started 2026-10-01T00:08:02-10:00
- done 2026-10-01T00:14:32-10:00
- Added: `app/src/data/{enums,sanity,validate}.js`, `app/src/data/locations/{hawaii,cities,towns,index}.js`
  (cities/towns are empty arrays), `tests/unit/locations.test.js`, `docs/DATA_SOURCES.md`. Changed: `CLAUDE.md`
  (folder map + Location data section).
- Verified:
  - `node --test tests/unit/locations.test.js`: 7/7 (zero errors, **zero warnings**, unique ids, 03 §1 order, enum
    counts, Pāhoa condo n/a + HPIA lava required, validator catches 8 kinds of breakage, sanity miss = warning only).
  - `bash tools/check.sh` → "check: OK (syntax 43 files · tests · data 7 files · smoke) in 8s" (smoke 5/5). No new screens.
  - Web research (WebSearch) checked house/condo medians, HUD FY2026 FMRs, Hawaiʻi County and Honolulu FY26 tax rates,
    HO-3 and HPIA ranges, HECO/HELCO 2025 rates, USGS lava zones; status per figure is in DATA_SOURCES.md.
  - Sanity table (reads plausibly: Puna cheapest, Honolulu condo affordable but house dear, Kona/Waimea priciest):

    | id | 1BR rent | house | condo | property tax | HO-3 / yr | required hazard / yr |
    |---|---|---|---|---|---|---|
    | pahoa | $1,400 | $400,000 | n/a | 0.54% | $1,100 | lava $4,000 (HPIA) |
    | hilo | $1,550 | $565,000 | $350,000 | 0.55% | $1,500 | none |
    | kailua-kona | $2,100 | $1,050,000 | $600,000 | 0.57% | $1,800 | none |
    | waimea | $1,950 | $1,195,000 | $650,000 | 0.58% | $1,700 | none |
    | honolulu | $2,100 | $1,160,000 | $535,000 | 0.31% | $1,400 | none |
- Deviations: none. Judgment calls (in DATA_SOURCES.md): Waimea uses a town estimate ($1.195M) because the Kamuela ZIP
  median (~$1.6M) includes the Mauna Lani/Mauna Kea resorts; Kona uses a town figure under the North Kona district median.
  Pāhoa sewer = `cesspool` (typical existing home); its build site work includes a septic system.
- Notes for later tasks:
  - `validateLocation(loc)` / `validateLocations(list)` → `{errors, warnings}`; messages start with the id. It also errors
    on unaccented "Hawaii/Oahu/Pahoa/Kilauea/lanai" in name/fullName/hook/blurb, so keep diacritics in tasks 08–09 text.
  - `SANITY` already has bands for all 20 ids (Brooklyn build = null, Yellow Pine rent = null); `GENERAL` holds
    utilities/groceries/monthsToBuild guards. Condo bands exist only for Honolulu, Brooklyn and Miami (per 03 §5).
  - The Pāhoa HO-3 base ($1,100) is the non-fire policy; fire + lava come from the required HPIA add-on. Task 10/24 cost
    math should add required hazardCoverage on top of HO-3 as 04 §3 says.
  - Hurricane coverage is optional everywhere in Hawaiʻi; task 24 may want to pre-check it as "recommended".

## Task 08 — City and suburb locations
- attempt started 2026-10-01T02:07:50-10:00
- done 2026-10-01T02:12:17-10:00
- Added: `app/src/data/locations/cities.js` (7 records + exported `CAD_USD = 0.71`). Changed: `tests/unit/locations.test.js`
  (2 new tests), `docs/DATA_SOURCES.md` (city global notes, CAD rate, 7 sections, sources), `CLAUDE.md` (Location data note).
- Verified:
  - `node --test tests/unit/locations.test.js`: 9/9 (12 records in 03 §1 order, zero errors, **zero warnings**; Brooklyn
    build n/a; Halifax CAD with asOf 2026-09 and the Canadian-dollar blurb line; Katy MUD + flood; Vegas Ninth Island + 4
    cooling months; Chattanooga fiber; Miami special assessments; cross-place checks below).
  - `bash tools/check.sh` → "check: OK (syntax 43 files · tests · data 7 files · smoke) in 8s" (smoke 5/5). No new screens.
  - WebSearch checked: 1BR rents and house medians for all seven, Miami-Dade condo median and HO-3 average, Katy component
    tax rates and MUD range, Halifax benchmark price, rents and 2025–26 rate, Bank of Canada CAD/USD (Sept 2026).
  - Summary table (sanity-read against Hawaiʻi: Brooklyn rent ,750 > Honolulu ,100; Katy tax 2.45% > Las Vegas 0.60%;
    Miami HO-3 ,000 is the highest of all 12; Katy/Chattanooga houses cheapest; Seattle and Brooklyn tie Hawaiʻi's top tier):

    | id | 1BR rent | house | condo | property tax | HO-3 / yr | hazard add-on / yr |
    |---|---|---|---|---|---|---|
    | seattle | $1,975 | $950,000 | $550,000 | 0.88% | $1,300 | earthquake $1,000 (optional) |
    | brooklyn | $3,750 | $1,450,000 | $925,000 | 0.85% | $2,000 | flood $1,200 (optional) |
    | miami | $2,450 | $680,000 | $400,000 | 1.75% | $5,000 | flood $900 (optional, zone-required) |
    | katy | $1,400 | $375,000 | $250,000 | 2.45% | $3,200 | flood $750 (advised) |
    | las-vegas | $1,350 | $475,000 | $265,000 | 0.60% | $1,300 | earthquake $500 (optional) |
    | chattanooga | $1,250 | $340,000 | $275,000 | 0.95% | $1,900 | flood $600 (optional) |
    | halifax | $1,325 | $400,000 | $320,000 | 1.05% | $1,280 | flood $285 (optional) |
- Deviations: none. Judgment calls (in DATA_SOURCES.md): Katy tax uses the new-buyer full rate (~2.45% incl. MUD), not
  Ownwell's capped-homestead median (~1.6%); Halifax rent uses asking rent (new lease), not CMHC's sitting-tenant average.
- Notes for later tasks:
  - Halifax figures are stored in USD already (CAD × 0.71); `currency` is for display ("converted from CAD at …").
    `CAD_USD` is exported from `cities.js` if a UI wants to show the rate.
  - Miami HO-3 includes windstorm (Florida practice), so there is no separate hurricane add-on there; Katy likewise.
  - Avoid "U.S." inside blurbs: the validator's sentence counter splits on ". " and would count an extra sentence.
  - Brooklyn `transport.mode` is 'transit' ($135 MetroCard); task 10's cost engine should not add car costs there.

## Task 09 — Small-town and rural locations
- attempt started 2026-10-01T04:07:51-10:00
- done 2026-10-01T04:12:59-10:00
- Added: `app/src/data/locations/towns.js` (8 records). Changed: `tests/unit/locations.test.js` (3 new tests),
  `docs/DATA_SOURCES.md` (town global notes, 8 sections, sources), `CLAUDE.md` (Location data note).
- Verified:
  - `node --test tests/unit/locations.test.js`: 12/12 (all 20 in exact 03 §1 order, zero errors; town specifics;
    cross-place: Clarksdale has the cheapest house and rent, Brooklyn and Honolulu are in the top 4 house prices).
  - One validator **warning** by design: Montpelier house $450,000 is above the 03 §5 band (330–420K); cited to the
    2025 sales medians ($470,500–514,500, Hickok & Boardman) in DATA_SOURCES.md.
  - `bash tools/check.sh` → "check: OK (syntax 43 files · tests · data 7 files · smoke) in 8s" (smoke 5/5). No new screens.
  - WebSearch checked: house medians for all eight, rents for Marquette/Bisbee/Homer, Montpelier tax rate, Valentine tax,
    Yellow Pine winter road (Jan–May 2026 landslide closure) and population, Ascend WV still open for Elkins in 2026.
  - Summary table, all 20 (sanity-read: Clarksdale cheapest by far; Brooklyn top for rent and house; Honolulu and the
    Kona/Waimea pair next; towns mostly cheapest except Montpelier and Homer; Valentine and Miami/Katy insurance high):

    | id | 1BR rent | house | condo | property tax | HO-3 / yr | hazard add-on / yr |
    |---|---|---|---|---|---|---|
    | pahoa | $1,400 | $400,000 | n/a | 0.54% | $1,100 | lava $4,000 (HPIA, required) |
    | hilo | $1,550 | $565,000 | $350,000 | 0.55% | $1,500 | none required |
    | kailua-kona | $2,100 | $1,050,000 | $600,000 | 0.57% | $1,800 | none required |
    | waimea | $1,950 | $1,195,000 | $650,000 | 0.58% | $1,700 | none required |
    | honolulu | $2,100 | $1,160,000 | $535,000 | 0.31% | $1,400 | none required |
    | seattle | $1,975 | $950,000 | $550,000 | 0.88% | $1,300 | earthquake $1,000 (optional) |
    | brooklyn | $3,750 | $1,450,000 | $925,000 | 0.85% | $2,000 | flood $1,200 (optional) |
    | miami | $2,450 | $680,000 | $400,000 | 1.75% | $5,000 | flood $900 (optional) |
    | katy | $1,400 | $375,000 | $250,000 | 2.45% | $3,200 | flood $750 (advised) |
    | las-vegas | $1,350 | $475,000 | $265,000 | 0.60% | $1,300 | earthquake $500 (optional) |
    | chattanooga | $1,250 | $340,000 | $275,000 | 0.95% | $1,900 | flood $600 (optional) |
    | halifax | $1,325 | $400,000 | $320,000 | 1.05% | $1,280 | flood $285 (optional) |
    | yellow-pine | n/a | $300,000 | n/a | 0.50% | $2,200 | none |
    | marquette | $1,050 | $295,000 | $230,000 | 1.60% | $1,300 | none |
    | montpelier | $1,400 | $450,000 | $275,000 | 2.10% | $1,200 | flood $1,500 (zone-required) |
    | elkins | $750 | $195,000 | n/a | 0.65% | $1,100 | flood $700 (zone-required) |
    | clarksdale | $650 | $85,000 | n/a | 1.30% | $2,200 | flood $650 (optional) |
    | bisbee | $850 | $260,000 | n/a | 0.75% | $1,400 | none |
    | valentine | $700 | $175,000 | n/a | 1.40% | $3,000 | windstorm $400 (optional) |
    | homer | $1,250 | $475,000 | $300,000 | 1.10% | $1,500 | earthquake $900 (optional) |
- Deviations: none. Judgment calls (DATA_SOURCES.md): condo n/a in Elkins, Clarksdale, Bisbee, Valentine (kept in
  Marquette, Montpelier, Homer); Clarksdale house uses a move-in-ready $85K, not Zillow's $46K ZHVI; Valentine tax 1.40%
  sits between the gross levy and Ownwell's after-credit bills; Elkins keeps Ascend WV in present tense ("As of 2026").
- Notes for later tasks:
  - Yellow Pine `gymMonthlyCents` is 0 (no gym); task 10/43 should treat a 0 cost as "not available", not free.
  - Yellow Pine commutes assume remote or local work (all ~10 min); `apartment`/`condo` commute values exist only
    because the validator requires them for every type.
  - `condoInsuranceAnnualCents` is filled even where condos are n/a (validator requires it); ignore it there.
  - Montpelier and Elkins flood add-ons are zone-required but `requiredForMortgage: false` for the typical home, like Brooklyn.

## Task 10 — Cost engine, affordability colors, lifestyle metrics
- attempt started 2026-10-01T06:07:50-10:00
- done 2026-10-01T06:11:32-10:00
- Added: `app/src/data/homeTypes.js`, `app/src/data/metrics.js`, `app/src/finance/costs.js`, `app/src/finance/affordability.js`,
  `app/src/finance/grid.js`, `tests/unit/costs.test.js` (14 tests). Changed: `app/src/data/locations/index.js`
  (`DATA_VERSION = 1`), `CLAUDE.md` (Plan numbers section, folder map).
- Verified:
  - `node --test tests/unit/costs.test.js`: 14/14. Hand-calculated lines for Hilo apartment/shared/condo, Pāhoa house
    (HPIA lava line) and Pāhoa build (project $502,500, upfront $140,630); P&I cross-checked with the closed-form formula in
    Python. PMI on at 10%, off at exactly 20%. classify boundaries (⅓ → green, ⅕ → cyan, upfront = cash not red,
    monthly = income → yellow). N/A cells; 100 cells; every cell's lines sum to its totals.
  - `bash tools/check.sh` → "check: OK (syntax 48 files · tests · data 9 files · smoke) in 8s" (smoke 5/5). No new screens.
  - `plan-comfortable` ($4,200/mo, $20,000 cash) status counts: **red 52, green 16, yellow 15, cyan 9, na 8**. Samples
    (upfront / monthly): Hilo apartment $3,150 / $1,755 yellow; Hilo shared $1,625 / $910 green; Brooklyn apartment
    $7,550 / $3,920 yellow; Clarksdale house $12,150 / $1,101 green; Elkins shared $875 / $528 cyan; Kailua-Kona house
    $137,600 / $7,406 red; Honolulu build $398,555 / $8,010 red.
  - Plausibility: every Hawaiʻi purchase and build is red (a $20K savings can't cover 10% down anywhere there); every
    Hawaiʻi apartment is yellow and every shared room green. Clarksdale is green/cyan for rent and its house; Brooklyn is
    the only place where even a shared room is a stretch. All purchases except Clarksdale's house are red only because
    of upfront cash, which is the lesson. No data looked wrong, so DATA_SOURCES.md is unchanged.
- Deviations: none. Judgment calls: the required-hazard premium is its own monthly line (`hazard`), not folded into
  insurance; build insurance scales against the house median (or the project cost if houses are n/a); temporary housing
  uses the room rent, else apartment rent, else $0; garden values round to the nearest half star; the apartment/condo
  garden note says "lānai" in Hawaiʻi and "balcony" elsewhere.
- Notes for later tasks:
  - Table (task 12): `buildGrid(state)` returns the same object while income, cash and DATA_VERSION are unchanged, so
    recolor only when it changes. `STATUSES` (affordability.js) is the legend in order; `tableAssumptions()` is the note.
    Column headers and tooltips are `HOME_TYPE_LIST[i].header` / `.explainer`.
  - Detail panel (task 15): `cell.cost.upfront/monthly` lines carry `note`; build cells also have `cost.project`
    (lot, construction, site work, project, loan). `cell.metrics` has `kind` (stars/bar/number) and `max`.
  - `cellCost(loc, type, {...FINANCE, downPaymentPct})` already handles other down payments (paperwork/underwriting).
  - Bump `DATA_VERSION` in `data/locations/index.js` whenever any location figure changes.

## Task 11 — Intake screen and app header
- attempt started 2026-10-01T08:07:51-10:00
- done 2026-10-01T08:12:18-10:00
- Added: `app/src/phases/intake/intakeModel.js` (pure rules: validateIntake, parseMoneyField, parseHours, checkName,
  payRates/payLine, applyIntake, INTAKE_MESSAGES), `app/styles/intake.css`, `tests/unit/intake.test.js` (8 tests),
  `tests/e2e/intake.json`. Changed: `phases/intake/intakeScreen.js` (real screen), `ui/header.js` (save status,
  disabled Portfolio button, responsive labels, `el.destroy()`), `main.js` (passes persistence, destroys the old header
  on re-render/logout), `config.js` (`INTAKE` limits), `components.css` (header), `login.css` (moved header-user
  rules out), `index.html` (intake.css), `tools/smoke.txt` (`intake` line), `CLAUDE.md`.
- Verified:
  - `node --test tests/unit/intake.test.js` 8/8; `bash tools/check.sh` → "check: OK (syntax 49 files · tests · data 9 files · smoke) in 10s" (smoke 6/6).
  - e2e `intake.json` (seed=fresh): 4 field errors + summary + focus on first bad field; $450 → range message; valid
    "$3,200.50"/40/"8,000" → one-liner "$38,406 … $18.46 per hour" → Continue → phase 'plan', player.* and
    savingsCents 800000, stepper "Plan" current, "Saved ✓", localStorage phase 'plan'. `register.json` and `persist.json` still pass.
  - `t11-empty.png` (1366 light): form card left (name prefilled "dev", hours 40, $ prefix, "hrs" suffix), cream net/gross
    card right with a green/striped pay bar; header title, 4 unhighlighted steps, "Saved ✓", disabled Portfolio, "Playing as dev", Log out.
  - `t11-errors.png`: red borders + "!" messages on name/income/hours/savings, red "4 boxes need a fix" bar beside Continue;
    the card's bottom edge just touches 768 (page scrolls slightly; fine outside the life phase).
  - `t11-filled.png`: all fields filled, blue one-liner "That's about $38,400 per year take-home, or $18.46 per hour."
  - `t11-dark.png`: same layout in dark; good contrast, green Continue, readable explainer.
  - `t11-1024-errors.png` / `t11-1024-plan.png` (1024×700): no overlap; lead hides at short heights; step labels collapse
    to numbers except the current one ("1 Plan"); "Playing as" hides, username + Log out stay.
- Deviations: none.
- Notes for later tasks:
  - The ʻokina in a typed name ("Kalāʻau") renders with visible side spacing in headless Chromium; probably the Plex
    Google Fonts subset lacks U+02BB and a fallback font is used. Worth checking in task 54/55 (maybe add
    `unicode-range` fallback or the latin-ext subset).
  - Task 17: pass `onPortfolio` to `renderHeader` in `main.js` and the button enables itself.
  - `applyIntake` only sets `finances.savingsCents` while phase is 'intake' (intake runs once).

## Task 12 — The Phase 1 affordability table
- attempt started 2026-10-01T10:07:53-10:00
- done 2026-10-01T10:12:48-10:00
- Added: `app/src/phases/plan/table.js` (DOM built once, `update(grid, view)` recolors; roving tabindex),
  `phases/plan/tableModel.js` (pure: cellKey, deniedKeys, cellAriaLabel, upfrontText/monthlyText, isHiddenStatus,
  moveFocus, firstVisible), `app/styles/plan.css`, `tests/unit/planTable.test.js` (5 tests), `tests/e2e/plan-keys.json`.
  Changed: `phases/plan/planScreen.js` (real screen), `dev/seeds.js` (plan-tight, plan-rich, plan-after-denial),
  `index.html` (plan.css), `tools/smoke.txt` (4 plan lines), `CLAUDE.md`.
- Verified:
  - `node --test tests/unit/planTable.test.js` 5/5; `bash tools/check.sh` → "check: OK (syntax 51 files · tests · data 9 files · smoke) in 14s" (smoke 10/10).
  - e2e `plan-keys.json` (seed=plan-comfortable): focus roving cell → ArrowRight (r0 c1) → ArrowDown (Hilo shared,
    aria-label "Hilo, shared room: upfront $1,625, monthly $910, comfortable") → Enter opens the placeholder row under
    Hilo and sets plan.expanded → End/Home → Esc closes, clears expanded, focus returns to the cell → hide toggle
    hides every red/n/a cell. intake/persist/register e2e still pass.
  - `t12-plan-comfortable.png` (1366 light): numbers bar ($4,200/mo, $20,000, ⅓ $1,400, ⅕ $840), 5-chip legend +
    hide toggle on a second line, sticky header, Hawaiʻi rows: apartments yellow Stretch, shared green, purchases red, Pāhoa condo gray "Not available"; notes under the frame.
  - `t12-plan-tight.png` / `t12-tight-1024-scrolled.png` (1024×700, scrolled): mostly red/yellow; header row and place column stay put; no page scroll.
  - `t12-plan-rich.png`: cyan rents, green/yellow Hawaiʻi purchases, red only for Waimea/Honolulu builds.
  - `t12-dark.png`: dark tints with bright borders and light ink; all five statuses legible.
  - `t12-plan-after-denial.png`: cash $8,950, red "Denied last time" pill on Hilo apartment.
  - `t12-keys-open.png`: blue focus ring on Hilo shared, gray placeholder row "Hilo · Shared room Details coming in task 15." with "Close (Esc)".
- Deviations: none. Judgment calls: with "Hide homes I can't afford" on, red **and** n/a cells hide (striped empty
  slot), and rows/regions with nothing left hide too; column explainers are CSS hover tooltips (aria-hidden, the
  cells' aria-labels already carry the type); clicking an open cell again closes it.
- Notes for later tasks:
  - Task 15: replace the `detail` callback in planScreen.js (it receives `{cell, location, homeType}`); the table
    inserts its return value in a full-width row after the cell's row. Esc/close already restore focus via `table.focusCell(key)`.
  - Red cells are still focusable/openable so the panel can explain why (D12); "Choose" must stay disabled there.
  - Uppercase region label "HAWAIʻI" shows the same ʻokina fallback spacing noted in task 11 (task 54/55).

## Task 13 — 2D preview backgrounds and landmarks
- attempt started 2026-10-01T12:07:57-10:00
- done 2026-10-01T12:14:52-10:00
- Added: `app/src/phases/plan/preview2d/palette.js` (VIEW, BIOME_PALETTE for all 17 biomes, paletteFor),
  `preview2d/landmarks.js` (all 20 landmark drawings + landmarkDescription, LANDMARK_KEYS),
  `preview2d/backgrounds.js` (sky, terrain, vegetation, plant, mailbox, fence, car, busStop, catchmentTank, people;
  re-exports landmark), `preview2d/index.js` (renderPreviewSVG, captionText; placeholder home per type),
  `app/src/dev/gallery2d.js`, `tests/unit/preview2d.test.js` (6 tests). Changed: `dev/galleries.js` (gallery2d),
  `styles/components.css` (.dev-g2d-*), `tools/smoke.txt` (gallery2d line), `CLAUDE.md`.
- Verified:
  - `node --test tests/unit/preview2d.test.js` 6/6 (all 100 cells: starts with <svg, viewBox, title, desc, no
    NaN/undefined/Infinity; deterministic; seed changes scenery; escaping; n/a sign; catchment only in Pāhoa).
  - `bash tools/check.sh` → "check: OK (syntax 56 files · tests · data 9 files · smoke) in 18s" (smoke 11/11).
  - `t13-hawaii.png` (1600x1400, house): Kīlauea low dark shield with a white steam plume; Maunakea broad blue-gray
    shield with snowcap and domes; Hualālai cone over a blue ocean band; Kohala green hills with mist bands; Lēʻahi
    crater ridge with Waikīkī towers and ocean. Palms, ʻōhiʻa with red blossoms, banana, ferns; Pāhoa has a catchment tank.
  - `t13-cities.png`: Space Needle + snowy Rainier; dense Manhattan skyline (Empire State spire, One WTC) over a river;
    white/teal Miami towers, wide teal bay and causeway; KATY water tower; Vegas mountains, pyramid, needle tower and
    gold-trim slabs with cacti; Lookout Mountain forested ridge with bluff and river; red/white lighthouse with beams and
    a row of colorful harbour houses. Bus stops in Seattle/Brooklyn/Honolulu/Halifax, cars elsewhere.
  - `t13-towns.png`: pine ridges; ore dock trestle on Lake Superior with a freighter; gold-domed capitol among hills;
    smooth layered blue Alleghenies; crossroads signpost with three blue guitars; Mule Mountains with white "B" and
    hillside houses; windmill on sandhill dunes; Homer glaciers and the spit.
  - First pass showed a thin pale sky line between landmark and ground in most scenes; fixed by starting the far ground
    band just above the horizon (`wave(H - 1, 1.5)`). Re-shot `t13-towns-all.png` (type=all): gap gone; Yellow Pine
    apartment/condo and Elkins/Clarksdale/Bisbee condos are grayed out with a "Not available here" sign.
  - `t13-hawaii-all-dark.png` (dark page): previews unchanged (the art is theme-independent), labels readable.
- Deviations: none. Judgment calls: landmark drawings live in `landmarks.js` (backgrounds.js re-exports `landmark`) to
  keep files under 400 lines; scenery (terrain, vegetation) is seeded per place, not per cell, so all five types of a
  place share one backdrop; gallery shows 20 places for one type (`&type=house` default, `&type=all` for all 100).
  Car vs. bus stop: bus stop when transport mode is transit/mixed or the transit metric is ≥ 4.
- Notes for later tasks:
  - Task 14: replace `placeholderHome()` in `preview2d/index.js` with `buildings.js`. The home stands on
    `GROUND = 238` centered at x 240; keep it within x 170–310 so the landmark stays visible. Props
    (`people`, `fence`, `mailbox`) are exported from backgrounds.js; the shared-room people currently overlap the door.
  - Gradient/filter ids are prefixed with a per-cell uid (`pv<hash>`), so many SVGs can be inlined on one page.
  - Task 15 can inline `renderPreviewSVG(...)` with innerHTML: every text node goes through escapeHtml.

## Task 14 — 2D preview homes by type and regional style
- attempt started 2026-10-01T14:07:52-10:00
- done 2026-10-01T14:17:53-10:00
- Added: `app/src/data/styleFamilies.js` (STYLE_FAMILY_DATA for all 16 families: 3–4 palettes {wall, trim, roof,
  accent}, house traits, apartment {floorsBySettlement, balconies, exteriorStairs, fireEscapes, rooftop, material,
  groundFloor}, condo {floorsBySettlement, townhomes/resort/glass, glassTint, crown}, vegetation, props; hillside and
  alaska variants; `styleFamily(key, variant)` merges a variant), `preview2d/shapes.js` (drawing primitives + GROUND),
  `preview2d/houses.js` (one house per family + hillside; `drawHouse` → {svg, porch}), `preview2d/buildings.js`
  (`drawHome`, apartment walk-up/mid-rise/tower, condo townhomes/low-rise/glass tower, shared = house + 3 figures,
  build lot), `tests/unit/buildings2d.test.js` (4 tests). Changed: `preview2d/index.js` (placeholder removed, uses
  drawHome; catchment tank for every type where water is catchment), `dev/gallery2d.js` (default `type=all`, 100 cells),
  `tests/unit/preview2d.test.js` (tank check now matches the tank lid, since #4f7a5a is also a plantation roof color), `CLAUDE.md`.
- Verified:
  - `node --test tests/unit/buildings2d.test.js tests/unit/preview2d.test.js` 10/10 (16 families complete; every
    house drawing clean; all 100 cells deterministic with 5 distinct homes per place; build sign, 3 shared figures,
    Honolulu condo tall vs Waimea low, Pāhoa tank on apartment/shared/house/build, none in Hilo).
  - `bash tools/check.sh` → "check: OK (syntax 60 files · tests · data 10 files · smoke) in 18s" (smoke 11/11).
  - `t14-hawaii.png` (1600x1800, all types): plantation homes on posts with lānai and ribbed metal roofs (Pāhoa blue, Hilo
    sage, different palettes), walk-ups with outdoor stairs and lānai walkways, catchment tanks in Pāhoa; Kona salmon
    stucco with lava-rock wall and plumeria, 4-floor resort condo; Waimea board-and-batten with stone chimney, townhome
    condos; Honolulu concrete tower on a parking podium, teal glass condo tower, modern small-lot house with carport.
    Pāhoa condo gray "Not available here".
  - `t14-cities.png`: Seattle mixed-use mid-rise with shops, slanted-crown tower, craftsman; Brooklyn brick walk-up with
    fire escapes and rooftop water tank, setback tower, brownstone row with stoop, build n/a; Miami deco low-rise, curved
    crown tower, pink deco house with porthole; Katy brick garden apartments, townhome condos, 2-story brick with garage
    and driveway; Las Vegas stucco complex, gold-glass tower with fin, tile-roof stucco house; Chattanooga brick block,
    balcony condo, wraparound-porch farmhouse; Halifax yellow walk-up, balcony condo, jellybean row.
  - `t14-towns.png`: Yellow Pine log cabin (shared) and A-frame (house) with woodpile, apt/condo n/a; Marquette
    foursquare with dormer and sandstone base; Montpelier white Cape with shutters and red barn, brick block, townhomes;
    Elkins farmhouse; Clarksdale pair of shotgun houses on piers; Bisbee hillside cottages with stairs; Valentine ranch
    with barn and grain bin; Homer metal-sided house with a boat on a trailer. Five n/a condos/apartments show the sign.
  - First pass: the five big-city condo towers were identical and Pāhoa/Hilo shared a palette. Fixed with per-family
    `glassTint`/`crown` and a palette index from `hashString(location.id)`; re-shot `t14-condo-cities.png` (5 distinct towers).
- Deviations: none. Judgment calls: condo traits (`condo` key) and `variants` added to the 08 §4 shape (spec shape lists
  only apartment); apartments with `material: 'brick'` use a brick tone instead of the palette wall; house cell draws the
  A-frame for mountain-cabin and shared draws the log cabin; shared uses the next palette so it differs from house.
- Notes for later tasks:
  - Task 34 (3D styles): reuse `styleFamily(key, variant)` palettes/traits; add 3D params next to them.
  - Task 15: `renderPreviewSVG` is final; inline it in the detail panel. Houses span about x 150–335 (ranch grain bin,
    hillside slope), wider than 170–310 but the landmark still shows.

## Task 15 — Cell detail panel and choosing a home
- attempt started 2026-10-01T16:07:51-10:00
- done 2026-10-01T16:16:25-10:00
- Added: `app/src/phases/plan/detail.js` (`renderDetail`: title + status badge + reasons + denied badge, 2D preview with
  the location hook as caption, Upfront/Monthly tables with each line's note (aria-describedby) and totals, 10 metrics with
  inline SVG icons + stars/bar/number + meaning, about this place with hazard chips, hazard notes and water/sewer notes,
  Choose this home), `phases/plan/detailModel.js` (pure: `detailTitle`, `utilityNotes`, `hazardLabel`, `chooseCheck`,
  `confirmText`, `choiceSnapshot`, `applyChoice`), `ui/modal.js` (`openModal` focus-trapped sheet with a modal stack,
  `confirmDialog` → Promise<boolean>), `ui/icons.js` (`icon(key)` inline SVGs), `tests/unit/planDetail.test.js` (4 tests),
  `tests/e2e/choose-home.json`, seed `plan-detail-open` + smoke line.
  Changed: `planScreen.js` (placeholder replaced; inline vs sheet via matchMedia, cached panel node, focus into the
  panel title and the frame scrolled so the clicked row sits under the sticky header; choose → confirm →
  `store.update(applyChoice, {checkpoint: 'home-chosen'})`), `table.js` (`lookup(key)`), `state/schema.js`
  (`freshPaperwork()` exported and used by createInitialState), `plan.css` (panel styles), `components.css` (modal),
  `tests/e2e/plan-keys.json` (asserts the real panel; End/Home now run after Esc since focus moves into the panel).
- Verified:
  - `bash tools/check.sh` → "check: OK (syntax 64 files · tests · data 10 files · smoke) in 21s" (smoke 12/12).
  - e2e `choose-home.json` ✓ (Pāhoa shared, green): focus moves to the panel title; panel totals equal the cell's
    Upfront/monthly text (both from cellCost); 10 metrics with 10 SVGs; Choose → confirm focuses "Not yet"; Esc closes it
    and returns focus to Choose; Choose → "Yes, start the paperwork" → phase 'paperwork', choice with snapshot (sums
    match), expanded null, fresh paperwork. `plan-keys.json` ✓.
  - `t15-hilo-apt.png` (1366×768): Hilo row under the header, panel below: "Apartment in Hilo" + Stretch badge + reason,
    Maunakea preview with caption, Upfront ,150 (deposit, first month, 0 fee) with notes, metrics column with icons,
    stars and noise/garage bars. No horizontal clipping; the rest scrolls inside the table frame.
  - `t15-yellowpine-apt.png`: "Not available here" badge, reason "There are no apartment buildings…", muted preview with
    the sign, "There are no prices…" instead of tables.
  - `t15-red.png` (Honolulu house, scrolled to the footer): Upfront 51,900, Monthly ,833 (P&I, PMI, tax, HO-3,
    utilities), hazard chips, water/sewer notes; Choose disabled with the red reason text.
  - `t15-sheet-900x700.png`: modal sheet over the dimmed plan, single column, title focused; `t15-inline-1024.png`
    (1024×768): inline two-column layout.
  - `t15-confirm.png`: confirm dialog over the panel. `t15-denied-dark.png` (seed plan-detail-open, dark): red
    "Denied last time" pill beside the status badge (first pass sat low; fixed with align-self) plus the retry note.
- Deviations: the inline panel also needs ≥ 720 px of height; shorter windows get the sheet (DEVIATIONS 2026-10-01).
  Judgment calls: the task's "900×700 shows the modal" holds through that height rule, while 04 §6's "≥ 900 px inline"
  still holds at normal heights. Confirm text varies by type (condo/house: mortgage + closing papers; build: construction
  loan + permits; build reads "You're choosing to build a new house in Hilo"). The snapshot also stores `status`. A denied
  cell can still be chosen (retry) but shows the badge and a note.
- Notes for later tasks:
  - Task 19 (paperwork): `state.choice = {locationId, homeTypeId, snapshot: {upfrontCents, monthlyCents, breakdown:
    {upfront, monthly}, status}, chosenAt}`; `freshPaperwork()` is in state/schema.js. The e2e waits 500 ms after confirming
    because the placeholder paperwork screen has no stable selector; tighten it once task 19 lands.
  - `ui/modal.js` is generic: `openModal({label, content, className, onClose, initialFocus})` stacks (only the top
    handles Esc/Tab/focus), restores focus to the opener. Reuse for the portfolio (17) and paperwork dialogs.
  - `ui/icons.js` `icon(key)` has the metric keys plus 'water' and 'hazard'; add more there.
  - `data/metrics.js` still carries emoji `icon` fields; the panel ignores them in favor of the SVGs.
