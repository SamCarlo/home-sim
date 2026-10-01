// Shared keys for location data (03 §1–§2, 08 §4). Pure data, no imports.

/** Table region groups, in table order (03 §1). */
export const REGIONS = ['hawaii', 'cities', 'towns'];

/** Settlement sizes (03 §2). */
export const SETTLEMENTS = ['rural', 'small-town', 'small-city', 'mid-city', 'big-city', 'suburb'];

/** Biomes used by the twenty places (03 §1). */
export const BIOMES = [
  'tropical-wet', 'tropical-dry', 'tropical-upland', 'tropical-urban', 'temperate-rain', 'temperate-urban',
  'subtropical-coastal', 'subtropical-flat', 'desert', 'desert-mountain', 'humid-forest', 'maritime', 'alpine',
  'continental-lake', 'continental-forest', 'plains', 'subarctic-coastal',
];

/** The 16 style family keys (08 §4). */
export const STYLE_FAMILIES = [
  'hawaii-plantation', 'hawaii-upcountry', 'kona-coastal', 'honolulu-highrise', 'pnw-urban', 'nyc-brownstone',
  'miami-deco', 'texas-suburban', 'desert-southwest', 'mountain-cabin', 'new-england', 'maritime', 'appalachian',
  'delta-south', 'midwest-lakeside', 'plains-ranch',
];

/** Style variants a family may carry (03 §1); null means the base family. */
export const STYLE_VARIANTS = { 'desert-southwest': ['hillside'], maritime: ['alaska'] };

/** The 20 landmark keys, one per place, in table order (03 §1). */
export const LANDMARKS = [
  'kilauea-plume', 'maunakea', 'hualalai', 'kohala-hills', 'leahi', 'needle-rainier', 'manhattan-skyline',
  'biscayne-skyline', 'water-tower', 'strip-mountains', 'lookout-mountain', 'harbour-lighthouse', 'pine-ridges',
  'ore-dock', 'gold-dome', 'allegheny-ridges', 'delta-crossroads', 'mule-mountains', 'sandhills-windmill', 'kachemak-spit',
];

/** Natural hazard keys for `hazards` (03 §2). */
export const HAZARDS = [
  'lava', 'hurricane', 'flood', 'tsunami', 'earthquake', 'wildfire', 'blizzard', 'tornado', 'hail',
  'extreme-heat', 'extreme-cold', 'vog', 'drought',
];

/** Extra insurance policy types for `ownership.hazardCoverage` (03 §2, 05 §5). */
export const COVERAGE_TYPES = ['hurricane', 'flood', 'lava', 'wildfire', 'earthquake', 'windstorm'];

export const WATER_KINDS = ['municipal', 'catchment', 'well', 'community'];
export const SEWER_KINDS = ['municipal', 'septic', 'cesspool'];
export const TRANSPORT_MODES = ['car', 'transit', 'mixed'];

/** Home type ids, in table column order (04 §2). */
export const HOME_TYPES = ['apartment', 'shared', 'condo', 'house', 'build'];
