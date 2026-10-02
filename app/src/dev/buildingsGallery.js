// `?dev=buildings&loc=<id>&kind=apartment|condo&all=1&hl=<floor>[,<unit>]&t=&month=&seed=` (08 §8, task 35): the three
// seeded buildings for a location side by side (as the picker will show them), or `all=1` one building per location
// in a labeled grid. `hl` highlights a floor (or a unit) on the middle building. `window.__buildings` = per-building
// stats; `window.__pick(x, y)` picks at a canvas pixel (for e2e checks).
import { h, clear } from '../ui/dom.js';
import { LOCATIONS, byId } from '../data/locations/index.js';
import { SCENE3D } from '../config.js';
import { seedFor } from '../util/rng.js';

/** Render the buildings gallery into root. Returns a cleanup function. */
export async function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const q = new URLSearchParams(location.search);
  const all = q.get('all') === '1';
  const loc = byId[q.get('loc')] ?? byId.honolulu;
  const kind = q.get('kind') === 'condo' ? 'condo' : 'apartment';
  const t = Number(q.get('t') ?? 0.42);
  const month = Number(q.get('month') ?? 5);
  const base = Number(q.get('seed') ?? 0);
  const [hlFloor, hlUnit] = (q.get('hl') ?? '').split(',').map((s) => (s === '' ? null : Number(s)));

  const view = h('div', { class: 'dev-scene-view' });
  const tags = h('div', { class: 'dev-styles-tags' });
  const label = h('div', { class: 'dev-scene-label' }, 'Loading 3D…');
  root.append(h('section', { class: 'dev-scene' }, view, tags, label));

  const [THREE, { generate }, { triangleCount }, { createScene }] = await Promise.all([
    import('three'), import('../three/buildingGen.js'), import('../three/propKit.js'), import('../three/scene.js')]);
  const sc = createScene(view, { location: all ? byId.katy : loc, timeOfDay: t, monthIndex: month });
  if (!sc) { label.textContent = 'Fallback shown'; document.body.dataset.ready = '1'; return () => {}; }
  window.__scene = sc;
  sc.terrain.group.getObjectByName('decor').visible = false;

  const jobs = all
    ? LOCATIONS.map((l, i) => ({ l, seed: seedFor('gallery', base, i) }))
    : [0, 1, 2].map((i) => ({ l: loc, seed: seedFor('building', base, i) }));
  const built = jobs.map(({ l, seed }) => generate({ style: l.styleFamily, variant: l.styleVariant, settlement: l.settlement, kind, seed, season: sc.season }));
  // Layout: a row (three) or a 5-wide grid (all), spaced by the widest footprint.
  const span = Math.max(...built.map((b) => b.bounds.max.x - b.bounds.min.x)) + 36;
  const deep = Math.max(...built.map((b) => b.bounds.max.z - b.bounds.min.z)) + 60;
  const stats = [];
  built.forEach((b, i) => {
    const x = all ? ((i % 5) - 2) * span : (i - 1) * span;
    const z = all ? (Math.floor(i / 5) - 1.5) * deep : 0;
    b.object.position.set(x, 0, z);
    b.setNight(sc.nightFactor);
    sc.add(b.object);
    const p = b.plan;
    stats.push({ loc: jobs[i].l.id, form: p.form, floors: p.floors, units: p.unitsPerFloor, tris: triangleCount(b.object) });
  });
  const focus = built[all ? 0 : 1];
  if (hlFloor) focus.highlight(hlFloor, hlUnit);

  sc.scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  built.forEach((b) => box.expandByObject(b.object));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  sc.controls.target.copy(center);
  const low = size.y < size.x * 0.25; // a row of walk-ups: the bounding sphere overstates what needs to fit
  sc.camera.position.copy(center).add(new THREE.Vector3(0.35, all ? 0.9 : low ? 0.42 : 0.32, 1).multiplyScalar(Math.max(size.x, size.y) * 1.4));
  sc.frame(box, { padding: all ? 0.8 : low ? 0.68 : 0.9 });

  const tagEls = built.map((b, i) => {
    const s = stats[i];
    const el = h('span', { class: 'dev-styles-tag' }, `${all ? `${jobs[i].l.name} · ` : ''}${s.form} · ${s.floors} fl · ${s.units}/fl`);
    tags.append(el);
    return el;
  });
  const v = new THREE.Vector3();
  const placeTags = () => {
    const r = view.getBoundingClientRect();
    built.forEach((b, i) => {
      v.set(b.object.position.x, 0, b.object.position.z + b.bounds.max.z + 14).project(sc.camera);
      tagEls[i].style.left = `${((v.x + 1) / 2) * r.width}px`;
      tagEls[i].style.top = `${((1 - v.y) / 2) * r.height}px`;
    });
  };
  sc.controls?.addEventListener?.('change', placeTags);

  const ray = new THREE.Raycaster();
  window.__pick = (px, py) => {
    const r = view.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1), sc.camera);
    for (const b of built) { const hit = b.pick(ray); if (hit) return { loc: b.plan.style, ...hit }; }
    return null;
  };

  const info = await sc.firstFrame();
  placeTags();
  const { drawCalls, triangles } = SCENE3D.budget;
  const ok = info.calls <= drawCalls && info.triangles <= triangles;
  clear(label).append(
    h('strong', null, all ? `Buildings · one ${kind} per location` : `Buildings · ${loc.name} · ${kind}`),
    h('span', null, hlFloor ? ` · highlight floor ${hlFloor}${hlUnit !== null && hlUnit !== undefined ? ` unit ${hlUnit}` : ''}` : ''),
    h('span', null, ` · tris per building ${Math.min(...stats.map((s) => s.tris))}–${Math.max(...stats.map((s) => s.tris))}`),
    h('span', { class: ok ? 'is-ok' : 'is-bad' }, ` · scene ${info.calls}/${drawCalls} calls · ${info.triangles}/${triangles} tris`));
  window.__buildings = { stats, calls: info.calls, triangles: info.triangles };
  console.info('buildings', JSON.stringify(window.__buildings));
  document.body.dataset.ready = '1';
  return () => {
    sc.controls?.removeEventListener?.('change', placeTags);
    built.forEach((b) => b.dispose());
    sc.dispose();
    delete window.__scene; delete window.__buildings; delete window.__pick; delete document.body.dataset.ready;
  };
}
