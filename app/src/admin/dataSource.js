// Where the admin console reads and writes (11 §3–§4, task 52). Two sources with one interface:
//   Firestore (classCodes, players, saves; the rules only let the admin through) and
//   local (the dev-only local profiles in localStorage, so the console works without Firebase).
// Interface: kind, listCodes, createCode, setCodeActive, deleteCode, listPlayers, loadSave, writeSave(uid, state, summary),
// updatePlayer(uid, patch), deleteClass(code) → number of students removed.
import { STORAGE_PREFIX, LOCAL_CLASS_CODES } from '../config.js';
import { saveDoc } from '../persistence/firestore.js';
import { saveKey, summaryKey } from '../persistence/local.js';
import { ACCOUNTS_KEY } from '../accounts/local.js';

/** localStorage key for the local-mode class codes ([{code, label, active, createdAt}]). */
export const LOCAL_CODES_KEY = `${STORAGE_PREFIX}classCodes`;

/** Firestore source. db = the admin app's Firestore, fs = the firebase/firestore module. */
export function createFirestoreSource({ db, fs }) {
  const { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, query, where } = fs;
  const all = async (q) => (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
  return {
    kind: 'firestore',
    async listCodes() {
      return (await all(collection(db, 'classCodes'))).map((c) => ({ code: c.id, label: c.label ?? c.id, active: c.active === true, createdAt: c.createdAt ?? 0 }));
    },
    createCode: ({ code, label }) => setDoc(doc(db, 'classCodes', code), { label, active: true, createdAt: Date.now() }),
    setCodeActive: (code, active) => updateDoc(doc(db, 'classCodes', code), { active }),
    deleteCode: (code) => deleteDoc(doc(db, 'classCodes', code)),
    async listPlayers() {
      return (await all(collection(db, 'players'))).map(({ id, ...p }) => ({ uid: id, ...p }));
    },
    async loadSave(uid) {
      const snap = await getDoc(doc(db, 'saves', uid));
      return snap.exists() && snap.data().stateJson ? JSON.parse(snap.data().stateJson) : null;
    },
    /** saves/{uid} and players/{uid}.summary in one batch (02 §5: admin actions write the summary). */
    async writeSave(uid, state, summary, extra = null) {
      const now = summary.updatedAt ?? Date.now();
      const batch = writeBatch(db);
      batch.set(doc(db, 'saves', uid), saveDoc(state, now));
      batch.update(doc(db, 'players', uid), { summary, updatedAt: now });
      if (extra) batch.update(doc(db, 'players', extra.uid), extra.patch);
      await batch.commit();
    },
    updatePlayer: (uid, patch) => updateDoc(doc(db, 'players', uid), patch),
    /** Delete every players and saves doc in the class (batches of 400 deletes). */
    async deleteClass(code) {
      const players = await all(query(collection(db, 'players'), where('classCode', '==', code)));
      for (let i = 0; i < players.length; i += 200) {
        const batch = writeBatch(db);
        for (const p of players.slice(i, i + 200)) {
          batch.delete(doc(db, 'saves', p.id));
          batch.delete(doc(db, 'players', p.id));
        }
        await batch.commit();
      }
      return players.length;
    },
  };
}

/** Local source over localStorage: accounts from accounts/local.js, saves and summaries from persistence/local.js. */
export function createLocalSource(storage = globalThis.localStorage) {
  const read = (key, fallback) => { try { return JSON.parse(storage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } };
  const write = (key, v) => storage.setItem(key, JSON.stringify(v));
  const codes = () => read(LOCAL_CODES_KEY, null) ?? LOCAL_CLASS_CODES.map((code) => ({ code, label: code, active: true, createdAt: 0 }));
  const accounts = () => read(ACCOUNTS_KEY, {});
  const patchAccount = (uid, patch) => {
    const all = accounts();
    const name = Object.keys(all).find((n) => all[n].uid === uid);
    if (name) { all[name] = { ...all[name], ...patch }; write(ACCOUNTS_KEY, all); }
  };
  return {
    kind: 'local',
    listCodes: async () => codes(),
    createCode: async ({ code, label }) => write(LOCAL_CODES_KEY, [...codes(), { code, label, active: true, createdAt: Date.now() }]),
    setCodeActive: async (code, active) => write(LOCAL_CODES_KEY, codes().map((c) => (c.code === code ? { ...c, active } : c))),
    deleteCode: async (code) => write(LOCAL_CODES_KEY, codes().filter((c) => c.code !== code)),
    async listPlayers() {
      return Object.entries(accounts()).map(([username, a]) => ({
        uid: a.uid, username, classCode: a.classCode, disabled: a.disabled === true, transferredTo: a.transferredTo,
        summary: read(summaryKey(a.uid), null) ?? { phase: read(saveKey(a.uid), null)?.phase ?? 'intake', monthIndex: 0 },
      }));
    },
    loadSave: async (uid) => read(saveKey(uid), null),
    async writeSave(uid, state, summary, extra = null) {
      write(saveKey(uid), state);
      write(summaryKey(uid), summary);
      if (extra) patchAccount(extra.uid, extra.patch);
    },
    updatePlayer: async (uid, patch) => patchAccount(uid, patch),
    async deleteClass(code) {
      const all = accounts();
      const names = Object.keys(all).filter((n) => all[n].classCode === code);
      for (const n of names) { storage.removeItem(saveKey(all[n].uid)); storage.removeItem(summaryKey(all[n].uid)); delete all[n]; }
      write(ACCOUNTS_KEY, all);
      return names.length;
    },
  };
}
