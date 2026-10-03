// Every tunable number in the game (docs/spec/01-architecture.md §9).
// A teacher should be able to change a rule by editing one number here.
// Money is integer cents; rates are decimals. Pure module: no DOM, no imports.

/** Shown in the header and the page title (00 §5, OPEN_ITEMS: the teacher may rename it). */
export const GAME_TITLE = 'Home & Life Sim';
/** monthIndex 0 = January of this year (00 D15). */
export const START_YEAR = 2033;
/** Class codes accepted in local mode (11 §2). */
export const LOCAL_CLASS_CODES = ['DEMO'];

/** Intake field limits (04 §1). Money in cents. */
export const INTAKE = {
  nameMin: 2, nameMax: 30,
  jobTitleMax: 40,
  incomeMinCents: 50000, incomeMaxCents: 2000000,     // $500 – $20,000 per month
  hoursMin: 10, hoursMax: 80, hoursDefault: 40,
  savingsMinCents: 0, savingsMaxCents: 100000000,     // $0 – $1,000,000
  weeksPerYear: 52,                                   // for the "per hour" one-liner
};

/** Housing cost defaults (04 §3; netToGross from 05 §7). */
export const FINANCE = {
  downPaymentPct: 0.10,
  mortgageRate: 0.065,           // 30-year fixed
  mortgageTermMonths: 360,
  mortgageRate15: 0.0585,        // 15-year option
  mortgageTerm15Months: 180,
  closingPct: 0.03,              // of the price (of the loan, for a build)
  pmiAnnualPct: 0.006,           // of the loan, while down < 20%
  pmiThresholdPct: 0.20,
  pmiDropLtv: 0.78,              // PMI drops off at 78% of the original price (09 §6)
  inspectionCents: 50000,
  appraisalCents: 60000,
  applicationFeeCents: { apartment: 5000, shared: 2500 },
  depositMonths: 1,
  utilityFactor: { apartment: 1.0, shared: 0.5, condo: 1.1, house: 1.6, build: 1.3 },
  build: {
    sqft: 1000,                  // the "cozy" plan
    contingencyPct: 0.10,        // financed
    downPaymentPct: 0.20,
    loanPct: 0.80,
    rate: 0.07,                  // construction-to-permanent
    termMonths: 360,
    avgDrawnPct: 0.50,           // interest reserve: loan × 50% drawn on average
    insuranceScaleMin: 0.5,
    insuranceScaleMax: 1.5,
  },
  netToGross: 0.76,              // gross = net ÷ 0.76
  fha: {                         // 05 §4 (simplified FHA)
    minDownPct: 0.035,
    upfrontMipPct: 0.0175,       // financed into the loan
    annualMipPct: 0.0055,        // of the loan, paid monthly
  },
};

/** Affordability colors (04 §4): red if over cash/income, yellow above ⅓, cyan at ⅕ or less. */
export const AFFORD = {
  stretchDivisor: 3,             // monthly × 3 > income → yellow
  wellBelowDivisor: 5,           // monthly × 5 ≤ income → cyan
};

/** Credit score and card terms (02 §2 initial score, 05 §4 inquiries, 05 §6 card, 09 §6 monthly changes). */
export const CREDIT = {
  startingScore: 680,
  minScore: 300,
  maxScore: 850,
  hardInquiryCost: 5,            // score −5 per hard inquiry
  inquiryRecoverMonths: 12,      // +5 back once an inquiry is older than this
  monthlyOnTime: 3,
  monthlyOnTimeAbove750: 1,
  utilizationWarnPct: 0.30,  utilizationWarnCost: 10,
  utilizationHighPct: 0.60,  utilizationHighCost: 25,
  missedPaymentCost: 60,
  foreclosureCost: 150,
  bands: [                       // portfolio gauge label (task 17), FICO-style ranges; first minScore ≤ score wins
    { minScore: 800, key: 'excellent', label: 'Excellent', status: 'green' },
    { minScore: 740, key: 'very-good', label: 'Very good', status: 'green' },
    { minScore: 670, key: 'good', label: 'Good', status: 'cyan' },
    { minScore: 580, key: 'fair', label: 'Fair', status: 'yellow' },
    { minScore: 0, key: 'poor', label: 'Poor', status: 'red' },
  ],
  card: {
    tiers: [                     // first match by minimum score wins
      { minScore: 700, kind: 'regular', limitCents: 150000, apr: 0.2299 },
      { minScore: 640, kind: 'regular', limitCents: 100000, apr: 0.2599 },
      { minScore: 0, kind: 'secured', limitCents: 30000, apr: 0.2799 },
    ],
    approveMinScore: 600,        // below this the offer becomes the secured card
    securedDepositCents: 30000,
    penaltyApr: 0.2999,
    annualFeeCents: 0,
    graceDays: 25,
    lateFeeCents: 3000,
    minPaymentFloorCents: 2500,
    minPaymentPct: 0.01,         // + that month's interest
  },
};

