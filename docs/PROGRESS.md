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

## Task 16 — Ledger and credit-score model
- attempt started 2026-10-01T17:27:53-10:00
- done 2026-10-01T17:32:43-10:00
- Added: `app/src/finance/ledger.js` (post, charge, transfer, available, accountValue, recurring add/update/remove/
  recurringFor, openLoan, payLoan, closeLoan, pmiSource; re-exports the two below), `finance/ledgerRecords.js`
  (agreements, applications, markUpfrontPaid, unpaidUpfront), `finance/ledgerTotals.js` (cash, netWorth, ledgerSums,
  monthTotalsOf, compactHistory), `finance/creditScore.js` (initialCredit, utilization, adjustScore, recordInquiry,
  monthlyUpdate), `tests/unit/ledger.test.js` (13 tests), `tests/unit/creditScore.test.js` (6 tests).
  Changed: `state/summary.js` now re-exports cash/net worth from ledgerTotals (one definition); CLAUDE.md (Ledger section,
  folder map); DEVIATIONS.
- Verified:
  - `npm test` → "ℹ tests 115 · ℹ pass 115 · ℹ fail 0" (19 new: balances vs transactions invariant through mixed ops and
    compaction, checking→savings spill, all-or-nothing refusal, card limits, transfers, a full 360-month payoff matching
    `amortizationSchedule` row by row, PMI dropping at the first month ≤ 78% of price and removing its recurring line,
    compaction keeping month −1 + last 24 months, credit +3/+1/−10/−25/−60, inquiry recovery after 12 months, clamping
    at 300 and 850).
  - `bash tools/check.sh` → "check: OK (syntax 68 files · tests · data 10 files · smoke) in 21s" (smoke 12/12).
  - No screenshots: no UI in this task.
- Deviations: optional shape additions (paidUpfront, monthTotals.byAccount, extra loan fields), see DEVIATIONS.
  Judgment calls: functions mutate the draft and return results (store.update convention), not new states; charge is
  all-or-nothing (a partial payment would blur "missed payment"); payLoan only amortizes and doesn't move cash (the month
  sim charges the housing recurring item, then calls payLoan when it was paid); an inquiry is recovered when it's strictly
  more than 12 months old; the on-time bonus also resets lateHousingStreak.
- Notes for later tasks:
  - Task 19/31 (paperwork/commit): charge fees with `charge(s, 'savings', cents, {month: PAPERWORK_MONTH, …})` then
    `markUpfrontPaid(s, lineKey, cents)`; at commit charge `unpaidUpfront(s)`. Tag the PMI recurring item with
    `source: pmiSource(loan.id)` so payLoan removes it. Pass `priceCents` to openLoan (net worth falls back on it); better
    still, set `home.purchasePriceCents`.
  - Task 44 (month sim): `charge(s, ['checking','savings','card'], …)` for living/lifestyle/events, plain 'checking' for
    housing (never the card); a {ok:false} is a missed payment. Then `monthlyUpdate` with `utilization(s)` and
    `housingMissed`, and `compactHistory(s, {currentMonth})` at month end.
  - Task 17 (portfolio): `monthTotals` has income/expense/byCategory for months older than 24.

## Task 17 — Portfolio drawer and settings
- attempt started 2026-10-01T18:13:45-10:00
- done 2026-10-01T18:20:13-10:00
- Added: `app/src/ui/drawer.js` (openDrawer, left slide-over on the modal stack), `app/src/ui/portfolio/` (index.js
  tabs shell + `openPortfolio`, portfolioModel.js pure view model, accounts.js, records.js, credit.js, settings.js
  incl. `applySettings`, parts.js), `app/styles/portfolio.css`, `tests/unit/portfolio.test.js` (5 tests),
  `tests/e2e/portfolio.json`, `tests/e2e/portfolio-restart.json`. Changed: `main.js` (Portfolio button enabled after
  intake, settings → data-theme/data-reduced-motion, `?open=portfolio&tab=<id>`), `config.js` (`CREDIT.bands`),
  `creditScore.js` (`creditBand`), `dev/seeds.js` (`portfolio-demo`), `components.css` (old unused right-drawer CSS
  replaced), `index.html` (portfolio.css), `tools/smoke.txt`, CLAUDE.md, DEVIATIONS.
- Verified:
  - `npm test` → 120 pass, 0 fail. `bash tools/check.sh` → "check: OK (syntax 76 files · tests · data 10 files · smoke) in 22s", smoke 13/13.
  - `node tools/shoot.mjs --path '/index.html?seed=portfolio-demo&open=portfolio&theme=light' --steps tests/e2e/portfolio.json` ✓
    (asserts: picking Dark sets data-theme + settings.theme and keeps focus on the radio; Esc closes and focus returns to
    the Portfolio button; arrow keys move between tabs). Shots in tools/shots/t17/:
    - 1-accounts: cash $18,720.33 / net worth $61,831.38 tiles, bank, card with "⚠ 38% of the limit" chip, mortgage card.
    - 2-expenses: Housing / Utilities / Food / Transportation tables with per-category totals.
    - 3b-agreement-open: mortgage agreement, "✓ Active" chip, summary, terms and filled-in values, read-only note.
    - 4-letter-open: cover letter with To/Sent/score rows and the text on a plumeria card.
    - 5-applications: three cards with ✕ Denied / ✓ Approved chips, fee, date and reasons.
    - 6-credit / 8-credit-dark: 300–850 gauge in band colors, needle at 669, "Fair (580–669)", history newest first.
    - 7-settings: theme pills, two toggles, speed 1×/2×/4×, red Restart button.
    - smoke-portfolio-demo: the accounts tab in dark mode, readable.
  - `tests/e2e/portfolio-restart.json` ✓: Esc on the first confirm keeps the game; two confirms → phase intake, drawer
    closed, account kept, Portfolio disabled (shots 10-restart-confirm2, 11-after-restart show the confirm over the drawer and the intake screen).
- Deviations: `CREDIT.bands` (FICO-style ranges, not in the spec); restart keeps settings as well as the account. See DEVIATIONS.
- Notes for later tasks:
  - Task 18: replace the agreement detail key/value block in `ui/portfolio/records.js` `renderAgreements` with the read-only form render.
  - Task 28: the letter detail (`renderLetters`) is where the score report goes.
  - Tasks 42–46: read `settings.reducedMotion` (also mirrored as `html[data-reduced-motion]`), `longCareWindow`, `animationSpeed`.
  - The drawer re-renders its open tab on every store change; tab renderers must stay cheap and side-effect free.
  - Automatic expenses filter to the current month only in phase 'life'; elsewhere they list everything.
## Task 18 — Declarative form engine
- attempt started 2026-10-01T18:59:46-10:00
- done 2026-10-01T19:08:20-10:00
- Added: `app/src/forms/` (engine.js renderForm, fields.js 12 value kinds + 4 display kinds, validate.js pure rules and
  helpers), `app/styles/forms.css` (incl. print CSS), `app/src/dev/formsGallery.js` (`?dev=forms`, `&fill=1`, `&mode=readonly`),
  `app/src/ui/portfolio/agreementDoc.js` (registry + generic schema), `tests/unit/forms.test.js` (8 tests),
  `tests/e2e/forms.json`, `tests/e2e/portfolio-agreement.json`. Changed: `config.js` (`FORMS`), `index.html` (forms.css),
  `dev/galleries.js`, `ui/portfolio/records.js` (agreement detail = read-only form), `ui/portfolio/parts.js` (humanKey,
  valueText, kvOf moved here), `tools/smoke.txt`, CLAUDE.md (Forms section, folder map), DEVIATIONS.
