// Welcome screen: Log in / Create account tabs (11 §2, 12 §1, §4). Talks only to ctx.accounts (01 §6);
// main.js hears the sign-in through accounts.onChange and loads the save.
import { h } from '../../ui/dom.js';
import { GAME_TITLE } from '../../config.js';
import {
  MESSAGES, checkUsername, checkPassword, checkClassCode, normalizeUsername, normalizeClassCode, validateRegistration,
} from '../provider.js';

const TAGLINE = 'Plan it. Sign it. Build it. Live it.';
let uidSeq = 0;

/** Mount the welcome screen; returns unmount. */
export function mount(container, ctx) {
  const accounts = ctx.accounts;
  const local = accounts?.kind !== 'firebase';
  const tabs = {};
  const panels = {};

  const loginForm = buildLogin(accounts);
  const registerForm = buildRegister(accounts);
  const tabList = h('div', { class: 'login-tabs', role: 'tablist', 'aria-label': 'Log in or create an account' });
  for (const [id, label, form] of [['login', 'Log in', loginForm], ['register', 'Create account', registerForm]]) {
    tabs[id] = h('button', {
      class: 'login-tab', type: 'button', role: 'tab', id: `tab-${id}`, 'aria-controls': `panel-${id}`,
      onClick: () => select(id),
      onKeydown: (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const o = id === 'login' ? 'register' : 'login'; select(o); tabs[o].focus(); } },
    }, label);
    panels[id] = h('div', { class: 'login-panel', role: 'tabpanel', id: `panel-${id}`, 'aria-labelledby': `tab-${id}` }, form);
    tabList.append(tabs[id]);
  }

  function select(id) {
    for (const k of Object.keys(tabs)) {
      const on = k === id;
      tabs[k].setAttribute('aria-selected', String(on));
      tabs[k].tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    }
    container.querySelector('.login-screen')?.setAttribute('data-tab', id);
  }

  container.append(
    h('section', { class: 'login-screen' },
      h('div', { class: 'login-card card' },
        h('div', { class: 'login-hero', 'aria-hidden': 'true' }, heroArt()),
        h('div', { class: 'login-body' },
          h('h1', { class: 'login-title' }, GAME_TITLE),
          h('p', { class: 'login-tagline' }, TAGLINE),
          h('p', { class: 'login-intro muted' }, 'Pick a home in Hawaiʻi or on the mainland, do the paperwork, then live there month by month.'),
          tabList, panels.login, panels.register,
        ),
      ),
      h('p', { class: 'login-mode', dataset: { mode: local ? 'local' : 'online' } },
        h('span', { class: 'login-mode-dot', 'aria-hidden': 'true' }),
        local ? 'Local mode: saves stay in this browser' : 'Online'),
    ),
  );
  select('login');
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}

/** A labeled input with hint + inline error, wired with aria-describedby. */
function field({ name, label, type = 'text', hint, autocomplete, transform, toggle }) {
  const id = `f-${name}-${++uidSeq}`;
  const hintEl = hint ? h('p', { class: 'hint', id: `${id}-hint` }, hint) : null;
  const errEl = h('p', { class: 'error', id: `${id}-err`, hidden: true });
  const input = h('input', {
    id, name, type, autocomplete, class: 'input', spellcheck: 'false', autocapitalize: 'off',
    'aria-describedby': [hintEl && hintEl.id, errEl.id].filter(Boolean).join(' '),
  });
  if (transform) {
    input.addEventListener('input', () => {
      const pos = input.selectionStart;
      const next = transform(input.value);
      if (next !== input.value) { input.value = next; input.setSelectionRange(pos, pos); }
    });
  }
  let control = input;
  if (toggle) {
    const btn = h('button', { class: 'login-eye btn btn-ghost', type: 'button', 'aria-pressed': 'false', 'aria-controls': id }, 'Show');
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? 'Hide' : 'Show';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
    btn.setAttribute('aria-label', 'Show password');
    control = h('div', { class: 'login-pw' }, input, btn);
  }
  const wrap = h('div', { class: 'field' }, h('label', { for: id }, label), control, hintEl, errEl);
  return {
    wrap, input,
    setError(msg) {
      errEl.textContent = msg || '';
      errEl.hidden = !msg;
      wrap.classList.toggle('has-error', !!msg);
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    },
  };
}

/** The friendly form-level error box (role=alert so it is announced). */
function alertBox() {
  const el = h('div', { class: 'login-alert', role: 'alert', hidden: true });
  return { el, show(msg) { el.textContent = msg || ''; el.hidden = !msg; } };
}

/** Shared submit wrapper: busy state, AccountError → field or alert. */
function submitWith(form, button, alert, fields, run) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert.show('');
    const label = button.textContent;
    try {
      button.disabled = true;
      button.textContent = 'One moment…';
      await run();
    } catch (err) {
      console.warn('account', err?.code || err);
      const target = err?.field && fields[err.field];
      if (target) { target.setError(err.message); target.input.focus(); } else alert.show(err?.message || 'Something went wrong. Try again.');
    } finally {
      if (form.isConnected) { button.disabled = false; button.textContent = label; }
    }
  });
}