/** Underwriting (05 §7). p = product of factors; approved when a seeded draw u < p. */
export const UNDERWRITING = {
  letterFactorBase: 0.55,        // letterFactor(L) = 0.55 + 0.45 × L
  letterFactorSlope: 0.45,
  lease: {
    hardFailRatio: 1.5,
    ratioTiers: [{ min: 3, f: 1.0 }, { min: 2.5, f: 0.85 }],
    cosignerF: 0.75,             // below 2.5 with an agreeing co-signer
    creditTiers: [{ min: 650, f: 1.0 }, { min: 600, f: 0.9 }, { min: 0, f: 0.75 }],
  },
  cosigner: { base: 0.35, slope: 0.6 },
  roommates: { goodRatio: 2.5, lowRatioF: 0.8, agreementBonus: 0.05 },   // ±5% from the roommate agreement (05 §4)
  mortgage: {
    maxBack: 0.50,
    minCredit: 580,
    fhaMinCredit: 580,
    conventionalMinCredit: 620,
    lavaZoneMinDownPct: 0.20,    // Lava Zones 1–2
    backTiers: [{ max: 0.36, f: 1.0 }, { max: 0.43, f: 0.85 }, { max: 0.50, f: 0.55 }],
    reserveMonths: 2, reserveF: 0.8,
    creditTiers: [
      { min: 740, f: 1.0, rateAdj: -0.0025 },
      { min: 680, f: 1.0, rateAdj: 0 },
      { min: 620, f: 0.9, rateAdj: 0.00375 },
      { min: 580, f: 0.8, rateAdj: 0.005, fhaOnly: true },
    ],
  },
  construction: {
    minCredit: 680,
    maxBack: 0.45,
    minDownPct: 0.20,
    backTiers: [{ max: 0.36, f: 1.0 }, { max: 0.43, f: 0.8 }, { max: 0.45, f: 0.5 }],
    contractorAF: 0.9,
  },
  creditExplanationBelow: 660,   // credit-explanation letter needed below this (05 §3)
  cosignerBelowRatio: 2.5,
};

/** Life phase: time budget (09 §4), money (09 §6), events (09 §7), wellbeing (09 §8),
 *  animation (09 §9) and care minigame (09 §10). */
