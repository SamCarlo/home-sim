// The live 3D half of the blueprint editor (07 §5, task 41). Browser only, loads three lazily. `update(bp)` rebuilds
// BLUEPRINT.view3d.debounceMs after the last change; the camera is framed once (and again when the first room appears)
// and otherwise keeps the student's angle across rebuilds. Returns null when WebGL is unavailable (the scene shows its
// 2D fallback note).
import { h } from '../../../ui/dom.js';
import { BLUEPRINT } from '../../../config.js';

/**
 * createBlueprintView(container, {location, palette?, seed?}) → Promise<{update(bp), rebuildNow(bp), info, current,
 * builds, firstFrame, dispose}> | null.
 */
export async function createBlueprintView(container, { location, palette = 0, seed = 0 }) {
  const [THREE, { build }, { createScene }] = await Promise.all([
    import('three'), import('../../../three/blueprintTo3d.js'), import('../../../three/scene.js')]);
  const view = h('div', { class: 'dz-view' });
  container.append(view);
  const sc = createScene(view, { location, homeTypeId: 'build', monthIndex: 0 });
  if (!sc) return null;
  sc.setPanLimits({ half: 80, yMax: 40 });

  let house = null, timer = null, framedEmpty = null, builds = 0, disposed = false;
  function frame() {
    const box = house.bounds;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    sc.controls.target.copy(center);
    sc.camera.position.copy(center).add(new THREE.Vector3(0.55, 0.5, 1).multiplyScalar(Math.max(size.x, size.z) * 1.15));
    sc.frame(box, { padding: 0.95 });
  }
  /** Rebuild the house now (no debounce). */
  function rebuildNow(bp) {
    clearTimeout(timer);
    timer = null;
    if (disposed) return;
    house?.dispose();
    house = build(bp, { style: location.styleFamily, styleVariant: location.styleVariant, palette, biome: location.biome,
      season: sc.season, snow: !!sc.season?.snow, seed });
    house.setNight(sc.nightFactor);
    sc.add(house.object);
    sc.scene.updateMatrixWorld(true);
    builds++;
    const empty = !bp.rooms.length;
    if (framedEmpty !== empty && (framedEmpty === null || framedEmpty)) frame(); // first build, or the first room
    framedEmpty = empty;
    sc.requestRender();
  }
  return {
    /** Schedule a rebuild after the debounce. */
    update(bp) { clearTimeout(timer); timer = setTimeout(() => rebuildNow(bp), BLUEPRINT.view3d.debounceMs); },
    rebuildNow,
    scene: sc,
    get pending() { return timer !== null; },
    get builds() { return builds; },
    get info() { return sc.info; },
    get current() { return house; },
    firstFrame: () => sc.firstFrame(),
    dispose() { disposed = true; clearTimeout(timer); house?.dispose(); sc.dispose(); },
  };
}