- Verified:
  - `node --test tests/unit/forms.test.js` → 8 pass (every rule, kind messages, phone range, initials with ʻokina/hyphens/
    kahakō, signature matching, computed/format/table helpers, when() visibility, sample values valid).
  - `bash tools/check.sh` → "check: OK (syntax 81 files · tests · data 10 files · smoke) in 23s", smoke 14/14.
  - `tests/e2e/forms.json` ✓ (tab order follows visual order; submit marks 10 fields, focuses Employer, aria-describedby ids
    exist, aria-invalid set; bad phone and wrong signature messages; wrong answer shows explanation; filled form shows
    11 of 11 and submits; read-only has no inputs). `tests/e2e/portfolio.json` (task 17) still ✓. Shots in tools/shots/t18/:
    - 1-empty: all kinds in a two-column card, "0 of 10 required done", initials hint "Your initials: KKA".
    - 2-errors: red borders and ⚠ messages under each of the 10 required fields, focus ring on Employer.
    - 3-partial: phone "555-01xx range" message, signature "must match your name", 5 struck out with "Not quite" feedback.
    - 4-completed / 8-filled-dark: "✓ 11 of 11 required done", landlord field revealed, 05 highlighted green with "Correct".
    - 5-readonly: values as text, initials boxes, "Answer: $105 · Right after 2 tries", signature in script with date.
    - 6-portfolio-agreement / 7-portfolio-card-dark: Agreements detail as a read-only document (Terms tiles, What you filled
      in, signature "Kai Mana"), light and dark.
- Deviations: forgiving signature match; optional agreement `docType` (DEVIATIONS).
- Notes for later tasks:
  - Tasks 19–31: a step's `schema(state)` goes straight into `renderForm`; store values as the agreement's `docValues`, set
    `docType: <step id>` and `registerAgreementDoc(stepId, …)` in `ui/portfolio/agreementDoc.js` so the portfolio shows the
    real document. Question values carry `firstTry` for the lease "find the trap" score.
  - The "Sam Hand" font is NOT used for signatures (missing glyphs render invisible on this machine); script fallbacks only.

## Task 19 — Paperwork screen and step orchestrator
- attempt started 2026-10-01T19:45:49-10:00
- done 2026-10-01T19:51:31-10:00
- Added: `app/src/phases/paperwork/flow.js` (STEP_ORDER, LETTER_STEPS, STATUS_INFO, appliesTo, stepsFor, prerequisites,
  stepStatus, checklist, nextStep, allDone, upfrontLine, payFee, setStep, completeStep, withdraw), `steps/index.js`
  (registry, `step(id)`), `steps/placeholder.js` + 27 step modules (26 placeholders naming their task 20–30, plus
  `results` for task 31), `app/styles/paperwork.css`, `tests/unit/paperworkFlow.test.js` (5 tests),
  `tests/e2e/paperwork-flow.json`. Changed: `paperworkScreen.js` (the real screen), `dev/seeds.js` (`paperworkStart`
  + 6 seeds), `index.html` (paperwork.css), `tools/smoke.txt` (+6), CLAUDE.md, DEVIATIONS.
- Verified:
  - `node --test tests/unit/paperworkFlow.test.js` → 5 pass (orders per type match 05 §3, co-signer only in the cosigner
    seed, credit letter only below 660, registry covers every id, unlock rules, fee charged once and all-or-nothing,
    withdraw keeps fees spent and validates).
  - `bash tools/check.sh` → "check: OK (syntax 111 files · tests · data 10 files · smoke) in 31s", smoke 20/20.
  - `tests/e2e/paperwork-flow.json` on `paperwork-apartment-start` ✓ (Mark done ×6 in order, Results stays disabled until
    the last, then unlocks and gets focus; $50 application fee charged and marked paid; Esc on the confirm keeps
    paperwork; confirming → phase plan, choice null, one `withdrawn` attempt, fee still spent). `choose-home.json` still ✓.
  - Shots in tools/shots/t19/:
    - apartment-start: Apartment in Hilo, 7 steps (application, cover letter, renters insurance, lease, move-in, card, results), step 1 active.
    - apartment-cosigner: same plus "Letter: ask a co-signer" as step 3, 8 steps.
    - shared-start: Honolulu shared, 8 steps incl. roommate intro, roommate agreement, lease.
    - condo-start: Miami, 10 steps incl. HOA review, appraisal, condo insurance, closing disclosure; list fits at 1366×768.
    - house-start: Katy, 9 steps (no HOA, home insurance).
    - build-start (+ dark smoke shot): Pāhoa "New house", 9 steps land → loan → letter → bids → permit → utilities → insurance → card → results.
    - e2e-results-unlocked: 6 of 7 done, green check icons, Results active with the task 31 note.
    - e2e-withdraw-confirm: "Choose a different home?" dialog naming the $50 fee.
- Deviations: 'withdrawn' attempt outcome; appliesTo/prerequisites live in flow.js; withdraw denies pending applications (DEVIATIONS).
- Notes for later tasks:
  - Tasks 20–31: replace the placeholder by rewriting `steps/<id>.js` with a default export `{id, title, kind,
    upfrontKey?, schema?, mount?, complete?}`. A 'form' with `schema` is rendered by the screen (drafts saved on change,
    read-only once done); any other kind gets `mount(container, {store, config, state, status, values, onDone(values),
    onDraft(values)})`. Without `complete` the screen calls `completeStep` (pays the upfrontKey fee from the snapshot,
    marks done); with `complete(s, values)` you do the fee yourself (`payFee`) and may return `{ok:false, shortfallCents}`.
  - Fee keys used: application (rental/room), inspection, appraisal, permits (the build line is 'permits', not 'permit').
  - The screen only remounts a step when the active id or its finished/locked state changes; draft saves don't remount.
  - Task 31: results.js is the 'results' step; set it done (or commit) from there. Seeds `paperwork-ready-<type>` can use
    `completeStep` for every id in `stepsFor(s)` except results.

## Task 20 — Renter paperwork: applications, lease, roommate agreement, move-in
- attempt started 2026-10-01T20:31:47-10:00
- done 2026-10-01T20:40:39-10:00
- Added: `app/src/content/names.js` (NAMES pools per region, `businessFor`, `peopleFor`, `phoneFor`, `nameRng`,
  `regionOf`), `phases/paperwork/steps/renterTerms.js` (`renterTerms`, `gameIdField`, `partiesFields`, `variantOf`),
  `phases/paperwork/docs.js` (portfolio doc registration, `termsFromAgreement`), `tests/unit/renterPaperwork.test.js`
  (6 tests), `tests/e2e/renter-apartment.json`, `tests/e2e/renter-shared.json`. Rewrote steps `rental-application.js`
  (+ `applicationSchema`, `applicationStep(variant)`), `room-application.js`, `lease.js` (`lateFee`, `leaseClauses`,
  `trapQuestions`, `leaseSchema`, `trapScore`), `roommate-agreement.js` (`ROOMMATE_CHOICES`, `roommateComfort`,
  `roommateSchema`), `move-in-payment.js` (`moveInSchema`, `moveInTotal`). Changed: `config.js` (`LEASE`),
  `finance/ledgerRecords.js` (addAgreement keeps `docType`), `paperworkScreen.js` (passes `Date.now()` as complete's 3rd
  arg), `ui/portfolio/index.js` (imports docs.js), `dev/seeds.js` (`SAMPLE_APPLICATION`, `finishSteps`, seeds
  `paperwork-apartment-lease`, `paperwork-shared-agreement`), `tools/smoke.txt` (+2), `tests/e2e/paperwork-flow.json`
  (fills the three real forms instead of the dev button), CLAUDE.md, DEVIATIONS, OPEN_ITEMS.
- Verified:
  - `node --test tests/unit/renterPaperwork.test.js` → 6 pass (name pools/seeding, late fee $0 → $85 → $105, 10/8 clauses
    with initials errors "Clause 4 needs your initials, KM", application fee charged once + pending app + all-or-nothing
    when broke, room fee $25, lease agreement docType/terms/trap score with no money moved, portfolio rebuilds the lease
    schema from the agreement, roommate comfort 1 for best answers, move-in authorization charges nothing, states valid).
  - `bash tools/check.sh` → "check: OK (syntax 114 files · tests · data 10 files · smoke) in 33s", smoke 22/22.
  - e2e ✓: `renter-apartment.json` (apartment path on paperwork-apartment-start, letters/insurance/card via dev button,
    $50 fee only, wrong trap answers show explanations, trap score 1, results unlocked "6 of 7 done"),
    `renter-shared.json` (paperwork-shared-agreement: agreement, 8-clause room lease, move-in), `paperwork-flow.json`,
    `portfolio.json`, `portfolio-agreement.json`.
  - Shots in tools/shots/t20/ (1366×2400):
    - 1-rental-application: filled light form, parties block (ʻĀina Kai Rental Group, Analyn Domingo), ratio 2.7×, teach box, refs, "15 of 15".
    - 2-lease-trap-wrong: 10 initialed clauses; "Quiet hours" struck out with "Not quite. Quiet hours are about noise, not a deadline."
    - 3-lease-filled / 5-lease-readonly: all three correct with explanations; read-only shows "Right after 2 tries" etc. and the signature.
    - 4-move-in-payment: deposit $1,550 + first month $1,550 = $3,100 table, savings after $16,850, checkbox, signature.
    - 6-roommate-agreement (dark): all radios, hoʻoponopono option + teach box, housemates line.
    - 7-room-lease-filled (dark): 8 clauses, room rent $1,100, homeowner landlord, correct explanations.
    - 8-room-application-readonly: the room application as signed.
