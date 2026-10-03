// Phase 4 life seeds (09 §12, task 42+): a design seed run through its real Move in, so the state is exactly what the
// design phase leaves behind (home, plants, animals, lifestyle, life month 0 at 'welcome', phase 'life').
// seeds.js calls addLifeSeeds(seeds) after addDesignSeeds (a function, to avoid an import cycle).
import { buildingOptions, moveIn } from '../phases/design/apartmentModel.js';
import { moveInHouse } from '../phases/design/houseModel.js';
import { sharedOptions, moveInShared } from '../phases/design/sharedModel.js';
import { moveInBuild } from '../phases/design/blueprint/moveIn.js';
import { addYardItem } from '../phases/design/blueprint/yard.js';

/** Fail loudly when a seed's Move in refuses (a seed that silently stays in design would hide bugs). */
function ok(result, name) {
  if (!result.ok) throw new Error(`${name}: move in refused ${JSON.stringify(result)}`);
}

/** Apartment/condo: first building, a middle floor, unit 0, `plants` pots. */
function unitMoveIn(seeds, from, name, plants) {
  return (now) => {
    const s = seeds[from].build(now);
    const o = buildingOptions(s)[0];
    const floor = o.floors[Math.floor(o.floors.length / 2)];
    ok(moveIn(s, { index: 0, floor, unit: 0, plants }), name);
    return s;
  };
}

/** Register the life-phase seeds on the seeds registry. */
export function addLifeSeeds(seeds) {
  seeds['life-month1-apartment'] = { phase: 'life',
    description: 'Hilo apartment, January 2033 welcome: a middle-floor walk-up unit with two potted plants.',
    build: unitMoveIn(seeds, 'design-apartment-hilo', 'life-month1-apartment', 2) };
  seeds['life-month1-condo'] = { phase: 'life',
    description: 'Miami condo, January 2033 welcome: a middle floor of a glass tower, one potted plant.',
    build: unitMoveIn(seeds, 'design-condo-miami', 'life-month1-condo', 1) };
  seeds['life-month1-shared'] = { phase: 'life',
    description: 'Honolulu shared house, January 2033 welcome: the first room, two roommates, one potted plant.',
    build: (now) => {
      const s = seeds['design-shared-honolulu'].build(now);
      const o = sharedOptions(s)[0];
      ok(moveInShared(s, { index: 0, roomId: o.rooms[0].id, plants: 1 }), 'life-month1-shared');
      return s;
    } };
  seeds['life-month1-house'] = { phase: 'life',
    description: 'Katy house, January 2033 welcome: a garden bed, a coop with three hens and a cat.',
    build: (now) => {
      const s = seeds['design-house-katy'].build(now);
      ok(moveInHouse(s, { index: 0, gardenBeds: 1, fruitTrees: 0, coop: true, pet: 'cat' }), 'life-month1-house');
      return s;
    } };
  seeds['life-month1-build'] = { phase: 'life',
    description: 'Pāhoa blueprint home (Cozy template), January 2033 welcome: two garden beds and a coop.',
    build: (now) => {
      const s = seeds['design-build-template'].build(now);
      let bp = s.home.blueprint;
      for (const kind of ['garden-bed', 'garden-bed', 'coop']) bp = addYardItem(bp, kind);
      ok(moveInBuild(s, bp), 'life-month1-build');
      return s;
    } };
}
