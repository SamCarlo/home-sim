# Data sources

Where every location figure comes from (03 §4). Each section lists the figure, its basis, the source and year, and
whether this run **verified** it against a 2025–2026 public source by web search or left it **unverified** (best
knowledge, a reasonable estimate). Figures in the data files are rounded per 03 §4 and are today's prices (D8).

## Global notes

- **Checked**: task 07 (2026-10-01) ran web searches for 1BR rent, median single-family and condo prices, property tax,
  HO-3 and HPIA premiums, and electricity rates for the Hawaiʻi places. Search snippets were used, so treat "verified"
  as "matches a named 2025–2026 source", not as an audited figure.
- **Rents**: HUD FY2026 Fair Market Rents (Oct 2025 – Sep 2026) are a county-wide *gross* rent (rent plus utilities)
  at the 40th percentile. Hawaiʻi County's 1BR FMR is $1,970 and Urban Honolulu's is $2,016. The county figure blends
  Kona and Hilo sides, so town rents are set below it for the east side and near it for Kona and Waimea (estimates).
- **Groceries**: "moderate plan" = USDA Moderate-Cost Food Plan for one adult (~$350–375/mo nationally in 2025), times
  a local price factor. Hawaiʻi's factor is about 1.35–1.45 (MIT Living Wage food costs), giving $475–500. Unverified.
- **Commute times**: one-way drive (or bus) minutes from a typical home of that type to the main job center: Hilo for
  Pāhoa, town or the resorts for Kona and Waimea, downtown for Honolulu. House and build options sit farther out. Estimates.
- **Transport**: monthly cost of gas, insurance and upkeep for one older paid-off car (Hawaiʻi gas ~$4.50–5.00/gal), or
  for Honolulu "mixed", a bus pass plus some car share or rides. Unverified.
- **Electricity**: Hawaiian Electric average residential rates for 2025: Hawaiʻi Island (HELCO) 45.81¢/kWh, Oʻahu (HECO)
  40.54¢/kWh. **Verified** (Hawaiian Electric "Average Price of Electricity"). A 1-bedroom uses ~300–350 kWh/mo, so
  electricity is ~$140–160; water, sewer and gas fill out `utilitiesMonthlyCents`.
- **Insurance**: Hawaiʻi HO-3 averages are low nationally (~$930–1,100/yr for $300k dwelling, ValuePenguin/NerdWallet 2025–26);
  Big Island standard-market homes run $1,400–3,200/yr. Hurricane coverage is a separate policy in Hawaiʻi (HO-3 excludes
  it), priced here as an optional add-on. HO-4 renters ~$15/mo and HO-6 condo ~$450–600/yr are estimates. HO-3 ranges
  **verified**; place-specific figures are estimates within them.
- **Lava zones**: USGS Lava-Flow Hazard Zones (1 = highest hazard). Pāhoa 1, Hilo 3, Kailua-Kona 4, Waimea 8. **Verified**.
- **Property tax**: effective rate for an owner-occupant = class rate × (value − home exemption) ÷ value, rounded to
  0.01%. Hawaiʻi County FY2025–26 Homeowner class: $5.95 per $1,000 (**verified**, Old Republic Title FY26 table and
  county summaries) with the basic $40,000 home exemption under age 60 (sources disagree on newer value-based tiers,
  so the basic one is used; unverified detail). Honolulu FY2026 Residential A/home-exemption rate $3.50 per $1,000 with a
  $120,000 home exemption under 65 (**verified**, Honolulu RPT FY26 rates).
- **Sanity bands**: all five Hawaiʻi records are inside their 03 §5 bands, so the validator prints no warnings.
- **Checked (cities)**: task 08 (2026-10-01) ran web searches for 1BR rent and median house/condo prices (all seven),
  Katy property tax and MUD rates, Miami-Dade home insurance, Halifax rent, benchmark price and tax rate, and the
  CAD→USD rate. Other figures are best knowledge, marked unverified.
- **CAD→USD (Halifax)**: **1 CAD = 0.71 USD** (`currency.usdPerUnit`, `asOf: '2026-09'`; `CAD_USD` in `cities.js`).
  Bank of Canada daily rates in late September 2026 were 1.41–1.42 CAD per USD (≈0.706–0.709); OFX shows the month's range
  as 0.707–0.726 USD per CAD. Rounded to 0.71. **Verified**. Each Halifax figure below gives the CAD original; the USD
  value is CAD × 0.71, then rounded per 03 §4. Re-run the conversion if the rate drifts by more than ~5%.
