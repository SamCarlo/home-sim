# 12 — UX, visual design, accessibility & content

## 1. Audience and voice

- Students aged 12–14, many reading at or below grade level, playing in class on Chromebooks.
- Target a **grade 6–7 reading level**: short sentences, everyday words. Define a money word the first time it appears
  (§5 glossary tooltips).
- The voice is warm, direct and a little playful. It's honest about trade-offs and never preachy or condescending.
  Explain why things cost what they cost.
- Frame things through choices and consequences. Say "Housing would take 45% of your income. That leaves less for
  everything else", not "You are irresponsible".

## 2. Visual direction

- **Home base**: the neutrals and the Life Skills green from the Class Bank (`interfaces/bank/index.html` `:root` tokens:
  `--bg`, `--surface`, `--ink`, `--line`, `--accent #2f7048`, …), so the game feels like part of the same classroom.
  Copy the token approach (bare `:root`, then light/dark overrides). Don't copy the bank's layout.
- **The game layer** adds warmth: sky blues, sunset orange for highlights, lava-rock charcoal, plumeria cream.
  - Cards have 12–14 px rounded corners and soft shadows. Keep spacing generous.
  - Status colors stay meaningful and are never used as decoration (§3).
- **Type**: IBM Plex Sans for UI and numbers (tabular figures for money), matching the Class Bank, plus one friendly
  display face for big headings and "Welcome to January, 2033." (for example Fraunces or Bricolage Grotesque from Google
  Fonts). Always include system fallbacks.
- **Icons**: inline SVG or Unicode. No icon-font dependency.
- **Motion**: gentle (150–250 ms UI transitions). The 3D day/night cycle is the showpiece, and everything honors reduced motion.

## 3. Themes and status colors

- `settings.theme`: system / light / dark → `data-theme` on `<html>`. Dark mode is fully designed, not just inverted.
- Semantic tokens, each with a background tint, a border/accent and ink, AA contrast in both themes:
  `--st-red`, `--st-yellow`, `--st-cyan`, `--st-green`, `--st-na`.
- Every status always shows **icon + label** as well as color: ✕ Can't afford · ⚠ Stretch · ◎ Well below your means ·
  ✓ Comfortable · — Not available.
- Wellbeing bars: one hue per domain plus a number, with the same hues in both themes.

## 4. Layout & accessibility

- Designed for 1366×768: the life phase has no page scroll, and the plan table scrolls inside its own frame.
  Checked at 1920×1080. Usable down to 1024 wide. Phones are best-effort.
- **Keyboard**: everything works without a mouse.
  - Table: arrow keys, Enter to open.
  - Forms: tab order.
  - Blueprint: arrows move, Shift+arrows resize, Delete removes, T cycles room type.
  - Care button: W.
  - Visible focus rings.
- **Screen readers**: real `<label>`s, `aria-describedby` for help text and errors, and an `aria-live="polite"` region
  for toasts, save status and care-button appearances. Modals trap focus and restore it on close.
  Each 3D view has a text description.
- **No meaning by color alone.** Minimum touch target is 44 px (the care button 48 px).
- **Reduced motion**: `prefers-reduced-motion` or the in-game setting gives the calendar-grid version of the month and
  cuts camera motion.
- **Care timing**: the "longer care window" setting doubles the visible time.

## 5. Glossary (`content/glossary.js`) and the `term()` tooltip

`term('PMI')` renders the word with a dotted underline. Hovering, focusing or tapping it shows a one-to-two sentence
definition with a tiny example. Task 55 fills in and checks the list. It must cover at least:
APR · interest · principal · amortization · down payment · closing costs · PMI · FHA loan · escrow · property tax ·
HOA · special assessment · homeowners insurance · renters insurance · premium · deductible · co-signer · security deposit
· lease · credit score · credit utilization · hard inquiry · debt-to-income (DTI) · gross vs net income · equity ·
net worth · emergency fund · appraisal · home inspection · earnest money · contingency · catchment · septic ·
lava zone · flood zone · diversification · risk/volatility · bond · stock · index fund.

Example: **Deductible**: "The part of a loss you pay yourself before insurance pays the rest. If your deductible is
$1,000 and a storm causes $4,000 of damage, you pay $1,000 and insurance pays $3,000."

## 6. Hawaiian orthography and place names

- Use the **ʻokina** (U+02BB ʻ), never an apostrophe or backtick, and **kahakō** vowels (ā ē ī ō ū):
  Hawaiʻi, Oʻahu, Pāhoa, Kīlauea, Lēʻahi (Diamond Head), ʻōhiʻa, ʻohana, mālama, lānai, ʻulu, mahalo.
- Use "Kailua-Kona" in full on first mention and "Kona" after that. The Waimea here is **Waimea (Kamuela) on Hawaiʻi Island**.
- Treat local culture with respect: aloha, kuleana (responsibility), mālama (care), and hoʻoponopono (making things right)
  in the roommate conflict plan. No caricature and no pidgin jokes.
- Code files are UTF-8. `escapeHtml` must not mangle ʻokina or kahakō. Spell-check allowlists include both spellings.

## 7. Sensitive content

- Every person and business is fictional (decision D14).
- Low-cost places are described through trade-offs (fewer jobs, long drives, older housing), never judgment. The same
  goes for high-cost places.
- Neglected animals "go to live with a neighbor" (decision D13). No animal death or injury, ever.
- Money stress and eviction are explained plainly and kindly, and always with a path forward ("Here's what you can try next").
- Mental health copy is supportive. The year-in-review includes one line: "If real life ever feels like too much, talk
  to someone you trust, like a school counselor."
- Investments are framed as long-term saving with risk, never as gambling or quick money.

## 8. Names and copy

- `GAME_TITLE` defaults to "Home & Life Sim" with the tagline "Plan it. Sign it. Build it. Live it." The teacher can
  rename it in `config.js`.
- Money: "$1,250" in tables and cards; "$1,250.37" in ledgers and statements. Rates: "6.5%".
  Dates: "January 2033", "Tue, January 14".
- Buttons are verbs ("Choose this home", "Send letter", "Live this month", "Continue to February").
