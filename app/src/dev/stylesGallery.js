// `?dev=styles&family=<key>&variant=&palette=<i>&loc=<id>&month=<i>&t=<0..1>` (08 §4, §8): a labeled 4 × 4 grid of swatch
// houses, one per style family (three/styleSwatch.js), or one family close up with `family=`. `palette` picks the
// palette index; `window.__styles` has per-family triangle counts.
import { h, clear } from '../ui/dom.js';
import { byId } from '../data/locations/index.js';
import { STYLE_FAMILY_LIST } from '../data/styleFamilies.js';
import { SCENE3D } from '../config.js';

const CELL = 95; // ft between swatch centers

/** Render the styles gallery into root. Returns a cleanup function. */
export async function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const q = new URLSearchParams(location.search);
  const loc = byId[q.get('loc')] ?? byId.katy;
  const month = Number(q.get('month') ?? 5);
  const t = Number(q.get('t') ?? 0.42);
  const palette = Number(q.get('palette') ?? 0);
  const only = STYLE_FAMILY_LIST.find((f) => f.key === q.get('family'));

  const view = h('div', { class: 'dev-scene-view' });
  const tags = h('div', { class: 'dev-styles-tags' });
  const label = h('div', { class: 'dev-scene-label' }, 'Loading 3D…');
  root.append(h('section', { class: 'dev-scene' }, view, tags, label));

  const [THREE, { createSwatchHouse }, { triangleCount }, { createScene }] = await Promise.all([
    import('three'), import('../three/styleSwatch.js'), import('../three/propKit.js'), import('../three/scene.js')]);
  const sc = createScene(view, { location: loc, timeOfDay: t, monthIndex: month });
  if (!sc) { label.textContent = 'Fallback shown'; document.body.dataset.ready = '1'; return () => {}; }
  window.__scene = sc;
  sc.terrain.group.getObjectByName('decor').visible = false; // terrain trees would mix with the swatches

  const families = only ? [only] : STYLE_FAMILY_LIST;
  const counts = {};
  const placed = [];
  families.forEach((f, i) => {
    const sw = createSwatchHouse(f.key, { variant: only ? q.get('variant') : null, palette, season: sc.season });
    const x = only ? 0 : ((i % 4) - 1.5) * CELL, z = only ? 0 : (Math.floor(i / 4) - 1.5) * CELL;
    sw.object.position.x += x;
    sw.object.position.z += z;
    sw.kit.setNight(sc.nightFactor);
    sc.add(sw.object);
    counts[f.key] = triangleCount(sw.object);
    placed.push({ family: f, sw, anchor: new THREE.Vector3(x, 0, z + sw.size.d / 2 + 22) });
  });

  sc.scene.updateMatrixWorld(true); // setFromObject reads matrixWorld, which is stale until the first render
  const box = new THREE.Box3();
  placed.forEach((p) => box.expandByObject(p.sw.object));
  const center = box.getCenter(new THREE.Vector3());
  sc.controls.target.copy(center);
  sc.camera.position.copy(center).add(new THREE.Vector3(only ? 0.7 : 0.12, only ? 0.45 : 1.15, 1).multiplyScalar(only ? 120 : 420));
  sc.frame(box, { padding: only ? 0.85 : 0.74 });

  // HTML labels under each swatch, re-projected when the camera moves.
  const tagEls = placed.map((p) => {
    const el = h('span', { class: 'dev-styles-tag' }, p.family.label);
    tags.append(el);
    return el;
  });
  const v = new THREE.Vector3();
  const placeTags = () => {
    const r = view.getBoundingClientRect();
    placed.forEach((p, i) => {
      v.copy(p.anchor).project(sc.camera);
      tagEls[i].style.left = `${((v.x + 1) / 2) * r.width}px`;
      tagEls[i].style.top = `${((1 - v.y) / 2) * r.height}px`;
    });
  };
  sc.controls?.addEventListener?.('change', placeTags);

  const info = await sc.firstFrame();
  placeTags();
  const { drawCalls, triangles } = SCENE3D.budget;
  clear(label).append(
    h('strong', null, only ? `Style · ${only.label} · palette ${palette}` : `Styles · all ${families.length} families · palette ${palette}`),
    h('span', null, ` · ${loc.name} · tris per swatch ${Math.min(...Object.values(counts))}–${Math.max(...Object.values(counts))}`),
    h('span', { class: info.calls <= drawCalls ? 'is-ok' : 'is-bad' }, ` · scene ${info.calls}/${drawCalls} calls · ${info.triangles}/${triangles} tris`));
  window.__styles = counts;
  console.info('styles', JSON.stringify(counts));
  document.body.dataset.ready = '1';
  return () => { sc.controls?.removeEventListener?.('change', placeTags); sc.dispose(); delete window.__scene; delete window.__styles; delete document.body.dataset.ready; };
}