export const LIFE = {
  wakingHoursPerWeek: 112,
  personalCareHours: 14,
  weeksPerMonth: 4.33,
  chores: {
    base: 10,
    byHomeType: { shared: -2, apartment: 0, condo: 0, house: 3, build: 4 },
    perAnimalKind: 1,
    gardenBeds: 1,
    walkUp: 0.5,
    roommateTraitMax: 1,
  },
  choices: {
    exercise: [0, 2, 4, 7],              // h/week
    extraWork: [0, 8, 16, 32],           // h/month
    social: [3, 7, 12, 20],              // h/week
    deepPractice: [7, 4, 0],             // h/week
  },
  defaults: { exercise: 4, extraWork: 0, social: 7, deepPractice: 7 },
  freeTime: [                            // first match wins
    { key: 'overbooked', below: 0, label: 'Overbooked — something has to give', color: 'red', mentalDelta: -8, physicalDelta: -2 },
    { key: 'burnout', below: 5, label: 'Burnout risk', color: 'red', mentalDelta: -6, physicalDelta: 0 },
    { key: 'stretched', below: 12, label: 'Stretched thin', color: 'orange', mentalDelta: -2, physicalDelta: 0 },
    { key: 'balanced', atMost: 30, label: 'Balanced', color: 'green', mentalDelta: 3, physicalDelta: 0 },
    { key: 'restless', atMost: 40, label: 'Restless', color: 'yellow', mentalDelta: -1, physicalDelta: 0 },
    { key: 'adrift', atMost: Infinity, label: 'Adrift — too much empty time', color: 'orange', mentalDelta: -4, physicalDelta: 0 },
  ],
  overtimeMultiplier: 1.5,
  paydays: [1, 15],
  gymMinExerciseHours: 4,                // exercise ≥ 4 h adds the location's gymMonthlyCents
  socialPaidShare: 0.5,                  // not every social hour costs money
  deepPracticeCostCents: { 0: 0, 4: 1000, 7: 2000 },
  petMonthlyCents: { cat: 3500, dog: 6000, chickens: 1500 },
  gardenMonthlyCents: 1000,
  adoptCents: { garden: 4000, cat: 15000, chickens: 12000 },
  solarUtilityCut: 0.40,
  catchmentWaterSaveCents: 4000,
  catchmentFilterCents: 2000,
  checkingBufferCents: 100000,           // checking above $1,000 sweeps to savings
  lateFees: { housingPct: 0.05, cardCents: 3000, utilitiesCents: 1500 },
  finalNoticeStreak: 2,
  evictionStreak: 3,
  maxRandomEventsPerMonth: 3,
  uninsuredLossCapCents: 800000,
  wellbeing: { start: 60, pullToward: 50, pullPct: 0.05, min: 0, max: 100 },
  dayMs: 1200,                           // one game day at 1×
  speeds: [1, 2, 4],
  reducedMotionDayMs: 300,
  careAppearances: 8,
  careWindowMs: 2500,
  careWindowLongMs: 5000,                // "longer care window" setting
  careSurviveRate: 0.5,
};

/** Investing (10 §1–§2). μ and σ are annual. */
export const INVEST = {
  unlockCents: 500000,
  reserveCents: 200000,
  portfolios: [
    { key: 'low', name: 'Low risk', mu: 0.040, sigma: 0.04,
      blurb: 'A bond fund: loans to governments and big companies. Slow and steady.' },
    { key: 'medium', name: 'Medium risk', mu: 0.065, sigma: 0.10,
      blurb: 'A balanced fund: about 60% stocks and 40% bonds.' },
    { key: 'high', name: 'High risk', mu: 0.090, sigma: 0.18,
      blurb: 'A stock index fund: a slice of hundreds of companies. Grows most over time, drops hardest in bad years.' },
  ],
};

/** Save throttles (02 §4). */
export const SAVE = {
  draftIntervalMs: 30000,
  checkpointMinGapMs: 5000,
};

/** Letters (06 §2–§3; D10). */
export const LETTERS = {
  browserSpellcheck: false,
  bands: [
    { min: 85, key: 'excellent', label: 'Excellent', status: 'green' },   // 06 §3 step 6; status = the st-* color
    { min: 70, key: 'strong', label: 'Strong', status: 'green' },
    { min: 55, key: 'fair', label: 'Fair', status: 'cyan' },
    { min: 40, key: 'weak', label: 'Weak', status: 'yellow' },
    { min: 0, key: 'needs-work', label: 'Needs work', status: 'red' },
  ],
  topContributions: 3,                // 06 §3 step 7: top 3 that helped and top 3 that hurt …
  minEffect: 0.05,                    // … ignoring contributions smaller than this (|wᵢ·zᵢ|)
  reportMaxIssues: 12,                // the report lists this many spelling / grammar issues, then "and N more"
};

/** Paperwork forms (05 §4, task 18). */
export const FORMS = {
  signDate: 'December 2032',          // every paperwork signature is dated this (game time before January 2033)
  phoneHint: '(808) 555-01xx',        // fictional 555-01xx range only
  initialsMax: 4,                     // longest initials box
};

/** Renter documents (05 §4, task 20): the lease's clause numbers, also used by the late-fee question. */
export const LEASE = {
  termMonths: 12,
  startLabel: 'January 1, 2033',
  renewalNoticeDays: 60,              // automatic renewal unless you give this much written notice
  lateFeeCents: 7500,                 // flat fee once rent is late …
  lateFeeGraceDay: 5,                 // … after the 5th
  lateFeePerDayCents: 1000,           // plus this per day after the grace day
  lateQuestionDay: 8,                 // "If rent arrives on the 8th, what's the late fee?"
  repairShareCents: 10000,            // tenant pays the first $100 of a repair
  guestNights: 14,                    // per 6 months
  petFeeCents: 30000,
  petRentCents: 3500,
  breakMonths: 2,                     // breaking the lease costs 2 months' rent
  entryNoticeDays: 2,
  quietHours: '10 pm to 7 am',
};

