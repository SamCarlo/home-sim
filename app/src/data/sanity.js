// Rough plausibility bands from 03 §5, in whole USD (rates as decimals). The validator turns a value outside its band
// into a warning, never an error; sources win (cite them in docs/DATA_SOURCES.md). Pure data.

/** Bands per location id: [min, max]. `condo` is set only where 03 §5 gives one; null = no band (e.g. Yellow Pine rent). */
export const SANITY = {
  pahoa:         { rent1br: [1100, 1600], house: [300000, 420000],   buildSqft: [350, 550], taxRate: [0.003, 0.007] },
  hilo:          { rent1br: [1200, 1700], house: [450000, 600000],   buildSqft: [350, 550], taxRate: [0.003, 0.007] },
  'kailua-kona': { rent1br: [1800, 2500], house: [800000, 1200000],  buildSqft: [400, 600], taxRate: [0.003, 0.007] },
  waimea:        { rent1br: [1700, 2400], house: [850000, 1300000],  buildSqft: [400, 600], taxRate: [0.003, 0.007] },
  honolulu:      { rent1br: [1900, 2600], house: [1000000, 1300000], condo: [450000, 550000], buildSqft: [450, 650], taxRate: [0.0025, 0.0045] },
  seattle:       { rent1br: [1900, 2500], house: [850000, 1000000],  buildSqft: [350, 500], taxRate: [0.008, 0.011] },
  brooklyn:      { rent1br: [3000, 4200], house: [1200000, 2000000], condo: [700000, 1100000], buildSqft: null, taxRate: [0.007, 0.011] },
  miami:         { rent1br: [2000, 2800], house: [550000, 750000],   condo: [350000, 480000], buildSqft: [250, 350], taxRate: [0.016, 0.021] },
  katy:          { rent1br: [1200, 1600], house: [330000, 420000],   buildSqft: [150, 220], taxRate: [0.022, 0.032] },
  'las-vegas':   { rent1br: [1200, 1500], house: [420000, 490000],   buildSqft: [200, 300], taxRate: [0.005, 0.008] },
  chattanooga:   { rent1br: [1100, 1500], house: [280000, 360000],   buildSqft: [180, 260], taxRate: [0.008, 0.012] },
  halifax:       { rent1br: [1300, 1700], house: [380000, 480000],   buildSqft: [220, 320], taxRate: [0.009, 0.013] },
  'yellow-pine': { rent1br: null,         house: [250000, 550000],   buildSqft: [300, 450], taxRate: [0.004, 0.007] },
  marquette:     { rent1br: [850, 1200],  house: [230000, 300000],   buildSqft: [200, 280], taxRate: [0.013, 0.020] },
  montpelier:    { rent1br: [1200, 1700], house: [330000, 420000],   buildSqft: [250, 350], taxRate: [0.018, 0.025] },
  elkins:        { rent1br: [650, 900],   house: [140000, 210000],   buildSqft: [170, 250], taxRate: [0.005, 0.008] },
  clarksdale:    { rent1br: [600, 850],   house: [60000, 120000],    buildSqft: [150, 210], taxRate: [0.009, 0.016] },
  bisbee:        { rent1br: [750, 1050],  house: [220000, 320000],   buildSqft: [200, 300], taxRate: [0.006, 0.010] },
  valentine:     { rent1br: [600, 850],   house: [150000, 230000],   buildSqft: [180, 250], taxRate: [0.014, 0.021] },
  homer:         { rent1br: [1150, 1600], house: [380000, 500000],   buildSqft: [300, 420], taxRate: [0.009, 0.014] },
};

/** Bands for every place (03 §2 metric ranges and general guards against typos). */
export const GENERAL = {
  metricRange: [1, 5],
  population: [1, 10000000],
  medianAge: [18, 70],
  hookMaxWords: 16,
  monthsToBuild: [3, 24],
  utilitiesMonthly: [50, 600],     // whole USD, 1-bedroom apartment
  groceriesMonthly: [250, 900],
};
