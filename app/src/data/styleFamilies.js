// Regional style families (08 §4): palettes and traits shared by the 2D previews (task 14) and 3D (task 34).
// Pure data. Each family: { key, label, palettes[3–4]{wall, trim, roof, accent}, house{…}, apartment{…}, condo{…},
// vegetation[], props[], look{…}, variants? }. `look` (task 34) holds the 3D parameters three/styles.js reads.

const FLOORS = { rural: [2, 3], 'small-town': [2, 3], 'small-city': [2, 4], 'mid-city': [3, 6], suburb: [2, 3], 'big-city': [5, 20] };
const CONDO_FLOORS = { rural: [2, 3], 'small-town': [2, 3], 'small-city': [3, 4], 'mid-city': [4, 7], suburb: [2, 3], 'big-city': [12, 24] };

/** Apartment traits with the 08 §4 defaults; `floorsBySettlement` entries override per settlement. */
const apt = (o = {}) => ({
  balconies: false, exteriorStairs: false, fireEscapes: false, rooftop: 'parapet', material: 'stucco',
  groundFloor: null, ...o, floorsBySettlement: { ...FLOORS, ...(o.floorsBySettlement || {}) },
});
const condo = (o = {}) => ({ balconies: true, glass: false, ...o, floorsBySettlement: { ...CONDO_FLOORS, ...(o.floorsBySettlement || {}) } });

