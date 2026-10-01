// Sky and ground palettes per biome for the 2D preview pictures (04 §7). Pure data, no imports.
// Late-afternoon light: skies fade from a blue top to a warm horizon. `clouds` marks wet biomes, `haze` desert ones.

/** Shared drawing constants (viewBox 480 × 270). */
export const VIEW = { w: 480, h: 270, horizon: 190 };

/**
 * Biome → palette. skyTop/skyBottom: gradient; sun: low sun color; ground: [far, mid, near] terrain bands;
 * leaf: [dark, light] vegetation greens; trunk; veg: vegetation kinds drawn by backgrounds.js `vegetation()`.
 */
export const BIOME_PALETTE = {
  'tropical-wet': { skyTop: '#7fb2d9', skyBottom: '#f3d9b8', sun: '#ffe9b0', clouds: 3, haze: false,
    ground: ['#4f8a4a', '#3f7a3c', '#356b33'], leaf: ['#2e6a34', '#58a04e'], trunk: '#6b5440',
    veg: ['palm', 'banana', 'ohia', 'fern', 'fern'] },
  'tropical-dry': { skyTop: '#5fa3dc', skyBottom: '#fbe2b6', sun: '#fff1c2', clouds: 1, haze: false,
    ground: ['#a89a6e', '#8f8a5c', '#5d5a4c'], leaf: ['#4d7a3a', '#86a85a'], trunk: '#6e5a44',
    veg: ['palm', 'shrub', 'palm', 'grass'] },
  'tropical-upland': { skyTop: '#8fb3cf', skyBottom: '#efe0c8', sun: '#fff0cc', clouds: 3, haze: false,
    ground: ['#79a35c', '#679552', '#557f45'], leaf: ['#3f6a3a', '#6f9a54'], trunk: '#5f4c3c',
    veg: ['oak', 'grass', 'fern', 'pine'] },
  'tropical-urban': { skyTop: '#62a6dc', skyBottom: '#fadcb4', sun: '#fff0c4', clouds: 1, haze: false,
    ground: ['#8fa47a', '#7d9668', '#9a9890'], leaf: ['#2f7040', '#62a85a'], trunk: '#6b5440',
    veg: ['palm', 'citytree', 'palm'] },
  'temperate-rain': { skyTop: '#8aa6bd', skyBottom: '#e4dccf', sun: '#f6ead0', clouds: 4, haze: false,
    ground: ['#5c7f5a', '#4c6f4b', '#8e928c'], leaf: ['#244f36', '#4f7f4f'], trunk: '#4f4036',
    veg: ['pine', 'citytree', 'fern', 'pine'] },
  'temperate-urban': { skyTop: '#7ea7cf', skyBottom: '#f0d6bc', sun: '#ffe8c0', clouds: 2, haze: false,
    ground: ['#7e8b78', '#7a8670', '#9b9a95'], leaf: ['#3d6b3a', '#73a05a'], trunk: '#5a4636',
    veg: ['citytree', 'oak'] },
  'subtropical-coastal': { skyTop: '#4fa3e0', skyBottom: '#fcd9b0', sun: '#fff0c0', clouds: 2, haze: false,
    ground: ['#8fb08a', '#7fa476', '#c9c0a4'], leaf: ['#2c7a4a', '#6abf6a'], trunk: '#7a6248',
    veg: ['palm', 'palm', 'citytree'] },
  'subtropical-flat': { skyTop: '#6aa7d8', skyBottom: '#f7dcb2', sun: '#fff0c4', clouds: 2, haze: false,
    ground: ['#9bab6a', '#8a9d5c', '#76894e'], leaf: ['#3f6a33', '#7a9e4a'], trunk: '#5e4a38',
    veg: ['oak', 'grass', 'oak'] },
  desert: { skyTop: '#5d9bd6', skyBottom: '#ffd7a8', sun: '#fff1c8', clouds: 0, haze: true,
    ground: ['#d8b38a', '#cfa57a', '#c4976a'], leaf: ['#5f8a4f', '#8fb06a'], trunk: '#7a6248',
    veg: ['cactus', 'agave', 'shrub'] },
  'desert-mountain': { skyTop: '#5f9ad3', skyBottom: '#ffd4a4', sun: '#fff0c4', clouds: 1, haze: true,
    ground: ['#c49a72', '#b88d66', '#a97e58'], leaf: ['#5f8550', '#8fae6a'], trunk: '#6e5844',
    veg: ['agave', 'cactus', 'shrub'] },
  'humid-forest': { skyTop: '#78a8d4', skyBottom: '#f4d8b6', sun: '#ffeac0', clouds: 2, haze: false,
    ground: ['#5f8a4c', '#527d42', '#467038'], leaf: ['#2f5f2e', '#6f9a44'], trunk: '#5a4434',
    veg: ['maple', 'oak', 'pine', 'maple'] },
  maritime: { skyTop: '#7d9fc0', skyBottom: '#ead9c4', sun: '#f8e8c8', clouds: 3, haze: false,
    ground: ['#6f8c62', '#5f7f56', '#8a8a84'], leaf: ['#2d5a3c', '#5f8a4c'], trunk: '#4f3f34',
    veg: ['pine', 'birch', 'maple'] },
  alpine: { skyTop: '#5d95cf', skyBottom: '#e9e0cc', sun: '#fff4d4', clouds: 1, haze: false,
    ground: ['#6f8a66', '#5f7a58', '#8a7a62'], leaf: ['#1f4a32', '#3f6a46'], trunk: '#4a3a30',
    veg: ['pine', 'pine', 'pine'] },
  'continental-lake': { skyTop: '#6f9cc9', skyBottom: '#efdcc2', sun: '#fbeac6', clouds: 2, haze: false,
    ground: ['#6f9058', '#62844e', '#557744'], leaf: ['#2a5636', '#78a04e'], trunk: '#4a3a30',
    veg: ['birch', 'pine', 'maple'] },
  'continental-forest': { skyTop: '#73a0cc', skyBottom: '#f2d8b8', sun: '#ffe8bf', clouds: 2, haze: false,
    ground: ['#6f9455', '#61874a', '#557a40'], leaf: ['#2f5a30', '#d27a34'], trunk: '#4f3c30',
    veg: ['maple', 'birch', 'pine', 'maple'] },
  plains: { skyTop: '#5f9fdc', skyBottom: '#fbdcae', sun: '#fff0c0', clouds: 1, haze: false,
    ground: ['#c2b27a', '#b0a46a', '#9c9a5c'], leaf: ['#6f8a44', '#a8a85a'], trunk: '#6a5440',
    veg: ['grass', 'grass', 'oak'] },
  'subarctic-coastal': { skyTop: '#6f97c4', skyBottom: '#f0dcc8', sun: '#fde8c8', clouds: 2, haze: false,
    ground: ['#6a8460', '#5c7754', '#7f8676'], leaf: ['#1f4634', '#4a7048'], trunk: '#4a3a30',
    veg: ['pine', 'birch', 'pine'] },
};

/** Palette for a biome (falls back to tropical-wet so an unknown key never breaks a picture). */
export function paletteFor(biome) {
  return BIOME_PALETTE[biome] || BIOME_PALETTE['tropical-wet'];
}