- **Cities: groceries and commutes**: USDA Moderate plan (~$350–375/mo) × local price factor (Brooklyn ~1.45, Seattle
  ~1.3, Miami ~1.25, the rest ~1.1–1.2). Commutes are to the main job center (downtown Seattle, Midtown/Downtown
  Manhattan, downtown Miami/Brickell, Houston's Energy Corridor, the Strip/downtown Las Vegas, downtown Chattanooga,
  downtown Halifax). All estimates.
- **Sanity bands (cities)**: all seven city records are inside their 03 §5 bands; the validator prints no warnings.

## Pāhoa

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $1,400 | Below the Hawaiʻi County FMR ($1,970, FY2026) since Puna rents are the county's lowest; few true apartments | estimate within band; FMR verified |
| Room in shared house | $750 | ~half of 1BR rent, typical Puna listings | unverified |
| Condo | unavailable | 03 §3 decision; Puna has almost no condos | n/a |
| House | $400,000 | Puna single-family median ~$400K (Hawaiʻi Information Service via local agents, July 2025) | **verified** |
| Lot (1 acre) | $45,000 | Lava zone 1–2 one-acre lots in lower Puna subdivisions sell ~$30–60K (listings, 2025) | unverified |
| Build cost | $375/sq ft | Owner-builder single-wall to standard construction on Hawaiʻi Island, low end of the band | unverified |
| Site work | $45,000 | Clearing, catchment tank and pump, septic (cesspools no longer allowed for new homes), power pole, gravel drive | unverified |
| Property tax | 0.54% | $5.95/$1,000 with $40K exemption on $400K | **verified** (rate) |
| HO-3 base | $1,100/yr | Liability, theft and water-damage policy; fire and lava come from HPIA in zones 1–2 | unverified |
| Lava (HPIA) | $4,000/yr, required | HPIA zone 1 premiums ~$3,500–6,000/yr for a modest home (Hawaiʻi Life, insurer guides, 2025); HPIA is the state's insurer of last resort and lenders require it | **verified** (range) |
| Hurricane | $900/yr, optional | Separate hurricane policy; HPIA does not write hurricane | unverified |
| Water / sewer | catchment / cesspool | Most Puna homes have rain catchment and an older cesspool (state law requires upgrades by 2050) | verified (general knowledge, widely reported) |
| Internet | $90/mo | Many lots lack cable, so satellite or fixed wireless | unverified |
| Population | 950 | 2020 Census, Pāhoa CDP (~945) | verified (general knowledge) |
| Metrics | see file | Hele-On buses a few times a day (transit 2); nearest cinema and Palace Theater in Hilo (~20 mi); median age ~42 | estimates |

## Hilo

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $1,550 | Below county FMR ($1,970 gross, FY2026); Hilo listings ~$1,400–1,700 | estimate within band; FMR verified |
| Room | $800 | Shared-house listings near UH Hilo | unverified |
| Condo | $350,000 | Hilo low-rise condo sales ~$300–400K (2025 listings); no 03 §5 band | unverified |
| House | $565,000 | Hilo single-family median $565,000, Q4 2025 (HIS via market reports) | **verified** |
| Lot / build | $140,000 lot; $400/sq ft | Town lots ~$100–180K; mid-band island construction cost | unverified |
| Property tax | 0.55% | $5.95/$1,000 with $40K exemption on $565K | **verified** (rate) |
| HO-3 | $1,500/yr | Big Island low-hazard standard market $1,500–2,100 (2026 insurer guides) | **verified** (range) |
| Hurricane / flood | $900 / $700, optional | Separate hurricane policy; NFIP flood for bayfront zones | unverified |
| Lava zone | 3 | USGS | **verified** |

