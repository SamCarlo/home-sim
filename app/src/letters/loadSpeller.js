// Browser-only: fetch the en_US dictionary once, lazily, and build the speller (06 §3 step 2). The ~550 KB .dic and
// nspell itself load only when a letter box mounts, never on login, intake or the plan table.
const BASE = new URL('../../vendor/dictionary-en/', import.meta.url);

let pending = null;
let ready = null;

async function fetchText(name) {
  const res = await fetch(new URL(name, BASE));
  if (!res.ok) throw new Error(`dictionary ${name}: HTTP ${res.status}`);
  return res.text();
}

/** Promise of the shared speller; starts the download on the first call. A failed load can be retried. */
export function loadSpeller() {
  if (!pending) {
    pending = Promise.all([import('./spell.js'), fetchText('index.aff'), fetchText('index.dic')])
      .then(([{ createSpeller }, aff, dic]) => (ready = createSpeller({ aff, dic })))
      .catch((err) => { pending = null; throw err; });
  }
  return pending;
}

/** The speller if it has finished loading, else null (scoring then skips spelling). */
export function loadedSpeller() {
  return ready;
}
