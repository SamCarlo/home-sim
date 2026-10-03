// The Phase 4 3D view (09 §1, task 42). Browser only, loads three lazily. Builds the scene for the home's location and
// month, renders the student's home with homeRender, and frames it (tall buildings frame the student's floor, like the
// apartment picker). The animation (task 45) drives `scene.setTimeOfDay` and `home.character`; call `refreshNight()` after.
// Returns null when WebGL is unavailable (the scene shows its 2D fallback).
import { h } from '../../ui/dom.js';
import { LIFE3D } from '../../config.js';

const TALL_FT = 80; // buildings taller than this frame the student's floor instead of the whole tower

/** createLifeView(container, {state}) → Promise<{scene, home, info, refreshNight, setLiving, firstFrame, dispose}> | null. */
export async function createLifeView(container, { state }) {
  const [THREE, { renderHome }, { createScene }, { byId }] = await Promise.all([
    import('three'), import('../../three/homeRender.js'), import('../../three/scene.js'), import('../../data/locations/index.js')]);
  const home0 = state.home;
  const location = byId[home0.locationId];
  const view = h('div', { class: 'life-view' });
  container.append(view);
  const sc = createScene(view, { location, homeTypeId: home0.kind, monthIndex: state.life.monthIndex, timeOfDay: LIFE3D.idleTimeOfDay });
  if (!sc) return null;
  const building = home0.kind === 'apartment' || home0.kind === 'condo';
  if (building) { // the terrain's trees would push a building past the draw-call budget (task 35)
    const decor = sc.terrain.group.getObjectByName('decor');
    if (decor) decor.visible = false;
  }

  const home = renderHome(state, { season: sc.season ?? 'summer', nightFactor: sc.nightFactor });
  sc.add(home.object);
  sc.scene.updateMatrixWorld(true);

  const box = home.bounds.clone();
  const tall = building && box.max.y > TALL_FT;
  if (tall) {
    const band = home.generator.floorBands?.[(home0.building?.floor ?? 1) - 1];
    if (band) { box.min.y = Math.max(0, band.y0 - TALL_FT / 2); box.max.y = band.y1 + TALL_FT / 2; }
  }
  sc.setPanLimits({ half: Math.max(70, (box.max.x - box.min.x) / 2 + 20), yMax: Math.max(40, box.max.y) });
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const low = size.y < Math.max(size.x, size.z) * 0.5;
  sc.controls.target.copy(center);
  sc.camera.position.copy(center).add(new THREE.Vector3(0.55, low ? 0.42 : 0.3, 1)
    .multiplyScalar(Math.max(size.x, size.y, size.z) * (building ? 1.4 : 1.2)));
  sc.frame(box, { padding: tall ? LIFE3D.towerFramePadding : building ? LIFE3D.buildingFramePadding : LIFE3D.framePadding });

  return {
    scene: sc,
    home,
    get info() { return sc.info; },
    /** Re-apply window glow after a time-of-day change. */
    refreshNight() { home.setNight(sc.nightFactor); sc.requestRender(); },
    /** Show wilted plants / departed animals from a home record. */
    setLiving(h2) { home.setLiving(h2); sc.requestRender(); },
    firstFrame: () => sc.firstFrame(),
    dispose() { home.dispose(); sc.dispose(); },
  };
}
