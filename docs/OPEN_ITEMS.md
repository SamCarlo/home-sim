# Open items

Anything a run couldn't finish, or anything that needs the teacher. Newest at the bottom. When an item is resolved,
mark it ✅ with the date and who resolved it.

## For the teacher
- [ ] **Firebase setup**: about 15 minutes on the free Spark plan, no credit card. It's only needed before students play
  online; the game is fully built and tested in local mode first.
  - Steps: `docs/spec/11-accounts-firebase.md` §9 (task 53 turns them into a click-by-click `docs/DEPLOY.md`).
  - Afterward, either run `node tools/configure.mjs --config <file> --admin <your Google email> --project <id>`, or give
    Claude the `firebaseConfig` snippet and the admin email, then deploy with `npx firebase-tools deploy --only hosting,firestore`.
- [ ] *(Optional)* Rename the game with `GAME_TITLE` in `app/src/config.js`. The working title is "Home & Life Sim".

## For the build
- [ ] **ʻokina spacing (task 20)**: in the UI sans font the ʻokina renders with visible space around it ("Hawai ʻ i",
  "ʻ Āina") in computed fields and intros (see tools/shots/t20/*). Likely a font fallback for U+02BB. Fix by loading a
  font subset that includes U+02BB or adding a fallback family with the glyph in `tokens.css`; check 12 §6.
- [ ] **Kahakō in the display font (task 21)**: the paperwork title "House in Pāhoa" (Fraunces, `.pw-title`) appears to
  render without the macron in tools/shots/t21/4-pahoa-loan-options.png although the string is "Pāhoa". Probably the same
  font-subset problem as the ʻokina item above; check the Fraunces subset includes U+0100–U+017F.
- [ ] **Construction credit floor (task 23 → 29)**: 05 §7 hard-fails construction loans under 680, but `CREDIT.startingScore`
  is 680 and the construction loan application's hard inquiry drops it to 675, so every build would be denied. Fix in task
  29: check the score from before the inquiry, lower the floor to 660, or raise the starting score; record it in DEVIATIONS.
