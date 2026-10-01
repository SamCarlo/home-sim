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
