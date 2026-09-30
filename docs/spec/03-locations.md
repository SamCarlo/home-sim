# 03 — Locations

Twenty real places. The teacher required Pāhoa, Hilo, Honolulu, Waimea and Kona, plus Seattle, New York,
Yellow Pine (Idaho), a Texas suburb, Miami-Dade and somewhere in Canada. The rest were added to cover small
towns and rural areas students probably don't know. Data files are grouped by table region:
`app/src/data/locations/hawaii.js`, `cities.js`, `towns.js`. `locations/index.js` exports the
ordered array and a `byId` map. `data/validate.js` checks every record against §2.

## 1. The twenty

| # | id | Display name | Region group | Settlement | Biome | Style family | Landmark key | Hook (why it's interesting) |
|---|---|---|---|---|---|---|---|---|
| 1 | `pahoa` | Pāhoa, Hawaiʻi Island | hawaii | rural | tropical-wet | hawaii-plantation | `kilauea-plume` | Rural Puna jungle town; cheap land in lava zones 1–2, rain catchment water, long drives |
| 2 | `hilo` | Hilo, Hawaiʻi Island | hawaii | small-city | tropical-wet | hawaii-plantation | `maunakea` | Rainy, green bayfront city with a university and farmers market |
| 3 | `kailua-kona` | Kailua-Kona, Hawaiʻi Island | hawaii | small-town | tropical-dry | kona-coastal | `hualalai` | Sunny resort and coffee town on the lava coast; tourism jobs, higher prices |
| 4 | `waimea` | Waimea (Kamuela), Hawaiʻi Island | hawaii | small-town | tropical-upland | hawaii-upcountry | `kohala-hills` | Cool, misty ranch town (paniolo country) with strong schools and high home prices |
| 5 | `honolulu` | Honolulu, Oʻahu | hawaii | big-city | tropical-urban | honolulu-highrise | `leahi` | Hawaiʻi's big city: condos, TheBus and Skyline rail, the highest prices in the state |
| 6 | `seattle` | Seattle, Washington | cities | big-city | temperate-rain | pnw-urban | `needle-rainier` | Rainy tech city with light rail, ferries, evergreen forests |
| 7 | `brooklyn` | New York City (Brooklyn), New York | cities | big-city | temperate-urban | nyc-brownstone | `manhattan-skyline` | Subway everywhere, no car needed, tiny expensive apartments |
| 8 | `miami` | Miami, Florida (Miami-Dade) | cities | big-city | subtropical-coastal | miami-deco | `biscayne-skyline` | Condo towers and art deco; hurricanes make insurance very expensive |
| 9 | `katy` | Katy, Texas (Houston suburb) | cities | suburb | subtropical-flat | texas-suburban | `water-tower` | Big new houses for the price, no state income tax, high property tax, car-only |
| 10 | `las-vegas` | Las Vegas, Nevada | cities | big-city | desert | desert-southwest | `strip-mountains` | "The Ninth Island": home to more Hawaiʻi transplants than anywhere else on the mainland |
| 11 | `chattanooga` | Chattanooga, Tennessee | cities | mid-city | humid-forest | appalachian | `lookout-mountain` | Outdoor city on a river with city-owned super-fast internet |
| 12 | `halifax` | Halifax, Nova Scotia (Canada) | cities | mid-city | maritime | maritime | `harbour-lighthouse` | Colorful harbour city, universities, cold snowy winters; prices converted from CAD |
| 13 | `yellow-pine` | Yellow Pine, Idaho | towns | rural | alpine | mountain-cabin | `pine-ridges` | Around 30 year-round residents, gravel roads, snowed in during winter |
| 14 | `marquette` | Marquette, Michigan | towns | small-city | continental-lake | midwest-lakeside | `ore-dock` | Lake Superior college town with deep lake-effect snow and trails everywhere |
| 15 | `montpelier` | Montpelier, Vermont | towns | small-town | continental-forest | new-england | `gold-dome` | The smallest state capital in the U.S., and the only one with no McDonald's |
| 16 | `elkins` | Elkins, West Virginia | towns | small-town | humid-forest | appalachian | `allegheny-ridges` | Appalachian mountain town with very cheap houses and a program that pays remote workers to move in |
| 17 | `clarksdale` | Clarksdale, Mississippi | towns | small-town | subtropical-flat | delta-south | `delta-crossroads` | Birthplace of the blues; some of the cheapest homes in the country, fewer jobs |
| 18 | `bisbee` | Bisbee, Arizona | towns | small-town | desert-mountain | desert-southwest (variant `hillside`) | `mule-mountains` | Old copper-mining town turned artists' town, houses stacked on steep hills |
| 19 | `valentine` | Valentine, Nebraska | towns | rural | plains | plains-ranch | `sandhills-windmill` | Sandhills cattle-ranching town, dark skies, the Niobrara River |
| 20 | `homer` | Homer, Alaska | towns | small-town | subarctic-coastal | maritime (variant `alaska`) | `kachemak-spit` | Halibut-fishing town at the end of the road; long dark winters, bright summers |

