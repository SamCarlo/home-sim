// `?dev=blueprint3d&template=tiny|cozy|family&loc=<id>&yard=0|1&roof=&siding=&t=&month=` (08 §8, task 41): a blueprint
// template built in 3D for a location. `yard=1` (default) adds 2 garden beds, a fruit tree, a coop, a driveway, a patio,
// a rain garden, the fence, 4 kW of solar and catchment so every yard prop can be checked. `window.__bp3d` = stats.
import { h, clear } from '../ui/dom.js';
import { byId } from '../data/locations/index.js';
import { SCENE3D } from '../config.js';
import { lotOf } from '../phases/design/blueprint/model.js';
import { templateBlueprint, TEMPLATE_IDS } from '../phases/design/blueprint/templates.js';
import { addYardItem, setFence } from '../phases/design/blueprint/yard.js';

/** Render the blueprint 3D gallery into root. Returns a cleanup function. */
export async function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const q = new URLSearchParams(location.search);
  const loc = byId[q.get('loc')] ?? byId.pahoa;
  const id = TEMPLATE_IDS.includes(q.get('template')) ? q.get('template') : 'cozy';
  let bp = templateBlueprint(id, lotOf(loc), { solarKw: 0, catchmentGallons: 0 });
  if (q.get('yard') !== '0') {
    for (const k of ['garden-bed', 'garden-bed', 'fruit-tree', 'coop', 'driveway', 'patio', 'rain-garden']) bp = addYardItem(bp, k);
    bp = { ...setFence(bp, true), solarKw: 4, catchmentGallons: loc.water === 'catchment' ? 10000 : 0 };
  }
  if (q.has('roof')) bp = { ...bp, roof: { ...bp.roof, style: q.get('roof') } };
  if (q.has('siding')) bp = { ...bp, exterior: { ...bp.exterior, siding: q.get('siding') } };

  const view = h('div', { class: 'dev-scene-view' });
  const label = h('div', { class: 'dev-scene-label' }, 'Loading 3D…');
  root.append(h('section', { class: 'dev-scene' }, view, label));
  const [THREE, { build }, { triangleCount }, { createScene }] = await Promise.all([
    import('three'), import('../three/blueprintTo3d.js'), import('../three/propKit.js'), import('../three/scene.js')]);
  const sc = createScene(view, { location: loc, timeOfDay: Number(q.get('t') ?? 0.42), monthIndex: Number(q.get('month') ?? 5) });
  if (!sc) { label.textContent = 'Fallback shown'; document.body.dataset.ready = '1'; return () => {}; }
  window.__scene = sc;
  const t0 = performance.now();
  const house = build(bp, { style: loc.styleFamily, styleVariant: loc.styleVariant, biome: loc.biome, season: sc.season, snow: !!sc.season?.snow });
  const buildMs = Math.round(performance.now() - t0);
  house.setNight(sc.nightFactor);
  sc.add(house.object);
  sc.setPanLimits?.({ half: 80, yMax: 40 });
  sc.scene.updateMatrixWorld(true);
  const box = house.bounds;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  sc.controls.target.copy(center);
  sc.camera.position.copy(center).add(new THREE.Vector3(0.55, 0.5, 1).multiplyScalar(Math.max(size.x, size.z) * 1.15));
  sc.frame(box, { padding: 0.95 });

  const info = await sc.firstFrame();
  const { drawCalls, triangles } = SCENE3D.budget;
  const ok = info.calls <= drawCalls && info.triangles <= triangles;
  clear(label).append(
    h('strong', null, `Blueprint · ${id} · ${loc.name}`),
    h('span', null, ` · ${house.info.rooms} rooms · ${house.info.walls} walls · ${house.info.openings} openings · ${house.info.yard} yard items · built in ${buildMs} ms`),
    h('span', null, ` · house ${triangleCount(house.object)} tris`),
    h('span', { class: ok ? 'is-ok' : 'is-bad' }, ` · scene ${info.calls}/${drawCalls} calls · ${info.triangles}/${triangles} tris`));
  window.__bp3d = { loc: loc.id, template: id, ...house.info, buildMs, calls: info.calls, triangles: info.triangles, path: house.path.length };
  console.info('blueprint3d', JSON.stringify(window.__bp3d));
  document.body.dataset.ready = '1';
  return () => { house.dispose(); sc.dispose(); delete window.__scene; delete window.__bp3d; delete document.body.dataset.ready; };
}
