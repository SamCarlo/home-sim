# 06 — Letters and the letter-scoring model

The teacher: "IF they need to write a letter for anything… they will be asked to write that letter in a box. Once they
hit send, the text gets read by a non-LLM ML algorithm and basic grammar/spell check library that rates their
likelihood of being approved through sentiment analysis and grammar/spell check. Their rating is given to them at the
end of this phase."

The scoring must be local, deterministic and explainable. There is no LLM and no network call.

## 1. Letter types (`letters/types.js`, pure data)

| id | To | When | Target words | The reader wants to know (content groups) |
|---|---|---|---|---|
| `rental-cover` | the property manager | apartment | 80–200 | who you are and your job · why this place · you'll pay on time (income/savings/budget) · you'll be a good neighbor (quiet, clean, respectful) · references available · thanks |
| `cosigner-request` | a parent or guardian (made-up name) | apartment/shared when income < 2.5× rent | 100–220 | what co-signing means (they pay if you don't) · why you need it · your budget/plan to pay · specific safeguards (autopay, savings, sharing your budget) · respect and gratitude |
| `roommate-intro` | future roommates | shared | 80–200 | about you (schedule, hobbies) · cleanliness/chores · quiet hours/guests · how you handle conflict · paying bills on time · friendly tone |
| `loan-purpose` | the loan officer | condo, house | 120–250 | the home and why · job and income stability · budget and payment plan · savings/emergency fund · commitment to pay on time · thanks |
| `construction-purpose` | the construction loan officer | build | 120–250 | what you'll build and why · budget and contractor · timeline · plan for surprises (contingency) · payments after it's built · thanks |
| `credit-explanation` | the loan officer | mortgage/construction when credit < 660 | 80–180 | why your credit history is short or low · on-time habits (rent, phone) · steps you're taking · commitment · thanks |

Each type also carries:
- `prompt`: 2–3 sentences, student-facing;
- `tips[]`: a static checklist shown beside the box. It must **not** tick itself off as the student types, because that would
  give away the score;
- `greetingExamples`, `closingExamples`;
- `groups`: the content groups above, each with a list of keywords or regexes for the feature extractor.

## 2. Letter box (`phases/paperwork/letterBox.js`)

- Layout:
  - a recipient card ("To: Leilani Kahale, Kīpuka Property Management");
  - the prompt and tips;
  - a large `<textarea>` with **`spellcheck` off** when `config.LETTERS.browserSpellcheck` is false (the default);
  - a live word count against the target range;
  - the note "Use made-up names. Don't share real personal information."
- Drafts save on the draft throttle.
- **Send** asks for confirmation ("Once you send it, you can't change it"). It then scores the letter silently with `score.js`,
  stores `letters[id] = {id, type, to, text, sentAt, attempt, score}`, marks the step done, and saves a checkpoint.
- After sending: "Sent! You'll find out how it was received at the end of this phase." **The score is not shown until Results** (decision D11).
- The dictionary loads lazily when the letter step mounts, so scoring never waits on the network.

## 3. Scoring pipeline (pure; `letters/*.js`)

1. **Normalize** (`features.js`):
   - Unicode NFC. Treat the ʻokina (U+02BB) and kahakō vowels as letters.
   - Split into paragraphs, sentences (on `.!?` followed by space/newline, keeping abbreviations like "Mr." together)
     and word tokens.
2. **Spelling** (`spell.js`):
   - `createSpeller({aff, dic, extraWords})` wraps **nspell** with the en_US Hunspell dictionary.
   - It skips numbers, URLs, and capitalized words mid-sentence (likely names).
   - It allows everything in `allowlist.js`: Hawaiian words and places (with and without diacritics: Hawaiʻi, Hilo,
     Pāhoa, Kona, Kailua, Waimea, Kamuela, Honolulu, Oʻahu, Puna, mahalo, aloha, ʻohana, kuleana, mālama, keiki, kupuna,
     lānai, pau, pono, …), the other 19 place names, and game/finance terms (HOA, PMI, APR, FHA, co-signer, cosigner,
     roommate, autopay, …).
   - Output: `{ misspelled: [{word, index, suggestions: [≤3]}], rate }` where rate = misspelled ÷ words.
3. **Grammar rules** (`grammar.js`): a list of rules, each `{id, test(text, tokens) → [{index, length, message, suggestion}], weight}`.
   Target the errors middle schoolers really make:
   - sentence starting with a lowercase letter;
   - standalone lowercase "i";
   - missing end punctuation;
   - repeated word ("the the");
   - double spaces;
   - `your/you're` (e.g. "your welcome", "your going");
   - `their/there/they're` ("there going", "their is");
   - `its/it's` ("it's own", "its a");
   - `should/could/would of`;
   - `alot`;
   - `then/than` in comparisons ("more then");
   - `to/too` before adjectives at a sentence end ("me to.");
   - run-on sentences (more than 40 words with no end punctuation);
   - SHOUTING (3+ consecutive all-caps words);
   - `!!` or more;
   - text-speak (`u`, `ur`, `r`, `pls`, `plz`, `thx`, `lol`, `idk`, `omg`, `btw`, `gonna`, `wanna`, `kinda`);
   - missing greeting (first line doesn't start like "Dear …", "Hello …", "Hi …", "To …", "Aloha …");
   - missing closing ("Sincerely", "Thank you", "Best regards", "Respectfully", "Mahalo", "Love," for a parent);
   - one long block over 150 words with no paragraph break (minor).
4. **Sentiment** (`sentiment.js`): **VADER** compound score for the whole letter and for each sentence, plus a `label`:
   warm (≥ 0.5), positive (≥ 0.05), neutral, negative (≤ −0.05). The negative-sentence rate is a separate feature.
5. **Features** (`features.js` → `extractFeatures(text, type, {speller}) → {vector, named}`). Named features, in a
   fixed order recorded in `model.json`:
   - `spellRate`, `grammarPer100w`, `sentiment` (compound), `negSentenceRate`, `politeness` (please/thank/appreciate/
     grateful/respect/mahalo per 100 words, capped);
   - `hasGreeting`, `hasClosing`, `lengthFit` (1 inside the range, sliding to 0 at half or double it),
     `sentenceLenFit` (1 when the average is 10–22 words), `contentCoverage` (fraction of the type's content groups hit);
   - `textSpeak` (count, capped), `shouting` (0/1), `exclaimRate`, `paragraphs` (0/1 has at least 2 paragraphs),
     `lexicalVariety` (type-token ratio on the first 150 words).
6. **Model** (`score.js` + `model.json`): logistic regression `p = σ(Σ wᵢ·zᵢ + b)`, where `zᵢ = (xᵢ − meanᵢ) ÷ stdᵢ`.
   - `likelihood = round(100·p)`.
   - **Band**: 85–100 Excellent · 70–84 Strong · 55–69 Fair · 40–54 Weak · 0–39 Needs work.
7. **Contributions**: `cᵢ = wᵢ·zᵢ`. The top 3 positive and top 3 negative are turned into plain sentences through a
   message table ("Few spelling mistakes", "You didn't mention how you'll pay", "Friendly, positive tone", "Missing a
   closing like 'Sincerely'").

**Contract**: `scoreLetter(text, type, {speller}) → { likelihood, band, sentiment: {compound, label}, wordCount,
issues: {spelling: [...], grammar: [...]}, features: {…named}, contributions: [{feature, value, effect, message}], modelVersion }`.
The same text always gets the same score.

## 4. Training corpus and model (`tools/letter-model/`)

- `corpus/<type>.json`: about 13 labeled letters for each of the 6 types (~80 total), written for this game with made-up names.
  - Spread for each type: 4 strong, 4 middling, 5 weak.
  - Weak ones each have a clear flaw: many spelling errors, rude or negative tone, missing key content, far too short,
    text-speak, ALL CAPS, or no greeting/closing.
  - Each entry: `{ id, type, text, label: 1|0, note }`. Roughly half are labeled 1.
  - Keep ~15% as a held-out test set (`split: 'test'`).
- `train.mjs`:
  - imports `extractFeatures` from `app/src/letters/features.js`, so training and scoring use the same code;
  - loads the dictionary from `app/vendor/dictionary-en/` with `fs`;
  - standardizes features;
  - trains **L2-regularized logistic regression** with batch gradient descent (seeded, deterministic);
  - reports 5-fold cross-validation accuracy and log-loss, plus held-out accuracy;
  - writes `app/src/letters/model.json`: `{version, trainedAt, features[], mean[], std[], weights[], bias, cv: {accuracy, logloss}, test: {accuracy}}`.
- Acceptance: CV accuracy ≥ 0.80, and the weights have sensible signs (spelling and grammar negative; greeting, closing,
  coverage and sentiment positive). If a sign is backwards, fix the corpus, not the math.
- Also write 3 hand-made **sanity letters** into `tests/unit/letters.test.js`: a strong one must score ≥ 70,
  a text-speak rant ≤ 35, and a polite but empty one should land in between.

## 5. Report UI (`ui/letterReport.js`; used by Results and the portfolio)

- A likelihood meter (0–100) with the band name and color.
- "What helped" and "What hurt": the top contributions as sentences with ↑ and ↓ markers.
- **Spelling**: each misspelled word with up to 3 suggestions. **Grammar**: the sentence excerpt with the problem span
  highlighted and the rule's message.
- **Tone**: the sentiment label with one sentence of explanation.
- A collapsible "How was this scored?":
  "Your letter was scored by a small machine-learning model trained on example letters. It checks spelling with a
  Hunspell dictionary, looks for common grammar mistakes, measures tone with VADER (a sentiment-analysis tool), and
  checks whether you covered what the reader needs to know. It's not a person and it's not an AI chatbot, but real
  readers care about the same things."
- Student text is rendered as text nodes only, never as HTML.

## 6. How letters affect decisions

See `05` §7: `letterFactor(L) = 0.55 + 0.45·L` for landlords, lenders and construction lenders;
co-signer `0.35 + 0.6·L`; roommates `0.5 + 0.5·L`. A great letter can't rescue impossible finances (hard fails),
but it matters in every other case.
