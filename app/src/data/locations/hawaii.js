// The five Hawaiʻi places (03 §1–§2), in table order. Pure data. Figures are today's prices (D8), rounded per 03 §4;
// every figure's basis, source, year and verified/unverified status is in docs/DATA_SOURCES.md.

const usd = (dollars) => Math.round(dollars * 100);
const HURRICANE = [5, 6, 7, 8, 9, 10]; // June–November
const WET_WINTER = [0, 1, 2, 3, 10, 11];

/** @type {object[]} */
export const HAWAII = [
  {
    id: 'pahoa', name: 'Pāhoa', fullName: 'Pāhoa, Hawaiʻi Island, Hawaiʻi',
    region: 'hawaii', state: 'HI', country: 'US', settlement: 'rural', population: 950,
    biome: 'tropical-wet', styleFamily: 'hawaii-plantation', styleVariant: null, landmark: 'kilauea-plume',
    hook: 'Rural Puna jungle town with cheap land in lava zones 1–2, catchment water, long drives',
    blurb: 'Pāhoa is a small country town in Puna, surrounded by rainforest, farms and big house lots. Land is cheap '
      + 'because it sits in lava zones 1 and 2 near Kīlauea, so insurance is harder to get. Most homes collect '
      + 'rainwater in a catchment tank, and many jobs are a long drive away in Hilo.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(1400), bedrooms: 1,
        notes: 'Few apartment buildings; most rentals are ʻohana units or small cottages on house lots.' },
      shared: { available: true, roomRentCents: usd(750), housemates: 2, notes: 'A room in a farm house with two housemates.' },
      condo: { available: false, naReason: 'Pāhoa is a rural town of houses and farm lots; there are almost no condos.' },
      house: { available: true, priceCents: usd(400000), sqft: 1300, bedrooms: 3, lotAcres: 1,
        notes: 'A single-wall house on a one-acre lot with a catchment tank. Older homes often have a cesspool.' },
      build: { available: true, lotPriceCents: usd(45000), lotAcres: 1, lotWidthFt: 150, lotDepthFt: 290,
        buildCostPerSqftCents: usd(375), siteWorkCents: usd(45000), permitCents: usd(5000), monthsToBuild: 12,
        notes: 'Cheap lava-zone lots, but you pay to clear jungle, add a catchment tank, a septic system and a power line.' },
    },
    ownership: {
      propertyTaxRate: 0.0054,
      homeInsuranceAnnualCents: usd(1100), condoInsuranceAnnualCents: usd(450), rentersInsuranceMonthlyCents: usd(15),
      hazardCoverage: [
        { type: 'lava', annualCents: usd(4000), requiredForMortgage: true,
          note: 'Fire and lava coverage from HPIA, the only company that will insure homes in lava zones 1–2.' },
        { type: 'hurricane', annualCents: usd(900), requiredForMortgage: false,
          note: 'In Hawaiʻi, hurricane coverage is a separate policy. You don’t have to buy it, but it is smart from June to November.' },
      ],
      lavaZone: 1,
    },
    living: {
      utilitiesMonthlyCents: usd(185),
      utilitiesSeasonal: { heatMonths: [], coolMonths: [], heatExtraCents: 0, coolExtraCents: 0 },
      internetMonthlyCents: usd(90), phoneMonthlyCents: usd(55), groceriesMonthlyCents: usd(475),
      transport: { mode: 'car', monthlyCents: usd(475),
        commuteMinutesOneWay: { apartment: 30, shared: 30, condo: 30, house: 40, build: 45 } },
      gymMonthlyCents: usd(45), socialHourCents: usd(25),
    },
    hazards: ['lava', 'earthquake', 'hurricane', 'vog', 'flood'],
    hazardNotes: 'Lava from Kīlauea reached Pāhoa in 2014 and lower Puna in 2018. Vog (volcanic smog) drifts in some days, '
      + 'and heavy rain can flood roads.',
    water: 'catchment', sewer: 'cesspool',
    seasons: { snowMonths: [], rainyMonths: WET_WINTER, hurricaneMonths: HURRICANE, fallColorMonths: [] },
    metrics: { schoolQuality: 2, transit: 2, movieTheaterMiles: 20, concertHallMiles: 20, noise: 1, gardenPotential: 5,
      gymAccess: 2, natureAccess: 4, medianAge: 42 },
    sources: ['HIS / Hawaiʻi Life Puna median 2025', 'HUD FMR FY2026', 'Hawaiʻi County RPT FY2026', 'HPIA lava-zone rates 2025',
      'HELCO average residential rate 2025', 'USGS lava-flow hazard zones'],
  },
  {
    id: 'hilo', name: 'Hilo', fullName: 'Hilo, Hawaiʻi Island, Hawaiʻi',
    region: 'hawaii', state: 'HI', country: 'US', settlement: 'small-city', population: 45000,
    biome: 'tropical-wet', styleFamily: 'hawaii-plantation', styleVariant: null, landmark: 'maunakea',
    hook: 'Rainy, green bayfront city with a university and a big farmers market',
    blurb: 'Hilo is the biggest town on the east side of Hawaiʻi Island, with a busy farmers market, a university and '
      + 'a bay full of canoe paddlers. It is one of the rainiest cities in the country, which keeps everything green. '
      + 'Homes cost less than on the Kona side, but tsunamis and heavy floods are real risks.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(1550), bedrooms: 1, notes: 'Walk-up apartments near downtown and the university.' },
      shared: { available: true, roomRentCents: usd(800), housemates: 2, notes: 'A room in a house, often near UH Hilo.' },
      condo: { available: true, priceCents: usd(350000), hoaMonthlyCents: usd(550), sqft: 850, bedrooms: 2,
        notes: 'Older low-rise condos; HOA dues have risen with building insurance costs.' },
      house: { available: true, priceCents: usd(565000), sqft: 1400, bedrooms: 3, lotAcres: 0.2,
        notes: 'A plantation-style house on a town lot with city water and sewer.' },
      build: { available: true, lotPriceCents: usd(140000), lotAcres: 0.25, lotWidthFt: 90, lotDepthFt: 120,
        buildCostPerSqftCents: usd(400), siteWorkCents: usd(25000), permitCents: usd(6000), monthsToBuild: 11,
        notes: 'Town lots can connect to county water; some need a septic system.' },
    },
    ownership: {
      propertyTaxRate: 0.0055,
      homeInsuranceAnnualCents: usd(1500), condoInsuranceAnnualCents: usd(500), rentersInsuranceMonthlyCents: usd(15),
      hazardCoverage: [
        { type: 'hurricane', annualCents: usd(900), requiredForMortgage: false,
          note: 'In Hawaiʻi, hurricane coverage is a separate policy. You don’t have to buy it, but it is smart from June to November.' },
        { type: 'flood', annualCents: usd(700), requiredForMortgage: false,
          note: 'Required only in a mapped flood or tsunami zone near the bay; optional elsewhere.' },
      ],
      lavaZone: 3,
    },
    living: {
      utilitiesMonthlyCents: usd(190),
      utilitiesSeasonal: { heatMonths: [], coolMonths: [], heatExtraCents: 0, coolExtraCents: 0 },
      internetMonthlyCents: usd(70), phoneMonthlyCents: usd(55), groceriesMonthlyCents: usd(475),
      transport: { mode: 'car', monthlyCents: usd(425),
        commuteMinutesOneWay: { apartment: 15, shared: 15, condo: 15, house: 20, build: 20 } },
      gymMonthlyCents: usd(45), socialHourCents: usd(25),
    },
    hazards: ['tsunami', 'flood', 'hurricane', 'earthquake', 'lava', 'vog'],
    hazardNotes: 'Tsunamis hit Hilo in 1946 and 1960, so the bayfront is now parks. Heavy rain can flood streets, and '
      + 'Mauna Loa flows have come close to town before.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [], rainyMonths: WET_WINTER, hurricaneMonths: HURRICANE, fallColorMonths: [] },
    metrics: { schoolQuality: 3, transit: 2, movieTheaterMiles: 3, concertHallMiles: 2, noise: 2, gardenPotential: 5,
      gymAccess: 3, natureAccess: 5, medianAge: 41 },
    sources: ['HIS / Locations Hilo median Q4 2025', 'HUD FMR FY2026', 'Hawaiʻi County RPT FY2026', 'HELCO average residential rate 2025',
      'USGS lava-flow hazard zones'],
  },
  {
    id: 'kailua-kona', name: 'Kailua-Kona', fullName: 'Kailua-Kona, Hawaiʻi Island, Hawaiʻi',
    region: 'hawaii', state: 'HI', country: 'US', settlement: 'small-town', population: 20000,
    biome: 'tropical-dry', styleFamily: 'kona-coastal', styleVariant: null, landmark: 'hualalai',
    hook: 'Sunny resort and coffee town on the lava coast; tourism jobs, higher prices',
    blurb: 'Kailua-Kona sits on the sunny, dry west coast, on old lava flows from Hualālai. Many jobs are in hotels, '
      + 'restaurants, tours and coffee farms, and prices are higher because so many visitors and second-home buyers want '
      + 'to live in Kona. Summers are hot, so many homes need air conditioning.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(2100), bedrooms: 1, notes: 'Rentals compete with vacation rentals, so they go fast.' },
      shared: { available: true, roomRentCents: usd(1000), housemates: 2, notes: 'A room in a house mauka (uphill) of town.' },
      condo: { available: true, priceCents: usd(600000), hoaMonthlyCents: usd(750), sqft: 900, bedrooms: 2,
        notes: 'Resort-style condos with a pool; high HOA dues cover building insurance and grounds.' },
      house: { available: true, priceCents: usd(1050000), sqft: 1600, bedrooms: 3, lotAcres: 0.25,
        notes: 'A house in a subdivision above town, with ocean views from some lots.' },
      build: { available: true, lotPriceCents: usd(350000), lotAcres: 0.25, lotWidthFt: 90, lotDepthFt: 120,
        buildCostPerSqftCents: usd(450), siteWorkCents: usd(30000), permitCents: usd(7500), monthsToBuild: 12,
        notes: 'Building on lava rock means extra work to level the lot and dig for utilities.' },
    },
    ownership: {
      propertyTaxRate: 0.0057,
      homeInsuranceAnnualCents: usd(1800), condoInsuranceAnnualCents: usd(550), rentersInsuranceMonthlyCents: usd(15),
      hazardCoverage: [
        { type: 'hurricane', annualCents: usd(1000), requiredForMortgage: false,
          note: 'In Hawaiʻi, hurricane coverage is a separate policy. You don’t have to buy it, but it is smart from June to November.' },
      ],
      lavaZone: 4,
    },
    living: {
      utilitiesMonthlyCents: usd(195),
      utilitiesSeasonal: { heatMonths: [], coolMonths: [5, 6, 7, 8, 9], heatExtraCents: 0, coolExtraCents: usd(35) },
      internetMonthlyCents: usd(70), phoneMonthlyCents: usd(55), groceriesMonthlyCents: usd(500),
      transport: { mode: 'car', monthlyCents: usd(450),
        commuteMinutesOneWay: { apartment: 15, shared: 20, condo: 15, house: 20, build: 25 } },
      gymMonthlyCents: usd(50), socialHourCents: usd(30),
    },
    hazards: ['earthquake', 'hurricane', 'tsunami', 'vog', 'drought', 'wildfire'],
    hazardNotes: 'Vog from Kīlauea often settles over Kona in the afternoon. Hualālai last erupted in 1801, and dry '
      + 'grass on the slopes can burn in summer.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [], rainyMonths: [5, 6, 7, 8], hurricaneMonths: HURRICANE, fallColorMonths: [] },
    metrics: { schoolQuality: 3, transit: 2, movieTheaterMiles: 3, concertHallMiles: 8, noise: 3, gardenPotential: 4,
      gymAccess: 3, natureAccess: 5, medianAge: 42 },
    sources: ['HIS North Kona median 2025', 'HUD FMR FY2026', 'Hawaiʻi County RPT FY2026', 'HELCO average residential rate 2025',
      'USGS lava-flow hazard zones'],
  },
  {
    id: 'waimea', name: 'Waimea', fullName: 'Waimea (Kamuela), Hawaiʻi Island, Hawaiʻi',
    region: 'hawaii', state: 'HI', country: 'US', settlement: 'small-town', population: 9200,
    biome: 'tropical-upland', styleFamily: 'hawaii-upcountry', styleVariant: null, landmark: 'kohala-hills',
    hook: 'Cool, misty paniolo ranch town with strong schools and high home prices',
    blurb: 'Waimea, also called Kamuela, is a cool, misty ranch town in the hills between the Kohala Mountains and '
      + 'Maunakea. It is paniolo (Hawaiian cowboy) country, with green pastures, strong schools and a small-town feel. '
      + 'Homes here are among the most expensive on the island, and many jobs are a drive down to the resorts.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(1950), bedrooms: 1, notes: 'Few rentals; many are ʻohana units behind family homes.' },
      shared: { available: true, roomRentCents: usd(950), housemates: 2, notes: 'A room in a ranch-style house.' },
      condo: { available: true, priceCents: usd(650000), hoaMonthlyCents: usd(600), sqft: 1100, bedrooms: 2,
        notes: 'Two-story townhome condos; only a few complexes in town.' },
      house: { available: true, priceCents: usd(1195000), sqft: 1700, bedrooms: 3, lotAcres: 0.4,
        notes: 'A board-and-batten house with a big yard and a fireplace for cold nights.' },
      build: { available: true, lotPriceCents: usd(425000), lotAcres: 0.5, lotWidthFt: 140, lotDepthFt: 155,
        buildCostPerSqftCents: usd(475), siteWorkCents: usd(35000), permitCents: usd(7500), monthsToBuild: 12,
        notes: 'Lots are pricey and most need their own septic system.' },
    },
    ownership: {
      propertyTaxRate: 0.0058,
      homeInsuranceAnnualCents: usd(1700), condoInsuranceAnnualCents: usd(550), rentersInsuranceMonthlyCents: usd(15),
      hazardCoverage: [
        { type: 'hurricane', annualCents: usd(900), requiredForMortgage: false,
          note: 'Hurricane coverage is a separate policy in Hawaiʻi. Optional, but strong winds do blow through here.' },
      ],
      lavaZone: 8,
    },
    living: {
      utilitiesMonthlyCents: usd(205),
      utilitiesSeasonal: { heatMonths: [11, 0, 1, 2], coolMonths: [], heatExtraCents: usd(25), coolExtraCents: 0 },
      internetMonthlyCents: usd(75), phoneMonthlyCents: usd(55), groceriesMonthlyCents: usd(500),
      transport: { mode: 'car', monthlyCents: usd(475),
        commuteMinutesOneWay: { apartment: 20, shared: 20, condo: 20, house: 25, build: 30 } },
      gymMonthlyCents: usd(50), socialHourCents: usd(30),
    },
    hazards: ['drought', 'wildfire', 'earthquake', 'hurricane', 'vog'],
    hazardNotes: 'Lava is very unlikely here (lava zone 8). Dry summers on the Kohala side bring wildfire risk, and '
      + 'strong trade winds can knock out power.',
    water: 'municipal', sewer: 'septic',
    seasons: { snowMonths: [], rainyMonths: WET_WINTER, hurricaneMonths: HURRICANE, fallColorMonths: [] },
    metrics: { schoolQuality: 4, transit: 2, movieTheaterMiles: 30, concertHallMiles: 1, noise: 1, gardenPotential: 4,
      gymAccess: 3, natureAccess: 5, medianAge: 42 },
    sources: ['Redfin / HIS Waimea medians 2025–2026 (town estimate)', 'HUD FMR FY2026', 'Hawaiʻi County RPT FY2026',
      'HELCO average residential rate 2025', 'USGS lava-flow hazard zones'],
  },
  {
    id: 'honolulu', name: 'Honolulu', fullName: 'Honolulu, Oʻahu, Hawaiʻi',
    region: 'hawaii', state: 'HI', country: 'US', settlement: 'big-city', population: 350000,
    biome: 'tropical-urban', styleFamily: 'honolulu-highrise', styleVariant: null, landmark: 'leahi',
    hook: 'Hawaiʻi’s big city: condos, TheBus and Skyline rail, the highest prices in the state',
    blurb: 'Honolulu is the biggest city in Hawaiʻi, on the south shore of Oʻahu between Lēʻahi (Diamond Head) and '
      + 'Pearl Harbor. Most people live in condo towers or on small house lots, and TheBus and the Skyline rail line '
      + 'help you get around without a car. It has the most jobs, shows and shops in the state, and the highest home prices.',
    currency: { code: 'USD', usdPerUnit: 1 },
    housing: {
      apartment: { available: true, rentCents: usd(2100), bedrooms: 1, notes: 'A one-bedroom in a walk-up or an older tower.' },
      shared: { available: true, roomRentCents: usd(1100), housemates: 2, notes: 'A room in a house or a big condo with two housemates.' },
      condo: { available: true, priceCents: usd(535000), hoaMonthlyCents: usd(800), sqft: 800, bedrooms: 2,
        notes: 'A unit in a concrete tower with a lānai; HOA dues are high and have been rising.' },
      house: { available: true, priceCents: usd(1160000), sqft: 1500, bedrooms: 3, lotAcres: 0.12,
        notes: 'A single-wall or modern house on a small 5,000 sq ft lot with a carport.' },
      build: { available: true, lotPriceCents: usd(750000), lotAcres: 0.12, lotWidthFt: 50, lotDepthFt: 100,
        buildCostPerSqftCents: usd(525), siteWorkCents: usd(40000), permitCents: usd(15000), monthsToBuild: 18,
        notes: 'Empty lots are rare, so this usually means tearing down an old house. Permits can take many months.' },
    },
    ownership: {
      propertyTaxRate: 0.0031,
      homeInsuranceAnnualCents: usd(1400), condoInsuranceAnnualCents: usd(600), rentersInsuranceMonthlyCents: usd(15),
      hazardCoverage: [
        { type: 'hurricane', annualCents: usd(1000), requiredForMortgage: false,
          note: 'In Hawaiʻi, hurricane coverage is a separate policy. You don’t have to buy it, but it is smart from June to November.' },
        { type: 'flood', annualCents: usd(700), requiredForMortgage: false,
          note: 'Required only in a mapped flood zone (parts of Waikīkī and Kakaʻako); optional elsewhere.' },
        { type: 'earthquake', annualCents: usd(400), requiredForMortgage: false,
          note: 'Optional. Oʻahu has small earthquakes; big ones are rare.' },
      ],
      lavaZone: null,
    },
    living: {
      utilitiesMonthlyCents: usd(185),
      utilitiesSeasonal: { heatMonths: [], coolMonths: [6, 7, 8, 9], heatExtraCents: 0, coolExtraCents: usd(30) },
      internetMonthlyCents: usd(70), phoneMonthlyCents: usd(55), groceriesMonthlyCents: usd(500),
      transport: { mode: 'mixed', monthlyCents: usd(250),
        commuteMinutesOneWay: { apartment: 30, shared: 30, condo: 25, house: 40, build: 40 } },
      gymMonthlyCents: usd(50), socialHourCents: usd(35),
    },
    hazards: ['hurricane', 'tsunami', 'flood', 'drought'],
    hazardNotes: 'Hurricanes are rare but serious, and low areas near the shore are in tsunami and flood zones. '
      + 'Heavy rain can flood streams in the valleys.',
    water: 'municipal', sewer: 'municipal',
    seasons: { snowMonths: [], rainyMonths: [0, 1, 2, 10, 11], hurricaneMonths: HURRICANE, fallColorMonths: [] },
    metrics: { schoolQuality: 3, transit: 4, movieTheaterMiles: 3, concertHallMiles: 4, noise: 4, gardenPotential: 3,
      gymAccess: 5, natureAccess: 4, medianAge: 41 },
    sources: ['HBR / HiCentral Oʻahu medians Oct 2025', 'HUD FMR FY2026', 'Honolulu RPT FY2026 + home exemption',
      'HECO average residential rate 2025'],
  },
];
