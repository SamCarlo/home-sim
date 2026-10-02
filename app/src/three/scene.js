// The 3D scene every 3D screen builds on (08 §2): renderer, camera + limited OrbitControls, render on demand,
// ResizeObserver, frame(box3), a pausable RAF loop, dispose() and the WebGL fallback. Browser only, load with import().
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SCENE3D } from '../config.js';
import { createSky } from './sky.js';
import { createTerrain } from './terrain.js';
import { disposeMaterials } from './materials.js';

const DEG = Math.PI / 180;
const VIEW_DIR = new THREE.Vector3(...SCENE3D.viewDir).normalize(); // default camera direction from the target

/** True when a WebGL context can be created on this device. */
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * WebGL fallback (08 §2): the Phase 1 SVG preview of the home (when a location is given) and a friendly note.
 * Loads the pure preview module lazily so callers don't pay for it when 3D works.
 */
export async function showFallback(container, { location = null, homeTypeId = 'house' } = {}) {
  const box = document.createElement('div');
  box.className = 'three-fallback';
  if (location) {
    const { renderPreviewSVG } = await import('../phases/plan/preview2d/index.js');
    const art = document.createElement('div');
    art.className = 'three-fallback-art';
    art.innerHTML = renderPreviewSVG({ location, homeTypeId }); // generated SVG, data is escaped by the renderer
    box.append(art);
  }
  const p = document.createElement('p');
  p.textContent = '3D isn’t available on this device — the game still works.';
  box.append(p);
  container.replaceChildren(box);
  return box;
}

/**
 * Create the scene in `container` (08 §2). Returns null (after showing the fallback) when WebGL is unavailable.
 * opts: { biome, landmark, monthIndex = 0, timeOfDay, interactive = true, seasons, coastal, location, homeTypeId, seed }.
 * `seasons` / `coastal` default from `location` when given.
 */
