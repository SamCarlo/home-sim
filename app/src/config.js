// Every tunable number in the game (docs/spec/01-architecture.md §9).
// A teacher should be able to change a rule by editing one number here.
// Money is integer cents; rates are decimals. Pure module: no DOM, no imports.

/** Shown in the header and the page title (00 §5, OPEN_ITEMS: the teacher may rename it). */
export const GAME_TITLE = 'Home & Life Sim';
/** monthIndex 0 = January of this year (00 D15). */
export const START_YEAR = 2033;
/** Class codes accepted in local mode (11 §2). */
export const LOCAL_CLASS_CODES = ['DEMO'];

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
  roommates: { goodRatio: 2.5, lowRatioF: 0.8, agreementBonus: 0.1 },
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

/** Insurance quotes (05 §5): premium multipliers and deductibles. */
export const INSURANCE = {
  quotes: [
    { key: 'basic', premiumX: 0.8, deductibleHomeCents: 250000, deductibleRentersCents: 100000, liabilityCents: 10000000 },
    { key: 'standard', premiumX: 1.0, deductibleHomeCents: 100000, deductibleRentersCents: 50000, liabilityCents: 30000000 },
    { key: 'premium', premiumX: 1.3, deductibleHomeCents: 50000, deductibleRentersCents: 25000, liabilityCents: 50000000 },
  ],
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
    { min: 85, key: 'excellent', label: 'Excellent' },
    { min: 70, key: 'strong', label: 'Strong' },
    { min: 55, key: 'fair', label: 'Fair' },
    { min: 40, key: 'weak', label: 'Weak' },
    { min: 0, key: 'needs-work', label: 'Needs work' },
  ],
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
