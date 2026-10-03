// The 3D half of the house and shared-living pickers (07 §3–§4, 08 §5, task 38). Browser only, loads three lazily.
// One generated house at a time (a house is 80–110 draw calls, so three side by side would blow the 150 budget);
// `show(spec)` rebuilds only when the listing, palette or extras change. An optional pin marks the chosen room.
// Returns null when WebGL is unavailable (the scene shows its 2D fallback).
import { h } from '../../ui/dom.js';

/**
 * createHouseView(container, {location, variant: 'house'|'shared'}) → Promise<{show({seed, palette, extras, sqft,
 * bedrooms, pin: {x, z, up} | null}), info, current, firstFrame, dispose}> | null.
 */
export async function createHouseView(container, { location, variant }) {
  const [THREE, { generate }, { createScene }] = await Promise.all([
    import('three'), import('../../three/houseGen.js'), import('../../three/scene.js')]);
  const view = h('div', { class: 'dz-view' });
  container.append(view);
  const sc = createScene(view, { location, homeTypeId: variant, monthIndex: 0 });
  if (!sc) return null;
  sc.setPanLimits({ half: 70, yMax: 40 });

  const pinMat = new THREE.MeshBasicMaterial({ color: '#2f8fd8' });
  const pin = new THREE.Group();
  pin.name = 'room-pin';
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 12), pinMat);
  cone.rotation.x = Math.PI;
  cone.position.y = 2;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(2, 14, 10), pinMat);
  ball.position.y = 5.2;
  pin.add(cone, ball);
  pin.visible = false;
  sc.add(pin);

  let house = null, key = '', framedSeed = null;
  /** Show a house; rebuilds when seed, palette or extras change, reframes only when the listing changes. */
  function show({ seed, palette = null, extras = {}, sqft = null, bedrooms = null, pin: at = null }) {
    const k = JSON.stringify([seed, palette, extras, sqft, bedrooms]);
    if (k !== key) {
      key = k;
      house?.dispose();
      house = generate({ style: location.styleFamily, styleVariant: location.styleVariant, variant, seed, palette, extras,
        biome: location.biome, season: sc.season, snow: !!sc.season?.snow, sqft, bedrooms });
      house.setNight(sc.nightFactor);
      sc.add(house.object);
      sc.scene.updateMatrixWorld(true);
    }
    if (seed !== framedSeed) {
      framedSeed = seed;
      const box = house.bounds;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      sc.controls.target.copy(center);
      sc.camera.position.copy(center).add(new THREE.Vector3(0.55, 0.42, 1).multiplyScalar(Math.max(size.x, size.z) * 1.2));
      sc.frame(box, { padding: 0.95 });
    }
    pin.visible = !!at;
    if (at) {
      const { main, houseZ } = house.plan;
      const top = house.bounds.max.y;
      pin.position.set(at.x * (main.w / 2 - 5), top + 2, houseZ + at.z * (main.d / 2 - 4));
    }
    sc.requestRender();
  }

  return {
    show,
    scene: sc,
    get info() { return sc.info; },
    get current() { return house; },
    firstFrame: () => sc.firstFrame(),
    dispose() {
      house?.dispose();
      cone.geometry.dispose();
      ball.geometry.dispose();
      pinMat.dispose();
      sc.dispose();
    },
  };
}
