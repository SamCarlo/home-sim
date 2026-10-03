#!/usr/bin/env node
// WCAG AA contrast check for the design tokens (12 §3–§4, task 54). Zero deps.
//
//   node tools/contrast.mjs          # prints every pair, exits 1 on any failure
//   node tools/contrast.mjs --quiet  # failures only
//
// Reads app/styles/tokens.css: the bare :root block is the light theme, :root[data-theme="dark"] overrides it for dark.
// It also fails if the OS-dark block (@media prefers-color-scheme) drifts from the data-theme="dark" block.
// Text pairs need 4.5:1 (AA normal text). UI pairs (focus ring, status icons, wellbeing bars) need 3:1 (WCAG 1.4.11).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(HS, 'app/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const quiet = process.argv.includes('--quiet');

const SURFACES = ['bg', 'surface', 'surface-2', 'field'];
const STATUSES = ['red', 'yellow', 'cyan', 'green', 'na'];
const WELLBEING = ['physical', 'purpose', 'financial', 'social', 'mental'];

/** [foreground, background, minimum ratio, what] — every text/background pairing the stylesheets use. */
const PAIRS = [
  // Body copy and links on every page surface.
  ...['ink', 'ink-2', 'muted', 'accent', 'accent-ink', 'danger', 'danger-ink', 'sunset-ink', 'sky-deep']
    .flatMap((fg) => SURFACES.map((bg) => [fg, bg, 4.5, 'text'])),
  // Status chips and table cells: ink on its tint and on a plain surface.
  ...STATUSES.flatMap((s) => [[`st-${s}-ink`, `st-${s}-bg`, 4.5, 'status text'], [`st-${s}-ink`, 'surface', 4.5, 'status text']]),
  // Filled buttons and washes.
  ['accent-on', 'accent', 4.5, 'primary button'],
  ['danger-on', 'danger', 4.5, 'danger button'],
  ['accent-ink', 'accent-wash', 4.5, 'accent wash'],
  ['ink', 'accent-wash', 4.5, 'accent wash'],
  ['danger-ink', 'danger-wash', 4.5, 'danger wash'],
  ['sunset-ink', 'sunset-wash', 4.5, 'sunset wash'],
  ['sky-deep', 'sky-wash', 4.5, 'sky wash'],
  ['ink', 'sky-wash', 4.5, 'sky wash'],
  ['ink', 'plumeria', 4.5, 'letter paper'],
  ['ink-2', 'plumeria', 4.5, 'letter paper'],
  ['ink-2', 'surface-2', 4.5, 'text'],
  // Non-text UI: focus ring, status icons and wellbeing bars must stand out from the surface (3:1).
  ...SURFACES.map((bg) => ['sky', bg, 3, 'focus ring']),
  ...STATUSES.filter((s) => s !== 'na').map((s) => [`st-${s}`, 'surface', 3, 'status icon']),
  ...WELLBEING.map((d) => [`wb-${d}`, 'surface', 3, 'wellbeing bar']),
];

const light = block(/(^|\n)\s*:root\s*\{([^}]*)\}/);
const darkTheme = block(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
const darkOs = block(/:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/);
// The life screen's time-budget bar adds its own orange ink (life.css `.life` block + its dark override).
const lifeCss = fs.readFileSync(path.join(HS, 'app/styles/life.css'), 'utf8');
const lifeLight = vars(lifeCss.match(/\n\.life\s*\{(\s*--tb-[^}]*)\}/)?.[1] ?? '');
const lifeDark = vars(lifeCss.match(/:root\[data-theme="dark"\] \.life\s*\{([^}]*)\}/)?.[1] ?? '');
PAIRS.push(['tb-orange-ink', 'surface', 4.5, 'time budget text'], ['tb-orange', 'surface', 3, 'time budget bar']);
const themes = { light: { ...light, ...lifeLight }, dark: { ...light, ...darkTheme, ...lifeLight, ...lifeDark } };

let failures = 0;
for (const k of new Set([...Object.keys(darkTheme), ...Object.keys(darkOs)])) {
  if (darkTheme[k] !== darkOs[k]) { failures++; console.log(`✗ dark blocks differ on --${k}: ${darkOs[k]} (OS) vs ${darkTheme[k]} (data-theme)`); }
}
for (const [name, vars] of Object.entries(themes)) {
  for (const [fg, bg, min, what] of PAIRS) {
    const a = rgb(vars[fg], fg), b = rgb(vars[bg], bg);
    const r = ratio(a, b);
    const ok = r >= min;
    if (!ok) failures++;
    if (!ok || !quiet) console.log(`${ok ? '✓' : '✗'} ${name.padEnd(5)} --${fg} on --${bg}  ${r.toFixed(2)} (≥ ${min}, ${what})`);
  }
}
console.log(`contrast: ${failures ? `${failures} failing` : 'all pass'} (${PAIRS.length} pairs × 2 themes)`);
process.exit(failures ? 1 : 0);

/** Custom properties declared in the first block matching `re` (its last capture group is the body). */
function block(re) {
  const m = css.match(re);
  if (!m) throw new Error(`tokens.css: block ${re} not found`);
  return vars(m[m.length - 1]);
}

/** `--name: value;` declarations in a CSS block body → {name: value}. */
function vars(body) {
  const out = {};
  for (const [, k, v] of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) out[k] = v.trim();
  return out;
}

function rgb(value, name) {
  const m = /^#([0-9a-f]{6})$/i.exec(value ?? '');
  if (!m) throw new Error(`--${name}: expected a #rrggbb color, got ${value}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
