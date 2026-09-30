# 05 — Phase 2: Paperwork

The teacher: "At this phase, it's all paperwork… The student will have to complete paperwork by literally filling
out generated forms that they complete in-browser… Include an offer for a credit card… a portfolio of their
agreements, their bank accounts/loan accounts, and automatic expenses are all being tracked. If a student fails to
secure the loans necessary for their chosen home style, they are brought back to the previous stage."

Teaching goals:
- landlords and lenders check income, credit and savings;
- fees are real and sometimes can't be refunded;
- read before you sign (lease traps, closing-disclosure errors);
- insurance trades premium against deductible;
- loans cost interest over time;
- credit cards help or hurt depending on how you use them.

## 1. Screen (`phases/paperwork/paperworkScreen.js`)

- On the left, a **checklist** of this attempt's steps (from `flow.js`). Each shows a status icon:
  locked, to do, draft, done, or skipped.
- On the right, the **active step**. The header's Portfolio button stays available.
- Steps unlock in order, though the letter steps can be done any time after their prerequisites.
- The final step, **Results**, unlocks when every other applicable step is done.
- A "Choose a different home" link sits under the checklist. It asks for confirmation, then records the attempt as
  `withdrawn` (fees already paid stay spent) and returns to Plan.
- Game date for every document: **December 2032** (the move-in date is January 1, 2033).
- Forms are pre-filled from state where it makes sense: character name, job title, income, balances.

## 2. Step contract (`phases/paperwork/steps/<id>.js`)

```js
export default {
  id: 'rental-application',
  title: 'Rental application',
  kind: 'form',                         // form | letter | choice | payment | offer | review
  appliesTo: (state) => true,           // filters the list per home type and situation
  requires: [],                         // step ids that must be done first
  upfrontKey: 'applicationFee',         // optional: which cost line this step pays on completion (sunk fee)
  schema: (state) => FormSchema,        // kind 'form' → rendered by forms/engine.js
  mount: (container, ctx) => unmount,   // other kinds (custom UI); ctx has store, config, onDone(values)
  complete: (state, values) => state,   // PURE: store values, options, fees, applications, agreement drafts
}
```

- `flow.js` exports `STEP_ORDER` (per home type), `stepsFor(state)`, `stepStatus(state, id)`,
  `nextStep(state)` and `allDone(state)`.
- **Fees** paid during steps (application, inspection, appraisal, permit) are charged right away through `finance/ledger.js`.
  The matching upfront line is marked paid, and results only charge the unpaid lines.

## 3. Steps per home type

| # | apartment | shared | condo | house | build |
|---|---|---|---|---|---|
| 1 | rental-application ($50) | room-application ($25) | mortgage-application | mortgage-application | land-purchase |
| 2 | letter: rental-cover | letter: roommate-intro | loan-options | loan-options | construction-loan-application |
| 3 | letter: cosigner-request* | letter: cosigner-request* | letter: loan-purpose | letter: loan-purpose | letter: construction-purpose |
| 4 | renters-insurance | renters-insurance | letter: credit-explanation† | letter: credit-explanation† | letter: credit-explanation† |
| 5 | lease | roommate-agreement | hoa-review | home-inspection ($) | contractor-bids |
| 6 | move-in-payment | lease (room variant) | home-inspection ($) | appraisal ($600) | building-permit ($) |
| 7 | credit-card-offer | move-in-payment | appraisal ($600) | home-insurance | site-utilities |
| 8 | results | credit-card-offer | condo-insurance | closing-disclosure | home-insurance |
| 9 | | results | closing-disclosure | credit-card-offer | credit-card-offer |
| 10 | | | credit-card-offer | results | results |
| 11 | | | results | | |

\* only if net income < 2.5 × rent (or room rent). † only if the credit score < 660.

## 4. Documents (what each step asks and teaches)

Every signature is the character name typed exactly, plus the auto-filled game date. Initials are auto-derived
from the character name. Any phone number uses the fictional 555-01xx range. There are **no SSN fields**: a masked
"Game ID •••-••-4821" is shown read-only instead.

