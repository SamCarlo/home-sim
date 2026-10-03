# 99 — The teacher's original request (verbatim) and the requirement checklist

## 1. Original request (2026-09-27), unedited

```text
 Add a task to this agent's folder. The task is to create a home/lifestyle simulator that allows the user to spend money from a bank (user-entered amount, for now) to pay for rent or mortgage on a house, condo, or apartment. The totoal price of each will depend
  on which area they choose to live in (give 20 real examples of cities / towns they could live in that are realistic, including Hilo, Kona, Honololu, Seattle, New York, Yellow Pine Idaho, a suburb in Texas, miami-dade, somehwere in canada, and others that you
  will think of yourself that include small towns and rural areas that I don't know about. But you definitely have to include Pahoa, Hilo, Honolulu, Waimea, and Kona.

  For each area to choose living in, that area will modulate the costs of land, building, and or rent.

  The first phase of the game is to plan. Students enter their monthly income based on their job (which is assigned in class--don't worry about representing that part, just have a plac e for them to put their net monthly income in this phase). Students will also
  enter their total amount of savings at that same start page. After entering that data, Then students are shown a spreadsheet of towns and home styles (apartment, condo, shared living situation, purchasing a house, building a house) and their monthly costs in the
  first year. If their savings+monthly income can't afford the up front and monthly price of a given cell (location X home type), then the upfront cost and mothly rent of that cell is shown in red. Otherwise, it's shown in green if they can afford. OR, if they
  would be paying more than 1/3rd of their total monthly income on their home, show the option in yellow. OR, if a living situation is well below their means (say, 1/5th the cost of their monthly income), then that option is shown in cyan. Each cell of this table
  is clickable, and when clicked, expands to show a 2D preview image of that living situation in that loction with a cost breakdown and a few lifestyle metrics (e.g. school quality in this area, public transportation, avg distance to a movie theater/ concert hall,
  noise level, Garden/Farming potential, Garage/Workshop space, access to gym/swim/running, access to nature, average age of neighbors.)

  The next phase is for the student to choose one and sign an agreement with the bank or landlord. At this phase, it's all paperwork. If the player has to take out a loan, pay for a home inspection, shop for renter's insurance, etc, they will do that at this
  phase. The student will have to complete paperwork by literally filling out generated forms that they complete in-browser/in-game. IF they need to write a letter for anything (e.g. statement of purpose for a loan, letter to their parents to ask them to be a
  co-signer on an apartment, etc.), they will be asked to write that letter in a box. Once they hit send, the text gets read by a non-LLM ML algorithm and basic grammar/spell check library that rates their likelihood of being approved through sentiment analysis
  and grammar/spell check. Their rating is given to them at the end of this phase, as well as the result of their paperwork (how much money they will recieve, how much they have to pay back each month, consequences for not paying, etc.). Include an offer for a
  credit card in this phase as well, with an explanation that it will help them build their credit and cover expenses if they ever experience a burst of spending activity (repairs, vacations, holidays etc.).

  As the student is completing all of this stuff, a portfolio of their agreements, their bank accounts/loan accounts, and automatic expenses are all being tracked.

  If a student fails to secure the loans necessary for their chosen home style, they are brought back to the previous stage of the game.

  The third stage of the game is designing their house, based on the type of home they chose. If they chose to build their own house, the player will be given a lot of design tools to create a blueprint on a UI that previews the results of their choices. If the
  student chose to move into an apartment, they basically just get to choose which building and floor they live in from a set of procedurally created 3d models that match the styles of the town/city they chose in the early phase of the game.

  The next stage of the game is the longest lasting. The student lives one month at a time, all while their home is being displayed in 3d in an interactive display(rotatable). A choice and dialogue panel appears on the right of the screen, saying "Welcome to
  (month), (2033)." It will ask them a series of questions about how they want to plan their time for that month. A "domains of personal wellbeing" stat card is shown somewhere on screen, which includes physical health, sense of purpose / connection to higher
  values, financial data, social fulfilment, mental health.
  They answer these questions about how they will budget their time. A time budget updates each time they select new options, e.g. "waking hours per week available: ___"
  -How much time do you want to spend on exercise each week for this month? (show them buttons as options. 3-4 options).
  -Do you want to pick up any extra work at your job for extra money? (3-4 options for how long to spend across the whole month doing extra work)
  -How much time per week do you want to spend on socializing, family, and leisure? 3-4 options.
  -Can you commit 1 hour per day on a deep and timeless  (e.g. philosophy, religion, spiritual practice, art, writing)?

  As they select options in this dialogue panel, the waking hours per week available is displaying a number and a single bar graph. The bar gets divided/filled, like a "storage space' illustrator on a computer. The amount of free time remaining has a colored
  bracket and colored label rating the cost/benefit to their mental health as they fill/empty their time. Too much or too little free time has a negative effect on their mental health. A footnote at the bottom states that real life is way more complicated than
  this, but it is true that balance is a virtue.

  After they enter all their choices, they hit "live this month" and it plays an animation. The sun rises and falls, and a little character is shown going about their day, leaving and returning to the house each day. A little button randomly appears thorughout
  this animation that says (Click here to water your plants and feed your animals!). A success rate of 50% or above on clicking this button will result i ntheir plants and animals (visible in the model) to survive into the following month or not.

  The player's wellness dashboard updates with expenses due to their lifestyle and income from their job, whose data we got at the start of the game. After their account reaches a certain level, an investment block appears. It offers the user to invest in a low,
  medium, or high risk portfolio,; it asks also for an amount. They can only invest their total money -2000$ at any time. If investing, a new datum appears: total investments, and aavarage growth rate this month. That amount changes continuously. The option to
  sell a certain amount is also available in that same area of the panel.

  In order to maintain the player's state as they leave and return from class(in real life), this will need an O-Auth layer. They have google accounts, and can just use those.

  Write a plan and break this down into as many tasks as necessary to do a quality job on the first try. There is no limit to the amount of tasks you can split this up into.
```

