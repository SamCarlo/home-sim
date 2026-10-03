// Phase 3 design seeds (07 §6, task 36+): a finished paperwork attempt committed through commitPaperwork, so the
// state is exactly what Results → Continue leaves behind (bills, loan or lease, card, home stub, phase 'design').
// seeds.js calls addDesignSeeds(seeds) at the end (a function, not an import of seeds.js, to avoid an import cycle).
import { decide, homeApproved } from '../finance/underwriting.js';
import { commitPaperwork } from '../phases/paperwork/commit.js';
import { byId } from '../data/locations/index.js';
import { lotOf } from '../phases/design/blueprint/model.js';
import { templateBlueprint } from '../phases/design/blueprint/templates.js';

/** Commit `from`'s ready state; when its draw denies, try save seeds 1, 2, … until the home is approved. */
function designFrom(seeds, from) {
  return (now) => {
    for (let metaSeed = 0; metaSeed < 60; metaSeed++) {
      const s = seeds[from].build(now);
      if (metaSeed) s.meta.seed = metaSeed;
      const decisions = decide(s);
      if (!homeApproved(decisions)) continue;
      s.paperwork.lettersRevealed = true;
      commitPaperwork(s, decisions, now);
      return s;
    }
    throw new Error(`${from}: no approving draw`);
  };
}

/** Register the design-phase seeds on the seeds registry. */
export function addDesignSeeds(seeds) {
  seeds['design-apartment-hilo'] = { phase: 'design',
    description: 'Hilo apartment approved: pick a building, floor and unit (plantation walk-ups).',
    build: designFrom(seeds, 'paperwork-ready-apartment') };
  seeds['design-condo-miami'] = { phase: 'design',
    description: 'Miami condo approved: pick a glass tower, floor and unit.',
    build: designFrom(seeds, 'paperwork-ready-condo') };
  seeds['design-house-katy'] = { phase: 'design',
    description: 'Katy house approved: pick one of three listings and customize it (garden, trees, coop, pet).',
    build: designFrom(seeds, 'paperwork-ready-house') };
  seeds['design-shared-honolulu'] = { phase: 'design',
    description: 'Honolulu room approved: pick a shared house, a room, and meet the roommates.',
    build: designFrom(seeds, 'paperwork-ready-shared') };
  seeds['design-build-pahoa'] = { phase: 'design',
    description: 'Pāhoa build approved (Cozy budget): the blueprint editor on an empty lot.',
    build: designFrom(seeds, 'paperwork-ready-build') };
  seeds['design-build-template'] = { phase: 'design',
    description: 'Pāhoa build approved (Cozy budget) with the Cozy template already placed.',
    build: (now) => {
      const s = seeds['design-build-pahoa'].build(now);
      const site = s.paperwork.options?.siteUtilities ?? {};
      s.home.blueprint = templateBlueprint('cozy', lotOf(byId[s.home.locationId]),
        { solarKw: site.solarKw ?? 0, catchmentGallons: site.catchmentGallons ?? 0 });
      return s;
    } };
}