Table order is exactly the order above. The region groups are headed "Hawaiʻi", "Cities & suburbs" and "Small towns & rural".

Hooks and blurbs must be accurate, respectful and specific. Describe trade-offs (cheap but remote, fewer jobs, harsh
winters), never judgments. If a fact in a hook can't be confirmed (for example, a relocation incentive that has
ended), soften or drop it and note that in `docs/DATA_SOURCES.md`.

## 2. Location record schema

```js
{
  id: 'hilo',
  name: 'Hilo',                                   // short display name (table row label)
  fullName: 'Hilo, Hawaiʻi Island, Hawaiʻi',
  region: 'hawaii',                               // hawaii | cities | towns
  state: 'HI', country: 'US',                     // Halifax: state 'NS', country 'CA'
  settlement: 'small-city',                       // rural | small-town | small-city | mid-city | big-city | suburb
  population: 45000,                              // approximate, for flavor
  biome: 'tropical-wet',
  styleFamily: 'hawaii-plantation', styleVariant: null,
  landmark: 'maunakea',
  hook: '…',                                      // ≤ 16 words
  blurb: '…',                                     // 2–3 sentences, grades 6–7 reading level
  currency: { code: 'USD', usdPerUnit: 1 },       // Halifax: { code: 'CAD', usdPerUnit: <rate used>, asOf: 'YYYY-MM' }

  housing: {                                      // every figure in USD cents
    apartment: { available: true, rentCents, bedrooms: 1, notes },
    shared:    { available: true, roomRentCents, housemates: 2, notes },
    condo:     { available: true, priceCents, hoaMonthlyCents, sqft, bedrooms, notes },
    house:     { available: true, priceCents, sqft, bedrooms, lotAcres, notes },
    build:     { available: true, lotPriceCents, lotAcres, lotWidthFt, lotDepthFt,
                 buildCostPerSqftCents, siteWorkCents, permitCents, monthsToBuild, notes },
    // not offered: { available: false, naReason: 'student-facing reason' }
  },

  ownership: {
    propertyTaxRate,                              // effective annual rate for an owner-occupant (decimal)
    homeInsuranceAnnualCents,                     // HO-3 on the median house, before hazard add-ons
    condoInsuranceAnnualCents,                    // HO-6
    rentersInsuranceMonthlyCents,                 // HO-4
    hazardCoverage: [                             // extra policies; see 05 §5
      { type: 'hurricane'|'flood'|'lava'|'wildfire'|'earthquake'|'windstorm', annualCents,
        requiredForMortgage: false, note },
    ],
    lavaZone: null,                               // Hawaiʻi Island only: 1–9 for the typical home here
  },

  living: {
    utilitiesMonthlyCents,                        // electricity + water + heating fuel for a 1-bedroom apartment
    utilitiesSeasonal: { heatMonths: [], coolMonths: [], heatExtraCents: 0, coolExtraCents: 0 },
    internetMonthlyCents, phoneMonthlyCents,
    groceriesMonthlyCents,                        // one adult, moderate-cost plan, local prices
    transport: { mode: 'car'|'transit'|'mixed', monthlyCents,
                 commuteMinutesOneWay: { apartment, shared, condo, house, build } },
    gymMonthlyCents,
    socialHourCents,                              // typical cost of one hour out (meal, movie, event)
  },

  hazards: ['hurricane', 'tsunami', …],           // keys: lava, hurricane, flood, tsunami, earthquake, wildfire,
                                                  // blizzard, tornado, hail, extreme-heat, extreme-cold, vog, drought
  hazardNotes: '…',
  water: 'municipal'|'catchment'|'well'|'community',
  sewer: 'municipal'|'septic'|'cesspool',
  seasons: { snowMonths: [], rainyMonths: [], hurricaneMonths: [], fallColorMonths: [] },   // 0 = January

  metrics: {
    schoolQuality,        // 1–5
    transit,              // 1–5
    movieTheaterMiles,    // typical distance from home to the nearest movie theater
    concertHallMiles,     // …to the nearest concert hall / performing-arts venue
    noise,                // 1 very quiet – 5 loud (location base)
    gardenPotential,      // 1–5 climate + soil + growing season
    gymAccess,            // 1–5 gyms, pools, running routes
    natureAccess,         // 1–5 trails, beaches, parks, open land
    medianAge,            // years; shown as "average age of neighbors"
  },

  sources: ['short reference', …],                // full notes live in docs/DATA_SOURCES.md
}
```