- Deviations: move-in month is display-only (January 1, 2033); move-in charges nothing (commit charges unpaid lines);
  roommate comfort stored as −1…1 (DEVIATIONS).
- Notes for later tasks:
  - Task 29: `paperwork.options.roommateComfort` (−1…1) × `UNDERWRITING.roommates.agreementBonus` is the roommate bonus;
    05 §4 says ±5% but config has 0.1, so pick one. Applications kinds: 'rental' / 'room'. `options.leaseTrapScore` is feedback only.
  - Task 31: `options.moveIn` = {authorized, account, depositCents, firstMonthCents, totalCents}; deposit + first-month
    lines stay unpaid until commit. Lease/roommate agreements are 'pending' with `docType`; set them active/void.
  - Steps 21–30: use `content/names.js` `businessFor(state, 'lenders'|'insurers'|'inspectors'|'contractors'|'hoas')`
    (seeded per attempt); register signed docs in `phases/paperwork/docs.js`; a step's `complete(s, values, now)`
    should call `setStep(…'done')` itself and return {ok, shortfallCents}. `dev/seeds.js` `finishSteps(s, ids, values)`
    builds "later step" seeds.
  - The UI font draws the ʻokina with extra space ("Hawai ʻ i") in some weights; see OPEN_ITEMS.

## Task 21 — Mortgage application and loan options
- attempt started 2026-10-01T21:17:48-10:00
- done 2026-10-01T21:23:35-10:00
- Added: `app/src/finance/loanOptions.js` (pure: `LOAN_CHOICES`, `LOAN_TERMS`, `loanOptions(state)`, `loanOption`,
  `creditTier`, `programBlock`, `strictLavaZone`, `findOption`, `optionKey`, `optionLabel`),
  `tests/unit/loanOptions.test.js` (6 tests), `tests/e2e/mortgage-house.json`. Rewrote steps `mortgage-application.js`
  (`mortgageSchema`, `estimatedGross`) and `loan-options.js` (mount + complete). Changed: `styles/paperwork.css`
  (pw-lo-*), `dev/seeds.js` (`SAMPLE_MORTGAGE_APPLICATION`, seeds `paperwork-house-options`,
  `paperwork-pahoa-house-options`), `tools/smoke.txt` (+2), CLAUDE.md, DEVIATIONS, OPEN_ITEMS.
- Verified:
  - `node --test tests/unit/loanOptions.test.js` → 6 pass (Lava Zone 1: FHA + under-20% disabled with reasons, Katy not;
    FHA 579 vs 580, conventional < 620, tier rate +0.5%; cash-to-close identity, FHA upfront MIP financed, short cash reason
    with the amount, paid fees not double-counted; 15-yr < 30-yr interest for Katy, Pāhoa and Miami condo; best keys
    always usable; application: −5 score, pending 'mortgage' app, no money moved, occupy "no" fails; complete stores
    options and refuses a disabled option; states valid).
  - `bash tools/check.sh` → "check: OK (syntax 115 files · tests · data 10 files · smoke) in 35s", smoke 24/24.
  - e2e ✓ `mortgage-house.json` on paperwork-house-start (fill + submit application, score 675, pending app, 8 rows,
    2 badges, choose disabled until a pick, choose 10%/15 yr → options stored, read-only view shows the choice);
    `paperwork-flow.json` and `choose-home.json` (plan-comfortable) still ✓.
  - Shots in tools/shots/t21/:
    - 1-mortgage-application: all 7 sections filled, gross $7,895 with the "Lenders use gross income" teach box, assets
      table, debts "None so far", Katy property $375,000, declarations, hard-check warning, signature.
    - 2-katy-loan-options: facts row (price, $80,000 cash, 675 "adds 0.375%", fixed $1,032/mo), teach box, 8 rows;
      "Lowest monthly" on conventional 10%/30, "Least interest" on 10%/15 (selected, green bar); both 20% rows struck through
      with "You need $13,356 more…"; breakdown under the table (housing 52% of gross).
    - 3-katy-chosen: read-only view after choosing, "You chose: Conventional · 10% down · 15 years."
    - 4-pahoa-loan-options: yellow "Lava zone rules" box; FHA rows "FHA won’t insure homes in Lava Zones 1–2", 5%/10% rows
      "lenders want at least 20% down"; only the two 20% rows usable with their badges.
- Deviations: credit-tier rate adjustments shown in the options; 2 months' reserves inside cash to close disable options;
  bankruptcy declaration must be "No" (DEVIATIONS).
- Notes for later tasks:
  - Task 29 (underwriting): reuse `loanOptions(state)` + `findOption(r, paperwork.options)` for the chosen loan's
    `rate` (tier already applied), `loanCents`, `housingCents`, `cashToCloseCents`, and `programBlock` for the hard fails.
    `grossCents` is on the result. Application kind is 'mortgage' (target `loc|type`).
  - Task 22 (closing disclosure) / 31 (commit): the down payment and closing costs at the chosen percentage come from the
    option, not the snapshot's 10% lines. `FIXED_KEYS` already includes 'special-assessment' if hoa-review adds one.
  - The paperwork screen's error text after a refused complete() says "to pay this fee"; loan-options never hits it
    because disabled rows can't be picked.

## Task 22 — HOA review, inspection, appraisal, closing disclosure
- attempt started 2026-10-01T22:03:47-10:00
- attempt started 2026-10-01T22:49:53-10:00
- done 2026-10-01T22:52:18-10:00
- Resumed the first attempt's uncommitted work (all four steps, buying.js, tests and seeds were already written); this run
  verified it, added the e2e and wrapped up.
- Added: `app/src/finance/buying.js` (pure), `tests/unit/buyerPaperwork.test.js` (6 tests), `tests/e2e/buyer-house.json`.
  Rewrote steps `hoa-review.js` (`hoaTerms`, `hoaQuestions`, `hoaSchema`), `home-inspection.js` (`hireInspector`,
  `requestRepairCredit`), `appraisal.js` (`orderAppraisal`, `gapAffordability`, `askSeller`, `payGap`),
  `closing-disclosure.js` (`closingTerms`). Changed: `config.js` (`BUYING`), `finance/loanOptions.js` (purchase price /
  appraisal / gap / repair credit), `flow.js` (`withdraw(s, now, reason)`), `docs.js` (hoa-review doc), `dev/seeds.js`
  (5 seeds), `styles/paperwork.css`, `tools/smoke.txt` (+5), CLAUDE.md, DEVIATIONS.