/** The 16 families, keyed by `styleFamily` (enums.js STYLE_FAMILIES order). */
export const STYLE_FAMILY_DATA = {
  'hawaii-plantation': {
    key: 'hawaii-plantation', label: 'Hawaiʻi plantation',
    palettes: [
      { wall: '#b9c9a4', trim: '#ffffff', roof: '#b0473a', accent: '#e8c75a' },
      { wall: '#f0dc8a', trim: '#ffffff', roof: '#4f7a5a', accent: '#d8504a' },
      { wall: '#a9cde0', trim: '#ffffff', roof: '#8a9096', accent: '#e07a40' },
      { wall: '#f4efe2', trim: '#4f7a5a', roof: '#b0473a', accent: '#e8c75a' },
    ],
    house: { roof: 'hip', pitch: 'low', porch: 'lanai', stilts: true, garage: false, stories: 1, windowStyle: 'jalousie', siding: 'board-and-batten', roofMaterial: 'metal' },
    apartment: apt({ exteriorStairs: true, balconies: true, rooftop: 'hip', material: 'wood' }),
    condo: condo({ floorsBySettlement: { 'small-city': [3, 5] } }),
    vegetation: ['palm', 'banana', 'ti', 'hibiscus'], props: ['catchment', 'slippers'],
  },
  'hawaii-upcountry': {
    key: 'hawaii-upcountry', label: 'Hawaiʻi upcountry ranch',
    palettes: [
      { wall: '#4f6e4a', trim: '#f2ead8', roof: '#8e2f2a', accent: '#8a8a84' },
      { wall: '#9a3a30', trim: '#f2ead8', roof: '#36503a', accent: '#8a8a84' },
      { wall: '#efe6cf', trim: '#36503a', roof: '#8e2f2a', accent: '#8a8a84' },
    ],
    house: { roof: 'gable', pitch: 'steep', porch: 'front', stilts: false, garage: false, stories: 1, windowStyle: 'double-hung', siding: 'board-and-batten', chimney: 'stone', roofMaterial: 'metal' },
    apartment: apt({ rooftop: 'gable', material: 'wood', floorsBySettlement: { 'small-town': [2, 2] } }),
    condo: condo({ townhomes: true, floorsBySettlement: { 'small-town': [2, 2] } }),
    vegetation: ['eucalyptus', 'ironwood', 'grass'], props: ['ranch-fence', 'mist'],
  },
  'kona-coastal': {
    key: 'kona-coastal', label: 'Kona coastal',
    palettes: [
      { wall: '#e8d6b4', trim: '#ffffff', roof: '#7a6a5a', accent: '#e07a64' },
      { wall: '#f2b8a0', trim: '#ffffff', roof: '#b0573a', accent: '#3a9aa0' },
      { wall: '#f6f2ea', trim: '#c8a070', roof: '#5f7a80', accent: '#e07a64' },
    ],
    house: { roof: 'hip', pitch: 'low', porch: 'lanai', stilts: false, garage: false, stories: 1, windowStyle: 'slider', siding: 'stucco', wall: 'lava-rock', roofMaterial: 'metal' },
    apartment: apt({ balconies: true, rooftop: 'hip', floorsBySettlement: { 'small-town': [2, 3] } }),
    condo: condo({ resort: true, floorsBySettlement: { 'small-town': [3, 5] } }),
    vegetation: ['plumeria', 'palm'], props: ['lava-rock-wall', 'ocean'],
  },
  'honolulu-highrise': {
    key: 'honolulu-highrise', label: 'Honolulu high-rise',
    palettes: [
      { wall: '#dedad2', trim: '#ffffff', roof: '#a8a49c', accent: '#4aa0a8' },
      { wall: '#f2efe8', trim: '#ffffff', roof: '#9a9690', accent: '#3a8a9a' },
      { wall: '#c8d4d2', trim: '#ffffff', roof: '#8a9490', accent: '#e0a050' },
    ],
    house: { roof: 'shed', pitch: 'flat', porch: 'none', stilts: false, garage: 'carport', stories: 2, windowStyle: 'modern', siding: 'single-wall' },
    apartment: apt({ balconies: true, rooftop: 'flat', material: 'concrete', groundFloor: 'parking', floorsBySettlement: { 'big-city': [12, 30] } }),
    condo: condo({ glass: true, glassTint: '#a6dcd6', crown: 'flat', floorsBySettlement: { 'big-city': [18, 30] } }),
    vegetation: ['monkeypod', 'palm'], props: ['podium-parking'],
  },
  'pnw-urban': {
    key: 'pnw-urban', label: 'Pacific Northwest urban',
    palettes: [
      { wall: '#6f8496', trim: '#f2ede2', roof: '#3a3f44', accent: '#a8743e' },
      { wall: '#4e6a52', trim: '#efe8d8', roof: '#3a3f44', accent: '#c89a4e' },
      { wall: '#a8a294', trim: '#ffffff', roof: '#4a4038', accent: '#7a4a3a' },
    ],
    house: { roof: 'gable', pitch: 'low', porch: 'craftsman', stilts: false, garage: false, stories: 1.5, windowStyle: 'craftsman', siding: 'shingle', eaves: 'wide' },
    apartment: apt({ balconies: true, rooftop: 'flat', material: 'panel', groundFloor: 'shops', floorsBySettlement: { 'big-city': [5, 7] } }),
    condo: condo({ glass: true, glassTint: '#9fbcc4', crown: 'slant', floorsBySettlement: { 'big-city': [14, 24] } }),
    vegetation: ['pine', 'fir', 'maple'], props: ['rain'],
  },
  'nyc-brownstone': {
    key: 'nyc-brownstone', label: 'New York brownstone',
    palettes: [
      { wall: '#7a4e3a', trim: '#2a2624', roof: '#3a302c', accent: '#b05a42' },
      { wall: '#9a4436', trim: '#2a2624', roof: '#3a302c', accent: '#d8c8a8' },
      { wall: '#8a6a52', trim: '#1f1f22', roof: '#3a302c', accent: '#a03c30' },
    ],
    house: { roof: 'flat', pitch: 'flat', porch: 'stoop', stilts: false, garage: false, stories: 4, windowStyle: 'tall', siding: 'brownstone', row: true },
    apartment: apt({ fireEscapes: true, rooftop: 'water-tank', material: 'brick', floorsBySettlement: { 'big-city': [5, 6] } }),
    condo: condo({ glass: true, glassTint: '#9aaac4', crown: 'setback', floorsBySettlement: { 'big-city': [12, 20] } }),
    vegetation: ['citytree'], props: ['stoop', 'iron-railing'],
  },
  'miami-deco': {
    key: 'miami-deco', label: 'Miami art deco',
    palettes: [
      { wall: '#f6c4cc', trim: '#ffffff', roof: '#e8e0d8', accent: '#3aa8a0' },
      { wall: '#bfe8d4', trim: '#ffffff', roof: '#e8e0d8', accent: '#e86a8a' },
      { wall: '#b8e2ec', trim: '#ffffff', roof: '#e8e0d8', accent: '#f0a040' },
      { wall: '#fbf6ec', trim: '#3aa8a0', roof: '#d8826a', accent: '#e86a8a' },
    ],
    house: { roof: 'flat', pitch: 'flat', porch: 'patio', stilts: false, garage: false, stories: 1, windowStyle: 'shutters', siding: 'stucco' },
    apartment: apt({ rooftop: 'deco', floorsBySettlement: { 'big-city': [3, 4] } }),
    condo: condo({ glass: true, glassTint: '#c4ecf0', crown: 'curve', floorsBySettlement: { 'big-city': [16, 30] } }),
    vegetation: ['palm'], props: ['hurricane-shutters'],
  },
  'texas-suburban': {
    key: 'texas-suburban', label: 'Texas suburban',
    palettes: [
      { wall: '#c89a72', trim: '#ffffff', roof: '#6a5e54', accent: '#d8c8a8' },
      { wall: '#b07a5a', trim: '#f4efe4', roof: '#4e4a46', accent: '#c8b48e' },
      { wall: '#dccbb0', trim: '#ffffff', roof: '#7a6650', accent: '#a8724a' },
    ],
    house: { roof: 'hip', pitch: 'mid', porch: 'none', stilts: false, garage: 'front-2', stories: 2, windowStyle: 'double-hung', siding: 'brick' },
    apartment: apt({ balconies: true, rooftop: 'hip', material: 'brick', floorsBySettlement: { suburb: [3, 3] } }),
    condo: condo({ townhomes: true, floorsBySettlement: { suburb: [2, 3] } }),
    vegetation: ['young-tree', 'shrub'], props: ['cul-de-sac', 'pool'],
  },
  'desert-southwest': {
    key: 'desert-southwest', label: 'Desert Southwest',
    palettes: [
      { wall: '#e2c4a0', trim: '#8a5a3a', roof: '#c0603a', accent: '#8aa07a' },
      { wall: '#d8a07a', trim: '#f4ead8', roof: '#a84a30', accent: '#6a8a6a' },
      { wall: '#efe0c4', trim: '#6a8a6a', roof: '#c0603a', accent: '#c87a4a' },
    ],
    house: { roof: 'tile', pitch: 'low', porch: 'none', stilts: false, garage: false, stories: 1, windowStyle: 'arched', siding: 'stucco', wall: 'block' },
    apartment: apt({ balconies: true, rooftop: 'tile', floorsBySettlement: { 'big-city': [2, 3], 'small-town': [2, 2] } }),
    condo: condo({ glass: true, glassTint: '#e6cc8e', crown: 'fin', floorsBySettlement: { 'big-city': [12, 22] } }),
    vegetation: ['cactus', 'agave'], props: ['gravel', 'block-wall'],
    variants: {
      hillside: { label: 'Hillside miners’ cottages', house: { roof: 'tin', pitch: 'low', porch: 'front', stories: 1, slope: true } },
    },
  },
  'mountain-cabin': {
    key: 'mountain-cabin', label: 'Mountain cabin',
    palettes: [
      { wall: '#8a5a36', trim: '#efe2c8', roof: '#3e5e44', accent: '#9a9a92' },
      { wall: '#a06a3e', trim: '#f2ead8', roof: '#7a3a30', accent: '#9a9a92' },
      { wall: '#6e4a30', trim: '#e8dcc0', roof: '#4a5a6a', accent: '#9a9a92' },
    ],
    house: { roof: 'gable', pitch: 'steep', porch: 'front', stilts: false, garage: false, stories: 1, windowStyle: 'double-hung', siding: 'log', aframe: true, woodpile: true },
    apartment: apt({ rooftop: 'gable', material: 'log', floorsBySettlement: { rural: [2, 2] } }),
    condo: condo({ townhomes: true }),
    vegetation: ['pine', 'spruce'], props: ['woodpile', 'snow'],
  },
  'new-england': {
    key: 'new-england', label: 'New England',
    palettes: [
      { wall: '#f6f3ec', trim: '#1f2326', roof: '#4a4c50', accent: '#a8322a' },
      { wall: '#e8d8a8', trim: '#ffffff', roof: '#4a4c50', accent: '#a8322a' },
      { wall: '#9ab0c0', trim: '#ffffff', roof: '#3a3c40', accent: '#a8322a' },
    ],
    house: { roof: 'gable', pitch: 'steep', porch: 'stoop', stilts: false, garage: false, stories: 1.5, windowStyle: 'shutters', siding: 'clapboard', barn: true },
    apartment: apt({ rooftop: 'parapet', material: 'brick', floorsBySettlement: { 'small-town': [3, 4] } }),
    condo: condo({ townhomes: true }),
    vegetation: ['maple', 'birch'], props: ['red-barn', 'stone-wall'],
  },
  maritime: {
    key: 'maritime', label: 'Maritime',
    palettes: [
      { wall: '#e8503a', trim: '#ffffff', roof: '#3a3c42', accent: '#f2c440' },
      { wall: '#3a8ac8', trim: '#ffffff', roof: '#3a3c42', accent: '#e8503a' },
      { wall: '#f2c440', trim: '#ffffff', roof: '#3a3c42', accent: '#3aa070' },
      { wall: '#3aa070', trim: '#ffffff', roof: '#3a3c42', accent: '#8a5ac0' },
    ],
    house: { roof: 'gable', pitch: 'steep', porch: 'stoop', stilts: false, garage: false, stories: 2, windowStyle: 'double-hung', siding: 'clapboard', row: true },
    apartment: apt({ rooftop: 'gable', material: 'wood', floorsBySettlement: { 'mid-city': [3, 4], 'small-town': [2, 3] } }),
    condo: condo({ floorsBySettlement: { 'mid-city': [4, 6], 'small-town': [2, 3] } }),
    vegetation: ['pine', 'birch'], props: ['lighthouse', 'harbour'],
    variants: {
      alaska: { label: 'Alaska coastal', house: { siding: 'metal', row: false, boat: true, pitch: 'low' },
        palettes: [
          { wall: '#5f8a9a', trim: '#e8e4dc', roof: '#3a4048', accent: '#d2553c' },
          { wall: '#9a4a3a', trim: '#e8e4dc', roof: '#3a4048', accent: '#3a8ac8' },
          { wall: '#c8c4b8', trim: '#3a4048', roof: '#2f5a4a', accent: '#e0a030' },
        ] },
    },
  },
  appalachian: {
    key: 'appalachian', label: 'Appalachian',
    palettes: [
      { wall: '#f6f3ec', trim: '#ffffff', roof: '#3e6a4a', accent: '#a8423a' },
      { wall: '#a8503e', trim: '#f6f3ec', roof: '#3e6a4a', accent: '#f6f3ec' },
      { wall: '#e8e0c8', trim: '#ffffff', roof: '#8a3a30', accent: '#3e6a4a' },
    ],
    house: { roof: 'gable', pitch: 'mid', porch: 'wraparound', stilts: false, garage: false, stories: 2, windowStyle: 'double-hung', siding: 'clapboard', roofMaterial: 'metal' },
    apartment: apt({ rooftop: 'parapet', material: 'brick', floorsBySettlement: { 'mid-city': [3, 4], 'small-town': [2, 3] } }),
    condo: condo({ floorsBySettlement: { 'mid-city': [4, 5] } }),
    vegetation: ['oak', 'maple', 'pine'], props: ['forested-hills'],
  },
  'delta-south': {
    key: 'delta-south', label: 'Delta South',
    palettes: [
      { wall: '#a8d0c8', trim: '#ffffff', roof: '#8a8e92', accent: '#e86a5a' },
      { wall: '#f4c8a0', trim: '#ffffff', roof: '#6a6e72', accent: '#3a8a9a' },
      { wall: '#d8c4e0', trim: '#ffffff', roof: '#8a8e92', accent: '#e8b440' },
      { wall: '#f0e6a0', trim: '#ffffff', roof: '#7a5a4a', accent: '#5a8ac0' },
    ],
    house: { roof: 'gable', pitch: 'mid', porch: 'front', stilts: 'piers', garage: false, stories: 1, windowStyle: 'tall', siding: 'clapboard', shotgun: true, roofMaterial: 'metal' },
    apartment: apt({ rooftop: 'parapet', material: 'brick', floorsBySettlement: { 'small-town': [2, 2] } }),
    condo: condo(),
    vegetation: ['oak'], props: ['flat-fields'],
  },
  'midwest-lakeside': {
    key: 'midwest-lakeside', label: 'Midwest lakeside',
    palettes: [
      { wall: '#efe4c8', trim: '#ffffff', roof: '#4a5a48', accent: '#a8483a' },
      { wall: '#6e8a6a', trim: '#f2ead8', roof: '#3e3e40', accent: '#a8483a' },
      { wall: '#c8b088', trim: '#ffffff', roof: '#5a3e34', accent: '#a8483a' },
    ],
    house: { roof: 'hip', pitch: 'mid', porch: 'front', stilts: false, garage: false, stories: 2, windowStyle: 'double-hung', siding: 'clapboard', dormer: true, foundation: 'sandstone' },
    apartment: apt({ rooftop: 'parapet', material: 'brick', floorsBySettlement: { 'small-city': [3, 4] } }),
    condo: condo({ floorsBySettlement: { 'small-city': [3, 4] } }),
    vegetation: ['birch', 'pine'], props: ['lake', 'snow'],
  },
  'plains-ranch': {
    key: 'plains-ranch', label: 'Plains ranch',
    palettes: [
      { wall: '#f6f3ec', trim: '#8a3a30', roof: '#6a5e54', accent: '#b0382e' },
      { wall: '#d8c4a0', trim: '#ffffff', roof: '#5a4e44', accent: '#b0382e' },
      { wall: '#b8c4c8', trim: '#ffffff', roof: '#4a4e52', accent: '#b0382e' },
    ],
    house: { roof: 'gable', pitch: 'low', porch: 'none', stilts: false, garage: false, stories: 1, windowStyle: 'picture', siding: 'lap', barn: true, grainBin: true },
    apartment: apt({ rooftop: 'gable', material: 'brick', floorsBySettlement: { rural: [2, 2] } }),
    condo: condo(),
    vegetation: ['grass'], props: ['barn', 'windmill', 'grain-bin'],
  },
};

