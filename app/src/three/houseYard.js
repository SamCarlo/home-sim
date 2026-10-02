// Yards for generated houses (08 §5, 07 §3, task 37). Browser only. `addYard` writes the lawn, sidewalk, front path,
// driveway and the family's fence (picket, iron, ranch, hedge, lava or block wall) into the house's merged build.
// Also small yard props: bikes and a grain bin.
import { merged } from './propKit.js';
import { mat, texturedMat } from './materials.js';
import { texBox } from './styleParts.js';
import { HOUSE } from '../phases/design/housePlan.js';

const LAWN = { tropical: '#5f9a48', desert: '#c9b08a', plains: '#9aa45e', alpine: '#6c8a4c', snow: '#eef2f4', default: '#6f9c50' };

/** Lawn color for a biome (desert gets gravel, snowy months white). */
export function lawnColor(biome, snow = false) {
  if (snow) return LAWN.snow;
  const b = String(biome ?? '');
  if (b.startsWith('tropical')) return LAWN.tropical;
  if (b.startsWith('desert')) return LAWN.desert;
  return LAWN[b] ?? LAWN.default;
}

/** One straight fence or wall run from (x0, z0) to (x1, z1). */
function fenceRun(add, kit, kind, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  if (len < 0.5) return;
  const yaw = Math.atan2(dx, dz), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const along = (t, o) => add(o.geo ?? 'box', o.material, { x: x0 + dx * t, z: z0 + dz * t, yaw, ...o.at });
  if (kind === 'picket' || kind === 'iron') {
    const iron = kind === 'iron', material = iron ? kit.m.iron : kit.m.trim, h = iron ? 3.6 : 3.2;
    for (const y of iron ? [0.4, h - 0.2] : [0.9, 2.4]) add('cbox', material, { x: cx, y, z: cz, yaw, sx: 0.12, sy: 0.2, sz: len });
    const step = iron ? 0.7 : 1.1, n = Math.max(1, Math.round(len / step));
    for (let i = 0; i <= n; i++) along(i / n, { material, at: iron ? { sx: 0.08, sz: 0.08, sy: h } : { sx: 0.5, sz: 0.12, sy: h } });
    const posts = Math.max(1, Math.round(len / 8));
    if (!iron) for (let i = 0; i <= posts; i++) along(i / posts, { material, at: { sx: 0.45, sz: 0.45, sy: h + 0.3 } });
  } else if (kind === 'ranch') { // post and two rails, like props.js createFence
    const posts = Math.max(1, Math.ceil(len / 8)), wood = mat('#a0744a'), post = mat('#7a5534');
    for (let i = 0; i <= posts; i++) along(i / posts, { material: post, at: { sx: 0.35, sz: 0.35, sy: 4.2 } });
    for (const y of [1.4, 3.2]) add('cbox', wood, { x: cx, y, z: cz, yaw, sx: 0.15, sy: 0.4, sz: len });
  } else if (kind === 'hedge') {
    const leaf = mat('#3f7a3a'), bloom = mat(kit.key === 'miami-deco' ? '#e86fa0' : '#d8443a');
    add('cbox', leaf, { x: cx, y: 1.6, z: cz, yaw, sx: 2.4, sy: 3.2, sz: len });
    const n = Math.max(1, Math.round(len / 7));
    for (let i = 0; i < n; i++) along((i + 0.5) / n, { geo: 'dodec', material: i % 3 ? leaf : bloom, at: { y: 3, s: i % 3 ? 1.5 : 0.7 } });
  } else if (kind === 'lava' || kind === 'block') {
    const material = kind === 'lava' ? kit.m.lava : texturedMat('ashlar', '#dccab0');
    const h = kind === 'lava' ? 2.6 : kit.key === 'honolulu-highrise' ? 3.6 : 5;
    add(texBox(1.6, h, len, 4), material, { x: cx, z: cz, yaw });
  }
}

/** A fence along x0..x1 at z with gaps [[a, b], …] (path, driveway). */
function frontRun(add, kit, kind, x0, x1, z, gaps) {
  let x = x0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > x) fenceRun(add, kit, kind, x, z, Math.min(a, x1), z);
    x = Math.max(x, b);
  }
  if (x < x1) fenceRun(add, kit, kind, x, z, x1, z);
}

/**
 * Add the yard into a merged build: lawn, sidewalk, front path (from `pathFromZ`), driveway (from `driveFromZ`) and the
 * fence. Returns `{lotW}` (the yard's half width).
 */