## Kailua-Kona

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $2,100 | Near the county FMR ($1,970 gross); Kona listings ~$1,900–2,400 | estimate within band; FMR verified |
| Room | $1,000 | Kona shared-house listings | unverified |
| Condo | $600,000 | North Kona condo median $663K (May 2025) includes resort units; in-town condos run lower | **verified** (district median) |
| House | $1,050,000 | North Kona single-family median ~$1.2M (May 2025) includes resort and oceanfront homes; Kailua-Kona town subdivisions ~$0.9–1.1M | **verified** (district); town figure estimated |
| Lot / build | $350,000 lot; $450/sq ft | Kona quarter-acre lots ~$300–400K; lava-rock sites cost more to prepare | unverified |
| Property tax | 0.57% | $5.95/$1,000 with $40K exemption on $1.05M | **verified** (rate) |
| HO-3 | $1,800/yr | Big Island standard market, higher value | **verified** (range) |
| Lava zone | 4 | USGS (Hualālai flank) | **verified** |
| Cooling | +$35/mo Jun–Oct | Hot dry summers, window AC | unverified |

## Waimea (Kamuela)

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $1,950 | Near the county FMR ($1,970 gross); few rentals | estimate within band; FMR verified |
| Room | $950 | Listings | unverified |
| Condo | $650,000 | Waimea townhome condos ~$550–750K (listings 2025) | unverified |
| House | $1,195,000 | Kamuela (96743) medians ~$1.6M (Redfin/Homes.com, 2025–26) include the Mauna Lani and Mauna Kea resort areas, which share the ZIP code; Waimea town homes sell ~$1.0–1.3M. The town estimate is used so the game reflects Waimea itself | district **verified**; town figure estimated |
| Lot / build | $425,000 lot; $475/sq ft | Half-acre Waimea lots ~$350–500K; upcountry construction | unverified |
| Property tax | 0.58% | $5.95/$1,000 with $40K exemption on $1.195M | **verified** (rate) |
| HO-3 | $1,700/yr | Big Island standard market | **verified** (range) |
| Lava zone | 8 | USGS | **verified** |
| Heating | +$25/mo Dec–Mar | Cold upcountry nights, space heaters/fireplace | unverified |
| Sewer | septic | Most homes outside the town core use septic or cesspools | unverified |
| Concert hall 1 mi | | Waimea has its own performing-arts theater; nearest cinema is on the coast (~30 mi) | unverified |

## Honolulu

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $2,100 | Urban Honolulu FMR 1BR $2,016 gross (FY2026); Zillow-style listings ~$1,900–2,300 | **verified** (FMR) |
| Room | $1,100 | Listings | unverified |
| Condo | $535,000 | Oʻahu condo median $535,000, October 2025 (Honolulu Board of Realtors / HiCentral) | **verified** |
| HOA | $800/mo | Oʻahu tower HOA dues commonly $700–1,000+ after master-policy increases | unverified |
| House | $1,160,000 | Oʻahu single-family median $1,162,500, October 2025 (HBR) | **verified** |
| Lot / build | $750,000 lot (teardown); $525/sq ft; 18 months | Small urban lots; Honolulu permitting delays widely reported | unverified |
| Property tax | 0.31% | $3.50/$1,000 with $120K home exemption on $1.16M (FY2026) | **verified** |
| HO-3 / HO-6 | $1,400 / $600 per yr | Oʻahu standard market; HO-6 estimate | HO-3 range **verified**; HO-6 unverified |
| Add-ons | hurricane $1,000, flood $700, earthquake $400 (all optional) | 05 §5 says earthquake is optional in Honolulu | unverified |
| Transit 4 | | TheBus plus the Skyline rail line (03 §6 anchor) | verified (anchor) |

## Seattle

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $1,975 | Zumper national rent report, Seattle 1BR median ~$1,930–1,960 (2025–26) | **verified** |
| Room | $1,000 | ~half of 1BR, listings | unverified |
| Condo | $550,000 (1BR, HOA $600) | Seattle condo medians ~$500–600K (NWMLS 2025) | unverified |
| House | $950,000 | NWMLS Seattle single-family median $965,000 Sept 2025 ($898,000 May 2025) | **verified** |
| Lot / build | $450,000 lot (teardown); $425/sq ft; 14 months | City lots and Seattle permitting times | unverified |
| Property tax | 0.88% | King County 2025 levy rates for Seattle ~$8.5–9.0 per $1,000 of assessed (≈ market) value | unverified |
| HO-3 / HO-6 | $1,300 / $450 per yr | Washington averages ~$1,100–1,400 (NerdWallet/Bankrate 2025) | unverified |
| Earthquake | $1,000/yr, optional | 03 §5 note: optional and extra; WA quake policies ~$800–1,500 | unverified |
| Utilities | $165 + $45 Nov–Mar | Seattle City Light (~14¢/kWh) is cheap; water, sewer and garbage are not | unverified |
| Transport | mixed $225 | ORCA monthly pass ~$99 plus occasional car share | unverified |
| Metrics | transit 4 (03 §6 anchor), median age ~35 (ACS) | | anchor verified |

