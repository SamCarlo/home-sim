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
*(none yet)*