/** Buyer documents (05 §4 hoa-review, home-inspection, appraisal, closing-disclosure; task 22). */
export const BUYING = {
  hoa: {
    healthyPct: [62, 78],               // reserve fund % funded when healthy (~70%) …
    lowPct: [18, 32],                   // … or low (~25%)
    lowChance: 0.35,                    // chance the reserve is low (raised by a pending assessment)
    lowChanceWithAssessment: 0.7,
    assessmentChance: { miami: 0.85, brooklyn: 0.35, honolulu: 0.35, default: 0.2 },
    assessmentMonthlyCents: { miami: [20000, 30000], default: [6000, 18000] },
    assessmentMonths: { miami: [60, 60], default: [24, 48] },
  },
  inspection: {
    inspectors: [
      { id: 'budget', label: 'Budget', feeCents: 30000, stars: 2.8, blurb: 'A quick walk-through and a two-page checklist.' },
      { id: 'standard', label: 'Standard', feeCents: 50000, stars: 4.6, blurb: 'A full report with photos of every problem.' },
      { id: 'thorough', label: 'Thorough', feeCents: 75000, stars: 4.9, blurb: 'Full report plus a termite check and a camera down the sewer line.' },
    ],
    findings: [3, 6],                   // how many problems a home has
    hiddenChance: 0.45,                 // a quick walk-through misses this finding
    missMonths: [1, 7],                 // a missed finding shows up in monthIndex 1–7 (life months 2–8, 09 §7)
    creditChance: { minor: 0.3, moderate: 0.6, major: 0.85 }, // seller agrees to a repair credit, by worst severity asked
  },
  appraisal: { low: 0.96, high: 1.03, sellerLowersChance: 0.5 },
  closing: { rateErrorPts: 0.0025 },    // the deliberate closing-disclosure error: rate 0.25 points too high
};

/** Builder paperwork and the design budget (05 §4 land-purchase … site-utilities, 07 §5; task 23). */
export const BUILD = {
  tiers: [                              // construction-loan-application budget tiers (05 §4)
    { id: 'tiny', label: 'Tiny', sqft: 600, blurb: 'One bedroom, one bath. Simple and cheap to run.' },
    { id: 'cozy', label: 'Cozy', sqft: 1000, blurb: 'Two bedrooms, one bath. The plan the table assumed.' },
    { id: 'family', label: 'Family', sqft: 1600, blurb: 'Three bedrooms, two baths, room to grow.' },
  ],
  defaultTier: 'cozy',
  designBudgetFactor: 1.10,             // design budget = tier sq ft × local cost per sq ft × 1.10 (05 §4)
  earnestMoneyCents: 100000,            // $1,000 with the land offer, applied to the down payment at closing
  minCreditScore: 680,                  // construction lenders' floor (05 §7), shown as a warning on the application
  lot: {
    acresScale: [0.8, 1.3],             // seeded variation on the location's lotAcres
    floodChance: 0.15,                  // chance the lot sits in a flood zone (AE) instead of X
    powerFt: [80, 900],                 // distance to the nearest power pole
    gravelChance: 0.4,                  // rural lots: gravel road instead of paved
  },
  bids: [                               // contractor-bids (05 §4); months are for a 12-month location, scaled
    { id: 'a', label: 'Bid A', adjPct: -0.08, months: 14, stars: 3.1, warrantyYears: 0, risky: true },
    { id: 'b', label: 'Bid B', adjPct: 0, months: 9, stars: 4.5, warrantyYears: 1, risky: false },
    { id: 'c', label: 'Bid C', adjPct: 0.10, months: 8, stars: 4.9, warrantyYears: 2, risky: false },
  ],
  risk: {                               // what choosing Bid A can cost (05 §4)
    extraMonths: [1, 4],                // extra months of temporary housing
    defectMonths: [0, 5],               // monthIndex of the defect event (life months 1–6)
    defectCents: [150000, 600000],
    lenderFactor: 0.9,                  // 05 §7: "The bank is nervous about your contractor's reviews"
  },
  setbacksFt: { front: 15, side: 5, rear: 10 }, // 07 §5 (the blueprint editor reuses these)
  utilities: {                          // site-utilities (05 §4): upgrade costs come out of the design budget
    electricShare: 0.6,                 // part of the utilities bill that is electricity
    waterShare: 0.15,                   // part that is the county water bill
    catchmentMonthlyCents: 2000,        // filters and UV bulb
    wellMonthlyCents: 1500,             // pump electricity and testing
    wellUpgradeCents: 2500000,
    catchmentUpgradeCents: 800000,      // a 10,000 gal tank where it isn't already the plan
    rooftopSolarKw: 5,
    solarPerKwCents: 300000,            // 07 §5 blueprint price
    solarCutPct: 0.6,                   // rooftop solar cuts the electric bill ~60%
    offGridUpgradeCents: 4000000,       // 8 kW + batteries
    offGridKw: 8,
    batteryMonthlyCents: 3000,          // battery upkeep off the grid
    catchmentGallons: 10000,
  },
};