- Verified:
  - `node --test tests/unit/buyerPaperwork.test.js` → 6 pass (deterministic 3–6 findings, thorough misses none, budget ⊆
    standard, missedFindings months 1–7; fee charged once + line settled; credit odds by severity and credit lowers cash to
    close; appraisal gap math incl. loan on the lower value; closing rate +0.25 until flagged, only the rate flag is correct,
    signing records final rate; Miami HOA assessment line added once + agreement docType; states valid).
  - `bash tools/check.sh` → "check: OK (syntax 116 files · tests · data 10 files · smoke) in 40s", smoke 29/29.
  - e2e ✓ `buyer-house.json` on paperwork-house-inspection (light): budget inspector −$300, missedFindings = termites
    (month 3, $3,990) + water heater (month 4); credit asked (seller no); accept → appraisal at value $386,000 → continue →
    home insurance (dev) → closing: wrong flag on loan amount shows the red note, rate flag fixes it, sign → errorFlagged.
  - Shots in tools/shots/t22/:
    - 1-inspection-pick: three inspector cards ($300 ★2.8, $500 ★4.6, $750 ★4.9) with blurbs and Hire buttons.
    - 2-inspection-report: ClearSight report, 3 findings with Moderate/Minor chips and estimates, budget-limits note, choices box, "The seller said no", Accept / Walk away.
    - 3-appraisal: at-value result with Continue.
    - 4-closing-flagged: agreed-loan box (6.875%), 9 rows, rate row green "✓ Fixed", "saves $57 a month", signature filled.
    - 6-hoa-review (Miami condo, light): dues $850, covers list, reserve 78% healthy, pending assessment $215/mo × 60, rules, 3 questions, ack + signature.
    - 7-appraisal-low (dark): $375,000 vs $363,000, gap $12,000 warning, Pay gap / Ask seller / Walk away.
    - 8-appraisal-asked: seller agreed, "The seller lowered the price to $363,000." + Continue.
- Deviations: see DEVIATIONS (inspector fee, credit ask, lend on lower value, assessment line, escrow row, wrong-flag count).
- Notes for later tasks:
  - Task 44: `paperwork.options.missedFindings` = [{month (monthIndex 1–7), label, cents}] → surprise repairs.
  - Task 29: the special assessment is already in `loanOptions(state).fixedCents`/housing; reuse `findOption`.
  - Task 31 (results/commit): `options.closing.finalRate` is the rate to open the loan at (higher if not flagged,
    `extraMonthlyCents` for the message); `options.purchase.priceCents` is the final price; `specialAssessment` becomes a
    recurring item for `months`; `repairCreditCents` and `purchase.gapCents` are already in the option's cash to close.
  - Polish: after the seller refuses a repair credit the "Your choices" box still lists the credit option; after the seller
    lowers the price the "came in low" warning still shows the old gap.

## Task 23 — Builder paperwork and the design budget
- attempt started 2026-10-01T23:35:47-10:00
- done 2026-10-01T23:44:39-10:00
- Added: `app/src/finance/build.js` (pure), `tests/unit/builderPaperwork.test.js` (9 tests), `tests/e2e/builder-pahoa.json`.
  Rewrote placeholder steps `land-purchase.js` (`landTerms`, `landSchema`), `construction-loan-application.js`
  (`constructionSchema`, `cashNeeded`), `contractor-bids.js` (`bidsFor`), `building-permit.js` (`permitSchema`),
  `site-utilities.js` (`utilitiesSchema`, `baseBudget`). Changed: `config.js` (`BUILD`), `docs.js` (land-purchase doc),
  `dev/seeds.js` (4 seeds + `SAMPLE_BUILD_VALUES`), `styles/paperwork.css` (bid cards), `tools/smoke.txt` (+4), CLAUDE.md, DEVIATIONS, OPEN_ITEMS.
- Verified:
  - `node --test tests/unit/builderPaperwork.test.js` → 9 pass (design budget math per tier; Cozy project = costs.js; bid
    price/months, delay adds temp housing; seeded lot; earnest money paid + counted toward down payment, all or nothing;
    hard inquiry + tier + design budget + snapshot; bids A/B/C + seeded risk; Hawaiʻi permit checklist + fee once;
    utility options by location, upgrades out of design budget, solar bill cut; whole Pāhoa path).
  - `bash tools/check.sh` → "check: OK (syntax 117 files · tests · data 10 files · smoke) in 43s", smoke 33/33.
  - e2e ✓ `builder-pahoa.json` on paperwork-build-start (light): earnest −$1,000; Tiny shows $247,500 budget, Cozy $412,500;
    letter (dev done); Bid B; permit −$5,000 and permits line paid; rooftop solar leaves $397,500; final snapshot upfront
    $134,863, monthly $3,503, cash $144,000, score 675.
  - Shots in tools/shots/t23/:
    - 1-land-purchase: lot table ($45,000, 0.81 acres, Lava Zone 1, flood X, catchment, pole 390 ft, septic required, gravel road), teach box, offer + $1,000 earnest, contingency checked, signature.
    - 2-construction-loan: borrower + gross $11,842, 3-tier comparison table, Cozy picked: project $502,500, down $100,500, loan $402,000, P&I $2,675, monthly $3,590, cash $139,630, budget $412,500, credit warning box.
    - 3-contractor-bids (+3b dark, after adding the facts-grid CSS): three named builders, $345,000 / $375,000 / $412,500, facts grid, risk flags on A and C, teach box.
    - 4-building-permit: 5 checklist items incl. solar water heater + catchment, "Why a solar water heater?" box, fee $5,000, "Pay $5,000 and apply".
    - 5-site-utilities: catchment/well, grid/solar/off-grid, septic; budget $412,500 − $15,000 = $397,500, −$87/mo.
- Deviations: see DEVIATIONS (earnest money, bid pricing vs design budget, bid months scaled, utility options).
- Notes for later tasks:
  - Task 29: construction hard-fails credit < 680, but a fresh player is 680 and drops to 675 after this step's hard
    inquiry, so every build would be denied (OPEN_ITEMS). Bid A → `options.contractorId === 'a'` (× `BUILD.risk.lenderFactor`);
    permit → `options.permit.approved`; housing for DTI = `choice.snapshot` monthly lines (refreshed for tier/bid/utilities).
  - Task 31: `choice.snapshot` is rewritten by `refreshBuildSnapshot`; the $1,000 earnest is already in
    `paidUpfront['down-payment']`. On denial refund it only if `options.land.contingency`.
  - Task 39: budget = `options.designBudgetCents` (already minus utility upgrades; base in `designBudgetBaseCents`);
    defaults from `options.siteUtilities` (solarKw, catchmentGallons, water, power, sewer); setbacks `BUILD.setbacksFt`.
  - Task 44: `options.contractorRisk` = extraMonths + defect (month 0–5, label, cents), Bid A only;
    `options.siteUtilities.monthlyDeltaCents` is already folded into the snapshot utilities line.
  - Form display fields (computed/info) have no `data-field`, so e2e asserts on `.fm-form` text.

## Task 24 — Insurance shopping
- attempt started 2026-10-02T00:21:48-10:00
- done 2026-10-02T00:28:27-10:00
- Added: `app/src/finance/insurance.js` (pure), `app/src/phases/paperwork/insuranceShop.js` (shop + `insuranceStep` +
  `policySchema`), `tests/unit/insurance.test.js` (7 tests), `tests/e2e/insurance-katy.json`. Rewrote placeholder steps
  `renters-insurance.js`, `condo-insurance.js`, `home-insurance.js`. Changed: `config.js` (`INSURANCE`, replacing the unused
  task-01 stub), `docs.js` (policy doc for all three step ids), `dev/seeds.js` (4 seeds), `styles/paperwork.css`,
  `tools/smoke.txt` (+4), CLAUDE.md, DEVIATIONS.
- Verified:
  - `node --test tests/unit/insurance.test.js` → 7 pass (base premiums + value scaling; quote factors/deductibles/liability;
    locked required add-ons for buyers/builders, never renters; HPIA + Florida deductible; calculator; renters choose →
    policy, recurring draft, deductible, snapshot lines, pending agreement; Pāhoa lava forced on, Miami condo defaults).
  - `bash tools/check.sh` → "check: OK (syntax 119 files · tests · data 10 files · smoke) in 48s".
  - e2e ✓ `insurance-katy.json` on paperwork-house-insurance: Basic + flood = $275.84/mo, calculator caps at $2,500,
    buy → options.insurance basic/flood, deductible $2,500, agreement "Basic HO-3 + flood: $275.84 a month, $2,500 deductible."
  - Shots in tools/shots/t24/:
    - 1-renters-hilo: HO-4, Koaʻe Insurance Group quotes $12 / $15 / $19.50 with $1,000 / $500 / $250 deductibles; hurricane + flood add-ons ($7.50, $5.83) unlocked; calculator "$500 … $2,500".
    - 2-condo-miami: HO-6 $80 / $100 / $130; optional flood $18.75; "Florida hurricane deductible" box ($8,000 to $20,000 on $400,000).
    - 3-home-pahoa (build path): HO-3 $92.13 / $115.16 / $149.71; lava and fire $333.33 checked + disabled, "Required by your lender" + HPIA chip; Lava Zone 1 warning; total $448.49.
    - 4-home-katy: HO-3 $213.34 / $266.67 / $346.67; flood advised but optional ($62.50), Harvey note.
    - 6-portfolio-policy: the Agreements tab shows the policy doc (premium table, deductible, liability, coverage), Pending approval.