**Validation rules** (`data/validate.js`, tested):
- All required fields are present, and money fields are non-negative integers.
- Every one of the 5 housing entries exists and is either available with numbers or `available: false` with an `naReason`.
- Metrics are in range. Arrays of months hold integers 0–11.
- `styleFamily` is one of the 16 families in `08-3d.md` §4, and `landmark` is a known key.
- Plausibility checks from §5: if a value falls outside its sanity band, the validator returns a
  warning (not an error). The data task either fixes the value or cites a source for it.

## 3. What's available where

Only mark a cell unavailable when the option is genuinely rare. Otherwise give a realistic figure, even if that figure is huge.
The ones decided so far:
- `yellow-pine`, apartment: "There are no apartment buildings — only about 30 people live here year-round."
- `yellow-pine`, condo: "There are no condos here."
- `pahoa`, condo: "Pāhoa is a rural town of houses and farm lots; there are almost no condos."
- `brooklyn`, build: "Empty lots in Brooklyn are extremely rare and cost millions, so almost nobody builds."

The data tasks decide the rest from the evidence. Condos are likely rare in Clarksdale, Elkins, Valentine and Bisbee, for example.
"Shared living" means renting one room in a house or apartment with two housemates. That option exists nearly everywhere.

## 4. Sourcing rules

- Use the most recent public figures (2024–2026). Good bases:
  - rents: HUD Fair Market Rents (FY2025/FY2026), local listings summaries, Zillow Observed Rent Index;
  - home values: Zillow ZHVI, Redfin or Realtor medians, local MLS summaries (e.g. Hawaiʻi Information Service for Hawaiʻi counties);
  - property tax: county or city effective rates;
  - insurance: state averages from insurer/NAIC summaries and news on hurricane/wildfire markets; for Puna lava zones, HPIA;
  - construction: regional cost-per-square-foot ranges;
  - electricity: EIA state residential rates;
  - groceries: USDA food plans adjusted for local cost of living (e.g. MIT Living Wage);
  - Halifax: CMHC or Statistics Canada rent data and Nova Scotia/HRM figures, converted at a stated CAD→USD rate.
- If web search/fetch is available in the run, **check** the key figures: 1BR rent, median house, condo price, property tax, insurance.
  If it isn't, use best knowledge and mark the figure "unverified" in `DATA_SOURCES.md`.
- Round sensibly: rents to $25, prices to $5,000, costs per square foot to $5, other monthly costs to $5.
- `docs/DATA_SOURCES.md` has one section per location listing the basis, source and year for each
  figure, plus global notes (CAD rate and date, what "moderate grocery plan" means, how commute times were chosen).
