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