- Deviations: see DEVIATIONS (contents-only add-on factor, value scaling, Pāhoa shot on the build path).
- Notes for later tasks:
  - Task 31 (commit): `paperwork.options.insurance.recurring` = `{label, amountCents (negative), category 'insurance',
    source 'insurance'}` → `addRecurring` with `startsMonth: 0`; the policy agreement (type 'insurance', docType = step id)
    goes active/void with the others. Results card: `options.insurance` has quoteLabel, monthlyCents, deductibleCents, addOns.
  - Task 29: the snapshot's `insurance`/`renters-insurance` + `hazard` lines are rewritten to the chosen policy, so DTI sees it.
    `refreshBuildSnapshot` would overwrite them if called after home-insurance (nothing does today).
  - Task 44 / 09 §7: insured losses use `options.deductibleCents` and `outOfPocket(loss, {deductibleCents})`; Florida
    hurricanes can use `options.insurance.hurricaneDeductible.lowCents`.
  - e2e: wait ~300 ms after `.pw-ins` appears before clicking quote buttons, or the first click can miss.

## Task 25 — Letter writing step
- attempt started 2026-10-02T01:07:49-10:00
- done 2026-10-02T01:15:37-10:00
- Added: `app/src/letters/types.js` (6 types: prompt, tips, greeting/closing examples, content groups + keywords, target
  words, recipient role), `letters/send.js` (`wordCount`, `lengthStatus`, `recipientFor`, `nextLetterId`, `sendLetter`),
  `letters/score.js` (stub → `{likelihood: null, pending: true}`), `phases/paperwork/letterBox.js` (`mountLetterBox`,
  `letterStep(id)`), `dev/sampleLetters.js`, `tests/unit/letterBox.test.js` (7 tests), `tests/e2e/letter.json`.
  Changed: the six letter step files (one-liners), `paperworkScreen.js` (`stayOnDone` + `onNext` in the mount ctx),
  `dev/seeds.js` (`paperwork-letter`; `finishSteps` sends the sample letter for letter steps), `styles/paperwork.css`,
  `tools/smoke.txt` (+1), CLAUDE.md, DEVIATIONS.
- Fixed earlier e2e scripts that clicked the dev "Mark done" button on steps that are now real: `paperwork-flow.json`
  and `renter-apartment.json` (cover letter + renters insurance; the insurance half was already broken since task 24),
  `builder-pahoa.json` (construction-purpose letter), `buyer-house.json` (home insurance, also broken since task 24).
- Verified:
  - `node --test tests/unit/letterBox.test.js` → 7 pass; `npm test` → 174 pass.
  - `bash tools/check.sh` → "check: OK (syntax 124 files · tests · data 10 files · smoke) in 49s", smoke 38/38.
  - e2e ✓ `letter.json` on paperwork-letter: textarea spellcheck="false", Send disabled when empty, 30-word count,
    draft saved, confirm → step done, letter stored with `score.pending`, no score shown, listed in portfolio Letters
    ("Analyn Domingo, ʻĀina Kai Rental Group"). Also ✓ paperwork-flow, renter-apartment, renter-shared, builder-pahoa,
    buyer-house, mortgage-house, insurance-katy.
  - Shots in tools/shots/t25/:
    - 1-empty: recipient card "To: Analyn Domingo · ʻĀina Kai Rental Group", prompt, empty textarea with a neutral placeholder, tip panel with greeting/closing examples, "0 words · aim for 80 to 200".
    - 2-draft: typed letter, focus ring, "30 words · aim for 80 to 200", made-up-names note, Send letter; checklist shows Draft.
    - 3-sent: green "✓ Sent! You'll find out how it was received at the end of this phase.", recipient, the letter text, Next step; checklist 2 of 7 done.
    - 4-portfolio: Letters tab lists "Rental cover letter", recipient and date.
- Deviations: see DEVIATIONS (stay on the sent view with a Next step button; dictionary preload left to task 26).
- Notes for later tasks:
  - Task 26/28: `letters/score.js` `scoreLetter(text, type, {speller})` is called by `sendLetter` inside the store update;
    keep it synchronous (load the speller before Send, e.g. when the letter box mounts, and pass it through
    `mountLetterBox` → `onDone` values or a module-level cache). Content groups live in `LETTER_TYPES[id].groups`
    (`keywords` are lowercase substrings; `patterns` optional). `dev/sampleLetters.js` has one in-range letter per type.
  - Task 28: letters made before the real model have `score: {likelihood: null, pending: true}`; the portfolio only shows a
    band when `score.band` exists. Results can rescore pending letters.
  - Task 29: the step's `values.letterId` points at `state.letters[id]`; `paperwork.letterIds` lists this attempt's letters.
  - e2e: after Send, click `.modal-confirm`, then `.pw-letter-next` to move on (the sent view stays up).

## Task 26 — Spelling, grammar, sentiment and content features
- attempt started 2026-10-02T01:53:48-10:00
- done 2026-10-02T02:01:06-10:00
- Added (all pure except loadSpeller): `app/src/letters/text.js` (normalizeText, foldKey, tokenize, splitLines,
  splitParagraphs, splitSentences), `allowlist.js` (Hawaiian words/places, the 20 game places, regions, game/finance
  terms; `isAllowed`, `ALLOW_KEYS`), `spell.js` (`createSpeller({aff, dic, extraWords})` → {correct, suggest, check}),
  `grammar.js` (19 rules, `GRAMMAR_RULES`, `checkGrammar`), `sentiment.js` (`analyzeSentiment`, `sentimentLabel`),
  `features.js` (`FEATURE_NAMES`, `FEATURE_RANGES`, `extractFeatures`, `lengthFit`, `sentenceLenFit`, `contentHits`),
  `loadSpeller.js` (browser; `loadSpeller()` promise, `loadedSpeller()` sync), `tests/unit/letterChecks.test.js` (33 tests),
  `tests/e2e/letter-checks.json`. Changed: `phases/paperwork/letterBox.js` (preloads the speller on mount, passes
  `loadedSpeller()` to `sendLetter`), CLAUDE.md, DEVIATIONS.
