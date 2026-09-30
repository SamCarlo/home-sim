# 04 — Phase 1: Intake & Plan

## 1. Intake screen (`phases/intake/intakeScreen.js`)

The first screen after logging in, shown when `state.phase === 'intake'`.

| Field | Type | Rules | Help text (student-facing) |
|---|---|---|---|
| Character name | text, 2–30 chars | letters, spaces, `'`, `-`, `ʻ`; default = username | "A made-up name for your character. It goes on your forms. Don't use your real name." |
| Job title | text, optional, ≤ 40 | — | "The job your teacher assigned you (optional)." |
| Net monthly income | currency | $500 – $20,000 | "Your take-home pay each month: what's left after taxes. Your teacher gave you this number." |
| Hours you work per week | number | 10 – 80, default 40 | "Used to plan your time and to figure out overtime pay." |
| Savings in the bank | currency | $0 – $1,000,000 | "How much money you have saved right now. (For now you type it in.)" |

- Currency inputs accept `3200`, `3,200` or `$3,200.50`, and store integer cents.
- Show a live one-liner: "That's about $X per year take-home, or $Y per hour."
- A short plain explanation of **net vs gross** ("Gross pay is before taxes; net pay is what actually lands in your account").
- **Continue** validates and does the following:
  - writes `player.*`;
  - sets `finances.savingsCents = startingSavingsCents` (only the first time: intake runs once);
  - sets `phase = 'plan'`;
  - saves a checkpoint (`intake-complete`).

The app header appears from intake onward:
- game title;
- a phase stepper: 1 Plan · 2 Paperwork · 3 Design · 4 Live, with the current phase highlighted and finished ones checked;
- the save indicator;
- a "Portfolio" button, from Phase 1 on;
- the username with a Log out button.

## 2. What each table cell means

- **Upfront**: cash needed before moving in.
- **Monthly**: the first-year monthly **housing** cost, meaning rent or mortgage-related payments plus insurance and utilities.

Other living costs (food, transport, phone) are not in the table; they show up in Phase 4.
Money comes from **current cash** (`checkingCents + savingsCents`). After a denied attempt, fees already paid really are gone.

## 3. Cost formulas (`finance/costs.js`, pure)

`cellCost(location, homeTypeId, config) → { available, naReason?, upfrontCents, monthlyCents, upfront: Line[], monthly: Line[], assumptions: string[] }`
where `Line = { key, label, cents, note? }`. Use `finance/loans.js` for `pmt()`. All math is in integer cents, rounded at each line.

Defaults come from `config.FINANCE`:
- 10% down;
- mortgage 30-year fixed at 6.5% (15-year at 5.85%);
- closing costs 3% of the price (or of the loan, for a build);
- PMI 0.6%/yr of the loan when down < 20%;
- inspection $500, appraisal $600;
- application fee $50 for an apartment, $25 for a shared room;
- deposit of one month's rent;
- utility factors: apartment 1.0, shared 0.5 (your share), condo 1.1, house 1.6, build 1.3;
- build: "cozy" 1,000 sq ft, 10% contingency (financed), 20% down, construction-to-permanent loan at 7%, 30 years.

| Type | Upfront lines | Monthly lines |
|---|---|---|
| apartment | security deposit (rent × depositMonths); first month's rent; application fee | rent; renters insurance; utilities × 1.0 |
| shared | deposit (room rent); first month; application fee | room rent; renters insurance; utilities × 0.5 |
| condo | down payment; closing costs; inspection; appraisal | principal & interest; PMI (if < 20% down); property tax (price × rate / 12); condo insurance HO-6 / 12; HOA dues; utilities × 1.1 |
| house | down payment; closing costs; inspection; appraisal | principal & interest; PMI; property tax; homeowners insurance HO-3 / 12 + required hazard coverage / 12; utilities × 1.6 |
| build | down payment (20% of project cost); loan closing (3% of loan); permit fees; temporary housing while building (monthsToBuild × local room rent, or apartment rent if shared living isn't available); construction interest reserve (loan × 50% drawn on average × 7% / 12 × monthsToBuild) | (after it's built) principal & interest; property tax on project cost; homeowners insurance scaled by (project cost ÷ median house price, clamped 0.5–1.5) + required hazard coverage; utilities × 1.3 |

