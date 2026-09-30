# Home & Life Sim — working guide

A browser game for the Life Skills course (grades 7–8, Pāhoa, Hawaiʻi Island). Students enter their class job's net
income and savings, pick a home from 20 places × 5 home types, do the real paperwork, design the home, then live
month by month from January 2033. Vanilla ES modules with an import map, no build step. It runs fully in local mode
(localStorage); Firebase is optional and teacher-configured. The spec is in `docs/spec/` (start with `00-overview.md`).
**Every task run follows [`docs/TASK_PROTOCOL.md`](docs/TASK_PROTOCOL.md).**

## Commands
- Serve: `python3 tools/serve.py` → http://127.0.0.1:1270 (`python3 tools/serve.py 8080` for another port)
- Test: `npm test` (= `node --test "tests/unit/*.test.js"`; Node 25 rejects a bare directory, see DEVIATIONS)
- Check: `npm run check` (= `bash tools/check.sh`, arrives in task 02)
- Shoot: `node tools/shoot.mjs …` (arrives in task 02). Until then:
  `chromium --headless=new --hide-scrollbars --window-size=1366,768 --screenshot=tools/shots/x.png "http://127.0.0.1:1270/?theme=light"`
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

## Folder map
```
app/index.html admin.html      entry pages (import map: three → vendor/, firebase/* → gstatic 12.19.0)
app/styles/                    tokens.css base.css components.css (+ one file per area)
app/src/main.js                boot (01 §5); error boundary; ?theme=light|dark
app/src/config.js              all tunables · firebase-config.js placeholder · types.js typedefs
app/src/util/                  escape.js format.js (pure)
app/src/ui/                    dom.js (h, clear, qs) · screens.js (registerScreen, renderPhase) · header.js
app/src/phases/<phase>/        one screen per phase (placeholders until their tasks)
app/src/accounts/ui/login.js   placeholder (task 05)
app/src/admin/adminMain.js     placeholder (task 52)
tests/unit/                    node --test files importing ../../app/src/…
tools/serve.py                 static server, port 1270 · tools/shots/ (gitignored)
docs/                          TASK_PROTOCOL, PROGRESS, OPEN_ITEMS, spec/
```

## Gotchas
- `ui/screens.js` `renderPhase(container, ctx)` mounts `ctx.phase` if given (e.g. `'login'`), otherwise the store's phase.
- `main.js` still uses an in-memory placeholder store with the `getState/update/subscribe` shape; task 04 swaps in
  `state/store.js`, task 05 the account provider and login.
- The OS on this machine prefers dark, so plain headless shots come out dark; pass `?theme=light` for light.

## Current status
See `docs/PROGRESS.md`.
