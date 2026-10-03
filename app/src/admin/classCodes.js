// Class codes card (11 §3, task 52): create, deactivate/reactivate, delete, student count per code, and the
// "Delete class data" action.
import { h } from '../ui/dom.js';
import { confirmDialog } from '../ui/modal.js';
import { checkNewCode } from './adminModel.js';
import { toast, deleteClassData } from './actions.js';

/** renderClassCodes({source, codes, counts, onChanged}) → the card element. onChanged() reloads the console. */
export function renderClassCodes({ source, codes, counts, onChanged }) {
  const codeIn = h('input', { id: 'adm-code', class: 'adm-input', name: 'code', placeholder: 'IO-P3', autocomplete: 'off', maxlength: 12,
    'aria-describedby': 'adm-code-error' });
  const labelIn = h('input', { id: 'adm-code-label', class: 'adm-input', name: 'label', placeholder: 'Period 3 Life Skills', maxlength: 60 });
  const error = h('p', { class: 'adm-error', id: 'adm-code-error', role: 'alert', hidden: true });

  async function create(e) {
    e.preventDefault();
    const checked = checkNewCode({ code: codeIn.value, label: labelIn.value }, codes);
    if (checked.error) { error.textContent = checked.error; error.hidden = false; codeIn.focus(); return; }
    try {
      await source.createCode(checked);
      toast(`Class code ${checked.code} is ready.`);
      onChanged();
    } catch (err) {
      console.warn('admin code', err?.code || err);
      toast(`The code wasn't created: ${err?.message || err}`, 'bad');
    }
  }

  async function run(fn, done) {
    try { await fn(); toast(done); onChanged(); } catch (err) {
      console.warn('admin code', err?.code || err);
      toast(`That didn't work: ${err?.message || err}`, 'bad');
    }
  }

  const rows = [...codes].sort((a, b) => a.code.localeCompare(b.code)).map((c) => {
    const n = counts[c.code] ?? 0;
    return h('tr', { dataset: { code: c.code } },
      h('th', { scope: 'row' }, h('code', null, c.code)),
      h('td', null, c.label),
      h('td', { class: 'num' }, String(n)),
      h('td', null, h('span', { class: `pf-chip st-${c.active ? 'green' : 'na'}` },
        h('span', { 'aria-hidden': 'true' }, c.active ? '✓' : '—'), c.active ? ' Active' : ' Inactive')),
      h('td', { class: 'adm-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-small adm-code-toggle',
          onClick: () => run(() => source.setCodeActive(c.code, !c.active), c.active ? `${c.code} no longer accepts new students.` : `${c.code} accepts new students again.`) },
          c.active ? 'Deactivate' : 'Reactivate'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-small adm-code-delete', onClick: async () => {
          const ok = await confirmDialog({ title: `Delete the code ${c.code}?`,
            message: `New students can't join with ${c.code} anymore. ${n ? `The ${n} student${n === 1 ? '' : 's'} already in it keep their games.` : ''}`,
            confirmLabel: 'Delete code' });
          if (ok) run(() => source.deleteCode(c.code), `Deleted the code ${c.code}.`);
        } }, 'Delete code'),
        n ? h('button', { type: 'button', class: 'btn btn-ghost btn-small adm-danger-link adm-class-delete', onClick: async () => {
          if (await deleteClassData(source, c.code, n)) onChanged();
        } }, 'Delete class data') : null));
  });

  return h('section', { class: 'card adm-card adm-codes', 'aria-labelledby': 'adm-codes-title' },
    h('h2', { class: 'adm-card-title', id: 'adm-codes-title' }, 'Class codes'),
    rows.length ? h('table', { class: 'adm-table' },
      h('thead', null, h('tr', null, ['Code', 'Label', 'Students', 'Status', ''].map((t, i) => h('th', { scope: 'col', class: i === 2 ? 'num' : null }, t)))),
      h('tbody', null, rows)) : h('p', { class: 'muted' }, 'No class codes yet. Make one for each class period.'),
    h('form', { class: 'adm-code-form', onSubmit: create },
      h('div', { class: 'adm-field' }, h('label', { class: 'adm-label', for: 'adm-code' }, 'New code'), codeIn),
      h('div', { class: 'adm-field adm-field-wide' }, h('label', { class: 'adm-label', for: 'adm-code-label' }, 'Label'), labelIn),
      h('button', { type: 'submit', class: 'btn btn-primary adm-code-create' }, 'Create code'),
      error));
}
