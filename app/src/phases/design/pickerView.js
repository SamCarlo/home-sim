// The 3D half of the apartment/condo picker (07 §2, 08 §5, task 36). Browser only, loads three lazily. Three seeded
// buildings stand side by side; focusing one slides the row so it sits at the lot center (the scene clamps pan to
// ±SCENE3D.lotHalf, so the camera can't travel 200 ft sideways). Clicks (not drags) on a building report {index,
// floor, unit} through onPick. Returns null when WebGL is unavailable (the scene shows its 2D fallback).
import { h } from '../../ui/dom.js';

const TALL_FT = 80; // buildings taller than this zoom to the chosen floor

/**
 * createPickerView(container, {location, kind, options, onPick}) → Promise<{focus(index | null), highlight(index,
 * floor, unit), screenOf(index, floor, unit), clickAt(px, py), info, dispose}> | null.
 * `options` = apartmentModel.buildingOptions(state).
 */
export async function createPickerView(container, { location, kind, options, onPick }) {
  const [THREE, { generate }, { createScene }] = await Promise.all([
    import('three'), import('../../three/buildingGen.js'), import('../../three/scene.js')]);
  const view = h('div', { class: 'dz-view' });
  const tags = h('div', { class: 'dz-tags', 'aria-hidden': 'true' });
  container.append(view, tags);
  const sc = createScene(view, { location, homeTypeId: kind, monthIndex: 0 });
  if (!sc) return null;
  // The terrain's own trees would push three buildings past the draw-call budget (task 35 measured without them).
  const decor = sc.terrain.group.getObjectByName('decor');
  if (decor) decor.visible = false;

  const built = options.map((o) => generate({ style: location.styleFamily, variant: location.styleVariant,
    settlement: location.settlement, kind, seed: o.seed, season: sc.season ?? 'summer' }));
  const span = Math.max(...built.map((b) => b.bounds.max.x - b.bounds.min.x)) + 36;
  const row = new THREE.Group();
  row.name = 'picker-row';
  built.forEach((b, i) => {
    b.object.position.set((i - 1) * span, 0, 0);
    b.setNight(sc.nightFactor);
    row.add(b.object);
  });
  sc.add(row);

  const tagEls = options.map((o) => {
    const el = h('span', { class: 'dz-tag' }, o.name);
    tags.append(el);
    return el;
  });
  const v = new THREE.Vector3();
  const placeTags = () => {
    const r = view.getBoundingClientRect();
    built.forEach((b, i) => {
      b.object.getWorldPosition(v);
      v.z += b.bounds.max.z + 12;
      v.project(sc.camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.05;
      tagEls[i].hidden = off;
      tagEls[i].style.left = `${((v.x + 1) / 2) * r.width}px`;
      tagEls[i].style.top = `${((1 - v.y) / 2) * r.height}px`;
    });
  };
  const onChange = () => placeTags();
  sc.controls.addEventListener('change', onChange);

  /**
   * Frame everything (index null) or one building, which slides to the middle. With a floor on a tall building the
   * camera frames that floor and a few around it, so a 26th-floor unit isn't a speck.
   */
  let lastKey = '';
  function focus(index, floor = null) {
    const tallB = index !== null && built[index].bounds.max.y > TALL_FT;
    const key = `${index}/${tallB ? floor : ''}`;
    if (key === lastKey) return;
    lastKey = key;
    row.position.x = index === null ? 0 : -(index - 1) * span;
    sc.scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    if (index === null) built.forEach((b) => box.expandByObject(b.object));
    else box.copy(built[index].bounds).translate(built[index].object.getWorldPosition(new THREE.Vector3()));
    const tall = index !== null && box.max.y > TALL_FT;
    if (tall && floor) {
      const band = built[index].floorBands[floor - 1];
      box.min.y = Math.max(0, band.y0 - TALL_FT / 2);
      box.max.y = band.y1 + TALL_FT / 2;
    }
    sc.setPanLimits({ yMax: Math.max(40, box.max.y) });
    tags.hidden = index !== null;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const low = size.y < size.x * 0.25;
    sc.controls.target.copy(center);
    sc.camera.position.copy(center).add(new THREE.Vector3(index === null ? 0.2 : 0.35, low ? 0.42 : 0.32, 1).multiplyScalar(Math.max(size.x, size.y) * 1.4));
    sc.frame(box, { padding: index === null ? (low ? 0.8 : 0.9) : 0.95 });
    placeTags();
  }

  /** Glow a floor band (unit null) or one unit on building `index`; everything else goes dark. */
  function highlight(index, floor, unit = null) {
    built.forEach((b, i) => b.highlight(i === index ? floor : null, i === index ? unit : null));
    if (index !== null && floor && unit !== null && unit !== undefined) built[index].setUnit(floor, unit);
    sc.requestRender();
  }

  const ray = new THREE.Raycaster();
  /** The {index, floor, unit} under a canvas pixel, or null. */
  function pickAt(px, py) {
    const r = view.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1), sc.camera);
    for (let i = 0; i < built.length; i++) {
      const hit = built[i].pick(ray);
      if (hit) return { index: i, ...hit };
    }
    return null;
  }
  /** Run a click at a canvas pixel (also used by e2e checks). */
  function clickAt(px, py) {
    const hit = pickAt(px, py);
    if (hit) onPick(hit);
    return hit;
  }
  /** Canvas pixel of the middle of a floor band or unit (for e2e checks). */
  function screenOf(index, floor, unit = null) {
    const b = built[index], p = b.plan;
    const band = b.floorBands[floor - 1];
    const col = unit === null ? (p.cols - 1) / 2 : unit % p.cols;
    v.set(-p.width / 2 + (col + 0.5) * p.unitW, (band.y0 + band.y1) / 2, p.depth / 2 + 0.2);
    b.object.localToWorld(v).project(sc.camera);
    const r = view.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  }

  let down = null;
  const canvas = sc.renderer.domElement;
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
  const onUp = (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const r = view.getBoundingClientRect();
    clickAt(e.clientX - r.left, e.clientY - r.top);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  const api = {
    focus, highlight, pickAt, clickAt, screenOf, scene: sc,
    get info() { return sc.info; },
    firstFrame: () => sc.firstFrame().then((info) => { placeTags(); return info; }),
    dispose() {
      sc.controls.removeEventListener('change', onChange);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      built.forEach((b) => b.dispose());
      sc.dispose();
    },
  };
  return api;
}
