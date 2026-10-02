// House plans (07 §3–§4, 08 §5, task 37). Pure: the seeded numbers behind a generated house (main block, wings, beds,
// baths, sq ft, garage, fence, yard spots), shared by three/houseGen.js and the house / shared-living pickers (task 38).
// Lengths in feet; the lot center is the origin, the street runs along +Z. `variant` is 'house' | 'shared'.
import { styleFamily } from '../../data/styleFamilies.js';
import { createRng, seedFor } from '../../util/rng.js';

/**
 * Main-block shape per family: width, depth, stories, story height, porch depth/width, door offset. Also used by the
 * `?dev=styles` swatch houses (three/styleSwatch.js).
 */
export const HOUSE_SHAPE = {
  'hawaii-plantation': { w: 30, d: 24, stories: 1, porchD: 8 },
  'hawaii-upcountry': { w: 28, d: 22, stories: 1, porchD: 6, porchW: 16 },
  'kona-coastal': { w: 34, d: 24, stories: 1, porchD: 9 },
  'honolulu-highrise': { w: 22, d: 26, stories: 2, storyH: 9.5 },
  'pnw-urban': { w: 26, d: 32, stories: 1, storyH: 10, porchD: 8 },
  'nyc-brownstone': { w: 20, d: 40, stories: 4, storyH: 11, doorX: -5 },
  'miami-deco': { w: 32, d: 26, stories: 1, storyH: 11, porchD: 8 },
  'texas-suburban': { w: 34, d: 30, stories: 2 },
  'desert-southwest': { w: 32, d: 26, stories: 1, storyH: 10 },
  'mountain-cabin': { w: 24, d: 30, stories: 1, storyH: 3, porchD: 7 },
  'new-england': { w: 30, d: 24, stories: 2, storyH: 8.5 },
  maritime: { w: 18, d: 24, stories: 2, doorX: -4 },
  appalachian: { w: 30, d: 26, stories: 2, porchD: 8 },
  'delta-south': { w: 14, d: 40, stories: 1, storyH: 11, porchD: 6, doorX: -3 },
  'midwest-lakeside': { w: 28, d: 28, stories: 2, porchD: 8 },
  'plains-ranch': { w: 46, d: 24, stories: 1, doorX: -8 },
};

/** Lot and yard numbers. */
export const HOUSE = {
  streetZ: 46,          // sidewalk's inner edge (detached houses)
  frontYard: 16,        // lawn between the porch and the sidewalk
  rowFrontYard: 6,      // row houses sit close to the sidewalk
  lotEdge: 56,          // keep yard items inside ±lotEdge (the lot pad is ±60)
  jitter: 0.1,          // ± share the main block's width/depth varies by seed
  sharedScale: 1.2,     // shared houses are this much wider and deeper
  sqftScale: [0.8, 1.3], // how far a target sq ft may stretch the main block
  wingChance: 0.7,      // detached house: chance of one wing (shared houses always get 1–2)
};

/** Fence kind per family (Hawaiʻi uses hedges; walls stand in for fences in Kona and the desert). */
export const FENCES = {
  'hawaii-plantation': 'hedge', 'hawaii-upcountry': 'ranch', 'kona-coastal': 'lava', 'honolulu-highrise': 'block',
  'pnw-urban': 'picket', 'nyc-brownstone': 'iron', 'miami-deco': 'hedge', 'texas-suburban': 'none',
  'desert-southwest': 'block', 'mountain-cabin': 'ranch', 'new-england': 'picket', maritime: 'picket',
  appalachian: 'picket', 'delta-south': 'picket', 'midwest-lakeside': 'picket', 'plains-ranch': 'ranch',
};

const HAWAII = ['hawaii-plantation', 'hawaii-upcountry', 'kona-coastal', 'honolulu-highrise'];

/** Is this a Hawaiʻi family (slippers by the door, mango/citrus trees)? */
export const isHawaii = (style) => HAWAII.includes(style);