## Brooklyn

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $3,750 | MNS Brooklyn 2025 year-end average 1BR $3,744; median asking 1BR $3,770 (July 2026) | **verified** |
| Room | $1,500 | Room shares in 3BR apartments, listings 2025 | unverified |
| Condo | $925,000 (2BR, HOA $700) | Brooklyn condo medians ~$850K–1.0M (Corcoran/Elliman reports 2025) | unverified |
| House | $1,450,000 | Brooklyn 1–3 family / townhouse medians ~$1.3–1.6M (2025 reports) | unverified |
| Build | unavailable | 03 §3 decision | n/a |
| Property tax | 0.85% | NYC Class 1 effective rate on market value for a recently bought row house; long-held homes pay much less because of assessment caps | unverified |
| HO-3 / HO-6 | $2,000 / $500 per yr | NY averages; brick row houses near the coast cost more | unverified |
| Flood | $1,200/yr, optional | NFIP in Sandy-affected zones; required only in mapped zones | unverified |
| Utilities | $150 + heat/cool extras | Con Edison electric; heat and hot water usually included in rent | unverified |
| Transport | transit $135 | MTA 30-day unlimited MetroCard $132 (2025) | **verified** (general knowledge) |
| Metrics | transit 5 (03 §6 anchor); population ~2.6M (2020 Census) | | verified |

## Miami

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $2,450 | Miami listings ~$2,300–2,600 (Zumper/Apartments.com 2025) | unverified (inside band) |
| Room | $1,150 | Listings | unverified |
| Condo | $400,000 (2BR, HOA $850) | Miami-Dade existing condo median $400,000, October 2025 (Miami Realtors) | **verified** |
| Special assessments | in condo notes | Florida SB 4-D (2022) milestone inspections and reserve studies after the 2021 Surfside collapse; widely reported assessments | verified (general knowledge, widely reported) |
| House | $680,000 | Miami-Dade single-family median $682,000, October 2025 (Miami Realtors) | **verified** |
| Lot / build | $350,000 lot; $300/sq ft; $40,000 site work (fill, hurricane code) | Estimates | unverified |
| Property tax | 1.75% | Miami-Dade + City of Miami ~19–20 mills, less the $50K homestead exemption | unverified |
| HO-3 | $5,000/yr (includes wind) | Miami-Dade average ~$5,100–5,200/yr (Insurify, 1800insurance 2025); Florida HO-3 includes windstorm with a hurricane deductible | **verified** |
| HO-6 | $1,200/yr | Condo unit policies run high in South Florida | unverified |
| Flood | $900/yr, optional (required in mapped zones) | Miami-Dade NFIP average ~$590/yr; set higher because many homes sit in AE zones | partly verified |
| Transport | car $575 | Florida has some of the highest car insurance in the U.S. | unverified |

## Katy

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $1,400 | Katy complexes ~$1,250–1,550 (2025 listings) | unverified (inside band) |
| Room | $750 | Listings | unverified |
| Condo | $250,000 (HOA $350) | Townhouse-condos are uncommon; listing estimate | unverified |
| House | $375,000 | HAR.com: Katy median sold price $345,000 (12 months to 2025); Harris-side ~$310K, Fort Bend-side ~$500K. Set between for a newer 4BR | **verified** (range) |
| Lot / build | $90,000 lot; $175/sq ft; 7 months | Production builders in Fort Bend/Waller counties | unverified |
| Property tax | 2.45% incl. MUD | City of Katy $0.425 + Katy ISD $1.117 per $100 + county + MUD $0.20–0.70 (HAR 2025–26): 2.3–3.5% before the homestead exemption. Ownwell's ~1.6% median includes long-held capped homes, which a new buyer won't get | **verified** (component rates) |
| HO-3 / HO-6 | $3,200 / $600 per yr | Texas is among the priciest states (hail, wind) | unverified |
| Flood | $750/yr, advised | Harvey 2017 flooding; NFIP averages | unverified |
| Utilities | $200 + $90 Jun–Sep | Deregulated electricity ~15¢/kWh; long AC season | unverified |
| Water / sewer | municipal | Most new neighborhoods get water and sewer from a MUD (a public utility district), which is why the MUD tax exists | verified (general knowledge) |
| Metrics | school 5 (Katy ISD is highly rated); concert hall ~28 mi (Houston Theater District) | | unverified |