/** Insurance shopping (05 §5, task 24). */
export const INSURANCE = {
  quotes: [                             // 05 §5 table: premium factor on the base, deductibles, coverage
    { id: 'basic', label: 'Basic', factor: 0.8, deductibleCents: { home: 250000, renters: 100000 }, liabilityCents: 10000000,
      coverage: 'Actual cash value (pays what your things are worth today, after wear)', extras: [] },
    { id: 'standard', label: 'Standard', factor: 1.0, deductibleCents: { home: 100000, renters: 50000 }, liabilityCents: 30000000,
      coverage: 'Replacement cost (pays to buy new things)', extras: [] },
    { id: 'premium', label: 'Premium', factor: 1.3, deductibleCents: { home: 50000, renters: 25000 }, liabilityCents: 50000000,
      coverage: 'Replacement cost', extras: ['Valuables (jewelry, electronics)', 'Water backup'] },
  ],
  defaultQuote: 'standard',
  // Hazard add-ons on a contents-only policy cost a share of the dwelling price (DEVIATIONS 2026-10-02).
  addOnFactor: { renters: 0.1, condo: 0.25, home: 1 },
  hpiaMaxLavaZone: 2,                   // lava zones 1–2: only HPIA writes lava coverage (05 §5)
  hpiaName: 'HPIA (Hawaiʻi Property Insurance Association)',
  hurricaneDeductiblePct: [0.02, 0.05], // Florida: separate hurricane deductible, 2–5% of the dwelling (05 §5)
  hurricaneDeductibleStates: ['FL'],
  sampleLossCents: 300000,              // the mini calculator's first example: a $3,000 loss
};

/** Student accounts (11 §2). */
export const ACCOUNTS = {
  usernamePattern: /^[a-z0-9][a-z0-9_-]{2,19}$/,
  passwordMinLength: 8,
  classCodePattern: /^[A-Z0-9-]{4,12}$/,
  syntheticEmailDomain: 'players.example.com',
  pbkdf2Iterations: 100000,
};

/** Storage key prefix for localStorage and sessionStorage (01 §4). */
export const STORAGE_PREFIX = 'homesim:v1:';

/** Hosts where dev flags work even in Firebase mode (01 §7). */
export const DEV_HOSTS = ['localhost', '127.0.0.1'];

/** 3D scene (08 §2–§3) and its performance budget (01 §10). Units are feet. */
export const SCENE3D = {
  maxPixelRatio: 1.5,           // 08 §2: antialias only when devicePixelRatio <= this
  fov: 45,
  exposure: 1.0,                // ACES filmic
  shadowMapSize: 1024,          // 01 §10: one shadow-casting light, 1024²
  polarMinDeg: 15,              // 08 §2 orbit limits
  polarMaxDeg: 80,
  zoomMin: 0.5,                 // × the framing distance
  zoomMax: 2.5,
  lotHalf: 60,                  // pan stays inside ±lotHalf ft of the lot center
  groundSize: 400,              // 08 §3: decorated terrain is 400 × 400 ft
  farGround: 1800,              // the plain ground runs on to the fog line
  timeOfDay: 0.62,              // default t (0.25 sunrise, 0.5 noon, 0.75 sunset)
  viewDir: [0.5, 0.27, 0.82],   // default camera direction from the target (front-right, low)
  backdrop: { xz: 1.25, y: 0.6 }, // landmark/peak scale: pushed back and lowered so they stay a backdrop
  fog: [500, 2400],
  budget: { drawCalls: 150, triangles: 120000 },
  coastal: ['honolulu', 'kailua-kona', 'miami', 'halifax', 'homer'], // 08 §3 water plane
};

