// `?dev=scene&biome=<b>&t=<0..1>&month=<i>&landmark=<key>&loc=<id>` (08 §8): an empty lot, sky, terrain and landmark.
// Missing params come from `loc`, else the first place with that landmark/biome. Shows draw calls and triangles vs
// the 01 §10 budget; `window.__scene` is the scene handle for shoot evals.
import { h, clear } from '../ui/dom.js';
import { LOCATIONS, byId } from '../data/locations/index.js';
import { SCENE3D } from '../config.js';
import { monthName } from '../util/dates.js';

/** Render the scene gallery into root. Returns a cleanup function. */
export async function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const q = new URLSearchParams(location.search);
  const biomeQ = q.get('biome'), landmarkQ = q.get('landmark');
  const loc = byId[q.get('loc')]
    ?? LOCATIONS.find((l) => l.landmark === landmarkQ && (!biomeQ || l.biome === biomeQ))
    ?? LOCATIONS.find((l) => l.biome === biomeQ)
    ?? LOCATIONS[0];
  const biome = biomeQ ?? loc.biome;
  const landmark = landmarkQ ?? loc.landmark;
  const t = Number(q.get('t') ?? SCENE3D.timeOfDay);
  const month = Number(q.get('month') ?? 0);

  const view = h('div', { class: 'dev-scene-view' });
  const label = h('div', { class: 'dev-scene-label' }, 'Loading 3D…');
  root.append(h('section', { class: 'dev-scene' }, view, label));

  const { createScene } = await import('../three/scene.js');
  const sc = createScene(view, { biome, landmark, location: { ...loc, biome, landmark }, timeOfDay: t, monthIndex: month });
  if (!sc) { label.textContent = 'Fallback shown'; document.body.dataset.ready = '1'; return () => {}; }
  window.__scene = sc;
  const season = sc.season;
  const info = await sc.firstFrame();
  const { drawCalls, triangles } = SCENE3D.budget;
  const ok = info.calls <= drawCalls && info.triangles <= triangles;
  clear(label).append(
    h('strong', null, `${loc.name} · ${biome} · ${landmark}`),
    h('span', null, ` · t ${t.toFixed(2)} · ${monthName(month)}${season.snow ? ' (snow)' : season.fall ? ' (fall color)' : ''}`),
    h('span', null, ` · night ${sc.nightFactor.toFixed(2)}`),
    h('span', { class: ok ? 'is-ok' : 'is-bad' }, ` · ${info.calls}/${drawCalls} calls · ${info.triangles}/${triangles} tris`));
  console.info('scene', JSON.stringify({ biome, landmark, t, month, ...info }));
  document.body.dataset.ready = '1';
  return () => { sc.dispose(); delete window.__scene; delete document.body.dataset.ready; };
}
