// Browser-side helper for the playthrough scripts (task 56). genPlaythroughs.mjs inlines this file into the first
// {"eval"} step, so it defines window.__play in the page. It fills paperwork forms the way a student would: real values
// in every field, and each quiz question answered by trying choices until "Check answer" says it's right.
(() => {
  const NAME = 'Kai Mana';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const protoOf = (el) => (el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement
    : HTMLInputElement).prototype;
  const setVal = (el, v) => {
    Object.getOwnPropertyDescriptor(protoOf(el), 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur'));
  };
  const textFor = (key, el) => {
    if (/signature/.test(key)) return NAME;
    if (el.type === 'tel' || /phone/.test(key)) return '(808) 555-0142';
    if (el.type === 'email' || /email/.test(key)) return 'kai.mana@example.com';
    if (/name/.test(key)) return 'Lani Pereira';
    if (el.type === 'number') return '1';
    if (/employer|company/.test(key)) return 'Hilo Bay Dental';
    return 'AC on above 85°F, set to 78°F';
  };
  const active = () => document.querySelector('.pw-item.is-active')?.dataset.step ?? null;
  const field = (key) => document.querySelector(`.fm-form [data-field="${key}"]`);

  async function answer(key) {
    for (let i = 0; i < 8; i++) {
      const wrap = field(key);
      if (!wrap || wrap.querySelector('.fm-q-feedback.is-right')) return true;
      const r = [...wrap.querySelectorAll('input[type=radio]')].find((x) => !x.disabled);
      if (!r) return false;
      r.click();
      wrap.querySelector('.fm-q-check').click();
      await sleep(40);
    }
    return false;
  }

  /** Fill every empty field of the open form. prefs: field key → value (radio/select value or text). */
  async function fill(prefs = {}) {
    if (!document.querySelector('.fm-form')) return 'no form';
    const filled = [];
    for (const wrap of document.querySelectorAll('.fm-form [data-field]')) {
      const key = wrap.dataset.field;
      if (wrap.querySelector('.fm-q-check')) { if (await answer(key)) filled.push(key); continue; }
      const inits = wrap.querySelectorAll('.fm-init-input');
      if (inits.length) { inits.forEach((i) => { if (!i.value) setVal(i, 'KM'); }); filled.push(key); continue; }
      const sel = wrap.querySelector('select');
      if (sel) {
        const want = prefs[key] ?? (sel.value ? null : [...sel.options].find((o) => o.value)?.value);
        if (want != null) { setVal(sel, want); filled.push(key); }
        continue;
      }
      const radios = [...wrap.querySelectorAll('input[type=radio]')];
      if (radios.length) {
        const r = prefs[key] != null ? radios.find((x) => x.value === String(prefs[key]))
          : radios.some((x) => x.checked) ? null : radios.find((x) => !x.disabled);
        if (r && !r.checked) { r.click(); filled.push(key); }
        continue;
      }
      const boxes = wrap.querySelectorAll('input[type=checkbox]');
      if (boxes.length) {
        boxes.forEach((b) => { if (!b.checked && !b.disabled && prefs[key] !== false) b.click(); });
        filled.push(key);
        continue;
      }
      const t = wrap.querySelector('input:not([type=hidden]):not([readonly]):not([disabled]), textarea:not([readonly])');
      if (t && !t.value) { setVal(t, prefs[key] ?? textFor(key, t)); filled.push(key); }
    }
    await sleep(60);
    return filled;
  }

  /** Resolve true once step `id` is the active checklist item (false after `ms`). */
  async function waitStep(id, ms = 8000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (active() === id) return true; await sleep(50); }
    return false;
  }

  /** What's blocking the open form, for the log when a submit doesn't advance. */
  const errors = () => [...document.querySelectorAll('.fm-form .has-error, .fm-form [role=alert]')]
    .map((e) => e.textContent.trim()).filter(Boolean);

  /** Click `sel` if it exists and is enabled; true when clicked. */
  const tap = (sel) => { const b = document.querySelector(sel); if (!b || b.disabled) return false; b.click(); return true; };

  // Keep the stack of any uncaught error so a failing run says where it broke.
  window.__errs = [];
  addEventListener('error', (e) => window.__errs.push(e.error?.stack || e.message));
  addEventListener('unhandledrejection', (e) => window.__errs.push(e.reason?.stack || String(e.reason)));

  window.__play = { fill, answer, waitStep, active, errors, tap, sleep };
  return 'play helper ready';
})();
