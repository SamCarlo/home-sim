// Cities & suburbs (03 §1 rows 6–12), in table order. Pure data. Figures are today's prices (D8), rounded per 03 §4;
// every figure's basis, source, year and verified/unverified status is in docs/DATA_SOURCES.md.

const usd = (dollars) => Math.round(dollars * 100);
const HURRICANE = [5, 6, 7, 8, 9, 10]; // Atlantic season, June–November
/** Halifax prices are converted from CAD at this rate (Bank of Canada, late September 2026: ~1.41 CAD per USD). */
export const CAD_USD = 0.71;

/** @type {object[]} */
export const CITIES = [
  {
    id: 'seattle', name: 'Seattle', fullName: 'Seattle, Washington',
    region: 'cities', state: 'WA', country: 'US', settlement: 'big-city', population: 780000,
    biome: 'temperate-rain', styleFamily: 'pnw-urban', styleVariant: null, landmark: 'needle-rainier',
    hook: 'Rainy tech city with light rail, ferries and evergreen forests',
    blurb: 'Seattle sits between Puget Sound and Lake Washington, with Mount Rainier on the skyline on clear days. '
      + 'Many jobs are in tech, health care and the port, and light rail, buses and ferries make it possible to live '
      + 'without a car. Winters are long, gray and drizzly, and homes cost a lot.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(1975), bedrooms: 1, notes: 'A one-bedroom in a newer mid-rise near a light rail stop.' },
      shared: { available: true, roomRentCents: usd(1000), housemates: 2, notes: 'A room in an old craftsman house with two housemates.' },
      condo: { available: true, priceCents: usd(550000), hoaMonthlyCents: usd(600), sqft: 750, bedrooms: 1,
        notes: 'A one-bedroom condo in a mid-rise; Seattle condos are smaller than houses and much cheaper.' },
      house: { available: true, priceCents: usd(950000), sqft: 1700, bedrooms: 3, lotAcres: 0.11,
        notes: 'A 1920s craftsman house with a basement on a 5,000 sq ft city lot.' },
      build: { available: true, lotPriceCents: usd(450000), lotAcres: 0.11, lotWidthFt: 50, lotDepthFt: 100,
        buildCostPerSqftCents: usd(425), siteWorkCents: usd(40000), permitCents: usd(15000), monthsToBuild: 14,
        notes: 'Empty city lots are rare, so this usually means tearing down an old house. Hillside lots need extra work.' },
    },
    ownership: {
      propertyTaxRate: 0.0088,
      homeInsuranceAnnualCents: usd(1300), condoInsuranceAnnualCents: usd(450), rentersInsuranceMonthlyCents: usd(15),
      hazardCoverage: [
        { type: 'earthquake', annualCents: usd(1000), requiredForMortgage: false,
          note: 'Optional and extra. Seattle sits on active faults, and regular home insurance does not cover earthquakes.' },
      ],
      lavaZone: null,
    },
    living: {
      utilitiesMonthlyCents: usd(165),
      utilitiesSeasonal: { heatMonths: [10, 11, 0, 1, 2], coolMonths: [], heatExtraCents: usd(45), coolExtraCents: 0 },
      internetMonthlyCents: usd(70), phoneMonthlyCents: usd(60), groceriesMonthlyCents: usd(475),
      transport: { mode: 'mixed', monthlyCents: usd(225),
        commuteMinutesOneWay: { apartment: 25, shared: 30, condo: 25, house: 35, build: 35 } },
      gymMonthlyCents: usd(55), socialHourCents: usd(45),
    },
    hazards: ['earthquake', 'flood', 'wildfire'],
    hazardNotes: 'A large earthquake is the big long-term risk. Some summers bring wildfire smoke from forests in the '
      + 'region, and heavy winter rain can cause landslides on steep hills.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [0, 1], rainyMonths: [0, 1, 2, 3, 9, 10, 11], hurricaneMonths: [], fallColorMonths: [9, 10] },
    metrics: { schoolQuality: 4, transit: 4, movieTheaterMiles: 2, concertHallMiles: 3, noise: 4, gardenPotential: 3,
      gymAccess: 5, natureAccess: 5, medianAge: 35 },
    sources: ['NWMLS Seattle single-family median Sept 2025', 'Zumper Seattle 1BR 2025–26', 'King County effective levy 2025',
      'Seattle City Light / EIA WA residential rate 2025'],
  },
  {
    id: 'brooklyn', name: 'Brooklyn', fullName: 'Brooklyn, New York City, New York',
    region: 'cities', state: 'NY', country: 'US', settlement: 'big-city', population: 2600000,
    biome: 'temperate-urban', styleFamily: 'nyc-brownstone', styleVariant: null, landmark: 'manhattan-skyline',
    hook: 'Subway everywhere, no car needed, tiny expensive apartments',
    blurb: 'Brooklyn is the most crowded part of New York City, with brownstone row houses, apartment buildings and '
      + 'parks across the river from Manhattan. The subway runs all day and night, so most people never need a car. '
      + 'Apartments are small and rent is among the highest in the country.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(3750), bedrooms: 1, notes: 'A small one-bedroom in a walk-up; heat and hot water are usually included.' },
      shared: { available: true, roomRentCents: usd(1500), housemates: 2, notes: 'A small room in a three-bedroom apartment, the most common way young people live here.' },
      condo: { available: true, priceCents: usd(925000), hoaMonthlyCents: usd(700), sqft: 850, bedrooms: 2,
        notes: 'A two-bedroom condo in a newer building. Many Brooklyn apartments are co-ops instead, which have strict buyer interviews.' },
      house: { available: true, priceCents: usd(1450000), sqft: 1800, bedrooms: 3, lotAcres: 0.04,
        notes: 'A narrow row house that shares walls with its neighbors, with a small backyard.' },
      build: { available: false, naReason: 'Empty lots in Brooklyn are extremely rare and cost millions, so almost nobody builds.' },
    },
    ownership: {
      propertyTaxRate: 0.0085,
      homeInsuranceAnnualCents: usd(2000), condoInsuranceAnnualCents: usd(500), rentersInsuranceMonthlyCents: usd(20),
      hazardCoverage: [
        { type: 'flood', annualCents: usd(1200), requiredForMortgage: false,
          note: 'Required only in a mapped flood zone near the water (Hurricane Sandy flooded these areas in 2012); optional elsewhere.' },
      ],
      lavaZone: null,
    },
    living: {
      utilitiesMonthlyCents: usd(150),
      utilitiesSeasonal: { heatMonths: [11, 0, 1, 2], coolMonths: [6, 7], heatExtraCents: usd(30), coolExtraCents: usd(45) },
      internetMonthlyCents: usd(70), phoneMonthlyCents: usd(60), groceriesMonthlyCents: usd(525),
      transport: { mode: 'transit', monthlyCents: usd(135),
        commuteMinutesOneWay: { apartment: 35, shared: 35, condo: 30, house: 40, build: 40 } },
      gymMonthlyCents: usd(60), socialHourCents: usd(50),
    },
    hazards: ['flood', 'hurricane', 'blizzard', 'extreme-heat'],
    hazardNotes: 'Low areas near the shore can flood in big storms, as they did in Hurricane Sandy. Winters bring '
      + 'snowstorms, and summer heat waves are hard in apartments without air conditioning.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [0, 1, 2, 11], rainyMonths: [], hurricaneMonths: HURRICANE, fallColorMonths: [9, 10] },
    metrics: { schoolQuality: 3, transit: 5, movieTheaterMiles: 1, concertHallMiles: 2, noise: 5, gardenPotential: 2,
      gymAccess: 5, natureAccess: 3, medianAge: 35 },
    sources: ['MNS Brooklyn rental report 2025 year end', 'Brooklyn sales reports 2025 (Corcoran / Douglas Elliman)',
      'NYC Dept. of Finance Class 1 effective rates', 'MTA 30-day unlimited fare 2025'],
  },
  {
    id: 'miami', name: 'Miami', fullName: 'Miami, Florida (Miami-Dade County)',
    region: 'cities', state: 'FL', country: 'US', settlement: 'big-city', population: 455000,
    biome: 'subtropical-coastal', styleFamily: 'miami-deco', styleVariant: null, landmark: 'biscayne-skyline',
    hook: 'Condo towers and art deco; hurricanes make insurance very expensive',
    blurb: 'Miami is a warm, busy city on Biscayne Bay, famous for beaches, art deco buildings and Latin American food '
      + 'and music. There is no state income tax, but home insurance is some of the most expensive in the country because '
      + 'of hurricanes and flooding. Older condo buildings must now pay for big safety repairs, so owners can get surprise bills.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(2450), bedrooms: 1, notes: 'A one-bedroom in a mid-rise with air conditioning and a pool.' },
      shared: { available: true, roomRentCents: usd(1150), housemates: 2, notes: 'A room in a house or a big apartment with two housemates.' },
      condo: { available: true, priceCents: usd(400000), hoaMonthlyCents: usd(850), sqft: 950, bedrooms: 2,
        notes: 'A unit in an older tower. Since the 2021 Surfside collapse, Florida law makes older buildings inspect '
          + 'and fix their structure, so owners may face special assessments of thousands of dollars on top of HOA dues.' },
      house: { available: true, priceCents: usd(680000), sqft: 1700, bedrooms: 3, lotAcres: 0.17,
        notes: 'A one-story concrete-block house with hurricane shutters and a small yard.' },
      build: { available: true, lotPriceCents: usd(350000), lotAcres: 0.17, lotWidthFt: 75, lotDepthFt: 100,
        buildCostPerSqftCents: usd(300), siteWorkCents: usd(40000), permitCents: usd(12000), monthsToBuild: 12,
        notes: 'New homes must meet strict hurricane codes, and low lots may need to be raised above flood level.' },
    },
    ownership: {
      propertyTaxRate: 0.0175,
      homeInsuranceAnnualCents: usd(5000), condoInsuranceAnnualCents: usd(1200), rentersInsuranceMonthlyCents: usd(20),
      hazardCoverage: [
        { type: 'flood', annualCents: usd(900), requiredForMortgage: false,
          note: 'Home insurance does not cover floods. Required in a mapped flood zone, which covers much of Miami; strongly advised everywhere.' },
      ],
      lavaZone: null,
    },
    living: {
      utilitiesMonthlyCents: usd(185),
      utilitiesSeasonal: { heatMonths: [], coolMonths: [4, 5, 6, 7, 8, 9], heatExtraCents: 0, coolExtraCents: usd(60) },
      internetMonthlyCents: usd(70), phoneMonthlyCents: usd(55), groceriesMonthlyCents: usd(450),
      transport: { mode: 'car', monthlyCents: usd(575),
        commuteMinutesOneWay: { apartment: 30, shared: 30, condo: 30, house: 40, build: 45 } },
      gymMonthlyCents: usd(50), socialHourCents: usd(40),
    },
    hazards: ['hurricane', 'flood', 'extreme-heat'],
    hazardNotes: 'Hurricanes are the big risk from June to November, and storm surge and heavy rain flood low streets. '
      + 'Some streets now flood during very high tides, even on sunny days.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [], rainyMonths: [5, 6, 7, 8, 9], hurricaneMonths: HURRICANE, fallColorMonths: [] },
    metrics: { schoolQuality: 3, transit: 3, movieTheaterMiles: 3, concertHallMiles: 4, noise: 4, gardenPotential: 3,
      gymAccess: 5, natureAccess: 4, medianAge: 40 },
    sources: ['Miami Realtors Miami-Dade medians Oct 2025', 'Zumper / Apartments.com Miami 1BR 2025',
      'Miami-Dade millage + homestead exemption 2025', 'Insurify / ValuePenguin Miami home insurance 2025'],
  },
  {
    id: 'katy', name: 'Katy', fullName: 'Katy, Texas (Houston suburb)',
    region: 'cities', state: 'TX', country: 'US', settlement: 'suburb', population: 26000,
    biome: 'subtropical-flat', styleFamily: 'texas-suburban', styleVariant: null, landmark: 'water-tower',
    hook: 'Big new houses for the price, no state income tax, high property tax, car-only',
    blurb: 'Katy is a fast-growing suburb west of Houston, full of new neighborhoods, big schools and shopping centers. '
      + 'Houses are large for the price and Texas has no state income tax, but property taxes are high and almost '
      + 'everyone drives. The land is flat and low, so heavy storms can flood streets and homes.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(1400), bedrooms: 1, notes: 'A one-bedroom in a garden apartment complex with a pool.' },
      shared: { available: true, roomRentCents: usd(750), housemates: 2, notes: 'A room in a big suburban house with two housemates.' },
      condo: { available: true, priceCents: usd(250000), hoaMonthlyCents: usd(350), sqft: 1200, bedrooms: 2,
        notes: 'A townhouse-style condo; there are not many, since most people here buy houses.' },
      house: { available: true, priceCents: usd(375000), sqft: 2400, bedrooms: 4, lotAcres: 0.15,
        notes: 'A newer two-story house in a master-planned neighborhood with an HOA, pools and a MUD tax.' },
      build: { available: true, lotPriceCents: usd(90000), lotAcres: 0.17, lotWidthFt: 60, lotDepthFt: 125,
        buildCostPerSqftCents: usd(175), siteWorkCents: usd(25000), permitCents: usd(5000), monthsToBuild: 7,
        notes: 'Builders put up houses fast here. Check the flood map before you buy a lot.' },
    },
    ownership: {
      propertyTaxRate: 0.0245,
      homeInsuranceAnnualCents: usd(3200), condoInsuranceAnnualCents: usd(600), rentersInsuranceMonthlyCents: usd(20),
      hazardCoverage: [
        { type: 'flood', annualCents: usd(750), requiredForMortgage: false,
          note: 'Advised. Home insurance does not cover floods, and Hurricane Harvey flooded thousands of Katy-area homes '
            + 'in 2017, many outside the mapped flood zones.' },
      ],
      lavaZone: null,
    },
    living: {
      utilitiesMonthlyCents: usd(200),
      utilitiesSeasonal: { heatMonths: [], coolMonths: [5, 6, 7, 8], heatExtraCents: 0, coolExtraCents: usd(90) },
      internetMonthlyCents: usd(65), phoneMonthlyCents: usd(55), groceriesMonthlyCents: usd(400),
      transport: { mode: 'car', monthlyCents: usd(550),
        commuteMinutesOneWay: { apartment: 30, shared: 30, condo: 30, house: 40, build: 45 } },
      gymMonthlyCents: usd(35), socialHourCents: usd(30),
    },
    hazards: ['hurricane', 'flood', 'extreme-heat', 'hail', 'tornado'],
    hazardNotes: 'Hurricanes and tropical storms bring huge rains, and the flat land floods easily. Summers are hot and '
      + 'humid, and spring storms bring hail.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [], rainyMonths: [4, 5, 8, 9], hurricaneMonths: HURRICANE, fallColorMonths: [] },
    metrics: { schoolQuality: 5, transit: 1, movieTheaterMiles: 3, concertHallMiles: 28, noise: 2, gardenPotential: 4,
      gymAccess: 4, natureAccess: 2, medianAge: 34 },
    sources: ['HAR.com Katy median sold price 2025', 'Katy ISD / City of Katy / Fort Bend and Harris tax rates 2025 + MUD',
      'Texas Dept. of Insurance / Insurify Texas home insurance 2025', 'FEMA NFIP average premium Texas'],
  },
  {
    id: 'las-vegas', name: 'Las Vegas', fullName: 'Las Vegas, Nevada',
    region: 'cities', state: 'NV', country: 'US', settlement: 'big-city', population: 660000,
    biome: 'desert', styleFamily: 'desert-southwest', styleVariant: null, landmark: 'strip-mountains',
    hook: '“The Ninth Island”: home to more Hawaiʻi transplants than anywhere else on the mainland',
    blurb: 'Las Vegas is a desert city ringed by mountains, and so many families from Hawaiʻi have moved here that '
      + 'people call it “the Ninth Island.” You can find poke, plate lunch and Hawaiian clubs all over town, and many '
      + 'jobs are in hotels and casinos. Summers are dangerously hot, often over 110°F, so air conditioning is a must.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(1350), bedrooms: 1, notes: 'A one-bedroom in a stucco complex with a pool and covered parking.' },
      shared: { available: true, roomRentCents: usd(700), housemates: 2, notes: 'A room in a suburban house with two housemates.' },
      condo: { available: true, priceCents: usd(265000), hoaMonthlyCents: usd(300), sqft: 1000, bedrooms: 2,
        notes: 'A two-bedroom condo in a gated complex.' },
      house: { available: true, priceCents: usd(475000), sqft: 1900, bedrooms: 3, lotAcres: 0.13,
        notes: 'A stucco house with a tile roof, a block wall around the yard and desert landscaping.' },
      build: { available: true, lotPriceCents: usd(150000), lotAcres: 0.15, lotWidthFt: 60, lotDepthFt: 110,
        buildCostPerSqftCents: usd(225), siteWorkCents: usd(25000), permitCents: usd(8000), monthsToBuild: 9,
        notes: 'Lots at the edge of the valley; desert soil is rocky, and water rules limit grass lawns.' },
    },
    ownership: {
      propertyTaxRate: 0.0060,
      homeInsuranceAnnualCents: usd(1300), condoInsuranceAnnualCents: usd(400), rentersInsuranceMonthlyCents: usd(15),
      hazardCoverage: [
        { type: 'earthquake', annualCents: usd(500), requiredForMortgage: false,
          note: 'Optional. Southern Nevada has some faults, but big earthquakes are rare.' },
      ],
      lavaZone: null,
    },
    living: {
      utilitiesMonthlyCents: usd(190),
      utilitiesSeasonal: { heatMonths: [11, 0], coolMonths: [5, 6, 7, 8], heatExtraCents: usd(20), coolExtraCents: usd(110) },
      internetMonthlyCents: usd(70), phoneMonthlyCents: usd(55), groceriesMonthlyCents: usd(425),
      transport: { mode: 'car', monthlyCents: usd(500),
        commuteMinutesOneWay: { apartment: 20, shared: 20, condo: 20, house: 25, build: 30 } },
      gymMonthlyCents: usd(30), socialHourCents: usd(35),
    },
    hazards: ['extreme-heat', 'drought', 'flood', 'earthquake'],
    hazardNotes: 'Summer heat over 110°F is the biggest danger. The Colorado River drought limits water, and sudden '
      + 'summer storms can cause flash floods in washes and streets.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [], rainyMonths: [6, 7], hurricaneMonths: [], fallColorMonths: [] },
    metrics: { schoolQuality: 2, transit: 3, movieTheaterMiles: 3, concertHallMiles: 6, noise: 3, gardenPotential: 2,
      gymAccess: 4, natureAccess: 3, medianAge: 38 },
    sources: ['LVR Southern Nevada single-family median Nov 2025 / Apr 2026', 'Zumper Las Vegas 1BR 2025',
      'Clark County tax rate + Nevada 3% abatement', 'NV Energy / EIA NV residential rate 2025'],
  },
  {
    id: 'chattanooga', name: 'Chattanooga', fullName: 'Chattanooga, Tennessee',
    region: 'cities', state: 'TN', country: 'US', settlement: 'mid-city', population: 185000,
    biome: 'humid-forest', styleFamily: 'appalachian', styleVariant: null, landmark: 'lookout-mountain',
    hook: 'Outdoor city on a river with city-owned super-fast internet',
    blurb: 'Chattanooga sits on the Tennessee River between forested ridges, with climbing, hiking and paddling close to '
      + 'downtown. The city’s own power company, EPB, runs fiber internet to every home, and it is some of the fastest '
      + 'in the country. Homes cost less than in big cities, and Tennessee has no state income tax on wages.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(1250), bedrooms: 1, notes: 'A one-bedroom in a newer complex near downtown or the North Shore.' },
      shared: { available: true, roomRentCents: usd(650), housemates: 2, notes: 'A room in an older house with two housemates.' },
      condo: { available: true, priceCents: usd(275000), hoaMonthlyCents: usd(250), sqft: 1000, bedrooms: 2,
        notes: 'A two-bedroom condo, often in a converted downtown building.' },
      house: { available: true, priceCents: usd(340000), sqft: 1700, bedrooms: 3, lotAcres: 0.25,
        notes: 'A brick ranch or bungalow on a quarter-acre with big trees.' },
      build: { available: true, lotPriceCents: usd(70000), lotAcres: 0.3, lotWidthFt: 90, lotDepthFt: 145,
        buildCostPerSqftCents: usd(210), siteWorkCents: usd(25000), permitCents: usd(4000), monthsToBuild: 8,
        notes: 'Hillside lots have great views but cost more to grade and build on.' },
    },
    ownership: {
      propertyTaxRate: 0.0095,
      homeInsuranceAnnualCents: usd(1900), condoInsuranceAnnualCents: usd(450), rentersInsuranceMonthlyCents: usd(15),
      hazardCoverage: [
        { type: 'flood', annualCents: usd(600), requiredForMortgage: false,
          note: 'Required only near the river and creeks in a mapped flood zone; optional elsewhere.' },
      ],
      lavaZone: null,
    },
    living: {
      utilitiesMonthlyCents: usd(180),
      utilitiesSeasonal: { heatMonths: [11, 0, 1], coolMonths: [6, 7], heatExtraCents: usd(40), coolExtraCents: usd(40) },
      internetMonthlyCents: usd(70), phoneMonthlyCents: usd(50), groceriesMonthlyCents: usd(400),
      transport: { mode: 'car', monthlyCents: usd(450),
        commuteMinutesOneWay: { apartment: 15, shared: 15, condo: 15, house: 20, build: 25 } },
      gymMonthlyCents: usd(30), socialHourCents: usd(30),
    },
    hazards: ['tornado', 'flood', 'hail'],
    hazardNotes: 'Spring storms can bring tornadoes and hail; a 2011 outbreak and a 2020 Easter tornado hit the area. '
      + 'Heavy rain sometimes floods creeks.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [], rainyMonths: [0, 1, 2, 3, 11], hurricaneMonths: [], fallColorMonths: [9, 10] },
    metrics: { schoolQuality: 3, transit: 2, movieTheaterMiles: 4, concertHallMiles: 3, noise: 3, gardenPotential: 4,
      gymAccess: 4, natureAccess: 5, medianAge: 39 },
    sources: ['Redfin / Zillow Chattanooga median 2025', 'Zillow / Apartments.com Chattanooga 1BR 2025–26',
      'Hamilton County + City of Chattanooga tax rates 2025', 'EPB Fiber price list 2025'],
  },
  {
    id: 'halifax', name: 'Halifax', fullName: 'Halifax, Nova Scotia, Canada',
    region: 'cities', state: 'NS', country: 'CA', settlement: 'mid-city', population: 480000,
    biome: 'maritime', styleFamily: 'maritime', styleVariant: null, landmark: 'harbour-lighthouse',
    hook: 'Colorful harbour city, universities, cold snowy winters; prices converted from Canadian dollars',
    blurb: 'Halifax is a harbour city on the Atlantic coast of Canada, with brightly painted wooden houses, several '
      + 'universities and a busy port. Winters are cold and snowy, and summers are cool and pleasant. Canada uses the '
      + 'Canadian dollar and the metric system; prices here are converted to US dollars.',
    currency: { code: 'CAD', usdPerUnit: CAD_USD, asOf: '2026-09' },
    housing: {
      apartment: { available: true, rentCents: usd(1325), bedrooms: 1, notes: 'A one-bedroom in an apartment building; vacancies are rare, so rents have climbed.' },
      shared: { available: true, roomRentCents: usd(700), housemates: 2, notes: 'A room in an old house near the universities with two housemates.' },
      condo: { available: true, priceCents: usd(320000), hoaMonthlyCents: usd(320), sqft: 900, bedrooms: 2,
        notes: 'A two-bedroom condo; monthly condo fees often include heat.' },
      house: { available: true, priceCents: usd(400000), sqft: 1500, bedrooms: 3, lotAcres: 0.15,
        notes: 'A wooden two-story house with clapboard siding in the city or a nearby suburb.' },
      build: { available: true, lotPriceCents: usd(140000), lotAcres: 0.2, lotWidthFt: 70, lotDepthFt: 125,
        buildCostPerSqftCents: usd(285), siteWorkCents: usd(28400), permitCents: usd(4260), monthsToBuild: 10,
        notes: 'Building pauses in the coldest months, and rocky ground can need blasting for a basement.' },
    },
    ownership: {
      propertyTaxRate: 0.0105,
      homeInsuranceAnnualCents: usd(1280), condoInsuranceAnnualCents: usd(355), rentersInsuranceMonthlyCents: usd(20),
      hazardCoverage: [
        { type: 'flood', annualCents: usd(285), requiredForMortgage: false,
          note: 'Optional overland-flood add-on. Heavy rain flooded parts of the Halifax area in July 2023.' },
      ],
      lavaZone: null,
    },
    living: {
      utilitiesMonthlyCents: usd(185),
      utilitiesSeasonal: { heatMonths: [10, 11, 0, 1, 2, 3], coolMonths: [], heatExtraCents: usd(105), coolExtraCents: 0 },
      internetMonthlyCents: usd(65), phoneMonthlyCents: usd(50), groceriesMonthlyCents: usd(440),
      transport: { mode: 'mixed', monthlyCents: usd(215),
        commuteMinutesOneWay: { apartment: 20, shared: 20, condo: 20, house: 30, build: 35 } },
      gymMonthlyCents: usd(40), socialHourCents: usd(30),
    },
    hazards: ['blizzard', 'hurricane', 'flood', 'wildfire'],
    hazardNotes: 'Nor’easters bring heavy snow, and some fall storms are leftover hurricanes, like Fiona in 2022. '
      + 'A 2023 wildfire burned homes on the edge of the city.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [11, 0, 1, 2], rainyMonths: [9, 10, 11], hurricaneMonths: HURRICANE, fallColorMonths: [9] },
    metrics: { schoolQuality: 3, transit: 3, movieTheaterMiles: 3, concertHallMiles: 3, noise: 3, gardenPotential: 3,
      gymAccess: 4, natureAccess: 4, medianAge: 39 },
    sources: ['Halifax Partnership benchmark price 2025', 'CMHC Rental Market Report 2025 / asking rents 2025',
      'HRM 2025–26 residential tax rate', 'Bank of Canada CAD/USD Sept 2026'],
  },
];
