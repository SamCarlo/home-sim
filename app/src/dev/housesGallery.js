// `?dev=houses&loc=<id>&variant=house|shared&seed=&palette=&extras=0|1&t=&month=` (08 §8, task 37): one generated
// house for a location in its regional style, with its yard. `extras=1` (default) adds the 07 §3 customizations
// (2 garden beds, 2 fruit trees, a coop) so the spots can be checked. `window.__houses` = plan + scene stats.
import { h, clear } from '../ui/dom.js';
import { byId } from '../data/locations/index.js';
import { SCENE3D } from '../config.js';

/** Render the houses gallery into root. Returns a cleanup function. */
export async function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const q = new URLSearchParams(location.search);
  const loc = byId[q.get('loc')] ?? byId.hilo;
  const variant = q.get('variant') === 'shared' ? 'shared' : 'house';
  const t = Number(q.get('t') ?? 0.42);
  const month = Number(q.get('month') ?? 5);
  const seed = Number(q.get('seed') ?? 0);
  const palette = q.has('palette') ? Number(q.get('palette')) : null;
  const extras = q.get('extras') === '0' ? {} : { gardenBeds: 2, fruitTrees: 2, coop: true };

  const view = h('div', { class: 'dev-scene-view' });
  const label = h('div', { class: 'dev-scene-label' }, 'Loading 3D…');
  root.append(h('section', { class: 'dev-scene' }, view, label));

  const [THREE, { generate }, { triangleCount }, { createScene }] = await Promise.all([
    import('three'), import('../three/houseGen.js'), import('../three/propKit.js'), import('../three/scene.js')]);
  const sc = createScene(view, { location: loc, timeOfDay: t, monthIndex: month });
  if (!sc) { label.textContent = 'Fallback shown'; document.body.dataset.ready = '1'; return () => {}; }
  window.__scene = sc;
  const house = generate({ style: loc.styleFamily, styleVariant: loc.styleVariant, variant, seed, palette, extras,
    biome: loc.biome, season: sc.season, snow: !!sc.season?.snow, sqft: loc.housing?.house?.sqft, bedrooms: loc.housing?.house?.bedrooms });
  house.setNight(sc.nightFactor);
  sc.add(house.object);
  sc.setPanLimits?.({ half: 70, yMax: 40 });

  sc.scene.updateMatrixWorld(true);
  const box = house.bounds;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  sc.controls.target.copy(center);
  sc.camera.position.copy(center).add(new THREE.Vector3(0.55, 0.42, 1).multiplyScalar(Math.max(size.x, size.z) * 1.2));
  sc.frame(box, { padding: 0.95 });

  const info = await sc.firstFrame();
  const { drawCalls, triangles } = SCENE3D.budget;
  const ok = info.calls <= drawCalls && info.triangles <= triangles;
  const p = house.plan;
  clear(label).append(
    h('strong', null, `House · ${loc.name} · ${variant}`),
    h('span', null, ` · ${p.beds} bd / ${p.baths} ba · ${p.sqft.toLocaleString()} sq ft · ${p.wings.length} wing${p.wings.length === 1 ? '' : 's'} (${p.wings.map((w) => w.side).join(', ') || 'none'})`),
    h('span', null, ` · house ${triangleCount(house.object)} tris`),
    h('span', { class: ok ? 'is-ok' : 'is-bad' }, ` · scene ${info.calls}/${drawCalls} calls · ${info.triangles}/${triangles} tris`));
  window.__houses = { loc: loc.id, variant, beds: p.beds, baths: p.baths, sqft: p.sqft, wings: p.wings.map((w) => w.side),
    garage: p.garage, fence: p.fence, calls: info.calls, triangles: info.triangles, path: house.path.length };
  console.info('houses', JSON.stringify(window.__houses));
  document.body.dataset.ready = '1';
  return () => { house.dispose(); sc.dispose(); delete window.__scene; delete window.__houses; delete document.body.dataset.ready; };
}
