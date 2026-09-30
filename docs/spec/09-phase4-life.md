# 09 — Phase 4: Life, one month at a time

The teacher's description (quoted in `99-original-request.md`) is the authority here: the 3D home is shown and
rotatable; a panel on the right says "Welcome to (month), (2033)." and asks how to spend time; a wellbeing stat
card; a waking-hours time budget drawn as a storage-style bar with a colored bracket and label; "Live this month" plays
an animation with a sun, a character that leaves and returns each day, and a random plant/animal care button; the
dashboard updates with lifestyle expenses and job income; and investing unlocks later.

## 1. Screen layout (`phases/life/lifeScreen.js`), targeting 1366×768

```
┌ header: title · stepper · save status · Portfolio · user ───────────────────────────────┐
│ money strip: Checking $ · Savings $ · Credit card $ · Investments $ (if any) · Net worth $ │
├──────────────────────────────────────────────────┬──────────────────────────────────────┤
│  3D home (rotate/zoom)          ┌─────────────┐  │  RIGHT PANEL (≈38%, min 380px)       │
│                                 │ Wellbeing   │  │  "Welcome to January, 2033."         │
│   calendar strip + day label    │ 5 bars      │  │  question 1 … 4 (+ home & garden)    │
│   during "Live this month"      └─────────────┘  │  time budget bar + bracket + note    │
│                                                  │  [investment block, once unlocked]   │
│                                                  │  [ Live this month ]                 │
└──────────────────────────────────────────────────┴──────────────────────────────────────┘
```
- The page never scrolls at 1366×768. The right panel scrolls inside itself if it has to.
- The wellbeing card is titled "Domains of personal wellbeing" and shows five labeled bars (0–100): **Physical health,
  Sense of purpose, Financial, Social fulfillment, Mental health**. Each bar shows its number and the last change (▲3 / ▼2).