- **rental-application / room-application**:
  - Fields: name; current living situation (select); move-in month; employer (text); job title; monthly net income
    (read-only); time at job (select); rental history (first place / rented before); two references (made-up name +
    relationship + phone); pets (none/cat/dog); smoking (y/n); background and credit check authorization (checkbox);
    signature.
  - Completion: an application is recorded as `pending`, and the non-refundable fee is charged.
  - Teaching: landlords usually want income of about 3× the rent.
- **lease** (apartment) / **lease: room variant** (shared):
  - The lease shows the fictional landlord, "Unit to be chosen in Phase 3", rent, deposit, a 12-month term and a
    start date of January 1, 2033.
  - It has ten clauses, each needing initials:
    1. automatic renewal unless you give 60 days' written notice;
    2. rent due on the 1st, $75 late after the 5th plus $10/day;
    3. the landlord may keep the deposit for "normal wear and tear" (**a trap**: in Hawaiʻi and most states, normal wear
       and tear can't be taken out of a deposit);
    4. tenant pays the first $100 of any repair;
    5. guests limited to 14 nights per 6 months;
    6. pets only with written permission, $300 fee + $35/month;
    7. breaking the lease costs 2 months' rent;
    8. landlord entry with 2 days' notice except emergencies;
    9. renters insurance required;
    10. quiet hours 10 pm–7 am.
  - Three **"find the trap"** questions (multiple choice):
    - Which clause could cost you money if you forget a date? (renewal)
    - Which clause probably isn't allowed? (wear and tear)
    - If rent arrives on the 8th, what's the late fee? (computed: $75 + 3 × $10)
  - A wrong answer shows an explanation and a retry. Score = correct on the first try, stored as feedback only.
  - The room variant has 8 clauses and the same kind of questions.
- **roommate-agreement**:
  - Fields: chores system; quiet hours; overnight guests per week; shared groceries; how bills are split; AC/thermostat
    rule (text); conflict plan (radio: talk within 24 hours / weekly house meeting / **hoʻoponopono-style talk:
    acknowledge, take responsibility, forgive, release**); pets; signatures.
  - Its values also set the roommates' comfort with the student, a small bonus in the roommates decision (±5%).
- **move-in-payment**: authorization for the deposit plus first month, drawn from savings. A checkbox confirms "charged only if
  approved".
- **mortgage-application** (a simplified Uniform Residential Loan Application):
  - Sections:
    - borrower (name, masked game ID);
    - employment (employer, title, years, monthly net income, and the **estimated gross** = net ÷ `FINANCE.netToGross`,
      with the note "Lenders use gross income, before taxes");
    - assets (balances, read-only);
    - liabilities (none so far);
    - property (from the chosen cell);
    - declarations ("I will live in this home": must be yes);
    - credit check authorization and signature.
  - Completion: records a hard credit inquiry (score −5, config) and a `pending` application.
- **loan-options** (choice):
  - A live comparison table of down payment × term:
    - down payment: 3.5% FHA, 5%, 10% or 20%;
    - term: 15 or 30 years.
  - Each option shows: down payment, loan amount, monthly principal & interest, PMI or FHA MIP, total monthly
    housing, total interest over the life of the loan, and cash to close (down + closing + remaining fees + 2 months' reserves).
  - Options the student can't cover are disabled, with the reason.
  - FHA (simplified): needs credit ≥ 580, adds a 1.75% upfront MIP to the loan and 0.55%/yr MIP.
  - Where `ownership.lavaZone` is 1–2: FHA is unavailable ("FHA won't insure homes in Lava Zones 1–2") and
    conventional loans need 20% down.
  - Stores `paperwork.options.{program, downPaymentPct, termYears}`.
- **hoa-review** (condo):
  - A summary of the HOA documents: dues and what they cover (building insurance, maintenance, trash, maybe water),
    reserve fund (seeded: healthy ~70% funded or low ~25%), special-assessment history, and rules (pets, rentals,
    noise, parking).
  - Special assessments are seeded, with the chance weighted by location. Miami's is high because of post-2021
    building-safety repairs. A pending assessment adds a monthly charge (e.g. $250/mo for 60 months) that counts
    as housing cost in underwriting.
  - Three comprehension questions, an acknowledgment and a signature.
- **home-inspection**:
  - Pick an inspector:
    - Budget: $300, quick walk-through, 2.8★;
    - Standard: $500, full report, 4.6★;
    - Thorough: $750, adds termite + sewer scope, 4.9★.
  - Seeded findings: 3–6 items, each minor, moderate or major, with a repair estimate. Termites are common in
    Hawaiʻi, roofs in hurricane zones, and so on.
  - Cheaper inspectors **miss** some findings. Each miss becomes a scheduled "surprise repair" event in life months 2–8.
  - The student then chooses one of three options:
    1. request a repair credit: acceptance probability by severity, and an accepted credit lowers cash to close;
    2. accept as-is;
    3. walk away: the attempt is withdrawn, fees stay spent, back to Plan.
- **appraisal**:
  - $600 fee. Seeded appraised value = price × 0.96–1.03.
  - If it comes in below the price, the student chooses:
    - pay the gap in cash (if affordable);
    - ask the seller to lower the price (50%, seeded);
    - walk away.
- **closing-disclosure** (review and sign):
  - A simplified Closing Disclosure: loan amount, rate, monthly principal & interest, PMI/MIP, escrow (tax + insurance),
    cash to close, no prepayment penalty, no balloon.
  - **One number is deliberately wrong**: the rate is 0.25 points higher than agreed. "Flag an error" fixes it.
    Signing without flagging it keeps the higher rate, and the results say so.
  - Teaching: always check your closing documents.
- **land-purchase** (build):
  - The lot listing, built from the location's build record plus seeded variation: acres, zoning, lava zone (Pāhoa: 1–2),
    flood zone, water (county/catchment/well), power (grid distance), sewer (septic required for new homes where there's
    no sewer; new cesspools aren't allowed in Hawaiʻi), and road access.
  - Terms: price, $1,000 earnest money, and a **financing contingency** checkbox, recommended and on by default.
    With the contingency, earnest money is refunded if the loan is denied. Unchecking it means the money is lost on denial.
  - Signature.
- **construction-loan-application**:
  - Simplified loan application plus a **budget tier**: Tiny 600 sq ft, Cozy 1,000 or Family 1,600.
  - Shows project cost, down payment (20%), monthly payment after completion, and cash needed. Stores `options.buildTier`.
  - **Design budget** = tier sq ft × local cost per sq ft × 1.10.
  - Records a hard credit inquiry.
- **contractor-bids**:
  - Three fictional bids for the chosen tier:
    - A: −8% price, 14 months, 3.1★, no warranty;
    - B: ±0%, 9 months, 4.5★, 1-year warranty;
    - C: +10% (uses the contingency), 8 months, 4.9★, 2-year warranty.
  - Choosing A adds seeded risk: extra months of temporary housing and a defect event in life months 1–6. The
    lender also docks it slightly (§7).
  - Stores `options.contractorId`. Teaching: the cheapest bid isn't always the best.
- **building-permit**:
  - County checklist: site plan, septic approval, setbacks, energy code (**Hawaiʻi requires a solar water heater on new
    single-family homes**), and catchment tank approval if there's no county water.
  - The permit fee is charged, and the upfront "permits" line is marked paid.
- **site-utilities** (choice):
  - Water: county hookup / catchment 10,000 gal / well, whichever the location supports.
  - Power: grid / grid + rooftop solar / off-grid solar + batteries.
  - Sewer: septic / county sewer.
  - Each option shows its cost and monthly effect: catchment has no water bill but ~$20/mo for filters/UV; solar
    cuts the electric bill ~60%.
  - Upgrades beyond the base site work come out of the design budget. The choices pre-fill blueprint yard features
    and change Phase 4 utilities.

## 5. Insurance shopping (`renters-insurance`, `condo-insurance`, `home-insurance`)

`finance/insurance.js` (pure) builds three quotes from the location data:

| Quote | Premium | Deductible (home / renters) | Coverage |
|---|---|---|---|
| Basic | base × 0.8 | $2,500 / $1,000 | actual cash value, $100k liability |
| Standard | base × 1.0 | $1,000 / $500 | replacement cost, $300k liability |
| Premium | base × 1.3 | $500 / $250 | replacement cost + valuables, water backup, $500k liability |

- **Base premium**: renters → `rentersInsuranceMonthlyCents`; condo → `condoInsuranceAnnualCents`; house/build →
  `homeInsuranceAnnualCents`, scaled to the value as in `04` §3.
- **Hazard add-ons** come from `ownership.hazardCoverage`. Items with `requiredForMortgage` are pre-checked and locked for
  buyers and builders. Examples:
  - flood in a high-risk zone;
  - hurricane coverage in Hawaiʻi, which is often separate;
  - lava coverage for Lava Zones 1–2. That comes only from **HPIA**, shown as "the only company that will insure here".
  - Florida quotes note a separate hurricane deductible of 2–5% of the dwelling.
  - Earthquake is optional in Seattle, Honolulu and Homer. Wildfire policies in Yellow Pine are scarce and pricey.
- A mini calculator: "If a $3,000 loss happens, you pay $X (your deductible) and insurance pays $Y."
- Renters insurance is required by the lease. Buyers can't close without insurance.
- The choice becomes a recurring expense plus a policy agreement. The deductible matters later, because insured-loss
  events in Phase 4 charge the deductible (`09` §7).

## 6. Credit card offer (`credit-card-offer`)

- Required explanation (student-facing): "A credit card can help you build credit and cover expenses if you ever have a burst of
  spending, like car repairs, a vacation, or the holidays. If you pay the full balance every month, you pay no interest.
  If you carry a balance, interest adds up fast."
- **Terms** by credit score (config):

  | Credit score | Card | Limit | APR |
  |---|---|---|---|
  | ≥ 700 | regular | $1,500 | 22.99% |
  | 640–699 | regular | $1,000 | 25.99% |
  | < 640 | secured | $300 | 27.99% |

  - A secured card needs a $300 deposit from savings, refunded if the card is closed.
  - All cards: $0 annual fee, 25-day grace period, late fee $30, minimum payment = the greater of $25 or 1% of the
    balance + that month's interest.
- **Schumer box**: the standard disclosure table (APR, penalty APR 29.99%, grace period, fees).
- Plus a worked example: "$1,000 paid at the $25 minimum takes N months and costs $M in interest", computed with `finance/creditCard.js`.
- **Accept**: read the terms, choose autopay (full balance, the recommended default, or minimum), sign. This records a
  hard inquiry, and the card opens at results if approved (§7). **Decline**: noted in the portfolio. The offer is one-time.

## 7. Underwriting & decisions (`finance/underwriting.js`, pure)

Constants live in `config.UNDERWRITING`, and every decision records its factors so the results can explain it.

- `letterFactor(L) = 0.55 + 0.45 × L`, where `L` = letter likelihood ÷ 100. If a step needs two letters, `L` is their average.
- `gross = net ÷ FINANCE.netToGross` (0.76).

**Lease (apartment)**:
- ratio = income ÷ rent.
- Hard fail: ratio < 1.5.
- f = 1.0 if ratio ≥ 3; 0.85 if ≥ 2.5. Below 2.5, a co-signer is required: f = 0.75 if the co-signer agrees, otherwise
  denied ("Your income is less than 2.5× the rent and you don't have a co-signer").
- Credit factor: ≥ 650 → 1.0; 600–649 → 0.9; < 600 → 0.75.
- p = f × credit × letterFactor(rental-cover).

**Co-signer**: p = 0.35 + 0.6 × L(cosigner-request).

**Roommates (shared)**: p = (ratio ≥ 2.5 ? 1 : 0.8) × (0.5 + 0.5 × L(roommate-intro)) × (1 ± roommate-agreement bonus).

**Mortgage (condo, house)**:
- housing = principal & interest + tax + insurance + PMI/MIP + HOA + special assessment.
- front = housing ÷ gross; back = (housing + other monthly debts) ÷ gross.
- **Hard fails**:
  - back > 0.50;
  - credit < 580;
  - program not allowed (FHA with credit < 580 or in Lava Zones 1–2; conventional with credit < 620);
  - cash < cash needed to close;
  - Lava Zones 1–2 with less than 20% down.
- f = 1.0 if back ≤ 0.36; 0.85 if ≤ 0.43; 0.55 if ≤ 0.50.
- Reserves: cash after closing < 2 × housing → × 0.8.
- Credit: ≥ 740 → 1.0 and rate −0.25; 680–739 → 1.0; 620–679 → 0.9 and rate +0.375; 580–619 (FHA only) → 0.8 and rate +0.5.
- p = f × reserves × credit × letterFactor(loan-purpose [+ credit-explanation]).

**Construction (build)**:
- Hard fails: credit < 680; back > 0.45; down payment < 20%; no contractor; no permit.
- f = 1.0 if back ≤ 0.36; 0.8 if ≤ 0.43; 0.5 if ≤ 0.45.
- Contractor A → × 0.9 ("The bank is nervous about your contractor's reviews").
- p = f × credit × letterFactor(construction-purpose [+ credit-explanation]).

**Credit card**: approved if credit ≥ 600 on the tiers in §6. Below that, it becomes the secured card, which is always approved.

**The draw**: `u = rng(seedFor(meta.seed, 'decision', kind, attemptIndex))`, with `attemptIndex = plan.attempts.length`.
Approved when `u < p`. Reloading can't change it; a new attempt gets a new draw.

**Decision record**: `{ id, kind, approved, probability, draw, factors: [{label, value, note}], reasons: [..], terms: {rate, termMonths, principalCents, paymentCents, …} }`.

## 8. Results (`phases/paperwork/results.js`) and commit (`paperwork/commit.js`, pure)

**Results screen**, one card per decision:
- approved/denied, with "Approval chance 86%" and its factors ("Finances ×0.85 · Letter ×0.92 · Credit ×1.0");
- the letter rating: band plus the "How your letter was scored" report from `ui/letterReport.js`;
- money you receive: loan principal (paid to the seller or builder for you) or credit line;
- cash you pay now, itemized;
- what you owe each month, itemized, with a total;
- loan summary: rate, term, total of all payments, total interest;
- the insurance you bought and its deductible;
- credit card terms;
- **"If you don't pay…"** consequences:
  - rent: late fee, a notice after 5 days, eviction after repeated missed months, credit damage of −60 to −100 points;
  - mortgage: 5% late fee after 15 days, credit damage at 30 days, foreclosure possible after 120 days (you lose the
    home and your down payment);
  - credit card: late fee, penalty APR, credit damage, and how long minimum payments take.
  - In the game, **3 missed housing payments in a row = eviction/foreclosure** (`09` §6).

**Commit** (runs when the student clicks Continue):
- **All required decisions approved**:
  - charge the unpaid upfront lines from savings (transactions in month −1);
  - open the loans;
  - add recurring expenses: housing payment, HOA, insurance, utilities, and the location's living costs (groceries,
    transport, phone, internet, category `living`);
  - set agreements to `active`;
  - open the card if it was accepted and approved;
  - resolve applications;
  - push `plan.attempts` with outcome `approved`;
  - set `home = {kind, locationId, styleFamily, label: 'To be chosen', plants: [], animals: []}`, then `phase = 'design'`;
  - checkpoint `paperwork-committed`.
- **Any required decision denied**:
  - set agreements to `void`;
  - deny applications, with reasons;
  - refund earnest money if the financing contingency was kept;
  - push the attempt with outcome `denied` and its reasons;
  - `choice = null`, reset `paperwork` (letters are kept in `letters`), `phase = 'plan'`;
  - checkpoint `paperwork-denied`.
  - The results screen shows everything first, with one button: "Back to planning".
- The credit card is separate: if accepted and approved, it opens even when the home is denied.

## 9. Portfolio during Phase 2

Applications show up as `pending` as soon as they're submitted, and fees as transactions right away. Signed documents appear
as "pending approval" agreements, openable read-only. An accepted card offer shows "pending approval". Nothing
counts as a debt until commit.

## 10. Fictional names (`content/names.js`)

Landlords, property managers, lenders, inspectors, contractors, insurers, HOAs and roommates are all fictional. Use
region-flavored names (e.g. "Kīpuka Property Management", "Evergreen Home Loans"), picked with the seeded RNG. Don't use
names of real businesses. If a name sounds like a real, well-known local company, pick another. HPIA is the one real
organization named, and only in explanatory text, because it genuinely is the lava-zone insurer of last resort.

## 11. Seeds (tasks 19–31)

- `paperwork-apartment-start` (Hilo)
- `paperwork-apartment-cosigner` (income < 2.5 × rent)
- `paperwork-shared-start` (Honolulu)
- `paperwork-condo-start` (Miami)
- `paperwork-house-start` (Katy)
- `paperwork-build-start` (Pāhoa)
- `paperwork-ready-<type>` (every step done, results next) for each type
- `results-approved-house`
- `results-denied-apartment`
