// Declarative form engine (05 §2 and §4, 12 §4, task 18). A paperwork document is mostly a schema:
//   renderForm(container, schema, { values, state, onChange, onSubmit, readOnly }) → { el, values(), validate(), submit(), destroy() }
// Schema format: see CLAUDE.md "Forms". Rules live in validate.js (pure); field kinds in fields.js.
import { h } from '../ui/dom.js';
import { VALUE_FIELDS, DISPLAY_FIELDS } from './fields.js';
import { initialValues, validateField, validateForm, requiredProgress } from './validate.js';

let formCount = 0;

/**
 * Render a schema into container (replacing its contents). values are the starting values (not mutated).
 * onChange(values) fires on every edit (the caller throttles drafts); onSubmit(values) only when everything is valid.
 * readOnly renders a signed copy: values as text, no inputs, no submit.
 */
export function renderForm(container, schema, { values: given = {}, state = null, onChange, onSubmit, readOnly = false } = {}) {
  const uid = `fm${++formCount}`;
  const values = initialValues(schema, given, state);
  const views = new Map();          // field id → { field, wrap, err, focus }
  const refreshers = [];            // computed fields and tables: re-run on every change
  const touched = new Set();
  let submitted = false;

  const progress = h('p', { class: 'fm-progress', 'aria-live': 'polite' });
  const summary = h('p', { class: 'fm-summary', role: 'alert', hidden: true });
  const form = h('form', { class: `fm-form${readOnly ? ' is-readonly' : ''}`, noValidate: true, 'aria-labelledby': `${uid}-title` },
    h('header', { class: 'fm-head' },
      h('h2', { class: 'fm-title', id: `${uid}-title` }, schema.title),
      schema.intro ? h('p', { class: 'fm-intro' }, schema.intro) : null,
      readOnly ? h('p', { class: 'fm-progress muted' }, 'Read-only copy of what you signed.')
        : [progress, h('p', { class: 'fm-legend-note muted small' }, h('span', { class: 'fm-req', 'aria-hidden': 'true' }, '*'), ' = required')]),
    (schema.sections || []).map((sec, i) => renderSection(sec, i)),
    readOnly ? null : h('footer', { class: 'fm-actions' }, summary,
      h('button', { type: 'submit', class: 'btn btn-primary btn-lg' }, schema.submitLabel ?? 'Submit')));

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });

  function renderSection(sec, i) {
    const titleId = `${uid}-s${i}`;
    return h('section', { class: 'fm-section', 'aria-labelledby': sec.title ? titleId : null },
      sec.title ? h('h3', { class: 'fm-section-title', id: titleId }, sec.title) : null,
      sec.intro ? h('p', { class: 'fm-section-intro muted' }, sec.intro) : null,
      h('div', { class: 'fm-fields' }, (sec.fields || []).map(renderField)));
  }

  function renderField(f) {
    const display = DISPLAY_FIELDS[f.kind];
    if (display) {
      const d = display(f, { uid, state });
      if (d.refresh) refreshers.push(d.refresh);
      if (f.when) views.set(f.id ?? `${uid}-d${views.size}`, { field: f, wrap: d.node });
      return d.node;
    }
    const kind = VALUE_FIELDS[f.kind];
    if (!kind) throw new Error(`forms: unknown field kind "${f.kind}" (${f.id})`);
    const inputId = `${uid}-${f.id}`;
    const hintId = f.hint ? `${inputId}-hint` : null;
    const errId = `${inputId}-err`;
    const wrapClass = `fm-field fm-k-${f.kind}${f.width === 'half' ? ' fm-half' : ''}`;
    if (readOnly) {
      const wrap = h('div', { class: `${wrapClass} is-readonly`, dataset: { field: f.id } },
        f.kind === 'checkbox' ? null : h('span', { class: 'fm-label' }, f.label), kind.view(f, values[f.id], { state }));
      views.set(f.id, { field: f, wrap });
      return wrap;
    }
    const err = h('p', { class: 'error fm-error', id: errId, hidden: true });
    const io = {
      inputId, state, value: values[f.id],
      describedBy: [hintId, errId].filter(Boolean).join(' '),
      current: () => values[f.id],
      set: (v) => change(f.id, v),
      blur: () => { touched.add(f.id); showError(f.id); },
    };
    const r = kind.render(f, io);
    const wrap = h('div', { class: wrapClass, dataset: { field: f.id } },
      r.label === 'for' ? h('label', { for: inputId }, f.label, f.required ? h('span', { class: 'fm-req', 'aria-hidden': 'true' }, ' *') : null) : null,
      r.node,
      hintId ? h('p', { class: 'hint', id: hintId }, f.hint) : null,
      err);
    views.set(f.id, { field: f, wrap, err, focus: r.focus });
    return wrap;
  }

  function showError(id) {
    const v = views.get(id);
    if (!v?.err) return;
    const visible = !v.wrap.hidden;
    const msg = visible && (touched.has(id) || submitted) ? validateField(v.field, values[id], { values, state }) : null;
    v.err.textContent = msg || '';
    v.err.hidden = !msg;
    v.wrap.classList.toggle('has-error', !!msg);
    v.wrap.querySelectorAll('input, select, textarea, fieldset').forEach((el) => {
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    });
  }

  function refresh() {
    for (const fn of refreshers) fn(values);
    for (const { field, wrap } of views.values()) if (field.when) wrap.hidden = !field.when(values, state);
    if (!readOnly) {
      const { done, total } = requiredProgress(schema, values, state);
      progress.textContent = total ? `${done} of ${total} required done` : 'Nothing required on this form.';
      progress.classList.toggle('is-done', done === total);
    }
  }

  function change(id, v) {
    values[id] = v;
    refresh();
    if (touched.has(id) || submitted) showError(id);
    if (submitted && !summary.hidden) setSummary(Object.keys(validateForm(schema, values, state)).length);
    onChange?.({ ...values });
  }

  function setSummary(n) {
    summary.hidden = !n;
    summary.textContent = n === 1 ? '1 field needs fixing. It’s marked in red.' : `${n} fields need fixing. They’re marked in red.`;
  }

  function submit() {
    if (readOnly) return false;
    submitted = true;
    const errors = validateForm(schema, values, state);
    for (const id of views.keys()) showError(id);
    const ids = Object.keys(errors);
    if (ids.length) {
      setSummary(ids.length);
      const first = views.get(ids[0]);
      const el = typeof first?.focus === 'function' ? first.focus() : first?.focus;
      el?.focus();
      return false;
    }
    summary.hidden = true;
    onSubmit?.({ ...values });
    return true;
  }

  refresh();
  container.replaceChildren(form);
  return {
    el: form,
    values: () => ({ ...values }),
    validate: () => validateForm(schema, values, state),
    submit,
    destroy: () => form.remove(),
  };
}

