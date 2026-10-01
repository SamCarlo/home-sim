# Vendored libraries

Fetched once from the npm registry by task 03 (2026-09-30) and committed. Nothing here is built or fetched at runtime.
Upgrade steps are in `HS/CLAUDE.md` → "Vendor".

| Library | Version | Source | License | Files | Fetched |
|---|---|---|---|---|---|
| three.js | 0.186.1 (r186) | npm `three` | MIT (`three/LICENSE`) | `three/three.module.min.js` (esbuild `--bundle --minify` of `build/three.module.js` + `three.core.js`; r186 ships no `.min.js`), `three/addons/controls/OrbitControls.js`, `three/addons/utils/BufferGeometryUtils.js` (copied as is; they `import … from 'three'`) | 2026-09-30 |
| nspell | 2.1.5 (+ is-buffer 2.0.5) | npm `nspell` | MIT (`nspell/LICENSE`) | `nspell/nspell.js` (esbuild `--bundle --format=esm --platform=browser`; default export `nspell(aff, dic)`) | 2026-09-30 |
| dictionary-en | 4.0.0 (en_US Hunspell, SCOWL 2020.12.07) | npm `dictionary-en` | MIT AND BSD (`dictionary-en/LICENSE`) | `dictionary-en/index.aff`, `dictionary-en/index.dic` | 2026-09-30 |
| vader-sentiment | 1.1.3 | npm `vader-sentiment` (Comcast JS port of VADER) | Apache-2.0 (`vader/LICENSE`, `vader/NOTICE`); VADER lexicon MIT (Hutto & Gilbert) | `vader/vader.js` (esbuild ESM bundle; exports `polarityScores(text) → {neg, neu, pos, compound}`, also the default export) | 2026-09-30 |
| Firebase JS SDK | 12.19.0 | `https://www.gstatic.com/firebasejs/12.19.0/firebase-{app,auth,firestore}.js` (import map) | Apache-2.0 | not vendored | 2026-09-30 |

Tool used: esbuild 0.28.2 via `npx -y esbuild`.