- Build **project cost** = lot price + (build cost per sq ft × 1,000 × 1.10 contingency) + site work
  (water, power, septic or sewer hookup, driveway). The loan is 80% of the project cost.
- The HOA master policy covers a condo building, which is why condos only carry HO-6.
- Each line has a plain-language note, e.g. PMI: "Extra insurance the lender makes you pay when you put down less than 20%."
- The `assumptions` array powers the note under the table: "Assumes 10% down, a 30-year fixed loan at 6.5%, …".

## 4. Affordability colors (`finance/affordability.js`, pure)

`classify({upfrontCents, monthlyCents, available}, {cashCents, incomeCents}) → { status, label, icon, reasons[] }`

**The first rule that matches wins:**

| Status | Rule (integer math) | Icon | Label | Reason text example |
|---|---|---|---|---|
| `na` | `available === false` | — | Not available here | location's `naReason` |
| `red` | `upfront > cash` **or** `monthly > income` | ✕ | Can't afford | "Upfront $12,400 is more than your $8,000 in savings." / "Monthly $3,900 is more than your $3,200 income." |
| `yellow` | `monthly * 3 > income` | ⚠ | Stretch | "Housing would take more than ⅓ of your income ($1,067)." |
| `cyan` | `monthly * 5 <= income` | ◎ | Well below your means | "Housing would take ⅕ of your income or less ($640)." |
| `green` | otherwise | ✓ | Comfortable | "Housing takes between ⅕ and ⅓ of your income." |

- Boundaries (these need unit tests):
  - monthly exactly ⅓ of income → `green`;
  - monthly exactly ⅕ → `cyan`;
  - upfront exactly equal to cash → affordable (not red);
  - monthly exactly equal to income → not red (it is still yellow).
- Red cells can't be chosen (decision D12). The detail panel explains why.

## 5. The table (`phases/plan/table.js`, `planScreen.js`)

- **Above the table**, a "Your numbers" bar:
  - net income; cash in the bank;
  - "⅓ of your income = $X" and "⅕ = $Y";
  - a legend with all five statuses (icon + label + color);
  - a toggle "Hide homes I can't afford".
- **Rows**: the 20 locations in `03` §1 order, under three region header rows. **Columns**: Apartment
  (rent), Shared living (rent a room), Condo (buy), House (buy), Build a house.
  - Each column header has a one-line explainer tooltip.
- **Cell**: status background tint + left border in the status color; line 1 "Upfront $12,400";
  line 2 "$1,850/mo"; the status icon and short label. Unavailable cells are gray with "Not available".
  - If a cell was already tried and denied, it carries a small "Denied last time" badge.
- **Sticky** header row and first column. On narrow screens the table scrolls horizontally inside its container, never the page.
- **Keyboard**:
  - cells are buttons with roving tabindex, so arrow keys move between them;
  - Enter or Space opens the detail panel, Esc closes it;
  - Home/End jump to the first or last cell of a row.
- Each cell's `aria-label` reads: "Hilo, apartment: upfront $3,100, monthly $1,620, comfortable".
- Build the table DOM once; recolor cells without rebuilding. Numbers come from `cellCost` and `classify`, memoized per state version.
- Under the table: the assumptions note plus "Prices are approximate 2025–26 figures for each place. Canada is converted to U.S. dollars."

## 6. Detail panel (`phases/plan/detail.js`)

Opens **inline below the clicked row** (a full-width row) at ≥ 900 px, or as a **modal sheet** below 900 px.
Only one is open at a time, and `plan.expanded` remembers it.

Contents:
1. Title "Apartment in Hilo" plus the status badge and its reasons.
2. The **2D preview** (§7), 480×270, with the location `hook` as its caption.
3. **Cost breakdown**: two small tables, Upfront and Monthly, with every line, its note (tooltip or small text), and the totals.
4. **Lifestyle metrics** (`data/metrics.js → cellMetrics(location, homeTypeId)`). Each metric gets an icon, a value shown as
   stars, a bar or a number, and a one-line meaning:
   - school quality (approximate) · public transportation · distance to a movie theater / concert hall (both numbers) ·
     noise level · garden/farming potential · garage/workshop space · gym/swim/running access · access to nature ·
     average age of neighbors · typical commute (minutes).
   - Home-type adjustments (`data/homeTypes.js`):

     | Metric | apartment | shared | condo | house | build |
     |---|---|---|---|---|---|
     | noise (added to the location base, clamped 1–5) | +1 | +1 | +0.5 | 0 | −1 |
     | garden potential (location base × factor) | ×0.4 "pots on the lānai/balcony" | ×0.6 | ×0.4 | ×0.9 | ×1.0 |
     | garage/workshop (0–3) | 0 none | 1 shared storage | 1 storage + parking | 2 garage | 3 garage + workshop (if you design one) |
     | average age of neighbors (added to median age) | −4 | −6 | 0 | +3 | +2 |
     | commute | from `living.transport.commuteMinutesOneWay[type]` |