export function addYard(add, kit, plan, { biome, snow = false, pathFromZ, driveFromZ }) {
  const E = HOUSE.lotEdge, { main, footprint, streetZ, driveX, row } = plan;
  const lotW = row ? main.w * 1.5 : Math.min(E, Math.max(34, Math.max(-footprint.minX, footprint.maxX) + 14));
  const backZ = row ? Math.max(-E, footprint.backZ - 24) : -E;
  const desert = String(biome ?? '').startsWith('desert') && !snow;
  add(desert ? texBox(lotW * 2, 0.1, streetZ - backZ, 6) : 'box', desert ? texturedMat('stucco', lawnColor(biome)) : mat(lawnColor(biome, snow)),
    desert ? { z: (streetZ + backZ) / 2 } : { z: (streetZ + backZ) / 2, sx: lotW * 2, sy: 0.1, sz: streetZ - backZ });
  add('box', kit.m.concrete, { z: streetZ + 3, sx: 120, sy: 0.2, sz: 6 }); // sidewalk
  const paving = kit.key === 'kona-coastal' || kit.key === 'hawaii-upcountry' ? mat('#8f8a80') : kit.m.concrete;
  const doors = row ? [-main.w, 0, main.w].map((o) => o + main.doorX) : [main.doorX];
  for (const dx of doors) add('box', paving, { x: dx, z: (pathFromZ + streetZ) / 2, sx: row ? 4.5 : 3.6, sy: 0.16, sz: streetZ - pathFromZ });
  const driveW = plan.garage === 'garage-2' ? 18 : 11;
  if (driveX !== null) add('box', kit.m.concrete, { x: driveX, z: (driveFromZ + streetZ) / 2, sx: driveW, sy: 0.17, sz: streetZ - driveFromZ });

  const kind = plan.fence;
  if (kind === 'none') return { lotW };
  const fz = streetZ - 1.5;
  const gaps = doors.map((dx) => [dx - 2.4, dx + 2.4]);
  if (driveX !== null) gaps.push([driveX - driveW / 2 - 0.5, driveX + driveW / 2 + 0.5]);
  if (row) {
    // Row houses: a low iron rail in front of each areaway, open at each stoop.
    const half = main.w * 1.5;
    frontRun(add, kit, kind, -half, half, fz, gaps.concat([-main.w / 2, main.w / 2].map((x) => [x - 0.2, x + 0.2])));
    return { lotW };
  }
  frontRun(add, kit, kind, -lotW, lotW, fz, gaps);
  for (const s of [-1, 1]) fenceRun(add, kit, kind, s * lotW, fz, s * lotW, -E);
  return { lotW };
}

/** A bicycle about 5.6 ft long on its kickstand, facing +Z. */
export function createBike(color = '#c8382e') {
  return merged((add) => {
    const tire = mat('#1d1f22'), paint = mat(color, { rough: 0.45, metal: 0.2 }), steel = mat('#7d8790');
    for (const z of [-1.9, 1.9]) add('cyl10', tire, { x: 0.06, y: 1.15, z, roll: Math.PI / 2, sx: 1.1, sy: 0.12, sz: 1.1 });
    add('cbox', paint, { y: 1.9, z: 0, pitch: -0.15, sx: 0.12, sy: 0.12, sz: 3.2 }); // top tube
    add('cbox', paint, { y: 1.4, z: -0.7, pitch: 0.75, sx: 0.12, sy: 0.12, sz: 2.4 }); // down tube
    add('cbox', paint, { y: 1.6, z: -1.2, sx: 0.12, sy: 1.6, sz: 0.12 }); // seat tube
    add('cbox', mat('#2b2f36'), { y: 2.5, z: -1.3, sx: 0.4, sy: 0.15, sz: 0.9 }); // seat
    add('cbox', steel, { y: 2.6, z: 1.6, sx: 1.8, sy: 0.1, sz: 0.1 }); // handlebar
    add('cbox', steel, { y: 1.95, z: 1.75, pitch: 0.3, sx: 0.1, sy: 1.4, sz: 0.1 }); // fork
  }, { name: 'bike' });
}

/** A corrugated steel grain bin with a cone roof (plains farms). */
export function createGrainBin() {
  return merged((add) => {
    const steel = mat('#b9c2c8', { rough: 0.5, metal: 0.4 });
    add('cyl16', steel, { sx: 7, sz: 7, sy: 16 });
    add('cone16', steel, { y: 16, sx: 7.5, sz: 7.5, sy: 5 });
    for (const y of [4, 8, 12]) add('cyl16', mat('#8f979c'), { y, sx: 7.1, sz: 7.1, sy: 0.3 });
  }, { name: 'grain-bin' });
}
