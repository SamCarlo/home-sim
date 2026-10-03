#!/usr/bin/env bash
# Full verification (01 §8): syntax → unit tests → data imports → smoke screenshots (→ rules tests with
# HOMESIM_FIREBASE=1). Stops at the first failure.
# Run from anywhere: bash tools/check.sh  (or npm run check). Steps whose inputs don't exist yet are skipped.
set -euo pipefail
cd "$(dirname "$0")/.."
t0=$(date +%s)
done_steps=()
fail() { echo "check: FAIL at $1 after $(( $(date +%s) - t0 ))s"; exit 1; }

# 1. Syntax: node --check on every .js/.mjs under app/src and tools.
mapfile -t files < <(find app/src tools -type f \( -name '*.js' -o -name '*.mjs' \) -not -path '*/shots/*' | sort)
for f in "${files[@]}"; do node --check "$f" || fail "node --check $f"; done
done_steps+=("syntax ${#files[@]} files")

# 2. Unit tests (glob, not the directory: Node 25 rejects a bare directory, see DEVIATIONS).
if compgen -G "tests/unit/*.test.js" > /dev/null; then
  node --test --test-reporter=dot "tests/unit/*.test.js" || fail "unit tests"
  done_steps+=("tests")
else
  done_steps+=("tests skipped")
fi

# 3. Letter model and data files must parse/import cleanly (once they exist).
data=()
[[ -f app/src/letters/model.json ]] && data+=(app/src/letters/model.json)
if [[ -d app/src/data ]]; then mapfile -t -O "${#data[@]}" data < <(find app/src/data -type f \( -name '*.js' -o -name '*.json' \) | sort); fi
if (( ${#data[@]} )); then
  node --input-type=module -e '
    import fs from "node:fs"; import { pathToFileURL } from "node:url"; import path from "node:path";
    for (const f of process.argv.slice(1)) {
      try { f.endsWith(".json") ? JSON.parse(fs.readFileSync(f, "utf8")) : await import(pathToFileURL(path.resolve(f))); }
      catch (e) { console.error(`${f}: ${e.message}`); process.exit(1); }
    }' "${data[@]}" || fail "data imports"
  done_steps+=("data ${#data[@]} files")
else
  done_steps+=("data skipped")
fi

# 4. Smoke: one browser, fresh tab + storage per line of tools/smoke.txt.
if [[ -f tools/smoke.txt ]]; then
  node tools/shoot.mjs --smoke tools/smoke.txt || fail "smoke"
  done_steps+=("smoke")
fi

# 5. Optional: Firestore rules on the emulator (11 §7). Slow (~30 s), so only with HOMESIM_FIREBASE=1 and Java present.
if [[ "${HOMESIM_FIREBASE:-}" == "1" ]]; then
  if command -v mise > /dev/null && mise exec java@temurin-21 -- java -version > /dev/null 2>&1; then
    mise exec java@temurin-21 -- npm run --silent test:rules || fail "rules tests"
    done_steps+=("rules")
  elif command -v java > /dev/null; then
    npm run --silent test:rules || fail "rules tests"
    done_steps+=("rules")
  else
    echo "check: HOMESIM_FIREBASE=1 but no Java (mise install java@temurin-21); skipping the rules tests"
    done_steps+=("rules skipped")
  fi
fi

summary=$(IFS=,; echo "${done_steps[*]}")
echo "check: OK (${summary//,/ · }) in $(( $(date +%s) - t0 ))s"