5. **About this place**: the `blurb`, hazards shown as chips with `hazardNotes`, and water/sewer notes such as
   "Water comes from a rain catchment tank".
6. **Choose this home**:
   - Disabled for `red` or `na` cells, with the reason shown.
   - Otherwise it opens a confirm dialog: "You're choosing an apartment in Hilo. Next you'll fill out the paperwork: applications,
     a lease, insurance, and a letter. Ready?"
   - Confirming sets `choice = {locationId, homeTypeId, snapshot, chosenAt}`, sets `phase = 'paperwork'`, resets
     `paperwork` to a fresh attempt, and saves a checkpoint (`home-chosen`).

## 7. 2D preview pictures (`phases/plan/preview2d/`, pure)

`renderPreviewSVG({ location, homeTypeId, seed? }) → string`: a complete `<svg viewBox="0 0 480 270">` with `<title>`
and `<desc>`. It's deterministic for the same inputs, in a flat, friendly illustration style with no photos and no external assets.

Layers, back to front:
1. **Sky**, a biome gradient at late afternoon (light clouds for wet biomes, a heat haze tint for desert).
2. **Landmark silhouette** from `location.landmark` (`backgrounds.js`):

   | Landmark key | Drawing |
   |---|---|
   | `maunakea` | broad shield volcano, snowcap in Dec–Mar optional |
   | `kilauea-plume` | low shield with a thin vog/steam plume |
   | `hualalai` | volcano over the ocean |
   | `kohala-hills` | rolling green hills with mist |
   | `leahi` | Diamond Head crater profile |
   | `needle-rainier` | Space Needle with a snowy Mt. Rainier behind |
   | `manhattan-skyline` | Manhattan skyline across the river |
   | `biscayne-skyline` | bay with towers |
   | `water-tower` | flat horizon with a town water tower |
   | `strip-mountains` | desert mountains with Strip towers |
   | `lookout-mountain` | forested ridge over a river |
   | `harbour-lighthouse` | harbour with a lighthouse |
   | `pine-ridges` | layered pine ridges |
   | `ore-dock` | Lake Superior with a lakeside ore dock |
   | `gold-dome` | gold-domed capitol among hills |
   | `allegheny-ridges` | layered blue ridges |
   | `delta-crossroads` | flat fields with a crossroads signpost and guitars |
   | `mule-mountains` | rocky desert hills |
   | `sandhills-windmill` | grass dunes with a windmill |
   | `kachemak-spit` | bay, glaciers and a long spit |

3. **Mid-ground terrain and vegetation** by biome: palms, ʻōhiʻa, banana, ferns; pines; maples; cacti and agave; prairie grass;
   birch; mangrove-free city trees.
4. **The home** by type × style family (`buildings.js`, colors from `data/styleFamilies.js`):
   - apartment: a walk-up or mid-rise block (height by settlement);
   - condo: low-rise or tower;
   - shared: a house with 3 figures on the porch or lānai;
   - house: a regional single-family house;
   - build: an empty lot with survey stakes, a "Your house here" sign and a faint blueprint outline.
5. **Foreground** details: mailbox, fence, car or bus stop by transit level, plants, catchment tank where `water === 'catchment'`.
6. A small caption chip, "Hilo · Apartment".

Unavailable cells get a muted version of the scene with a "Not available here" sign.

**Dev gallery**: `?dev=gallery2d` renders all 100 cells in a labeled grid, which is the visual check for tasks 13–14.

## 8. Seeds to provide (tasks 10–15)

- `plan-comfortable`: $4,200/mo net, $20,000 savings, a good mix of colors.
- `plan-tight`: $2,400/mo, $3,000 savings, mostly red and yellow.
- `plan-rich`: $12,000/mo, $250,000 savings, lots of cyan.
- `plan-after-denial`: an attempt marked denied, with fees already spent.