## 2. Clarifications from the teacher during planning

- **Accounts (replaces the last OAuth paragraph for students)**: "Let's just make a really simple username and password
  system, no google account required. These game instances will not have any personal info in them. Give me a single
  administrator google o-auth login though. Firebase sounds good but I have not set anything up with that system before,
  so let me know if I need to do anything on my end before we get that working."
- **Task runner**: switch the scheduled runner from Fable 5 (out of usage credits) to Opus 5.5.

## 3. Requirement checklist

Task 57 fills the **Verified** column. Each entry names where the requirement is implemented and how it was checked
(test name, screenshot, e2e step).

| ID | Requirement | Spec | Tasks | Verified |
|---|---|---|---|---|
| R1 | Spend money from a bank; savings is user-entered (for now) | 04 §1, 00 §7 | 11 || ✅ t57: intake.json + every play-*.json types savings; t57 shot 4-life money strip (Savings $16,810); ledger.test.js |
| R2 | Pay rent or a mortgage on a house, condo or apartment (plus shared living and building) | 04 §3, 05 | 10, 20–31 || ✅ t57: play-apartment-hilo / shared-honolulu / condo-miami / house-katy / build-pahoa all reach a lease or loan and 3 lived months (npm run test:e2e); underwriting.test.js commit tests |
| R3 | 20 real places, including Pāhoa, Hilo, Honolulu, Waimea, Kona, Seattle, New York, Yellow Pine ID, a Texas suburb, Miami-Dade, Canada, and small towns/rural areas | 03 §1 | 07–09 || ✅ t57: LOCATIONS has 20 (Pāhoa, Hilo, Kailua-Kona, Waimea, Honolulu, Seattle, Brooklyn, Miami, Katy TX, Las Vegas, Chattanooga, Halifax NS, Yellow Pine ID, Marquette, Montpelier, Elkins, Clarksdale, Bisbee, Valentine, Homer); locations.test.js; sources in DATA_SOURCES.md |
| R4 | Each area changes land, building and rent costs | 03 §2, 04 §3 | 07–10 || ✅ t57: costs.test.js; shot 1-plan (Pāhoa apt $1,600/mo vs Kailua-Kona $2,310/mo, build upfront $140,630 vs $240,000) |
| R5 | Phase 1 start page: net monthly income and total savings | 04 §1 | 11 || ✅ t57: intake.json e2e; intake.test.js; t56 shot 1-intake |
| R6 | Spreadsheet of towns × home styles (apartment, condo, shared, buy a house, build a house) with first-year monthly (and upfront) costs | 04 §5 | 12 || ✅ t57: shot 1-plan (20 rows × 5 columns, upfront + /mo per cell); planTable.test.js |
| R7 | Red when savings/income can't cover the upfront or monthly cost | 04 §4 | 10, 12 || ✅ t57: shot 1-plan ("Can't afford" red cells); affordability rules in costs/planTable tests |
| R8 | Green when affordable | 04 §4 | 10, 12 || ✅ t57: shot 1-plan (shared living "Comfortable" green) |
| R9 | Yellow when housing is more than ⅓ of monthly income | 04 §4 | 10, 12 || ✅ t57: shot 1-plan ("Stretch" yellow above the ⅓ line $1,400) |
| R10 | Cyan when housing is well below means (≤ ⅕ of income) | 04 §4 | 10, 12 || ✅ t57: smoke-plan-rich ("Well below your means" cyan at ≤ ⅕ = $2,400); planTable.test.js color mixes |
| R11 | Clickable cells expand to a 2D preview of that home in that place | 04 §6–7 | 13–15 || ✅ t57: smoke-plan-detail-open (2D Hilo apartment preview with Mauna Kea); preview2d.test.js; plan-keys.json |
| R12 | The expanded cell shows a cost breakdown | 04 §6 | 15 || ✅ t57: smoke-plan-detail-open ("What it costs": deposit, first month, fee, totals); planDetail.test.js |
| R13 | Lifestyle metrics: school quality, public transit, distance to movie theater/concert hall, noise, garden/farming potential, garage/workshop, gym/swim/running access, nature access, average age of neighbors | 04 §6 | 07–09, 15 || ✅ t57: metrics.js has all 9 asked for (+ commute); smoke-plan-detail-open "What life is like" panel |
| R14 | Phase 2: choose one and sign agreements with the bank or landlord | 05 | 19–31 || ✅ t57: play-*.json sign lease/mortgage/construction docs; agreements active after commit (underwriting.test.js) |
| R15 | Loans, home inspection, renters insurance shopping, etc. happen in Phase 2 | 05 §3–5 | 20–24 || ✅ t57: play-house-katy (inspection, appraisal, loan options, home insurance), play-apartment-hilo (renters insurance); insurance.test.js, buyerPaperwork.test.js |
| R16 | Generated forms completed in the browser | 05 §4 | 18, 20–23 || ✅ t57: forms.test.js; t57 shot 2-paperwork; every play fills the forms with real input |
| R17 | Letters written in a box when needed (loan statement of purpose, co-signer letter to parents, …) | 06 §1–2 | 25 || ✅ t57: letter.json; plays type cover/loan-purpose letters; co-signer letter seed paperwork-apartment-cosigner; letterBox.test.js |
| R18 | Letters read by a non-LLM ML algorithm plus a grammar/spell-check library, which rates approval likelihood from sentiment and grammar/spelling | 06 §3–4 | 26–27 || ✅ t57: VADER sentiment + nspell + 19 grammar rules → logistic model (letterModel.test.js, letterChecks.test.js); play-apartment-hilo weak letter 1/100 vs strong 93/100 |
| R19 | The rating is given at the end of Phase 2 with the paperwork results: money received, monthly repayment, consequences of not paying | 05 §8, 06 §5 | 28, 31 || ✅ t57: smoke-results-approved-house (chance, letter report, money, monthly, "if you don't pay"); results.test.js |
| R20 | Credit card offer in Phase 2, with the explanation (builds credit; covers bursts of spending such as repairs, vacations, holidays) | 05 §6 | 30 || ✅ t57: smoke-paperwork-card-offer ("builds credit… car repairs, a vacation, or the holidays"); creditCard.test.js, card-offer.json |
| R21 | A portfolio of agreements, bank/loan accounts and automatic expenses is tracked throughout | 02, 05 §9 | 16–17 || ✅ t57: portfolio.json, portfolio-agreement.json; portfolio.test.js; header Portfolio button in every phase after intake |
| R22 | Failing to secure the needed loans returns the student to the previous stage | 05 §8 | 29, 31 || ✅ t57: play-apartment-hilo denial → back to plan → retry approved; results-denied.json; underwriting.test.js denied commit |
| R23 | Phase 3, build: blueprint design tools with a preview of the choices | 07 §5 | 39–41 || ✅ t57: shot 3-design (Cozy template, plan + live 3D preview, cost vs budget, "Plan OK"); blueprint*.test.js, design-build*.json |
| R24 | Phase 3, apartment: choose building and floor from procedural 3D models that match the town's style | 07 §2, 08 §4–5 | 34–36 || ✅ t57: smoke-design-apartment-hilo (3 procedural Hilo walk-ups); design-apartment.json picks a floor and unit; apartmentModel.test.js |
| R25 | Phase 4: live one month at a time with the home shown in rotatable 3D | 09 §1–2, 08 | 42 || ✅ t57: shot 4-life (3D home, "Drag to look around"); life-month1.json; life-leak.json |
| R26 | Right-side panel says "Welcome to (month), (2033)." and asks time-planning questions | 09 §1, §3 | 42–43 || ✅ t57: shot 4-life ("Welcome to January, 2033." in the right panel); life-flow.test.js |
| R27 | "Domains of personal wellbeing" card: physical health, purpose/higher values, financial, social fulfillment, mental health | 09 §1, §8 | 42, 44 || ✅ t57: shot 4-life wellbeing card (Physical health, Sense of purpose, Financial, Social fulfillment, Mental health) |
| R28 | Questions with 3–4 button options: exercise per week; extra work across the month; socializing/family/leisure per week; 1 h/day deep and timeless practice | 09 §3 | 43 || ✅ t57: shot 4-life (4 buttons each); questions.js QUESTIONS incl. deep practice; life-plan.json |
| R29 | "Waking hours per week available" number plus a single storage-style bar that fills as options are chosen | 09 §4 | 43 || ✅ t57: shot 4-life ("Waking hours per week available: 112" + one segmented bar); time-budget.test.js |
| R30 | Free time left gets a colored bracket and a colored label rating its mental-health cost/benefit; too much or too little free time hurts mental health | 09 §4, §8 | 43–44 || ✅ t57: shot 4-life (bracket + "Balanced: good for your mental health"); life-plan-overbooked.json; time-budget.test.js rating table |
| R31 | Footnote: real life is more complicated, but balance is a virtue | 09 §4 | 43 || ✅ t57: shot 4-life footnote; timeBudgetView.js FOOTNOTE |
| R32 | "Live this month" animation: the sun rises and sets, and the character leaves and returns each day | 09 §9 | 45 || ✅ t57: life-live.json, life-live-reduced.json; timeline.test.js; t56 shot 6-life-live (night scene, day 23 of 31) |
| R33 | A random "Click here to water your plants and feed your animals!" button; ≥ 50% success keeps the plants and animals (visible in the model) alive into the next month | 09 §10 | 46 || ✅ t57: care.test.js (exact text, 0.5 keeps all), life-care-hit/miss/play.json |
| R34 | The dashboard updates with lifestyle expenses and job income | 09 §6, §11 | 44, 47 || ✅ t57: month-sim.test.js, month-report.test.js; t56 shot 7-summary (in $4,200 / out $4,111) |
| R35 | An investment block appears once the account reaches a threshold, offering a low/medium/high risk portfolio and an amount | 10 §1–3 | 48 || ✅ t57: investments.test.js unlock at $5,000; life-invest.json (low/medium/high + amount) |
| R36 | Only total money − $2,000 can be invested at any time | 10 §3 | 48 || ✅ t57: investments.test.js "maxInvest keeps the $2,000 reserve" |
| R37 | While invested, show total investments and the average growth rate this month, changing continuously | 10 §5 | 48 || ✅ t57: life-invest-live.json; investments.test.js "live ticker ends where finalizeMonth lands" |
| R38 | Sell a chosen amount from the same panel | 10 §3 | 48 || ✅ t57: investments.test.js sell; life-invest.json |
| R39 | State persists between class sessions: simple username/password for students (no Google, no personal info), one admin Google login, Firebase | 11 | 04–05, 49–52 || ✅ t57: npm run test:e2e:emulator (apartment path on the Auth + Firestore emulators); tests/firebase rules/accounts/saves/admin; persist.json local. Live Firebase waits on the teacher (OPEN_ITEMS) |
| R40 | Tell the teacher exactly what to set up in Firebase | 11 §9 | 53 || ✅ t57: docs/DEPLOY.md (click by click), OPEN_ITEMS "For the teacher" |
