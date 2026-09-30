# Deviations from the spec

When a task knowingly departs from `docs/spec`, it records the change here: date, task number, what changed, why,
and where in the code. Keep entries short. The teacher's intent in `99-original-request.md` still wins.

*(none yet)*

- **2026-09-30, task 01**: `node --test tests/unit/` fails on Node 25 (`Cannot find module …/tests/unit`; a directory
  argument is no longer treated as a test root). Use the quoted glob `node --test "tests/unit/*.test.js"` instead, in
  `package.json` and in `tools/check.sh` (task 02). Where the spec or a task says `node --test tests/unit/`, read it as the glob.
