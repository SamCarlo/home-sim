// `?dev=vendor`: proves every vendored library loads in the browser (task 03).
// A lit, slowly rotating cube with OrbitControls; nspell on a typo; VADER on two sentences.
import { h, clear } from '../ui/dom.js';

const SPELL_SENTENCE = 'Teh quick brown fox';
const SENTENCES = [
  'Thank you so much for your kind help, I really appreciate it!',
  'This is terrible and I am very angry about the awful service.',
];

/** Render the vendor check into root. Returns a cleanup function. */
export async function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const canvasBox = h('div', { class: 'dev-vendor-canvas' });
  const results = h('div', { class: 'dev-vendor-results' }, h('p', null, 'Loading libraries…'));
  root.append(h('section', { class: 'dev-vendor card' },
    h('h2', null, 'Vendor check'),
    h('div', { class: 'dev-vendor-grid' }, canvasBox, results)));

  const [three, { OrbitControls }, { default: nspell }, { polarityScores }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
    import('../../vendor/nspell/nspell.js'),
    import('../../vendor/vader/vader.js'),
  ]);
  const stopCube = startCube(three, OrbitControls, canvasBox);

  const dictUrl = (f) => new URL(`../../vendor/dictionary-en/${f}`, import.meta.url);
  const [aff, dic] = await Promise.all(['index.aff', 'index.dic'].map((f) => fetch(dictUrl(f)).then((r) => r.text())));
  const speller = nspell(aff, dic);
  const spellRows = SPELL_SENTENCE.split(' ').map((word) => {
    const ok = speller.correct(word);
    return h('li', { class: ok ? 'is-ok' : 'is-bad' },
      h('strong', null, word), ok ? ' ✓' : ` ✗ → ${speller.suggest(word).slice(0, 3).join(', ')}`);
  });
  const vaderRows = SENTENCES.map((s) => {
    const { neg, neu, pos, compound } = polarityScores(s);
    return h('li', null, h('q', null, s), h('br'),
      h('code', null, `compound ${compound.toFixed(3)} · pos ${pos} · neu ${neu} · neg ${neg}`));
  });

  clear(results);
  results.append(
    h('p', null, h('strong', null, 'three.js '), `r${three.REVISION}`, ' · OrbitControls loaded'),
    h('h3', null, `nspell: "${SPELL_SENTENCE}"`), h('ul', null, spellRows),
    h('h3', null, 'VADER sentiment'), h('ul', null, vaderRows));
  document.body.dataset.ready = '1';
  return () => { stopCube(); delete document.body.dataset.ready; };
}

function startCube(THREE, OrbitControls, box) {
  const w = 420, ht = 320;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, ht);
  box.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d2b3a);
  const camera = new THREE.PerspectiveCamera(45, w / ht, 0.1, 100);
  camera.position.set(3, 2.4, 3.6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 6, 3);
  scene.add(sun);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xe8743b, roughness: 0.5 }));
  cube.rotation.set(0.4, 0.6, 0);
  scene.add(cube);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  renderer.setAnimationLoop(() => {
    cube.rotation.y += 0.004;
    controls.update();
    renderer.render(scene, camera);
  });
  renderer.render(scene, camera);
  return () => { renderer.setAnimationLoop(null); controls.dispose(); renderer.dispose(); };
}