/**
 * 3D parameters per family (08 §4, task 34), read by three/styles.js. roof: hip | gable | shed | flat | barrel | aframe |
 * saltbox; pitch = rise per run; eave = overhang (ft); ridge 'x' runs across the front, 'z' puts the gable to the street.
 * wallTex/roofTex: canvas texture kinds (materials.js). window: jalousie | sash | grid | storefront (+ windowExtra
 * shutters | arched | tall). porch: lanai | front | craftsman | stoop | wraparound | patio | none. base: posts | piers |
 * slab | sandstone | lava | raised (5 ft, wall material: the brownstone stoop level). rails: wood | iron | glass | pipe. rooftop: water-tank | ac | solar. trees: props.js TREE_KINDS.
 */
const LOOK = {
  'hawaii-plantation': { roof: 'hip', pitch: 0.32, eave: 2.5, ridge: 'x', roofTex: 'metal', wallTex: 'batten', window: 'jalousie', porch: 'lanai', base: 'posts', rails: 'wood', rooftop: ['solar'], trees: ['palm', 'banana', 'mango'], extras: ['catchment', 'slippers'] },
  'hawaii-upcountry': { roof: 'gable', pitch: 0.9, eave: 1.5, ridge: 'x', roofTex: 'metal', wallTex: 'batten', window: 'sash', porch: 'front', base: 'slab', rails: 'wood', rooftop: [], trees: ['birch', 'pine'], extras: ['chimney-stone', 'ranch-fence'] },
  'kona-coastal': { roof: 'hip', pitch: 0.22, eave: 3, ridge: 'x', roofTex: 'metal', wallTex: 'stucco', window: 'grid', porch: 'lanai', base: 'lava', rails: 'glass', rooftop: ['solar'], trees: ['palm', 'citrus'], extras: ['lava-wall'] },
  'honolulu-highrise': { roof: 'shed', pitch: 0.12, eave: 2, ridge: 'x', roofTex: null, wallTex: 'stucco', window: 'storefront', porch: 'none', base: 'slab', rails: 'glass', rooftop: ['ac'], trees: ['monkeypod', 'palm'], extras: ['carport', 'upper-lanai'] },
  'pnw-urban': { roof: 'gable', pitch: 0.42, eave: 3, ridge: 'z', roofTex: 'shingle', wallTex: 'shingle', window: 'grid', porch: 'craftsman', base: 'slab', rails: 'wood', rooftop: [], trees: ['spruce', 'pine', 'maple'], extras: ['brackets'] },
  'nyc-brownstone': { roof: 'flat', pitch: 0, eave: 0, ridge: 'x', roofTex: null, wallTex: 'ashlar', window: 'sash', windowExtra: 'tall', porch: 'stoop', base: 'raised', rails: 'iron', rooftop: ['water-tank'], trees: ['oak'], extras: ['cornice', 'fire-escape'] },
  'miami-deco': { roof: 'flat', pitch: 0, eave: 0, ridge: 'x', roofTex: null, wallTex: 'stucco', window: 'sash', windowExtra: 'shutters', porch: 'patio', base: 'slab', rails: 'pipe', rooftop: ['ac'], trees: ['palm'], extras: ['deco-bands'] },
  'texas-suburban': { roof: 'hip', pitch: 0.5, eave: 1.5, ridge: 'x', roofTex: 'shingle', wallTex: 'brick', window: 'sash', porch: 'none', base: 'slab', rails: 'wood', rooftop: [], trees: ['oak', 'citrus'], extras: ['garage-2', 'ac-ground'] },
  'desert-southwest': { roof: 'barrel', pitch: 0.3, eave: 1.5, ridge: 'x', roofTex: 'tile', wallTex: 'stucco', window: 'sash', windowExtra: 'arched', porch: 'none', base: 'slab', rails: 'iron', rooftop: ['solar'], trees: ['cactus', 'agave'], extras: ['block-wall', 'gravel'] },
  'mountain-cabin': { roof: 'aframe', pitch: 1.7, eave: 1.5, ridge: 'z', roofTex: 'metal', wallTex: 'log', window: 'grid', porch: 'front', base: 'piers', rails: 'wood', rooftop: [], trees: ['pine', 'spruce'], extras: ['woodpile', 'chimney-stone'] },
  'new-england': { roof: 'gable', pitch: 0.85, eave: 1, ridge: 'x', roofTex: 'shingle', wallTex: 'siding', window: 'sash', windowExtra: 'shutters', porch: 'stoop', base: 'slab', rails: 'wood', rooftop: [], trees: ['maple', 'birch'], extras: ['chimney-brick', 'barn'] },
  maritime: { roof: 'saltbox', pitch: 0.8, eave: 1, ridge: 'x', roofTex: 'shingle', wallTex: 'siding', window: 'sash', porch: 'stoop', base: 'slab', rails: 'wood', rooftop: [], trees: ['spruce', 'birch'], extras: ['row'] },
  appalachian: { roof: 'gable', pitch: 0.55, eave: 1.5, ridge: 'x', roofTex: 'metal', wallTex: 'siding', window: 'sash', porch: 'wraparound', base: 'piers', rails: 'wood', rooftop: [], trees: ['oak', 'maple', 'pine'], extras: ['chimney-brick'] },
  'delta-south': { roof: 'gable', pitch: 0.6, eave: 1.5, ridge: 'z', roofTex: 'metal', wallTex: 'siding', window: 'sash', windowExtra: 'tall', porch: 'front', base: 'piers', rails: 'wood', rooftop: [], trees: ['oak'], extras: ['shotgun'] },
  'midwest-lakeside': { roof: 'hip', pitch: 0.5, eave: 2, ridge: 'x', roofTex: 'shingle', wallTex: 'siding', window: 'sash', porch: 'front', base: 'sandstone', rails: 'wood', rooftop: [], trees: ['birch', 'pine'], extras: ['dormer'] },
  'plains-ranch': { roof: 'gable', pitch: 0.25, eave: 2, ridge: 'x', roofTex: 'shingle', wallTex: 'siding', window: 'grid', porch: 'none', base: 'slab', rails: 'wood', rooftop: [], trees: ['oak'], extras: ['barn', 'windmill'] },
};
for (const [k, look] of Object.entries(LOOK)) STYLE_FAMILY_DATA[k].look = look;
STYLE_FAMILY_DATA['desert-southwest'].variants.hillside.look = { roof: 'shed', pitch: 0.15, roofTex: 'metal', wallTex: 'batten', porch: 'front', base: 'piers', extras: ['gravel'] };
STYLE_FAMILY_DATA.maritime.variants.alaska.look = { roof: 'gable', pitch: 0.4, wallTex: 'metal', extras: ['boat'] };

/** Ordered list (enums.js STYLE_FAMILIES order). */
export const STYLE_FAMILY_LIST = Object.values(STYLE_FAMILY_DATA);

/**
 * The family record for a place, with its variant (03 §1 `styleVariant`) merged in: variant house traits override the
 * base ones and a variant may bring its own palettes.
 */
export function styleFamily(key, variant = null) {
  const base = STYLE_FAMILY_DATA[key];
  if (!base) throw new Error(`unknown style family "${key}"`);
  const v = variant ? base.variants?.[variant] : null;
  if (!v) return base;
  return { ...base, label: v.label || base.label, variant, palettes: v.palettes || base.palettes, house: { ...base.house, ...v.house },
    look: { ...base.look, ...(v.look || {}) } };
}