/** Fruit tree kind for a biome (07 §3): mango/citrus in Hawaiʻi and the tropics, fig in the desert, citrus in the warm south, apple up north. */
export function fruitTreeKind(biome, seed = 0) {
  const b = String(biome ?? '');
  if (b.startsWith('tropical')) return createRng(seedFor('fruit', seed)).chance(0.5) ? 'mango' : 'citrus';
  if (b.startsWith('desert')) return 'fig';
  if (b.startsWith('subtropical')) return 'citrus';
  return 'apple';
}

/** Which sides of the main block a wing may use without hitting the family's garage, chimney, carport or porch. */
function freeSides(look, fam) {
  if (fam.house.row) return ['back'];
  if (look.roof === 'aframe' || look.extras.includes('shotgun')) return ['back'];
  const x = look.extras;
  const left = !x.includes('garage-2') && !(x.includes('chimney-stone') && look.roof !== 'aframe');
  const right = !x.includes('carport') && !x.includes('ac-ground') && look.porch !== 'wraparound'
    && !(x.includes('chimney-brick') && fam.key !== 'new-england');
  return [...(left ? ['left'] : []), ...(right ? ['right'] : []), 'back'];
}

/**
 * The plan for one house: `{style, styleVariant, variant, seed, palette, row, main {w, d, stories, storyH, porchD,
 * porchW, doorX}, houseZ, wings [{side, x, z, w, d, stories, storyH}], footprint {minX, maxX, frontZ, backZ}, beds,
 * baths, sqft, garage ('garage-2' | 'carport' | 'driveway' | 'none'), driveX, fence, streetZ, hawaii, bikes, spots
 * {beds[3], trees[2], coop, pet, porch}}`. Options: `sqft` / `bedrooms` (a listing's target), `palette` (index).
 */
