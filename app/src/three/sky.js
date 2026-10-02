// Gradient sky, stars, sun and moon (08 §3). Browser only.
// setTimeOfDay(t): t 0..1, 0.25 sunrise, 0.5 noon, 0.75 sunset; night outside [0.22, 0.80].
import * as THREE from 'three';
import { BIOME_PALETTE } from '../phases/plan/preview2d/palette.js';
import { createRng } from '../util/rng.js';
import { SCENE3D } from '../config.js';

const SKY_RADIUS = 1400;
const SUN_DIST = 260; // sun light distance from its target

/** Palettes: top/horizon colors, sun color, hemisphere strength, nightFactor. `day` comes from the biome. */
const NIGHT = { top: '#081127', horizon: '#1d2c4f', sun: '#ffffff', hemi: 0.3, night: 1 };
const DAWN = { top: '#6c80b6', horizon: '#f7b49a', sun: '#ffc79a', hemi: 0.95, night: 0.35 };
const DUSK = { top: '#4b3d7c', horizon: '#f0874a', sun: '#ff9a5a', hemi: 1.0, night: 0.3 };

/** t → palette keyframes (08 §3); colors blend linearly between neighbors. */
function keyframes(day) {
  return [[0, NIGHT], [0.22, NIGHT], [0.27, DAWN], [0.34, day], [0.68, day], [0.75, DUSK], [0.80, NIGHT], [1, NIGHT]];
}

/** Day palette from the biome's 2D sky (shared with the plan previews). */
function dayPalette(biome) {
  const p = BIOME_PALETTE[biome] ?? BIOME_PALETTE['tropical-wet'];
  const horizon = new THREE.Color(p.skyTop).lerp(new THREE.Color('#ffffff'), 0.55);
  return { top: p.skyTop, horizon: `#${horizon.getHexString()}`, sun: '#fff4e0', hemi: 1.1, night: 0 };
}

/** Linear blend of two palettes into Color objects. */
function blend(a, b, f) {
  const c = (k) => new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), f);
  return { top: c('top'), horizon: c('horizon'), sun: c('sun'), hemi: a.hemi + (b.hemi - a.hemi) * f,
    night: a.night + (b.night - a.night) * f };
}

/** Palette at time t. Exported for tests of the keyframe shape. */
export function paletteAt(t, biome) {
  const frames = keyframes(dayPalette(biome));
  const x = ((t % 1) + 1) % 1;
  for (let i = 1; i < frames.length; i++) {
    const [t1, p1] = frames[i];
    const [t0, p0] = frames[i - 1];
    if (x <= t1) return blend(p0, p1, t1 === t0 ? 0 : (x - t0) / (t1 - t0));
  }
  return blend(NIGHT, NIGHT, 0);
}

const SKY_VERT = `varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  gl_FragColor = vec4(mix(horizon, top, pow(h, 0.55)), 1.0);
  #include <colorspace_fragment>
}`;

/**
 * Create the sky for a biome. Returns { group, sun, moon, hemi, setTimeOfDay(t), fitShadow(box3), nightFactor, fogColor }.
 * Add `group` to the scene; `sun.target` is inside it.
 */
export function createSky({ biome }) {
  const group = new THREE.Group();
  group.name = 'sky';

  const uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 24, 12),
    new THREE.ShaderMaterial({ uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
  dome.renderOrder = -1;
  group.add(dome);

  // Stars: seeded points on the upper dome; opacity follows nightFactor.
  const rng = createRng(7);
  const pos = [];
  for (let i = 0; i < 700; i++) {
    const az = rng.float(0, Math.PI * 2), el = Math.asin(rng.float(0.06, 1));
    const r = SKY_RADIUS * 0.95;
    pos.push(Math.cos(el) * Math.cos(az) * r, Math.sin(el) * r, Math.cos(el) * Math.sin(az) * r);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false,
    transparent: true, opacity: 0, fog: false, depthWrite: false, toneMapped: false }));
  group.add(stars);

  // Visible sun and moon discs on the dome.
  const disc = (color, size) => new THREE.Mesh(new THREE.CircleGeometry(size, 16),
    new THREE.MeshBasicMaterial({ color, fog: false, toneMapped: false, transparent: true }));
  const sunDisc = disc('#fff3c8', 40);
  const moonDisc = disc('#e8eeff', 28);
  group.add(sunDisc, moonDisc);

  const hemi = new THREE.HemisphereLight('#ffffff', '#6b6a55', 1);
  const sun = new THREE.DirectionalLight('#ffffff', 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SCENE3D.shadowMapSize, SCENE3D.shadowMapSize);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.4;
  const moon = new THREE.DirectionalLight('#8fa6ff', 0);
  group.add(hemi, sun, sun.target, moon, moon.target);

  const center = new THREE.Vector3();
  const api = { group, sun, moon, hemi, nightFactor: 0, fogColor: new THREE.Color() };

  /** Fit the sun's shadow camera around box3 (08 §3). */
  api.fitShadow = (box) => {
    const size = box.getSize(new THREE.Vector3());
    box.getCenter(center);
    const r = Math.max(30, size.length() / 2 + 10);
    Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: SUN_DIST + r * 2 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.copy(center);
    moon.target.position.copy(center);
    api.setTimeOfDay(api.t ?? SCENE3D.timeOfDay);
  };

  /** Move the sun east → west and blend the palettes (08 §3). */
  api.setTimeOfDay = (t) => {
    api.t = t;
    const p = paletteAt(t, biome);
    uniforms.top.value.copy(p.top);
    uniforms.horizon.value.copy(p.horizon);
    api.fogColor.copy(p.horizon);
    api.nightFactor = p.night;

    const a = ((t - 0.25) / 0.5) * Math.PI; // 0 at sunrise, π at sunset
    const dir = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.9, 0.45).normalize();
    const elev = Math.sin(a);
    sun.position.copy(center).addScaledVector(dir, SUN_DIST);
    sun.color.copy(p.sun);
    sun.intensity = elev > 0 ? 2.8 * Math.pow(Math.min(1, elev * 1.6), 0.7) : 0;
    sun.castShadow = elev > 0.02;
    sunDisc.position.copy(dir).multiplyScalar(SKY_RADIUS * 0.9);
    sunDisc.lookAt(0, 0, 0);
    sunDisc.material.color.copy(p.sun).lerp(new THREE.Color('#ffffff'), 0.4);
    sunDisc.visible = elev > -0.08;

    // Moon: opposite arc, rises as the sun sets.
    const mdir = new THREE.Vector3(-Math.cos(a) * 0.8, Math.max(0.25, -Math.sin(a)) * 0.9, 0.5).normalize();
    moon.position.copy(center).addScaledVector(mdir, SUN_DIST);
    moon.intensity = 0.9 * p.night;
    moonDisc.position.copy(mdir).multiplyScalar(SKY_RADIUS * 0.9);
    moonDisc.lookAt(0, 0, 0);
    moonDisc.visible = p.night > 0.2;
    moonDisc.material.opacity = Math.min(1, p.night * 1.3);

    hemi.intensity = p.hemi;
    hemi.color.copy(p.top).lerp(new THREE.Color('#ffffff'), 0.5);
    hemi.groundColor.set('#5b5a48').lerp(new THREE.Color('#1a2238'), p.night);
    stars.material.opacity = Math.max(0, (p.night - 0.3) / 0.7);
    stars.visible = stars.material.opacity > 0.01;
    return api;
  };

  api.setTimeOfDay(SCENE3D.timeOfDay);
  return api;
}
