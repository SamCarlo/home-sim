// Cached low-poly materials, procedural canvas textures and a merge batch (08 §1, 01 §10). Browser only.
// One scene lives at a time: scene.dispose() calls disposeMaterials(), which frees everything cached here.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const materials = new Map();
const textures = new Map();

/** Cached flat-shaded MeshStandardMaterial for a color (+ options). Never dispose these yourself. */
export function mat(color, { rough = 0.9, metal = 0, flat = true, emissive = null, opacity = 1, map = null, side } = {}) {
  const key = [color, rough, metal, flat, emissive, opacity, map?.uuid ?? '', side ?? ''].join('|');
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat });
    if (emissive) m.emissive = new THREE.Color(emissive);
    if (opacity < 1) Object.assign(m, { transparent: true, opacity });
    if (map) m.map = map;
    if (side !== undefined) m.side = side;
    materials.set(key, m);
  }
  return m;
}

/** An uncached material for parts that recolor later (ground, leaves). The scene disposes it with its mesh. */
export function ownMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: true, ...opts });
}

const PAINTERS = {
  siding(g, s) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += s / 8) {
      g.fillStyle = '#c9c9c9'; g.fillRect(0, y + s / 8 - 3, s, 3);
      g.fillStyle = '#e9e9e9'; g.fillRect(0, y + s / 8 - 6, s, 3);
    }
  },
  brick(g, s) {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, s, s);
    const bh = s / 8, bw = s / 4;
    for (let r = 0; r < 8; r++) {
      for (let c = -1; c < 5; c++) {
        const x = c * bw + (r % 2 ? bw / 2 : 0);
        g.fillStyle = (r * 7 + c * 3) % 5 === 0 ? '#e6e6e6' : '#f6f6f6';
        g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  },
  shingle(g, s) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
    const rh = s / 6, w = s / 6;
    for (let r = 0; r < 6; r++) {
      for (let c = -1; c < 7; c++) {
        const x = c * w + (r % 2 ? w / 2 : 0);
        g.fillStyle = (r + c) % 3 === 0 ? '#e2e2e2' : '#f2f2f2';
        g.fillRect(x + 1, r * rh, w - 2, rh - 3);
      }
      g.fillStyle = '#b4b4b4'; g.fillRect(0, r * rh + rh - 3, s, 3);
    }
  },
  metal(g, s) {
    const w = s / 8;
    for (let x = 0; x < s; x += w) {
      const grad = g.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#b8b8b8'); grad.addColorStop(1, '#ffffff');
      g.fillStyle = grad; g.fillRect(x, 0, w, s);
    }
  },
};

/** Gray-scale tileable canvas texture: 'siding' | 'brick' | 'shingle' | 'metal' (tinted by the material color). */
export function canvasTexture(kind) {
  if (textures.has(kind)) return textures.get(kind);
  const paint = PAINTERS[kind];
  if (!paint) throw new Error(`unknown texture ${kind}`);
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  paint(canvas.getContext('2d'), s);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(kind, tex);
  return tex;
}

/** Cached textured material: a canvas texture tinted with `color`. Set repeat on geometry UVs, not the texture. */
export function texturedMat(kind, color, opts = {}) {
  return mat(color, { ...opts, map: canvasTexture(kind), flat: opts.flat ?? true });
}

/** Free every cached material and texture (scene.dispose calls this). */
export function disposeMaterials() {
  for (const m of materials.values()) m.dispose();
  for (const t of textures.values()) t.dispose();
  materials.clear();
  textures.clear();
}

const tmp = new THREE.Object3D();

/**
 * Merge batch (01 §10 "static geometry merged per material"): add(geometry, material, transform) many times, then
 * build() → a Group with one mesh per material. Geometries are made non-indexed and keep position + normal (+ uv if all have it).
 */
export function createBatch() {
  const buckets = new Map(); // material → geometry[]
  return {
    add(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, sx = s, sy = s, sz = s } = {}) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone(); // templates can be reused; they never reach the GPU
      tmp.position.set(x, y, z); tmp.rotation.set(rx, ry, rz); tmp.scale.set(sx, sy, sz); tmp.updateMatrix();
      g.applyMatrix4(tmp.matrix);
      if (!buckets.has(material)) buckets.set(material, []);
      buckets.get(material).push(g);
      return g;
    },
    /** One mesh per material; `shadows` sets castShadow (and receiveShadow). Frees the parts. */
    build({ castShadow = false, receiveShadow = false, name = 'batch' } = {}) {
      const group = new THREE.Group();
      group.name = name;
      for (const [material, geos] of buckets) {
        const keepUv = material.map && geos.every((g) => g.attributes.uv);
        for (const g of geos) for (const k of Object.keys(g.attributes)) {
          if (k !== 'position' && k !== 'normal' && !(keepUv && k === 'uv')) g.deleteAttribute(k);
        }
        const merged = mergeGeometries(geos, false);
        geos.forEach((g) => g.dispose());
        const mesh = new THREE.Mesh(merged, material);
        Object.assign(mesh, { castShadow, receiveShadow });
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
      }
      buckets.clear();
      return group;
    },
  };
}
