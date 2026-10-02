// `?dev=props&loc=<id>&month=<i>&t=<0..1>&focus=all|trees|yard|animals|plants|character&walk=1&anim=1` (08 §8):
// every prop in rows (trees, yard items, animals, healthy and wilted plants) on a scene. `month` sets the season
// (deciduous trees go fall-colored or bare where the place has seasons). `walk=1` sends the character round a loop;
// `anim=1` runs the idle animations. Shows each prop's triangles vs the 08 §5 budget; `window.__props` has the counts.
import { h, clear } from '../ui/dom.js';
import { byId } from '../data/locations/index.js';
import { PROPS3D, SCENE3D } from '../config.js';
import { monthName } from '../util/dates.js';

const FOCUS = ['all', 'trees', 'yard', 'animals', 'plants', 'character'];

/** Render the props gallery into root. Returns a cleanup function. */
export async function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const q = new URLSearchParams(location.search);
  const loc = byId[q.get('loc')] ?? byId.montpelier;
  const month = Number(q.get('month') ?? 5);
  const t = Number(q.get('t') ?? 0.45);
  const focus = FOCUS.includes(q.get('focus')) ? q.get('focus') : 'all';
  const walk = q.get('walk') === '1', anim = walk || q.get('anim') === '1';

  const view = h('div', { class: 'dev-scene-view' });
  const label = h('div', { class: 'dev-scene-label' }, 'Loading 3D…');
  root.append(h('section', { class: 'dev-scene' }, view, label));

  const [THREE, P, { createCharacter }, { createScene }] = await Promise.all([
    import('three'), import('../three/props.js'), import('../three/character.js'), import('../three/scene.js')]);
  const sc = createScene(view, { location: loc, timeOfDay: t, monthIndex: month });
  if (!sc) { label.textContent = 'Fallback shown'; document.body.dataset.ready = '1'; return () => {}; }
  window.__scene = sc;
  const season = sc.season;

  const counts = {}; // name → {tris, budget?}
  const idlers = [];
  const place = (group, obj, name, x, z, { budget, ry = 0 } = {}) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = ry;
    group.add(obj);
    if (name) counts[name] = { tris: P.triangleCount(obj), budget };
    if (obj.userData.idle) idlers.push(obj.userData.idle);
    return obj;
  };
  const section = (name) => { const g = new THREE.Group(); g.name = name; sc.add(g); return g; };

  // The terrain's own trees would mix with the props; &decor=1 keeps them.
  if (q.get('decor') !== '1') sc.terrain.group.getObjectByName('decor').visible = false;

  // Trees: three rows of five, 24 ft apart.
  const trees = section('trees');
  P.TREE_KINDS.forEach((kind, i) => {
    place(trees, P.createTree(kind, { season }), `tree:${kind}`, ((i % 5) - 2) * 24, -70 + Math.floor(i / 5) * 25, { budget: PROPS3D.budget.tree });
  });

  // Yard items in two rows, left to right, each with its own width.
  const yard = section('yard');
  const items = [
    ['garden-bed', 8, () => {
      const bed = P.createGardenBed();
      const veg = P.createPlant('vegetable');
      const spots = [];
      for (let k = 0; k < 6; k++) spots.push({ x: (k % 3 - 1) * 2.4, y: 0.9, z: (Math.floor(k / 3) - 0.5) * 1.8, ry: k, s: 1.4 });
      bed.add(P.instanceProp(veg, spots, { name: 'veg-instanced' }));
      return bed;
    }],
    ['coop', 13, () => P.createCoop(), -2.5],
    ['catchment-10k', 15, () => P.createCatchmentTank(10000)],
    ['solar-4kw', 21, () => P.createSolarArray(4)],
    ['fence', 16, () => P.createFence([{ x: -8, z: 0 }, { x: 8, z: 0 }, { x: 8, z: -8 }])],
    ['car', 7, () => P.createCar('#c8382e')],
    ['bus-stop', 14, () => P.createBusStop(), -1.5],
    ['mailbox', 2, () => P.createMailbox()],
    ['woodpile', 5, () => P.createWoodpile()],
    ['windmill', 6, () => P.createWindmill()],
    ['street-lamp', 3, () => P.createStreetLamp(), 0, -2],
  ];
  const gap = 5;
  [items.slice(0, 5), items.slice(5)].forEach((row, r) => {
    let x = -(row.reduce((sum, [, w]) => sum + w + gap, -gap)) / 2;
    for (const [name, w, make, dx = 0, dz = 0] of row) {
      const obj = place(yard, make(), name, x + w / 2 + dx, (r ? 28 : 6) + dz);
      obj.userData.setNight?.(sc.nightFactor);
      x += w + gap;
    }
  });

  // Animals, then healthy and wilted plants, plus the slippers (a small row up front).
  const animals = section('animals');
  P.ANIMAL_KINDS.forEach((kind, i) => {
    place(animals, P.createAnimal(kind), `animal:${kind}`, -9 + i * 4.2 + (kind === 'goat' ? 1 : 0), 48, { budget: PROPS3D.budget.animal, ry: 0.5 });
  });
  const plants = section('plants');
  P.PLANT_KINDS.forEach((kind, i) => {
    place(plants, P.createPlant(kind, { healthy: true }), `plant:${kind}`, 8 + i * 1.6, 47);
    place(plants, P.setPlantHealth(P.createPlant(kind), false), `plant:${kind}:wilted`, 8 + i * 1.6, 49.5);
  });
  place(plants, P.createSlippers(), 'slippers', 13.4, 48.5, { ry: -0.3 });

  // The character: stands by the animals, or walks a loop round them with walk=1.
  const charGroup = section('character');
  const ch = createCharacter({ shirt: '#2f9e6b', pants: '#2b3a55', skin: '#c68a5e', hair: '#1d1612' });
  ch.object.position.set(-12, 0, 52);
  charGroup.add(ch.object);
  counts.character = { tris: P.triangleCount(ch.object) };
  const loop = [{ x: 4, z: 53 }, { x: 4, z: 44 }, { x: -12, z: 44 }, { x: -12, z: 52 }];
  if (walk) (async () => { while (await ch.walkTo(loop)); })();

  sc.scene.updateMatrixWorld(true); // setFromObject reads matrixWorld, which is stale until the first render
  const boxOf = (g) => new THREE.Box3().setFromObject(g);
  const frameBox = focus === 'all' ? boxOf(trees).union(boxOf(yard)).union(boxOf(animals))
    : focus === 'character' ? new THREE.Box3(new THREE.Vector3(-14, 0, 42), new THREE.Vector3(6, 6, 55))
    : focus === 'animals' ? boxOf(animals) : boxOf({ trees, yard, plants }[focus]);
  // Look from the front and a little above, so the rows read left to right.
  const center = frameBox.getCenter(new THREE.Vector3());
  sc.controls.target.copy(center);
  sc.camera.position.copy(center).add(new THREE.Vector3(0.15, focus === 'all' ? 0.75 : 0.4, 1).multiplyScalar(100));
  sc.frame(frameBox, { padding: focus === 'all' ? 0.62 : 0.9 });

  idlers.forEach((fn) => fn(1));
  ch.update(0);
  if (anim) sc.start((dt, s) => { idlers.forEach((fn) => fn(s)); ch.update(dt); });

  const info = await sc.firstFrame();
  const over = Object.entries(counts).filter(([, c]) => c.budget && c.tris > c.budget);
  const { drawCalls, triangles } = SCENE3D.budget;
  const seasonText = season.snow ? 'snow' : season.fall ? 'fall color' : 'green';
  clear(label).append(
    h('strong', null, `Props · ${loc.name} · ${monthName(month)} (${seasonText}) · focus ${focus}`),
    h('span', { class: over.length ? 'is-bad' : 'is-ok' },
      over.length ? ` · over budget: ${over.map(([n, c]) => `${n} ${c.tris}`).join(', ')}` : ' · every tree ≤ 300, animal ≤ 400 tris'),
    h('span', null, ` · scene ${info.calls}/${drawCalls} calls · ${info.triangles}/${triangles} tris`));
  window.__props = counts;
  console.info('props', JSON.stringify(Object.fromEntries(Object.entries(counts).map(([n, c]) => [n, c.tris]))));
  document.body.dataset.ready = '1';
  return () => { sc.dispose(); delete window.__scene; delete window.__props; delete document.body.dataset.ready; };
}
