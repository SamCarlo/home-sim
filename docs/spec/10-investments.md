# 10 — Investments

The teacher: "After their account reaches a certain level, an investment block appears. It offers the user to invest in
a low, medium, or high risk portfolio; it asks also for an amount. They can only invest their total money − $2000 at any
time. If investing, a new datum appears: total investments, and average growth rate this month. That amount changes
continuously. The option to sell a certain amount is also available in that same area of the panel."

## 1. Unlock

- At the start of any month's **plan** stage, if `checkingCents + savingsCents ≥ INVEST.unlockCents` ($5,000, config),
  set `life.investUnlocked = true`. It stays unlocked even if cash drops later.
- The first time, show a short intro card in the block: "You have enough saved to think about investing. Investing
  can grow your money over time, but the value goes up and down. Only invest money you won't need soon."

## 2. Portfolios (`config.INVEST.portfolios`)

| Key | Name shown | What it is (student-facing) | Expected return / yr (μ) | Volatility / yr (σ) |
|---|---|---|---|---|
| `low` | Low risk | "A bond fund: loans to governments and big companies. Slow and steady." | 4.0% | 4% |
| `medium` | Medium risk | "A balanced fund: about 60% stocks and 40% bonds." | 6.5% | 10% |
| `high` | High risk | "A stock index fund: a slice of hundreds of companies. Grows most over time, drops hardest in bad years." | 9.0% | 18% |

Each card shows "In a typical year, $1,000 could end up between $A and $B". That's roughly the 10th–90th percentile of
a one-year lognormal with that μ and σ, computed rather than hard-coded.
Note: "These are simulated returns based on long-run history. Real markets can do better or worse."

## 3. Invest and sell (`life/investments.js`, pure; `phases/life/investPanel.js`)

- **Invest**: pick a portfolio and type an amount.
  - `maxInvest = checkingCents + savingsCents − INVEST.reserveCents` ($2,000).
  - Show it live: "You can invest up to $X. You always keep $2,000 in the bank."
  - Money comes out of savings first, then checking.
  - It adds to that portfolio's `valueCents` and `basisCents` and posts a transaction.
  - Validation: amount > 0, ≤ max, whole dollars.
- **Sell**: pick a portfolio you hold and type an amount ≤ its current value.
  - Proceeds go to savings. `basisCents` is reduced in proportion.
  - Note: "In real life, you might owe taxes on gains."
- Allowed during the **plan** stage (and the summary). The block is disabled while the month animation runs.
- Every buy and sell saves a checkpoint (`invest`).

## 4. Simulation

- `planMonth` builds one daily path per portfolio the student holds:
  - `v₀ = 1`, `vₖ₊₁ = vₖ · exp((μ − σ²/2)·Δt + σ·√Δt·Zₖ)` with `Δt = (1/12) / days`;
  - `Zₖ` are seeded standard normals (Box–Muller) from `seedFor(meta.seed, 'market', monthIndex, key)`.
- All holdings of a portfolio share that path. `finalizeMonth` multiplies each holding by `v_days`.
- Money buttons are disabled mid-month, so nothing is bought or sold mid-path.

## 5. Display

- Once any holding is > 0, the money strip and the invest block show:
  - **Total investments: $X**, the value-weighted current value;
  - **Average growth rate this month: +Y%**, the value-weighted % change since the start of the month, with the
    per-portfolio change on hover or expand.
- **"That amount changes continuously"**: during "Live this month" both numbers update every day along the path
  (tweened between days), and a small sparkline draws the month. Outside the animation they show the latest month-end
  values plus the history sparkline.
- Net worth includes investments (`02` §2).

## 6. Tests (`tests/unit/investments.test.js`)

- `maxInvest` edge cases: exactly $2,000 in cash means $0 is investable, and negative results clamp to 0.
- Buy and sell move cash and basis correctly. Selling more than the value is refused.
- The path is deterministic for a given seed.
- Over 5,000 simulated months, the mean log return ≈ `(μ − σ²/2)/12` and its std ≈ `σ/√12`, within a tolerance.