function buildLogin(accounts) {
  const user = field({ name: 'username', label: 'Username', autocomplete: 'username', transform: (v) => v.toLowerCase() });
  const pass = field({ name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password', toggle: true });
  const remember = h('input', { type: 'checkbox', id: `f-remember-${++uidSeq}`, name: 'remember' });
  const alert = alertBox();
  const button = h('button', { class: 'btn btn-primary btn-lg login-submit', type: 'submit' }, 'Log in');
  const form = h('form', { class: 'login-form', novalidate: true, dataset: { form: 'login' } },
    user.wrap, pass.wrap,
    h('label', { class: 'login-check', for: remember.id }, remember, 'Keep me logged in on this device'),
    alert.el, button,
    h('details', { class: 'login-forgot' }, h('summary', null, 'Forgot your password?'), h('p', null, MESSAGES.forgot)),
  );
  submitWith(form, button, alert, { username: user, password: pass }, async () => {
    const u = normalizeUsername(user.input.value);
    user.setError(u ? null : MESSAGES.required);
    pass.setError(pass.input.value ? null : MESSAGES.required);
    if (!u || !pass.input.value) return;
    await accounts.login({ username: u, password: pass.input.value, remember: remember.checked });
  });
  for (const f of [user, pass]) f.input.addEventListener('input', () => { f.setError(null); alert.show(''); });
  return form;
}

function buildRegister(accounts) {
  const user = field({ name: 'username', label: 'Username', autocomplete: 'username', hint: 'Pick a game name. Not your real name.', transform: (v) => v.toLowerCase() });
  const pass = field({ name: 'password', label: 'Password', type: 'password', autocomplete: 'new-password', hint: "Don't reuse a password from another account.", toggle: true });
  const confirm = field({ name: 'confirm', label: 'Type the password again', type: 'password', autocomplete: 'new-password' });
  const code = field({ name: 'classCode', label: 'Class code', hint: 'Your teacher gives you this.', transform: (v) => v.toUpperCase() });
  const fields = { username: user, password: pass, confirm, classCode: code };
  const alert = alertBox();
  const button = h('button', { class: 'btn btn-primary btn-lg login-submit', type: 'submit' }, 'Create account');
  const form = h('form', { class: 'login-form', novalidate: true, dataset: { form: 'register' } },
    h('div', { class: 'login-grid' }, user.wrap, code.wrap, pass.wrap, confirm.wrap),
    alert.el, button,
  );
  const values = () => ({ username: user.input.value, password: pass.input.value, confirm: confirm.input.value, classCode: code.input.value });
  // Inline checks on blur, once the student has typed something.
  const blurCheck = { username: () => checkUsername(user.input.value), password: () => checkPassword(pass.input.value),
    confirm: () => (confirm.input.value && confirm.input.value !== pass.input.value ? MESSAGES.passwordMismatch : null),
    classCode: () => checkClassCode(code.input.value) };
  for (const [name, f] of Object.entries(fields)) {
    f.input.addEventListener('blur', () => { if (f.input.value) f.setError(blurCheck[name]()); });
    f.input.addEventListener('input', () => { if (f.wrap.classList.contains('has-error')) f.setError(null); alert.show(''); });
  }
  submitWith(form, button, alert, fields, async () => {
    const { ok, errors } = validateRegistration(values());
    for (const [name, f] of Object.entries(fields)) f.setError(errors[name] || null);
    if (!ok) { fields[Object.keys(errors)[0]].input.focus(); return; }
    await accounts.register({ username: user.input.value, password: pass.input.value, classCode: normalizeClassCode(code.input.value) });
  });
  return form;
}

/** Island sunset: sky, sun, Kīlauea-ish ridge, a small house with a lit window. Decorative only. */
function heroArt() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 320 400');
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  svg.setAttribute('class', 'login-art');
  const parts = [
    ['rect', { x: 0, y: 0, width: 320, height: 400, fill: 'url(#lg-sky)' }],
    ['circle', { cx: 210, cy: 205, r: 46, fill: '#ffd28a' }],
    ['path', { d: 'M0 250 L70 205 L120 225 L190 170 L260 215 L320 195 L320 400 L0 400 Z', fill: '#4a4543' }],
    ['path', { d: 'M0 290 Q80 260 160 285 T320 280 L320 400 L0 400 Z', fill: '#2f7048' }],
    ['path', { d: 'M0 330 Q100 305 200 325 T320 320 L320 400 L0 400 Z', fill: '#245a39' }],
    ['rect', { x: 92, y: 262, width: 92, height: 62, rx: 3, fill: '#fbf5e6' }],
    ['path', { d: 'M82 266 L138 226 L194 266 Z', fill: '#a4501a' }],
    ['rect', { x: 104, y: 282, width: 22, height: 20, rx: 2, fill: '#ffd28a' }],
    ['rect', { x: 146, y: 290, width: 22, height: 34, rx: 2, fill: '#3f8fc6' }],
    ['path', { d: 'M240 330 Q244 280 236 250', stroke: '#4a4543', 'stroke-width': 5, fill: 'none' }],
    ['path', { d: 'M236 252 q-28 -6 -40 8 M236 252 q-6 -26 -26 -30 M236 252 q22 -18 40 -12 M236 252 q30 2 36 20', stroke: '#245a39', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }],
  ];
  const defs = document.createElementNS(ns, 'defs');
  defs.innerHTML = '<linearGradient id="lg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f5f8b"/><stop offset=".55" stop-color="#e0772f"/><stop offset="1" stop-color="#fcebdd"/></linearGradient>';
  svg.append(defs);
  for (const [tag, attrs] of parts) {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}
