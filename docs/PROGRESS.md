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