- The 3D view has a hidden text description for screen readers ("A two-story plantation-style house in Hilo with a
  garden bed and three chickens").

## 2. Month state machine

`life.current.stage`: `welcome → plan → live → summary`, then the next month's `welcome`.
- **welcome**: "Welcome to February, 2033." plus a one-line recap of last month and any warnings ("You missed a rent
  payment. One more and you'll get a final notice."). A **Plan my month** button.
- **plan**: the questions (§3) and the time budget (§4). **Live this month** is enabled once all four core questions
  are answered. The previous month's answers are pre-selected.
- **live**: `planMonth()` has already run (at the end of plan). The animation plays (§9) and the care game runs
  inside it (§10). When it ends, `finalizeMonth()` runs.
- **summary**: results (§11), then **Continue to <next month>**.
- Each stage change saves a checkpoint. Reloading during `live` restarts that month's animation from day 1 with the
  same saved plan; care counts start over.

## 3. Questions (exact wording and options)

1. **"How much time do you want to spend on exercise each week this month?"**
   None (0 h) · A little (2 h) · Regular (4 h) · Training hard (7 h)
2. **"Do you want to pick up any extra work at your job for extra money?"**
   No extra work · A few shifts (8 h this month) · Busy month (16 h this month) · Maximum hustle (32 h this month).
   Each option shows the expected extra pay: `hours × hourlyNet × 1.5`.
3. **"How much time per week do you want to spend on socializing, family, and leisure?"**
   A little (3 h) · Some (7 h) · Plenty (12 h) · Lots (20 h). Each option shows a rough monthly cost (§6).
4. **"Can you commit 1 hour per day to something deep and timeless — like philosophy, religion, a spiritual practice,
   art, or writing?"**
   Yes, every day (7 h/week) · Most days (4 h/week) · Not this month (0 h)
5. *(Optional; shown when plants or animals are missing or the student has none)* **"Anything for your home and
   garden?"** Plant a garden bed or pots ($40) · Adopt a cat ($150, then $35/mo) · Get 3 chickens ($120, then
   $15/mo, needs a yard) · Not now. Options are filtered by home type (no chickens in an apartment).

Answers are big toggle buttons in groups (radio semantics, keyboard-accessible). Changing one updates the time budget right away.

## 4. Time budget (`life/timeBudget.js`, pure; `phases/life/timeBudgetView.js`)

`timeBudget(state, choices) → { waking: 112, segments: [{key, label, hours, color}], freeHours, rating: {key, label, color, mentalDelta, physicalDelta} }`

| Segment | Hours per week |
|---|---|
| Job | `player.weeklyJobHours` |
| Commute | `2 × commuteMinutesOneWay[homeType] × 5 ÷ 60` |
| Personal care & meals | 14 (config) |
| Chores & errands | 10 base (config); by home type: shared −2, apartment 0, condo 0, house +3, build +4; +1 per animal kind; +1 with garden beds; +0.5 for a walk-up; roommate traits ±1 |
| Exercise | choice |
| Extra work | monthly hours ÷ 4.33 |
| Social, family & leisure | choice |
| Deep practice | choice |
| **Free time left** | 112 − everything above |

**Free-time rating** (config `LIFE.freeTime`; the first match wins):

| Free hours | Label | Color | Mental | Other |
|---|---|---|---|---|
| < 0 | Overbooked — something has to give | red | −8 | physical −2 ("cutting into sleep") |
| < 5 | Burnout risk | red | −6 | |
| < 12 | Stretched thin | orange | −2 | |
| ≤ 30 | Balanced | green | +3 | |
| ≤ 40 | Restless | yellow | −1 | |
| > 40 | Adrift — too much empty time | orange | −4 | |

**The bar**:
- Above it: "**Waking hours per week available: 112**" and "Free time left: 25 h".
- One horizontal bar where 112 h is the full width, split into segments in the table's order, like the storage bar on
  a computer, with a legend and tooltips.
- A **colored bracket** spans the free-time segment, with a label in the rating's color: "Balanced: good for your mental health".
- When overbooked, a red striped overflow sticks out past the end of the bar ("−3 h").
- Everything updates live as answers change.
- **Footnote** under the bar: "*Real life is way more complicated than this — but it's true that balance is a virtue.*"

Check the numbers: 112 − 40 job − 5 commute − 14 care − 10 chores = 43 discretionary hours. The choices 4 / 0 / 7 / 7
leave 25 free (Balanced), choosing nothing leaves 43 (Adrift), and choosing the maximum of everything overbooks.
Keep the defaults tuned so those three outcomes still hold.

## 5. Simulation contract (pure; `life/planMonth.js`, `life/finalizeMonth.js`)

```js
planMonth(state, choices) → {
  monthIndex, days,                                  // real 2033+ calendar
  hours,                                             // timeBudget(state, choices)
  income: { paycheckCents, overtimeCents },
  events: [ { day, id, label, message, category, amountCents,        // − cost / + income
              insured?: { lossCents, deductibleCents, insurerPaysCents }, wellbeing?: { domain: delta } } ],
  market: { low?: number[], medium?: number[], high?: number[] } | null,   // daily multipliers, index 0 = 1.0, length days+1
  care: { needed: boolean, count, schedule: [ { day, fraction } ] },     // fraction = position in the animation 0..1
}
finalizeMonth(state, plan, choices, { careShown, careHits }) → { state, result }
```

`result` has these fields:
- `incomeCents`, `expenseCents`, `byCategory`;
- `events`;
- `card` (`statementCents`, `paidCents`, `interestCents`, `carried`);
- `loanPayments` (`interestCents`, `principalCents`, `balanceCents`);
- `missed[]`, `warnings[]`, `evicted`;
- `savingsDeltaCents`, `cashAfterCents`, `netWorthCents`;
- `creditBefore`, `creditAfter`;
- `wellbeingBefore`, `wellbeingAfter`, `deltas: [{domain, delta, reason}]`;
- `careRate`, `plantsSurvived`, `animalsStayed`;
- `investment` (`startCents`, `endCents`, `pct`).

Both functions are deterministic. Randomness comes from `seedFor(meta.seed, 'month', monthIndex, stream)`.
`planMonth` fixes everything random ahead of time (events, the market path, the care schedule), so what the animation
shows is exactly what `finalizeMonth` charges.

## 6. Money rules

- **Hourly net** = `netMonthly ÷ (weeklyJobHours × 52 ÷ 12)`. **Overtime** = extra hours × hourly × 1.5.
- **Income**: the paycheck is shown as two halves (day 1 and day 15); overtime is paid on the last day. It all goes to checking.
- **Expenses**:
  - everything in `finances.recurring`: housing payment, HOA, insurance, utilities, internet, phone, groceries, transport,
    special assessments, pet costs;
  - seasonal utilities: in `heatMonths` add `heatExtraCents × typeFactor`, in `coolMonths` add `coolExtraCents × typeFactor`;
    solar cuts utilities by 40%, and catchment saves ~$40 of water but costs $20 in filters;
  - **lifestyle** from the answers: exercise ≥ 4 h adds `gymMonthlyCents` (0–2 h is free: walking, running, beach);
    social hours × 4.33 × `socialHourCents` × 0.5 (not every hour costs money); deep practice 4 h → $10, 7 h → $20
    (books, supplies, a class); pets: cat $35, dog $60, chickens $15; garden $10;
  - the plan's events.
- **Loans**: every month, interest = balance × rate ÷ 12, principal = payment − interest, and the balance goes down.
  PMI drops off once the balance is ≤ 78% of the original price.
- **Credit card**:
  - statement = carried balance + new charges;
  - interest = carried balance × APR ÷ 12 if last month's statement wasn't paid in full;
  - autopay pays the full statement or the minimum (the greater of $25 or 1% plus interest), taken from checking.
- **Payment order at month end**:
  1. Income goes to checking.
  2. Pay housing first, then utilities and insurance, then debts, then living costs, then lifestyle, then events.
  3. When checking would go below $0, move money from savings.
  4. When savings is empty, event, living and lifestyle costs go on the credit card if there's room.
     **Housing can't go on the card.**
  5. Anything still unpaid is a **missed payment**.
  6. Sweep: checking above `LIFE.checkingBufferCents` ($1,000) moves to savings.
- **Missed payments**:
  - late fees: housing 5% of the payment, card $30, utilities $15;
  - credit −60 each (the score can't go below 300);
  - `lateHousingStreak` +1 for a missed housing payment. A month with every payment on time resets it to 0.
  - Streak 2 → **Final notice** warning (in the summary and the next welcome).
  - Streak 3 → **eviction** (renters) or **foreclosure** (owners). The home is lost (owners lose their equity), housing
    items are removed from recurring, loans are closed with credit −150, and `plan.attempts` gets outcome `evicted`.
    Then `phase = 'plan'` with a kind but clear explanation, and the student picks a new home with whatever cash is left.
- **Credit score each month**:
  - all payments on time: +3 (+1 above 750, max 850);
  - card utilization > 30%: −10, > 60%: −25;
  - each missed payment: −60;
  - each hard inquiry older than 12 months: +5 back.

## 7. Events (`life/events.js`, data + pure picker)

Each event:
```js
{ id, label, message, category, chance,
  when: { months, regions, locations, homeKinds, hazards, transport, settlement, minSocial },
  amount: [minCents, maxCents] | income: [minCents, maxCents], insured?: 'property'|'belongings', wellbeing?: {…} }
```
Pick **at most 3 random events per month**, plus any scheduled ones (missed inspection findings, contractor defects).
Seeded. Suggested set (tune in config):

| id | Who / when | Chance/mo | Cost |
|---|---|---|---|
| car-repair | car-dependent places | 7% | $300–900 |
| flat-tire | car | 5% | $120–200 |
| lost-transit-pass | transit places | 3% | $50–130 |
| medical-copay | all | 6% | $80–400 |
| dentist | all | 4% | $150–350 |
| phone-screen | all | 4% | $150–300 |
| appliance-broke | owners pay $250–900; **renters: "the landlord fixed it for free"** | 7% | owner only |
| plumbing | owners | 3% | $300–1,200 |
| roof-leak | house/build (×3 with the "old roof" quirk) | 2% | $800–2,500 |
| termites | Hawaiʻi owners | 2% | $600–1,800 |
| surprise-repair | scheduled from missed inspection findings | — | finding cost |
| contractor-defect | build with contractor A, scheduled in months 1–6 | — | $1,000–4,000 |
| holidays | November 30%, December 100% | — | $100–450 gifts |
| friends-birthday | all (×2 if social ≥ 12) | 8% | $40–120 |
| family-trip | June–August (a family visit) | 4% | $400–1,200 |
| wedding-travel | social ≥ 7 | 3% | $300–900 |
| hurricane-prep | HI/FL/TX in hurricane months | 10% | $80–200 |
| hurricane-damage | HI/FL/TX in hurricane months | 1.5% | insured loss: property $5k–25k (owners) or belongings $1.5k–5k (renters). You pay the deductible, or the whole loss if uninsured (capped at $8k for gameplay) |
| flood | locations with flood hazard | 1% | insured as above, if flood coverage was bought |
| heating-spike | snow months | 40% | $60–200 |
| snow-tow | snow months, car | 5% | $100–250 |
| vog-day | pahoa, kailua-kona | 10% | $0; mental −1 |
| civil-defense-drill | pahoa | 1% | $0; mental −1 (a practice alert, never scary) |
| wildfire-smoke | yellow-pine, bisbee, valentine, waimea, July–September | 10% | $0; physical −1, mental −1 |
| break-in | big cities | 1.5% | belongings loss $500–2,000 (insured above the deductible) |
| kitchen-fire | all | 0.5% | loss $2,000–6,000 (insured) |
| work-bonus | all | 5% | +$200–600 |
| tax-refund | April | 60% | +$300–900 |
| neighbor-gift | Hawaiʻi | 5% | groceries −$40 and social +1 ("Your neighbor dropped off fish and ʻulu") |
| community-cleanup | all | 4% | $0; purpose +1 (mālama ʻāina) |

## 8. Wellbeing (`life/wellbeing.js`, pure)

Each domain starts at 60. Every month: add the deltas, then **pull 5% toward 50** (so extremes fade without upkeep),
clamp to 0–100 and round. Every delta carries a reason string for the summary. Numbers live in config.

| Domain | Deltas |
|---|---|
| **Physical** | exercise 0 → −4, 2 → +1, 4 → +3, 7 → +5 · gym or nature access ≥ 4 with exercise ≥ 2 → +1 · commute ≥ 7.5 h/wk → −1 · extra work 32 h → −2 · overbooked → −2 · garden kept alive → +1 · walk-up stairs → +1 · smoke events → −1 |
| **Purpose** | deep practice 0 → −2, 4 → +3, 7 → +5 · plants/animals cared for → +1, lost → −1 · extra work 32 h → −1 · community event → +1 |
| **Financial** | share of income saved ≥ 20% → +4, ≥ 10% → +3, > 0 → +1, < 0 → −3, < −20% → −6 · savings ≥ 3 months of expenses → +2 · carried card balance → −3 · each missed payment → −10 · investments up > 2% → +1, high-risk drop > 5% → −2 |
| **Social** | social 3 → −3, 7 → +1, 12 → +3, 20 → +4 · shared living → +1 (plus roommate traits) · rural settlement → −1 · extra work ≥ 16 → −1, 32 → −2 · neighbor gift → +1 |
| **Mental** | free-time rating (§4) · home noise ≥ 4 → −1 · nature access ≥ 4 or a nature view → +1 · financial < 35 → −3 ("money stress") · pets present → +1 · plants or animals lost → −2 · deep practice 7 → +1 · vog/smoke → −1 |

## 9. "Live this month" animation (`phases/life/animation.js`)

- Each day lasts `LIFE.dayMs` (1,200 ms) at 1×, so a month is about 36 s. Controls: 1× / 2× / 4× and Pause.
  `?speed=` overrides this for tests.
- For each day, `scene.setTimeOfDay(t)` runs t from 0 to 1. The sky, sun, shadows and window glow follow it.
- **Weekdays**: at t ≈ 0.30 the character walks out the door along `path` to `exit` and disappears; at t ≈ 0.72 they
  come back and go inside.
- **Weekends**: the character stays home (garden, porch, lānai). If social ≥ 7 they go out in the afternoon (0.55 → 0.85).
- A calendar strip and a day label ("Tue, January 14") sit over the 3D view. On an event's day a toast appears
  ("Car repair −$450").
- If the student holds investments, the money strip's investment figure moves each day along the precomputed market path
  (tweened), with a small sparkline (`10-investments.md`).
- Plants sway, animals idle, and the season is applied from the month.
- **Reduced motion** (setting or `prefers-reduced-motion`): no camera or sun motion. Instead a calendar grid fills in one
  day at a time (~0.3 s/day), with the same events, care buttons and investment ticks.
- At the end, run `finalizeMonth` and move to the summary.

## 10. Care minigame (`phases/life/careButton.js`)

- It's only active when the home has plants or animals. With neither, the summary tip says "Plants and pets make a home
  feel alive, and they're good for your mental health."
- **Appearances**: `LIFE.careAppearances` (8) times per month, at the scheduled moments. The button reads exactly
  **"Click here to water your plants and feed your animals!"** and pops up at a seeded random spot over the 3D view
  (not under the panels). Each stays visible for `LIFE.careWindowMs` (2,500 ms) of **real time**, or 5,000 ms with the
  "longer care window" setting, whatever the animation speed. If the speed changes, the remaining schedule is re-timed.
- Big target (≥ 48 px) that can be focused. When it appears, a polite live-region announcement plays and pressing
  **W** also counts. A hit gives a small splash animation.
- `careRate = hits ÷ shown`. **≥ 0.5 → everything survives. Below 0.5 → plants wilt** (they stay visible but brown; no garden
  bonus until replanted) and **animals go to live with a neighbor** ("Your chickens went to live with Auntie Noe
  next door, who has more time for them. You can adopt again when you're ready.").
  - Update `home.plants[].alive` and `home.animals[].present`, and show it in 3D.
- `?care=hit|miss|half` resolves the game automatically for tests.

## 11. Month summary & year in review (`phases/life/summary.js`, `yearReview.js`)

- **Summary** "January 2033 — how it went":
  - **Money**: income (paycheck and overtime), then expenses by category (housing, utilities, food, transportation,
    lifestyle, events, debt payments), net for the month, and the savings change. A simple horizontal bar compares
    income with expenses.
  - The card statement, any missed payments and warnings, loan progress (principal paid and balance), and the credit score change.
  - Events.
  - **Wellbeing**: before → after for each domain, with reason chips (+3 "You exercised 4 h/week").
  - The plants & animals result, the investment change (if any), and a rotating tip from `content/tips.js`.
  - Then **Continue to February**.
- **Year in review**, after every December (month 11, 23, …):
  - totals for the year, net worth at the start and now, best and worst month, and a wellbeing trend sparkline for each
    domain;
  - an optional reflection box ("What would you do differently next year?"), saved to `life.reflections` for the teacher.

## 12. Seeds

- `life-month1-apartment` (Hilo)
- `life-month1-shared` (Honolulu)
- `life-month1-condo` (Miami)
- `life-month1-house` (Katy, garden + coop + cat)
- `life-month1-build` (Pāhoa, blueprint home)
- `life-plan-filled` (answers chosen)
- `life-summary` (a finished month)
- `life-overdue` (2 missed housing payments)
- `life-invest` (month 8, investing unlocked with holdings)
- `life-year-review` (just finished December)