export function createScene(container, opts = {}) {
  const { location = null, interactive = true } = opts;
  const biome = opts.biome ?? location?.biome ?? 'tropical-wet';
  const landmark = opts.landmark ?? location?.landmark ?? null;
  const seasons = opts.seasons ?? location?.seasons ?? {};
  const coastal = opts.coastal ?? (location ? SCENE3D.coastal.includes(location.id) : false);

  let renderer;
  try {
    if (!webglAvailable()) throw new Error('no WebGL');
    const dpr = window.devicePixelRatio || 1;
    renderer = new THREE.WebGLRenderer({ antialias: dpr <= SCENE3D.maxPixelRatio, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(dpr, SCENE3D.maxPixelRatio));
  } catch {
    showFallback(container, { location, homeTypeId: opts.homeTypeId });
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = SCENE3D.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r186 removed PCFSoftShadowMap (DEVIATIONS)
  const canvas = renderer.domElement;
  canvas.className = 'three-canvas';
  canvas.style.display = 'block';
  canvas.style.width = canvas.style.height = '100%';
  container.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(SCENE3D.fov, 1, 0.5, 4000);
  const sky = createSky({ biome });
  const terrain = createTerrain({ biome, landmark, seasons, coastal, monthIndex: opts.monthIndex ?? 0, seed: opts.seed ?? 0 });
  scene.add(sky.group, terrain.group);
  scene.fog = new THREE.Fog(sky.fogColor.clone(), ...SCENE3D.fog);

  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.08, enabled: interactive, screenSpacePanning: false,
    minPolarAngle: SCENE3D.polarMinDeg * DEG, maxPolarAngle: SCENE3D.polarMaxDeg * DEG,
  });

  let disposed = false, pending = 0, loopId = 0, loopFn = null, lastT = 0, season = null;
  const clampTarget = () => { // pan limited to the lot
    const t = controls.target, L = SCENE3D.lotHalf;
    const cx = THREE.MathUtils.clamp(t.x, -L, L), cy = THREE.MathUtils.clamp(t.y, 0, 40), cz = THREE.MathUtils.clamp(t.z, -L, L);
    if (cx !== t.x || cy !== t.y || cz !== t.z) {
      camera.position.add(new THREE.Vector3(cx - t.x, cy - t.y, cz - t.z));
      t.set(cx, cy, cz);
    }
  };

  function renderNow() {
    pending = 0;
    if (disposed) return;
    controls.update(); // with damping this keeps firing 'change' (→ requestRender) until it settles
    renderer.render(scene, camera);
    api.info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  }
  /** Render on the next frame (coalesced). */
  function requestRender() {
    if (!pending && !disposed && !loopFn) pending = requestAnimationFrame(renderNow);
  }
  controls.addEventListener('change', () => { clampTarget(); requestRender(); });

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function tick(now) {
    loopId = 0;
    if (disposed || !loopFn || document.hidden) return;
    const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
    lastT = now;
    loopFn(dt, now / 1000);
    renderNow();
    loopId = requestAnimationFrame(tick);
  }
  const onVisibility = () => {
    if (document.hidden) { cancelAnimationFrame(loopId); loopId = 0; lastT = 0; } else if (loopFn && !loopId) loopId = requestAnimationFrame(tick);
    else requestRender();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const api = {
    scene, camera, renderer, controls, sky, terrain, info: { calls: 0, triangles: 0 },
    get nightFactor() { return sky.nightFactor; },
    get season() { return season; },
    /** 0..1: 0.25 sunrise, 0.5 noon, 0.75 sunset (08 §3). */
    setTimeOfDay(t) { sky.setTimeOfDay(t); scene.fog.color.copy(sky.fogColor); requestRender(); return api; },
    /** Snow and fall color for a monthIndex (08 §3). Returns {snow, fall, month}. */
    setSeason(monthIndex) { season = terrain.setSeason(monthIndex); requestRender(); return season; },
    add(obj) { scene.add(obj); requestRender(); return obj; },
    remove(obj) { scene.remove(obj); requestRender(); return obj; },
    /** Fit the camera to box3 (keeps the view direction), set zoom limits and the sun's shadow box. */
    frame(box, { padding = 1.25 } = {}) {
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const r = Math.max(sphere.radius, 8) * padding;
      const vFov = camera.fov * DEG, hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const dist = r / Math.sin(Math.min(vFov, hFov) / 2);
      const dir = camera.position.clone().sub(controls.target);
      if (dir.lengthSq() < 1e-6) dir.copy(VIEW_DIR);
      dir.normalize();
      controls.target.copy(sphere.center);
      camera.position.copy(sphere.center).addScaledVector(dir, dist);
      controls.minDistance = dist * SCENE3D.zoomMin;
      controls.maxDistance = dist * SCENE3D.zoomMax;
      camera.near = Math.max(0.5, dist / 200);
      camera.updateProjectionMatrix();
      sky.fitShadow(box);
      controls.update();
      requestRender();
      return dist;
    },
    requestRender,
    /** Run loopFn(dt, seconds) every frame until stop(); pauses while the tab is hidden. */
    start(fn) { loopFn = fn; if (pending) { cancelAnimationFrame(pending); pending = 0; } if (!loopId && !document.hidden) loopId = requestAnimationFrame(tick); },
    stop() { loopFn = null; cancelAnimationFrame(loopId); loopId = 0; lastT = 0; requestRender(); },
    /** Free geometries, materials, textures and the renderer (08 §2). */
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(pending); cancelAnimationFrame(loopId);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach((m) => { m.map?.dispose(); m.dispose(); });
      });
      disposeMaterials();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };

  /** Render one frame now and resolve after it (galleries use it before setting ready). */
  api.firstFrame = () => new Promise((resolve) => requestAnimationFrame(() => { renderNow(); resolve(api.info); }));

  camera.position.copy(VIEW_DIR).multiplyScalar(110);
  resize();
  api.frame(new THREE.Box3(new THREE.Vector3(-30, 0, -30), new THREE.Vector3(30, 20, 30)));
  api.setTimeOfDay(opts.timeOfDay ?? SCENE3D.timeOfDay);
  api.setSeason(opts.monthIndex ?? 0);
  return api;
}
