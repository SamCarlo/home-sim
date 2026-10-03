// Admin actions (11 §3, task 52): reset, transfer, pause/unpause, delete class data. Every one asks first; delete
// class data makes the admin type the code. Each resolves true when something changed (the caller reloads).
import { h } from '../ui/dom.js';
import { openModal, confirmDialog } from '../ui/modal.js';
import { planReset, planTransfer, transferTargets } from './adminModel.js';

/** A short status message in the #toasts live region. kind: 'good' | 'bad'. */
export function toast(text, kind = 'good') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = h('div', { class: `toast toast-${kind}`, role: kind === 'bad' ? 'alert' : null }, text);
  box.append(el);
  setTimeout(() => el.remove(), 5000);
}

/** Run an action; a failure becomes a toast instead of an uncaught error. */
async function attempt(fn, done) {
  try { await fn(); toast(done); return true; } catch (err) {
    console.warn('admin action', err?.code || err);
    toast(err?.code === 'permission-denied' ? "The database refused that change (admin only)." : `That didn't work: ${err?.message || err}`, 'bad');
    return false;
  }
}

/** Reset game: a fresh save and summary for the student. */
export async function resetGame(source, player) {
  const ok = await confirmDialog({
    title: `Reset ${player.username}'s game?`,
    message: `This erases ${player.username}'s whole game (home, money, letters and months) and starts them over at intake. It can't be undone.`,
    confirmLabel: 'Reset game',
  });
  if (!ok) return false;
  const plan = planReset(player, Date.now());
  return attempt(() => source.writeSave(plan.uid, plan.state, plan.summary), `${player.username}'s game was reset.`);
}

/** Pause or unpause: a paused student can't log in or save. */
export async function togglePause(source, player) {
  const pausing = !player.disabled;
  const ok = await confirmDialog({
    title: pausing ? `Pause ${player.username}?` : `Unpause ${player.username}?`,
    message: pausing
      ? `${player.username} won't be able to log in or save until you unpause them. Their game is kept.`
      : `${player.username} will be able to log in and play again.`,
    confirmLabel: pausing ? 'Pause account' : 'Unpause account',
  });
  if (!ok) return false;
  return attempt(() => source.updatePlayer(player.uid, { disabled: pausing, updatedAt: Date.now() }),
    pausing ? `${player.username} is paused.` : `${player.username} can play again.`);
}

/**
 * Transfer save: pick the new username, read the plan, confirm. Copies `from`'s game to the new account and pauses
 * `from` (players/{from} gets disabled + transferredTo).
 */
export function transferSave(source, from, players) {
  const targets = transferTargets(players, from);
  return new Promise((resolve) => {
    let changed = false;
    const select = h('select', { id: 'adm-transfer-to', class: 'adm-select', name: 'to' },
      h('option', { value: '' }, 'Choose a student…'),
      targets.map((p) => h('option', { value: p.uid }, `${p.username} (${p.classCode})`)));
    const error = h('p', { class: 'adm-error', role: 'alert', hidden: true });
    const ok = h('button', { type: 'submit', class: 'btn btn-primary modal-confirm' }, 'Transfer save');
    const form = h('form', { class: 'modal-confirm-body adm-transfer', onSubmit: (e) => { e.preventDefault(); go(); } },
      h('h2', { class: 'modal-title' }, `Transfer ${from.username}'s save`),
      h('p', { class: 'modal-message' }, `Use this when a student forgot their password and made a new username. `
        + `${from.username}'s game is copied to the new username, which loses its own game. ${from.username} is then paused.`),
      h('label', { class: 'adm-label', for: 'adm-transfer-to' }, 'New username'),
      targets.length ? select : h('p', { class: 'muted' }, 'No other active students yet. Have the student make the new username first.'),
      error,
      h('div', { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn btn-secondary modal-cancel', onClick: () => modal.close() }, 'Cancel'),
        targets.length ? ok : null));
    const modal = openModal({ label: `Transfer ${from.username}'s save`, content: form, className: 'modal-confirm-dialog adm-dialog',
      initialFocus: targets.length ? select : null, onClose: () => resolve(changed) });

    async function go() {
      const to = targets.find((p) => p.uid === select.value);
      if (!to) return showError('Choose the new username first.');
      ok.disabled = true;
      let fromState = null;
      try { fromState = await source.loadSave(from.uid); } catch (err) { console.warn('admin load', err?.code || err); }
      const plan = planTransfer({ from, to, fromState, now: Date.now() });
      if (!plan.ok) { ok.disabled = false; return showError(plan.error); }
      changed = await attempt(() => source.writeSave(plan.toUid, plan.state, plan.summary, { uid: from.uid, patch: plan.fromPatch }),
        `${from.username}'s save now belongs to ${to.username}. ${from.username} is paused.`);
      modal.close();
    }
    function showError(text) { error.textContent = text; error.hidden = false; }
  });
}

/** Delete class data: every save and player in the class, after typing the code. */
export function deleteClassData(source, code, count) {
  return new Promise((resolve) => {
    let changed = false;
    const input = h('input', { id: 'adm-delete-confirm', class: 'adm-input', name: 'confirm', autocomplete: 'off', spellcheck: 'false',
      onInput: () => { ok.disabled = input.value.trim().toUpperCase() !== code; } });
    const ok = h('button', { type: 'submit', class: 'btn btn-danger modal-confirm', disabled: true }, 'Delete class data');
    const form = h('form', { class: 'modal-confirm-body adm-delete', onSubmit: async (e) => {
      e.preventDefault();
      if (ok.disabled) return;
      ok.disabled = true;
      changed = await attempt(() => source.deleteClass(code), `Deleted the games of ${count} student${count === 1 ? '' : 's'} in ${code}.`);
      modal.close();
    } },
      h('h2', { class: 'modal-title' }, `Delete all data for ${code}?`),
      h('p', { class: 'modal-message' }, `This deletes the saved games and class records of ${count} student${count === 1 ? '' : 's'} in ${code}. It can't be undone.`),
      source.kind === 'firestore' ? h('p', { class: 'modal-message muted' }, 'Their sign-in accounts stay but can no longer play. '
        + 'To remove those too, open the Firebase console → Authentication → Users and delete them there.') : null,
      h('label', { class: 'adm-label', for: 'adm-delete-confirm' }, `Type ${code} to confirm`),
      input,
      h('div', { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn btn-secondary modal-cancel', onClick: () => modal.close() }, 'Cancel'), ok));
    const modal = openModal({ label: `Delete all data for ${code}`, content: form, className: 'modal-confirm-dialog adm-dialog',
      initialFocus: input, onClose: () => resolve(changed) });
  });
}
