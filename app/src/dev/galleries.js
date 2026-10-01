// Dev galleries (01 §7): `?dev=<name>` renders one of these instead of the game.
// Each module exports `mount(root)`, which renders into root, sets body[data-ready="1"] when done,
// and may return a cleanup function. Later tasks add gallery2d, scene, props, buildings, houses, blueprint3d.

/** Gallery name → lazy module loader. */
export const galleries = {
  vendor: () => import('./vendorCheck.js'),
};

/** Mount gallery `name` into root. Returns false when no such gallery exists. */
export async function mountGallery(name, root) {
  const load = galleries[name];
  if (!load) return false;
  const mod = await load();
  await mod.mount(root);
  return true;
}