export function planHouse({ style, styleVariant = null, seed = 0, variant = 'house', palette = null, sqft = null, bedrooms = null }) {
  const fam = styleFamily(style, styleVariant);
  const look = fam.look;
  const rng = createRng(seedFor('house', style, styleVariant ?? '', variant, seed));
  const shared = variant === 'shared';
  const row = !!fam.house.row;
  const base = HOUSE_SHAPE[style] ?? { w: 28, d: 24, stories: 1 };
  const j = () => 1 + rng.float(-HOUSE.jitter, HOUSE.jitter);
  const grow = shared && !row ? HOUSE.sharedScale : 1;
  const main = {
    storyH: 9, porchD: 8, doorX: 0, ...base,
    w: Math.round(base.w * (row ? 1 : j()) * grow), d: Math.round(base.d * j() * grow),
  };
  const floorArea = () => main.w * main.d * (look.roof === 'aframe' ? 1.5 : main.stories);
  if (sqft && !row) {
    const k = Math.min(HOUSE.sqftScale[1], Math.max(HOUSE.sqftScale[0], Math.sqrt((sqft * 0.8) / floorArea())));
    main.w = Math.round(main.w * k);
    main.d = Math.round(main.d * k);
  }
  main.porchW = Math.min(base.porchW ?? main.w, main.w);
  main.doorX = Math.round((base.doorX ?? 0) * (main.w / base.w));

  // Wings: a detached house usually gets one, a shared house one or two; row houses only add a back extension.
  const sides = freeSides(look, fam);
  const count = row ? (shared ? 1 : 0) : shared ? rng.int(1, Math.min(2, sides.length)) : rng.chance(HOUSE.wingChance) ? 1 : 0;
  const order = rng.shuffle(sides.filter((s) => s !== 'back'));
  const chosen = [...order, 'back'].slice(0, count);
  const wings = chosen.map((side) => {
    const stories = main.stories > 1 && rng.chance(0.3) ? 2 : 1;
    const storyH = look.roof === 'aframe' ? 8.5 : Math.min(main.storyH, 9.5);
    if (side === 'back') {
      const w = row ? main.w - 2 : Math.round(Math.min(main.w * 0.6, rng.int(14, 20)));
      const d = Math.round(rng.int(12, 18) * (row ? 0.8 : 1));
      const x = row ? 0 : (rng.chance(0.5) ? 1 : -1) * (main.w / 2 - w / 2);
      return { side, x, z: -main.d / 2 - d / 2 + 0.5, w, d, stories: row ? 2 : stories, storyH };
    }
    const w = rng.int(12, 18), d = Math.round(Math.min(main.d - 2, rng.int(16, 22)));
    const s = side === 'left' ? -1 : 1, setback = rng.int(2, 6);
    return { side, x: s * (main.w / 2 + w / 2 - 0.5), z: main.d / 2 - setback - d / 2, w, d, stories, storyH };
  });

  // Place the house so the porch ends a front yard short of the sidewalk.
  const porch = look.porch === 'none' || look.porch === 'stoop' ? 3 : main.porchD;
  const streetZ = row ? main.d / 2 + 9 + HOUSE.rowFrontYard : HOUSE.streetZ;
  const houseZ = row ? 0 : Math.round(streetZ - HOUSE.frontYard - porch - main.d / 2);
  let minX = -main.w / 2, maxX = main.w / 2, backZ = houseZ - main.d / 2;
  for (const wg of wings) {
    minX = Math.min(minX, wg.x - wg.w / 2);
    maxX = Math.max(maxX, wg.x + wg.w / 2);
    backZ = Math.min(backZ, houseZ + wg.z - wg.d / 2);
  }
  const garage = look.extras.includes('garage-2') ? 'garage-2' : look.extras.includes('carport') ? 'carport' : row ? 'none' : 'driveway';
  if (garage === 'garage-2') minX = Math.min(minX, -main.w / 2 - 22);
  if (garage === 'carport') maxX = Math.max(maxX, main.w / 2 + 12.5);
  // The driveway runs beside the house on the side with room; the garage and carport fix it.
  const driveX = garage === 'garage-2' ? -main.w / 2 - 11 : garage === 'carport' ? main.w / 2 + 6.5
    : garage === 'none' ? null : (wings.some((w) => w.side === 'right') && !wings.some((w) => w.side === 'left') ? minX - 7 : maxX + 7);
  const footprint = { minX, maxX, frontZ: houseZ + main.d / 2, backZ };

  const area = Math.round(floorArea() + wings.reduce((t, w) => t + w.w * w.d * w.stories, 0));
  const beds = bedrooms ? bedrooms + (shared ? 1 : 0) : Math.max(2, Math.min(6, Math.round(area / 520))) + (shared ? 1 : 0);
  const baths = shared ? Math.max(2, Math.ceil(beds / 2)) : Math.max(1, Math.round(beds / 2 + (area > 1800 ? 0.5 : 0)));

  const E = HOUSE.lotEdge;
  const clampX = (x) => Math.max(-E, Math.min(E, x));
  const clampZ = (z) => Math.max(-E, Math.min(E, z));
  const spots = row
    ? {
      beds: [0, 1, 2].map((i) => ({ x: -main.w / 2 + 4.5, z: clampZ(backZ - 5 - i * 5.5) })),
      trees: [{ x: main.w / 2 - 4, z: clampZ(backZ - 8) }, { x: main.w / 2 - 4, z: clampZ(backZ - 19) }],
      coop: { x: 1, z: clampZ(backZ - 22) },
      pet: { x: 2, z: clampZ(backZ - 4) },
    }
    : {
      beds: [0, 1, 2].map((i) => ({ x: clampX(-main.w / 2 + 5 + i * 10), z: clampZ(backZ - 9) })),
      trees: [{ x: clampX(minX - 8), z: clampZ(backZ - 14) }, { x: clampX(maxX + 8), z: clampZ(backZ - 14) }],
      coop: { x: clampX(maxX - 6), z: clampZ(backZ - 25) },
      pet: { x: clampX(main.w / 2 - 6), z: clampZ(backZ - 18) },
    };
  spots.porch = { x: main.doorX + 3, z: houseZ + main.d / 2 + Math.min(porch, 4) - 1 };

  const pal = palette ?? rng.int(0, fam.palettes.length - 1);
  return {
    style, styleVariant, variant, seed, palette: ((pal % fam.palettes.length) + fam.palettes.length) % fam.palettes.length,
    row, main, houseZ, wings, footprint, beds, baths, sqft: area, garage, driveX, fence: FENCES[style] ?? 'none',
    streetZ, hawaii: isHawaii(style), bikes: shared ? rng.int(2, 3) : 0, spots,
  };
}
