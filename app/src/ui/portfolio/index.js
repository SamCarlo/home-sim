// The portfolio drawer (02 §2, 05 §9, 12 §3–§4, task 17): accounts, automatic expenses, agreements, letters,
// applications, credit score and settings, available from every phase after intake. It re-renders the open tab
// whenever the store changes, so settings and Phase 2 records update live.
import { h, clear } from '../dom.js';
import { openDrawer } from '../drawer.js';
import { renderAccounts, renderExpenses } from './accounts.js';
import { renderAgreements, renderLetters, renderApplications } from './records.js';
import { renderCredit } from './credit.js';
import { renderSettings } from './settings.js';
import '../../phases/paperwork/docs.js'; // registers the signed paperwork documents (agreementDoc.js)

/** Tab ids in order; ?tab=<id> (dev) or openPortfolio({tab}) picks the first one shown. */
export const TABS = [
  { id: 'accounts', label: 'Accounts', render: (s) => renderAccounts(s) },
  { id: 'expenses', label: 'Automatic expenses', render: (s) => renderExpenses(s) },
  { id: 'agreements', label: 'Agreements', render: (s, c) => renderAgreements(s, c.nav) },
  { id: 'letters', label: 'Letters', render: (s, c) => renderLetters(s, c.nav) },
  { id: 'applications', label: 'Applications', render: (s) => renderApplications(s) },
  { id: 'credit', label: 'Credit score', render: (s) => renderCredit(s) },
  { id: 'settings', label: 'Settings', render: (s, c) => renderSettings(s, c) },
];

/**
 * openPortfolio({store, user, tab?, onClose?}) → { close() }. Opens the left drawer; Esc or ✕ closes it and
 * returns focus to whatever opened it (the header's Portfolio button).
 */
export function openPortfolio({ store, user = null, tab = 'accounts', onClose = null }) {
  let current = TABS.some((t) => t.id === tab) ? tab : 'accounts';
  let openId = null;
  let drawer = null;
  const nav = {
    get openId() { return openId; },
    open: (id) => { openId = id; renderPanel(true); },
    back: () => { openId = null; renderPanel(true); },
  };
  const ctx = { store, user, nav, onRestarted: () => drawer?.close() };

  const tabButtons = TABS.map((t) => h('button', {
    type: 'button', role: 'tab', id: `pf-tab-${t.id}`, class: 'pf-tab', 'aria-controls': 'pf-panel',
    dataset: { tab: t.id }, onClick: () => select(t.id, false), onKeydown: onTabKey,
  }, t.label));
  const panel = h('div', { class: 'pf-panel', id: 'pf-panel', role: 'tabpanel', tabindex: '0' });
  const content = h('div', { class: 'pf' },
    h('div', { class: 'pf-tabs', role: 'tablist', 'aria-label': 'Portfolio sections' }, tabButtons), panel);

  function renderPanel(focusPanel = false) {
    const t = TABS.find((x) => x.id === current);
    for (const b of tabButtons) {
      const on = b.dataset.tab === current;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('is-current', on);
    }
    panel.setAttribute('aria-labelledby', `pf-tab-${current}`);
    panel.dataset.tab = current;
    clear(panel).append(t.render(store.getState(), ctx));
    if (focusPanel) (panel.querySelector('.pf-back') || panel).focus();
  }

  function select(id, focusTab = true) {
    if (id !== current) openId = null;
    current = id;
    renderPanel();
    if (focusTab) tabButtons.find((b) => b.dataset.tab === id)?.focus();
  }

  function onTabKey(e) {
    const i = TABS.findIndex((t) => t.id === current);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); select(TABS[(i + step + TABS.length) % TABS.length].id); }
    else if (e.key === 'Home') { e.preventDefault(); select(TABS[0].id); }
    else if (e.key === 'End') { e.preventDefault(); select(TABS[TABS.length - 1].id); }
  }

  // Keep focus where it was when the store changes (e.g. a settings radio), unless that element was replaced.
  const unsub = store.subscribe(() => {
    if (!drawer) return;
    const active = document.activeElement;
    const key = active && panel.contains(active) ? focusKey(active) : null;
    renderPanel();
    if (key) panel.querySelector(key)?.focus();
  });

  renderPanel();
  drawer = openDrawer({ label: 'Portfolio', title: 'Your portfolio', content,
    initialFocus: tabButtons.find((b) => b.dataset.tab === current),
    onClose: () => { unsub(); drawer = null; document.body.classList.remove('has-drawer'); onClose?.(); } });
  document.body.classList.add('has-drawer');
  return { close: () => drawer?.close() };
}

/** A selector that finds the "same" control after a re-render (inputs by name + value). */
function focusKey(el) {
  return el.tagName === 'INPUT' && el.name ? `input[name="${el.name}"][value="${el.value}"]` : null;
}