- Verified:
  - `node --test tests/unit/letterChecks.test.js` → 33 pass (every grammar rule positive + negative, spelling skips
    names/Hawaiian/numbers/URLs/acronyms, sentiment labels, features deterministic + in range for all 6 types, "Mr."/"Dr."/"a.m." splitting).
  - `bash tools/check.sh` → "check: OK (syntax 131 files · tests · data 10 files · smoke) in 52s", smoke 38/38.
  - e2e ✓ `letter-checks.json` on paperwork-letter: the dictionary loads in the browser, "recieve > receive/relieve",
    "becuase > because", Pāhoa/Mahalo/Kahale not flagged, send still works. e2e ✓ `letter.json` (task 25) still passes.
  - Shot tools/shots/t26/letter-checks.png: sent view ("✓ Sent!", recipient, letter text, Next step), checklist 2 of 7 done.
  - Feature vectors (FEATURE_NAMES order), sanity-read:
    - strong (`SAMPLE_LETTERS['rental-cover']`): spellRate 0, grammarPer100w 0, sentiment 0.9823, negSentenceRate 0,
      politeness 1.80, hasGreeting 1, hasClosing 1, lengthFit 1, sentenceLenFit 1, contentCoverage 1, textSpeak 0,
      shouting 0, exclaimRate 0, paragraphs 1, lexicalVariety 0.63.
    - weak ("hey / i want the apartment its really nice and i would of taken it alot sooner … lol. u should give it to me
      becuase im … PLEASE PICK ME NOW!!!"): spellRate 0.083 (alot, lol, becuase, im), grammarPer100w 20 (capped),
      sentiment 0.9351, negSentenceRate 0, politeness 2.08, hasGreeting 1 ("hey"), hasClosing 0, lengthFit 0.2,
      sentenceLenFit 1, contentCoverage 0.33, textSpeak 3, shouting 1, exclaimRate 0.25, paragraphs 0, lexicalVariety 0.83.
    - Reads right: the weak letter loses on spelling, grammar, closing, length, coverage, text-speak, shouting and
      paragraphs. VADER alone rates it warm ("nice", "good", "promise", "please"), so sentiment can't carry the model by itself.
- Deviations: see DEVIATIONS (text.js split out; line-based paragraphs; extra extractFeatures outputs).
- Notes for later tasks:
  - Task 27 (corpus/model): `extractFeatures(text, type, {speller})` → `vector` in `FEATURE_NAMES` order; build the
    Node speller with `createSpeller({aff, dic})` from `fs` (see the test). `FEATURE_RANGES` gives each feature's range.
    grammarPer100w is the *weighted* count (minor rules 0.5) of rules that don't have their own feature.
  - Task 28 (score.js): `extractFeatures` also returns `issues {spelling, grammar}`, `sentiment {compound, label,
    sentences}`, `wordCount`, `groupsHit`, which map straight onto the scoreLetter contract. All indices point into
    `normalizeText(text)` (same length as the NFC text). The browser speller may still be null if the student sends
    within a second of opening the box; score.js should treat a null speller as "spelling not checked" (spellRate 0).
  - VADER (180 KB) is a static import of sentiment.js, so once score.js imports features.js the paperwork screen pulls it
    in. nspell + the dictionary stay lazy (loadSpeller).

## Task 27 — Train the letter-scoring model
- attempt started 2026-10-02T02:39:49-10:00
- done 2026-10-02T02:47:10-10:00
- Files: `tools/letter-model/corpus/{rental-cover,cosigner-request,roommate-intro,loan-purpose,construction-purpose,credit-explanation}.json`
  (84 letters, one JSON object per line), `tools/letter-model/logreg.mjs` (pure: standardizer, L2 batch GD `fit`, `train`,
  `probability`, `metrics`, stratified seeded `crossValidate`), `tools/letter-model/train.mjs` (`run({write, log})`,
  `REQUIRED_SIGNS`/`EXPECTED_SIGNS`), `app/src/letters/model.json`, `package.json` (`train:letters`),
  `tests/unit/letterModel.test.js` (8 tests).
- Corpus: 14 per type (4 strong, 4 middling, 6 weak), 36 of 84 labeled 1, 12 held out (`split: 'test'`, 2 per type).
  Middling letters: 2 per type labeled 1 (one group missing, or a few slips), 2 labeled 0 (thin content, complaints,
  or no plan). Weak flaws: rude/negative tone, text-speak with no greeting/closing, ALL CAPS, far too short, heavy
  spelling + run-on, and grammar mistakes all through with otherwise complete content.
- Corpus fixes made while training (the "fix the corpus, not the math" loop):
  1. With 13/type, `grammarPer100w` came out **+0.024**. Grammar errors only showed up in weak letters that were also
     misspelled and texty, while several approved middling letters had small slips. Adding one "grammar all through,
     content fine" letter per type (`*-14`) gave −1.10.
  2. `negSentenceRate` was +0.145. Adding grumbling sentences to five middling-weak letters (rc-07, lp-07, cp-08, cs-07,
     ce-08) brought it to +0.053. The rest is real signal: strong co-signer and credit letters honestly name the risk
     ("if I could not pay", "missed one car payment"), and VADER scores those sentences negative. Accepted as a soft warning.
- Metrics (`npm run train:letters`): 5-fold stratified CV accuracy **0.931**, log-loss 0.237 (folds 1.00 0.93 0.79 1.00
  0.93); held-out test accuracy **1.000** (12 letters), log-loss 0.077; train fit 0.958. Version `letters-lr-50c10926`.
  CV misses: rc-14 (grammar-weak, content full), cs-07, cs-13 (hides the risk but hits every keyword group), rm-06 and
  lp-06 (approved middling letters with many lowercase-i slips).
- Weights (z-scored features; bias −1.055):

  | feature | weight | | feature | weight |
  |---|---|---|---|---|
  | spellRate | −0.099 | | lengthFit | +0.180 |
  | grammarPer100w | −1.095 | | sentenceLenFit | +0.107 |
  | sentiment | +0.382 | | contentCoverage | +1.095 |
  | negSentenceRate | +0.053 (soft warn) | | textSpeak | −0.068 |
  | politeness | +0.167 | | shouting | −0.073 |
  | hasGreeting | +0.065 | | exclaimRate | −0.074 |
  | hasClosing | +0.158 | | paragraphs | +0.541 |
  | | | | lexicalVariety | −0.340 (no expected sign; short letters have high type-token ratios) |

  All six required signs (06 §4) are right. Spelling is small because grammar and text-speak already carry most misspelled letters.
- Verified: `npm run train:letters` run twice → identical model (minus `trainedAt`); the unit test retrains and compares
  against the committed model.json, so a stale model fails `npm test`. `node --test tests/unit/letterModel.test.js` 8/8.
  `bash tools/check.sh` → OK (syntax 133 files · tests · data 11 files incl. model.json · smoke 38/38). No screenshots
  (no UI in this task).
- Deviations: see DEVIATIONS (14 letters per type; stratified CV; extra model.json fields).
- Notes for later tasks:
  - Task 28: `p = probability(vector, model)` in logreg.mjs is the exact formula. score.js should reimplement it in a few
    lines (σ(Σ wᵢ·(xᵢ−meanᵢ)/stdᵢ + b)) rather than import from tools/. Sample letters score > 0.7 for all six types, and
    the task-26 weak rant < 0.2. A **polite but empty** rental letter scored 67 at normal length with two paragraphs, but
    25–27 when it was ~50 words in one paragraph. Make the sanity letter full length so it lands in 36–69.
  - Task 28 message table: `negSentenceRate` has a tiny positive weight, so it may appear as a "helped" contribution.
    Skip it in "What helped" (or give it neutral wording), and do the same for `lexicalVariety`, whose weight is negative.
  - After any change to `extractFeatures`, grammar rules or the corpus, run `npm run train:letters`; the stale-model test
    will remind you.

## Task 28 — Letter scores and the score report
- attempt started 2026-10-02T03:25:53-10:00
- attempt started 2026-10-02T04:11:49-10:00
- done 2026-10-02T04:16:01-10:00
- Third attempt. The second attempt had built nearly everything (uncommitted); this run verified it, polished the report and wrapped up.
- Files: `app/src/letters/score.js` (real `scoreLetter`, `predict`, `contributions` + MESSAGES table, `bandFor`,
  `needsScore`, `rescorePending`, `issueExcerpt`), `app/src/ui/letterReport.js` (`renderLetterReport(letter)`,
  `wholeWordFix`, `groupBySpot`), `app/styles/letters.css` (+ index.html link), `app/src/config.js` (`LETTERS.bands[].status`,
  `topContributions`, `minEffect`, `reportMaxIssues`), `app/src/main.js` (`rescoreLetters` on boot),
  `ui/portfolio/{records,portfolioModel}.js` (Letters tab uses the report; `letterRevealed` hides scores for the paperwork
  attempt in progress until Results), `dev/lettersGallery.js` + `galleries.js` + `sampleLetters.js` `REPORT_SAMPLES`,
  `dev/seeds.js` (portfolio-demo letters now real types with pending scores, scored on load), `tests/unit/letters.test.js`
  (9 tests), `tests/unit/letterBox.test.js` (stub tests updated), `tools/smoke.txt` (`letters`).
- Sanity letters (06 §4, rental-cover, with the dictionary): strong 93, rant 0, polite-but-empty 60 (told what it left out).
  Gallery samples: strong 93 Excellent, middling 68 Fair, weak 0 Needs work. Deterministic (deepEqual on rescoring).
- Verified: `node --test tests/unit/letters.test.js tests/unit/letterBox.test.js` all pass; `bash tools/check.sh` → OK
  (syntax 135 files · tests · data 11 · smoke 39/39).
  - `tools/shots/task28-letters.png` (1500×2100): three reports side by side. Strong: green meter 93 Excellent, three ↑
    reasons, "Nothing hurt this letter", no spelling/grammar issues, Warm tone. Middling: cyan 68 Fair + "A good start…",
    ↓ grammar, becuase/alot with suggestions, three grammar excerpts with the span highlighted. Weak: red 0 Needs work +
    "Every writer rewrites…", the missing content groups named, 12 grammar cards then "…and 2 more", Negative tone.
    First shot showed the same lowercase "i" flagged twice and "Try: H"; fixed (merged spots, "Try: Hi"), and a
    regression ("Try: me!") on the exclamation card was fixed too.
  - `tools/shots/task28-portfolio-letter-open.png`: portfolio-demo Letters tab, loan-purpose letter opened: report below
    To/Sent (39 Needs work, too short at 42 words, one block of text). List rows show band chips ("Needs work · 39", "· 3").
- Notes for later tasks:
  - Task 31 (Results): `renderLetterReport({text, score})` from `ui/letterReport.js`; set `paperwork.lettersRevealed = true`
    when Results opens (or mark the results step done) so the portfolio shows the scores. 05 §7 uses `L = likelihood / 100`.
  - Task 29 underwriting: rescore with the speller if `needsScore(letter.score)` before using a likelihood.
  - Spelling suggestions come straight from nspell and can be odd ("dont" → cont, dent, dint). A small override table in
    spell.js (dont → don't, im → I'm, alot → a lot) would help; left for task 55 (copy/glossary).

## Task 29 — Underwriting decisions and the paperwork commit
- attempt started 2026-10-02T04:57:48-10:00
- done 2026-10-02T05:05:29-10:00
- First attempt. Files: `app/src/finance/underwriting.js` (new: `decide`, `drawFor`, `letterFactor`, `letterFor`,
  `attemptIndex`, `cardAccepted`, `homeApproved`, `REQUIRED_KINDS`, `DECISION_LABELS`), `app/src/phases/paperwork/commit.js`
  (new: `commitPaperwork`, `recurringFor`), `app/src/dev/seeds.js` (`paperwork-ready-{apartment,shared,condo,house,build}`,
  `leaseValuesFor`), `steps/construction-loan-application.js` (stores `options.pulledScore` before the inquiry),
  `app/src/config.js` (`UNDERWRITING.roommates.agreementBonus` 0.1 → 0.05), `tests/unit/underwriting.test.js` (13 tests),
  `tools/smoke.txt` (5 ready seeds).
- Verified: `node --test tests/unit/underwriting.test.js` 13/13; `bash tools/check.sh` → OK (syntax 137 files · tests ·
  data 11 · smoke 44/44). `tools/shots/smoke-paperwork-ready-house.png`: Katy house checklist 8 of 9 done, every step ✓,
  Results card active ("Coming in task 31"), no errors.
- Decision records for the ready seeds (dev save seed, attempt 0; letters scored without the dictionary in Node):
  - **apartment** (Hilo, $4,200/mo, rent $1,550): lease **denied**, p 0.8232, draw 0.9779. Finances ×0.85 (2.7× rent) ·
    Credit ×1 (680) · Letter ×0.9685 (Excellent 93). Card approved: regular $1,000 at 25.99%.
  - **shared** (Honolulu room $1,100): roommates **approved**, p 0.9923, draw 0.3103. Finances ×1 (3.8×) · Intro letter ×0.945
    (89) · Roommate agreement ×1.05 (best answers). Card approved.
  - **condo** (Miami, conventional 10%/30y): mortgage **approved**, p 0.4772, draw 0.3887. Finances ×0.55 (back 46%) ·
    Reserves ×1 ($15,590 left after closing) · Credit ×0.9 (675, rate +0.375) · Letter ×0.964 (92). Card approved.
  - **house** (Katy, conventional 10%/30y): mortgage **approved**, p 0.4772, draw 0.3887. Finances ×0.55 (back just over 43%) ·
    Reserves ×1 ($30,150 left) · Credit ×0.9 (675) · Letter ×0.964 (92). Card approved.
  - **build** (Pāhoa, Cozy, Bid B): construction **approved**, p 0.8636, draw 0.1727. Finances ×1 (back 29%) · Credit ×0.9
    (675) · Letter ×0.9595 (91). Terms: $402,000 at 7.375% for 360 months, P&I $2,776.51, housing $3,451.13, upfront
    $128,862.50 (down payment minus the $1,000 earnest, closing, 9 months temporary housing, construction interest).
  - Condo and house share a draw because both use the dev save's seed with kind 'mortgage' and attempt 0 (as specified).
- Deviations: see DEVIATIONS (construction credit floor uses the pulled score; renter/builder cash hard fail; living-cost
  categories; roommate bonus 5%; buyer upfront from the chosen option; build bills start after construction).
- Notes for later tasks:
  - Task 30: `decide` reads the offer from `paperwork.options.card = {accepted, autopay}` (the ready seeds set it). Commit
    resolves pending applications of kind 'credit-card' and agreements of type 'card'/'credit-card' by the card decision, so
    the card step should create those as pending. Secured deposit is charged at commit.
  - Task 31: compute `decide(state, {speller: loadedSpeller()})` once when Results opens, store it in
    `paperwork.decisions` (so a reload shows the same cards), then on Continue run
    `store.update((s) => commitPaperwork(s, s.paperwork.decisions, now), {checkpoint: approved ? 'paperwork-committed' :
    'paperwork-denied'})`. Each decision has `label`, `factors[{label, value, note}]`, `reasons`, `hardFail`, and
    `terms.upfront` (what commit charges) + `upfrontCents`, `paymentCents`, `totalInterestCents`, `rate`, `lender`.
    `paperwork-ready-apartment` is naturally denied and `paperwork-ready-house` approved, good bases for
    `results-denied-apartment` / `results-approved-house`. Commit sets `paperwork.lettersRevealed` on approval.
  - Commit throws if the cash isn't there; underwriting hard-fails that case first, so only a bug can hit it.
  - Insurance's `options.insurance.recurring.amountCents` is negative; recurring items are positive expenses, so commit uses
    the absolute value.

## Task 30 — Credit card offer and card mechanics
- attempt started 2026-10-02T05:43:47-10:00
- done 2026-10-02T05:49:40-10:00
- First attempt. Files: `app/src/finance/creditCard.js` (new: `tierFor`, `offerFor`, `minimumPayment`, `cycle`,
  `applyCycle`, `payoffExample`, `durationText`), `steps/credit-card-offer.js` (real step: `CARD_EXPLANATION`,
  `schumerRows`, `exampleText`, `cardSchema`, `cardTerms`, `currentAnswer`, `priorAnswer`), `phases/paperwork/docs.js`
  (registers the offer doc), `finance/underwriting.js` (`cardDecision` uses `offerFor` + `options.card.pulledScore`),
  `dev/seeds.js` (`CARD_ACCEPT`; ready seeds now accept through the real step; new `paperwork-card-offer`,
  `paperwork-card-offer-secured`), `tests/unit/creditCard.test.js` (9 tests), `tests/unit/underwriting.test.js` (2 tests
  updated for the card records), `tests/e2e/card-offer.json`, `tools/smoke.txt` (+2).
- Verified: `node --test tests/unit/creditCard.test.js` 9/9; `bash tools/check.sh` → OK (syntax 138 files · tests · data 11 ·
  smoke 46/46); `node tools/shoot.mjs --path "/index.html?seed=paperwork-card-offer&theme=light" --steps tests/e2e/card-offer.json` ✓.
  - `tools/shots/t30/1-offer-full.png`: Uluwehi Savings Bank offer, explanation verbatim, "Regular card, $1,000 limit" / score 680,
    Schumer box (25.99%, penalty 29.99%, 25-day grace, minimum rule, $1,000 limit, no annual fee, $30 late fee), APR ÷ 12 note,
    worked example ($1,000 at the minimum: starts $31.66, 78 months, $1,010.39 interest; $100/mo: 12 months, $139.44; full: $0),
    accept/decline radios. No overlaps.
  - `2-accept-filled.png`: Accept chosen → autopay (full preselected, minimum picked here) + "Minimum payments are expensive"
    warning, hard-check warning, checkbox, signature "Kai Mana".
  - `3-after-accept.png`: step 6 Done, Results next; the e2e asserts autopay 'minimum', score −5, pending credit-card application
    and pending agreement.
  - `4-secured-full.png` (dark): score 620 → "Secured card, $300 limit", secured-card note, Security deposit row, 27.99%
    example (81 months, $1,137.54).
- Deviations: see DEVIATIONS (card tier uses the pulled score; decline stored as a void agreement; worked example uses the real
  minimum rule plus a $100/month contrast).
- Notes for later tasks:
  - Task 44 (month sim): `cycle(card, {chargesCents, payFrom: checking})` → apply with `applyCycle`; the returned
    `paidCents` must be moved with `transfer(s, 'checking', 'card', …)` and new charges posted with `charge(s, 'card', …)`,
    so set `balanceCents` through the ledger (or apply only `carriedLastMonth`) to keep ledger sums consistent. `missed` →
    a card late fee + credit −60. Penalty APR is disclosed but not applied in `cycle` (09 §6 doesn't use it); add it there
    if wanted.
  - Task 31 (Results): the card decision's terms now match what the student was offered (pulled score). The accepted offer
    is a pending agreement (docType 'credit-card-offer') + pending 'credit-card' application; commit resolves both.
  - The offer is one-time: `priorAnswer(state)` ('open' | 'declined' | 'accepted') makes later attempts show a short
    "Already answered" form; `options.card = {accepted: false, prior}` then.

## Task 31 — End-of-phase results
- attempt started 2026-10-02T06:29:47-10:00
- done 2026-10-02T06:36:55-10:00
- Files: `phases/paperwork/steps/results.js` (real Results step, replaces the placeholder), `phases/paperwork/resultsModel.js`
  (pure: `resultsSummary`, `loanPreview`, `letterStepsFor`, `factorLine`), `steps/placeholder.js` ("Mark done" only with
  `?dev=1`), `finance/underwriting.js` (draw reason says "decision draw", not "lender's draw", since landlords use it too),
  `styles/paperwork.css` (`.pw-res-*`), `dev/seeds.js` (`results-approved-house`, `results-denied-apartment`),
  `tools/smoke.txt` (+2), `tests/unit/results.test.js` (8 tests), `tests/e2e/paperwork-apartment-full.json`,
  `tests/e2e/results-denied.json`.
- Verified: `node --test tests/unit/results.test.js` (for all five ready seeds the pay-now total = cash commit actually
  charges, the monthly rows = commit's recurring items, loan principal/payment match); `bash tools/check.sh` OK (139 files,
  tests, 48/48 smoke); e2e `paperwork-apartment-full.json` on `?seed=paperwork-apartment-start` (real forms + typed cover
  letter + card accept → Results approved → Continue → phase design, $3,100 charged) and `results-denied.json` on
  `?seed=results-denied-apartment` (Back to planning → plan with "Denied last time" on Hilo apartment, card opened, no dev button).
  - t31/1-approved-house.png: green verdict, Mortgage card (48%, factor list, letter report collapsed), card; receive $337,500 +
    $1,000 limit; pay now $37,500 + $11,250 = $48,750, $78,900 → $30,150; 9 monthly rows sum to $4,808.18, $1,191.82 left of
    $6,000; loan $337,500 + $460,673 interest = $798,173; insurance, card terms, "If you don't pay…" ($111 late fee, $37,500 down).
  - t31/2-denied-apartment.png: red verdict, Lease denied (82% chance, draw 98), card opens, three next-step tips, $50 fees spent.
  - t31/3-apartment-full-results.png: approved Hilo lease 80%, $1,550 + $1,550 = $3,100, $19,950 → $16,850.
  - t31/5-denied-back-to-plan.png: plan table with the "Denied last time" badge on Hilo apartment.
- Deviations: none in game rules. The full e2e sets `meta.seed = 5` at its start (the default dev save's lease draw is 0.98, a
  denial whatever the student writes); seed 5's lease draw is 0.21.
- Notes for later tasks:
  - Results computes `decide(s, {speller})` once after `loadSpeller()` (rescorePending first), stores it in
    `paperwork.decisions` + `lettersRevealed` (checkpoint 'paperwork-results'); a reload reuses it. Continue → commitPaperwork.
  - `resultsSummary` reuses commit's `recurringFor` with `loanPreview(home)`, so if commit changes, the screen follows.
  - Task 32+: the design phase starts with `home.label 'To be chosen'`; the e2e ends on the design placeholder.
  - Loose end: `tests/e2e/renter-apartment.json` and `paperwork-flow.json` click `.pw-dev-done` on steps that are real now
    (they aren't in check.sh); run them with `?dev=1` or retire them in task 56.

## Task 32 — 3D scene foundation
- attempt started 2026-10-02T07:15:52-10:00
- done 2026-10-02T07:28:00-10:00
- Files: `app/src/three/scene.js` (createScene, webglAvailable, showFallback), `three/sky.js` (createSky, paletteAt),
  `three/terrain.js` (createTerrain), `three/landmarks.js` (20 backdrops, addLandmark), `three/materials.js` (mat, ownMat,
  canvasTexture, texturedMat, createBatch, disposeMaterials), `dev/sceneGallery.js` + `dev/galleries.js` (scene),
  `config.js` (`SCENE3D`), `styles/components.css` (`.three-fallback`, `.dev-scene*`), `tools/smoke.txt` (+scene).
- Verified: `bash tools/check.sh` OK (145 files, tests, data 11, smoke 49/49). One shoot run visited all 20 `?dev=scene&loc=<id>`
  pages with no console errors: draw calls 9–18, triangles 1,388–13,470 (budget 150 / 120k).
  - t32/tropical-wet-noon.png (`biome=tropical-wet&t=0.5&landmark=kilauea-plume`): **11 calls, 4,641 tris**. Blue sky, green
    ground, lighter lot pad, palms, ferns, round trees, black lava patches, broad shield volcano with a gray plume behind the lot.
  - t32/desert-sunset.png (`biome=desert&t=0.75`, Las Vegas): **10 calls, 3,652 tris**. Orange/pink sky, ochre ridge, Strip
    towers, cacti, agave and rocks in warm, dim light.
  - t32/alpine-night.png (`biome=alpine&t=0.95`, Yellow Pine, January snow): **11 calls, 10,798 tris**. Navy sky with stars,
    moonlit blue snow on rolling ground, dark pines, snow-capped distant peaks.
  - t32/continental-lake-snow.png (`biome=continental-lake&t=0.55&month=0`, Marquette): **12 calls, 2,800 tris**. White
    ground and lot, bare deciduous trunks, green pines, ore dock over Lake Superior, green ridges.
  - Extra: kona-coast.png (water plane + sand shore on the west edge, Hualālai), honolulu-urban.png (asphalt/sidewalk grid,
    Lēʻahi crater, skyline, ocean), montpelier-fall.png (September: orange/red/gold crowns, gold dome capitol).
- Deviations (DEVIATIONS.md): PCFShadowMap instead of PCFSoftShadowMap (removed in r186); createScene takes
  `location`/`seasons`/`coastal` and returns null after drawing the fallback; the plain ground runs to 1,800 ft.
- Notes for later tasks:
  - `createScene(container, {location, homeTypeId, timeOfDay, monthIndex, interactive})` → null means fallback was shown.
    Add the home with `sc.add(group)`, then `sc.frame(new THREE.Box3().setFromObject(group))` (also fits the sun shadow box).
    `sc.nightFactor` drives window glow; `sc.season` = {snow, fall, month} after `setSeason` (task 34+: roof snow caps).
  - Merge static parts with `createBatch()` (one mesh per material). Use `mat()` for shared colors, `ownMat()` for anything
    you recolor. `dispose()` frees everything, including the material cache, so don't keep `mat()` results across scenes.
  - Animations: `sc.start((dt, s) => …)` / `sc.stop()`; outside the loop call `sc.requestRender()` after changes.
  - The default camera looks from front-right (`SCENE3D.viewDir`); terrain keeps that foreground clear and turns the
    landmark backdrop to sit behind the lot. Water is on the −X edge.
  - three/*.js import `three` statically, so they can't load in Node tests; keep pure logic elsewhere if it needs tests.