- Prices are **today's** prices, not inflated to 2033 (decision D8).

## 5. Rough sanity bands (from general knowledge — sources win)

These exist to catch typos and wild guesses, not to set values. If a solid source disagrees, trust the source and cite it.
All figures are USD.

| Place | 1BR rent / mo | Median single-family | Build cost / sq ft | Effective property tax | Notes |
|---|---|---|---|---|---|
| Pāhoa | 1,100–1,600 | 300k–420k | 350–550 | 0.3–0.7% | Lots in lava zones 1–2 can be very cheap; insurance via HPIA; catchment water; few rentals |
| Hilo | 1,200–1,700 | 450k–600k | 350–550 | 0.3–0.7% | |
| Kailua-Kona | 1,800–2,500 | 800k–1.2M | 400–600 | 0.3–0.7% | |
| Waimea | 1,700–2,400 | 850k–1.3M | 400–600 | 0.3–0.7% | |
| Honolulu | 1,900–2,600 | 1.0M–1.3M (condo 450k–550k) | 450–650 | 0.25–0.45% | |
| Seattle | 1,900–2,500 | 850k–1.0M | 350–500 | 0.8–1.1% | Earthquake coverage is optional and extra |
| Brooklyn | 3,000–4,200 | 1.2M–2.0M (condo 700k–1.1M) | n/a (build unavailable) | 0.7–1.1% | |
| Miami | 2,000–2,800 | 550k–750k (condo 350k–480k) | 250–350 | 1.6–2.1% | Home insurance can be several thousand a year, plus flood |
| Katy | 1,200–1,600 | 330k–420k | 150–220 | 2.2–3.2% | Includes MUD taxes; flood insurance advised |
| Las Vegas | 1,200–1,500 | 420k–490k | 200–300 | 0.5–0.8% | |
| Chattanooga | 1,100–1,500 | 280k–360k | 180–260 | 0.8–1.2% | |
| Halifax | 1,300–1,700 | 380k–480k | 220–320 | 0.9–1.3% | Converted from CAD |
| Yellow Pine | — | 250k–550k (few sales) | 300–450 | 0.4–0.7% | Remote hauling raises build costs; wildfire risk |
| Marquette | 850–1,200 | 230k–300k | 200–280 | 1.3–2.0% | Winter heating spikes |
| Montpelier | 1,200–1,700 | 330k–420k | 250–350 | 1.8–2.5% | |
| Elkins | 650–900 | 140k–210k | 170–250 | 0.5–0.8% | |
| Clarksdale | 600–850 | 60k–120k | 150–210 | 0.9–1.6% | |
| Bisbee | 750–1,050 | 220k–320k | 200–300 | 0.6–1.0% | |
| Valentine | 600–850 | 150k–230k | 180–250 | 1.4–2.1% | Hail and wind raise insurance |
| Homer | 1,150–1,600 | 380k–500k | 300–420 | 0.9–1.4% | High heating costs |

## 6. Metric scales (anchors)

- **schoolQuality** (1–5): 1 = well below the state average on public accountability data, 3 = about average, 5 = among the best.
  It's simplified, and the UI calls it "approximate".
- **transit** (1–5): 1 none, 2 a few buses a day, 3 regular buses, 4 frequent buses plus some rail, 5 subway/rail everywhere.
  Anchors: Brooklyn 5, Honolulu 4, Seattle 4, Yellow Pine 1.
- **movieTheaterMiles / concertHallMiles**: typical driving distance. Remote places can be 50+ miles (and hours on gravel for Yellow Pine).
- **noise** (1–5): location base. Home types adjust it (`04` §6).
- **gardenPotential** (1–5): climate, rain or water, soil, and season length. Anchors: Hilo/Pāhoa 5 (year-round),
  Las Vegas 2 (desert water limits), Homer 2 (short season).
- **gymAccess**, **natureAccess** (1–5): how easy it is to get to gyms, pools, running routes, trails, beaches and open land.
- **medianAge**: census median age of the town or area.