/** Phase 3 design (07 §1–§2, task 36). */
export const DESIGN = {
  plantCents: 2000,             // 07 §2: optional potted plants, $20 each, paid from savings/checking
  maxPlants: 3,
  plantKind: 'potted',          // three/props.js PLANT_KINDS
  highFloorShare: 0.6,          // floors at or above this share of the home floors count as "high" (views, quiet)
  lowFloors: 2,                 // floors 1–2 are "low" (louder)
  stairsFloor: 3,               // no elevator above this floor → "lots of stairs"
  // Which places can see what from a high floor (07 §2 "depending on the location").
  oceanViews: ['hilo', 'kailua-kona', 'honolulu', 'miami', 'halifax', 'homer'],
  mountainViews: ['pahoa', 'hilo', 'kailua-kona', 'waimea', 'honolulu', 'seattle', 'las-vegas', 'chattanooga', 'elkins',
    'bisbee', 'homer', 'yellow-pine'],
  // Amenity chances per building form (07 §2 tags). Towers/glass always have an elevator; walk-ups never do.
  amenityOdds: {
    walkup: { laundry: 0.7, parking: 0.5, elevator: 0, pool: 0.1, gym: 0, rooftop: 0.15 },
    lowrise: { laundry: 0.9, parking: 0.8, elevator: 0.6, pool: 0.4, gym: 0.3, rooftop: 0.2 },
    tower: { laundry: 0.9, parking: 0.7, elevator: 1, pool: 0.4, gym: 0.6, rooftop: 0.4 },
    glass: { laundry: 1, parking: 0.8, elevator: 1, pool: 0.7, gym: 0.8, rooftop: 0.5 },
    townhomes: { laundry: 1, parking: 1, elevator: 0, pool: 0.3, gym: 0, rooftop: 0 },
  },
  // 07 §3 house listings and light customization (paid from savings, never below $0; warn under lowCashCents).
  house: {
    quirks: ['old-roof', 'big-yard', 'solar', 'fixer-kitchen', 'mountain-view', 'busy-street'],
    roofLeakMultiplier: 3,      // 09 §5 roof-leak chance ×3 with "old roof"
    solarElectricFactor: 0.5,   // 07 §3: solar cuts electricity 50%
    bigYardLot: 1.6,            // "big yard" lot size multiplier
    sqftJitter: 0.12,           // listings vary ± this share around the location's median sq ft
    yearBuilt: [1955, 2022],
    suburbBuiltFrom: 1982,      // master-planned suburbs (Katy) are newer
    bedCents: 12000,            // garden bed $120 (0–3)
    maxBeds: 3,
    treeCents: 6000,            // fruit tree $60 (0–2)
    maxTrees: 2,
    coopCents: 40000,           // chicken coop + 3 hens $400
    hens: 3,
    petCents: { cat: 15000, dog: 25000 },
    lowCashCents: 100000,       // warn when savings would drop below $1,000
  },
  // 07 §4 shared living: rooms per house, roommate ages and the agreement's softening.
  shared: {
    rooms: [2, 3],
    roommates: 2,
    ages: [19, 35],
    hobbies: ['surfing', 'gaming', 'cooking', 'guitar', 'hiking', 'basketball', 'painting', 'gardening', 'reading', 'baking'],
    quietHoursSoften: 0.5,      // agreed quiet hours take this much off the roommates' noise
    choresSystemSoften: 0.5,    // a chore chart (or clean-as-you-go) halves the extra chore hours from messy roommates
  },
};

/** 08 §6–§7: props and the character. */
export const CHARACTER3D = {
  walkSpeed: 4.5,               // ft/s when walkTo gets no duration (an easy walking pace)
  stride: 2.2,                  // ft per step; sets the leg-swing rate
  swing: 0.55,                  // max leg swing in radians (arms swing 80% of it)
};

export const PROPS3D = {
  budget: { tree: 300, animal: 400 }, // 08 §5 triangles per prop
};