## Las Vegas

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| Hook | "The Ninth Island" | Long-standing nickname for Las Vegas among Hawaiʻi transplants, widely reported (e.g. Hawaiʻi and Las Vegas news, the California Hotel's Hawaiʻi ties) | verified (general knowledge) |
| 1BR rent | $1,350 | Zumper/Apartments.com 1BR ~$1,250–1,400 (2025) | unverified (inside band) |
| Room | $700 | Listings | unverified |
| Condo | $265,000 (HOA $300) | LVR condo/townhome median ~$260–290K (2025) | unverified |
| House | $475,000 | LVR single-family median $488,995 Nov 2025; $473,875 April 2026 | **verified** |
| Lot / build | $150,000 lot; $225/sq ft; 9 months | Estimates | unverified |
| Property tax | 0.60% | Clark County: 35% assessment × ~3.3% rate ≈ 1.15% of taxable value; taxable value is below market and the 3% owner-occupied abatement cap keeps bills down | unverified |
| HO-3 / HO-6 | $1,300 / $400 per yr | Nevada averages ~$1,000–1,400 | unverified |
| Utilities | $190 + $110 Jun–Sep | NV Energy; summer AC bills often double | unverified |
| Extreme-heat cooling months | June–September (5–8) | NWS Las Vegas: average highs over 100°F June–September | verified (general knowledge) |
| Metrics | gardenPotential 2 (03 §6 anchor); concert hall: The Smith Center | | anchor verified |

## Chattanooga

| Figure | Value | Basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $1,250 | Median 1BR $1,123 (Sept 2025) to average $1,311 (Aug 2026) across rent sites | **verified** (range) |
| Room | $650 | Listings | unverified |
| Condo | $275,000 (HOA $250) | Estimate | unverified |
| House | $340,000 | Chattanooga median home price ~$340,000 (2025–26 rent/price summaries) | **verified** |
| Lot / build | $70,000 lot; $210/sq ft; 8 months | Estimates | unverified |
| Property tax | 0.95% | Tennessee assesses homes at 25%; City of Chattanooga + Hamilton County rates total ~$3.8 per $100 of assessed value | unverified |
| HO-3 / HO-6 | $1,900 / $450 per yr | Tennessee averages (tornado, hail) | unverified |
| Internet | $70/mo | EPB Fiber, the city-owned power company's fiber network; 1 Gig plan ~$68 (2025) | verified (general knowledge) |
| Metrics | natureAccess 5 (ridges, river, climbing); concert hall: the Tivoli Theatre | | unverified |

## Halifax

All CAD figures × 0.71 (see Global notes).

| Figure | USD value | CAD original and basis / source / year | Status |
|---|---|---|---|
| 1BR rent | $1,325 | CAD 1,850 asking rent. CMHC Oct 2025 purpose-built 1BR average ~CAD 1,400–1,540 (sitting tenants); asking rents for a new lease ran ~CAD 1,770 in Q1 2025 and rose since. A new renter pays asking rent | **verified** (range) |
| Room | $700 | CAD 1,000 | unverified |
| Condo | $320,000 (fee $320) | CAD 450,000; fees CAD 450 | unverified |
| House | $400,000 | CAD 565,000; Halifax benchmark price CAD 557,842 (2025, +3.8%, Halifax Partnership) | **verified** |
| Lot / build | $140,000 lot; $285/sq ft; site $28,400; permit $4,260; 10 months | CAD 200,000; CAD 400/sq ft; CAD 40,000; CAD 6,000 | unverified |
| Property tax | 1.05% | HRM 2025–26 general rate CAD 0.770 per $100 (kept flat) plus the provincial area rate and urban transit/fire rates. The Capped Assessment Program resets on sale, so a buyer pays on full assessed value | rate **verified**; total unverified |
| HO-3 / HO-6 / renters | $1,280 / $355 per yr / $20 per mo | CAD 1,800 / 500 / 25 | unverified |
| Flood | $285/yr, optional | CAD 400 overland-flood endorsement; July 2023 floods | unverified |
| Utilities | $185 + $105 Nov–Apr | CAD 260 + 150 heat; Nova Scotia Power rates are among Canada's highest | unverified |
| Transport | mixed $215 | CAD 300: Halifax Transit pass ~CAD 82.50 plus some car use | unverified |
| Groceries | $440 | CAD 620 | unverified |
| Seasons | hurricane months June–Nov | Post-tropical storms (Fiona 2022, Juan 2003) reach Nova Scotia | verified (general knowledge) |

## Sources

- UHERO, *The Hawaiʻi Housing Factbook 2025*: https://uhero.hawaii.edu/the-hawaii-housing-factbook-2025/
- Big Island market updates (HIS data), May and July 2025: https://marcoinkona.com/hawaii-island-real-estate-market-update-july-2025/
- Locations Hawaiʻi statewide report: https://www.locationshawaii.com/learn/market-reports/hawaii-statewide-real-estate-report/
- Honolulu Board of Realtors / HiCentral, October 2025: https://www.hicentral.com/mpr/mpr-2025-10.php
- Redfin, Waimea housing market: https://www.redfin.com/city/19780/HI/Waimea/housing-market
- HUD FY2026 FMRs via https://www.bnbcalc.com/section8/hi and https://www.ushousingdata.com/fair-market-rents/hawaii-county-hi
- Old Republic Title, 2025–2026 Hawaiʻi real property tax rates: https://www.oldrepublictitle.com/Media/3qxf5cnr/2025-2026-real-property-tax.pdf
- Honolulu FY26 final tax rates: https://realproperty.honolulu.gov/media/j4xaoww0/state-report-fy26-final-tax-rates.pdf
- Hawaiʻi Life, Puna lava zones and insurance: https://www.hawaiilife.com/blog/puna-lava-zones-neighborhoods-and-homeowners-insurance/
- Big Island insurance by region: https://bigislandcomps.com/blog/insurance-costs
- ValuePenguin Hawaiʻi home insurance: https://www.valuepenguin.com/best-cheap-homeowners-insurance-hawaii
- Hawaiian Electric, average price of electricity: https://www.hawaiianelectric.com/billing-and-payment/rates-and-regulations/average-price-of-electricity
- USGS lava-flow hazard zone maps: https://hilo.hawaii.edu/natural-hazards/volcanoes/documents/natural-hazards/volcanoes/USGS_Lava_Flow_Hazard_Zone_Maps.pdf
- NWMLS via market reports, Seattle Sept 2025: https://www.georgiabuys.com/2025/10/17/seattle-housing-market-update-fall-2025/
- Zumper, Seattle rent 2026: https://www.zumper.com/blog/is-seattle-affordable-for-renters/
- MNS Brooklyn year-end report: https://www.mns.com/brooklyn_year_end_report
- Brownstoner, Brooklyn rents October 2025: https://www.brownstoner.com/real-estate-market/brooklyn-rents-rise-october-2025-rental-report/
- Miami Realtors, October 2025: https://www.miamirealtors.com/2025/10/23/miami-dade-real-estate-registers-best-sales-month-of-the-year-affordable-and-1m-up-condo-transactions-surge/
- Miami home insurance 2025: https://www.1800insurance.com/guides/miami-homeowners-insurance-cost and https://insurify.com/homeowners-insurance/florida/miami/
- HAR.com, Katy cost of living and property taxes: https://www.har.com/blog_145863_cost-of-living-in-katy-tx-a-buyers-breakdown and https://www.har.com/blog_146186_katy-tx-property-taxes-explained-what-homeowners-and-buyers-need-to-know-in-2026
- City of Katy tax information: https://www.cityofkaty.com/government/city-departments/finance/tax-information
- LVR medians via 8 News Now and KTNV: https://www.8newsnow.com/news/local-news/las-vegas-home-prices-stable-market-shifting-toward-buyers-lvr-says/
- Chattanooga rents: https://www.rentcafe.com/average-rent-market-trends/us/tn/chattanooga/ and https://www.zillow.com/rental-manager/market-trends/chattanooga-tn/
- Halifax Partnership, Halifax Index real estate: https://halifaxpartnership.com/research-strategy/halifax-index/real-estate/
- CMHC 2025 Rental Market Report: https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/market-reports/rental-market-reports-major-centres
- CBC, Halifax 2025–26 tax rate: https://www.cbc.ca/news/canada/nova-scotia/halifax-to-keep-property-tax-rate-flat-bills-going-up-about-4-7-1.7494224
- Bank of Canada daily exchange rates: https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates/
