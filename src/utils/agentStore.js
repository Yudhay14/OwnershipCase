import {
  agentMaster as BASE_AGENT_MASTER,
  supportMaster as BASE_SUPPORT_MASTER,
} from "../data/agents.js";
import { cleanText, normalizeKey } from "./text.js";

/**
 * Daftar agent yang bisa diubah admin.
 *
 * Daftar dasar tetap di `src/data/agents.js` (hasil generate, tidak pernah
 * ditulis ulang). Admin hanya menambah/menghapus lewat LAPISAN OVERRIDE yang
 * disimpan di localStorage, sehingga:
 *   - daftar dasar tetap utuh sebagai sumber kebenaran,
 *   - setiap perubahan bisa dibalik ("Kembalikan daftar awal"),
 *   - tanpa override, daftar efektif IDENTIK dengan daftar dasar.
 *
 * CATATAN KEAMANAN: aplikasi ini murni front-end (tanpa server), jadi kredensial
 * admin hanya berfungsi sebagai gerbang UI, bukan proteksi data. Siapa pun yang
 * bisa membuka DevTools tetap dapat membaca kredensial dan mengubah
 * localStorage. Untuk keamanan sungguhan perlu backend/autentikasi server.
 */

const STORAGE_KEY = "od.agentOverrides.v1";

export const AGENT_LISTS = { REGULAR: "regular", SUPPORT: "support" };

function emptyOverrides() {
  return {
    regular: { added: [], removed: [] },
    support: { added: [], removed: [] },
  };
}

let overrides = emptyOverrides();
let version = 0;
const listeners = new Set();

function storage() {
  try {
    if (typeof localStorage === "undefined" || !localStorage) return null;
    return localStorage;
  } catch {
    return null;
  }
}

function cleanEntry(entry) {
  return { name: cleanText(entry?.name), ldap: cleanText(entry?.ldap) };
}

/** Kunci identitas agent: LDAP bila ada, kalau tidak nama. */
export function agentKey(agent) {
  const ldap = normalizeKey(agent?.ldap);
  if (ldap) return `ldap:${ldap}`;
  return `name:${normalizeKey(agent?.name)}`;
}

function sanitize(raw) {
  const next = emptyOverrides();
  if (!raw || typeof raw !== "object") return next;
  [AGENT_LISTS.REGULAR, AGENT_LISTS.SUPPORT].forEach((list) => {
    const source = raw[list];
    if (!source || typeof source !== "object") return;
    if (Array.isArray(source.added)) {
      next[list].added = source.added.map(cleanEntry).filter((a) => a.name);
    }
    if (Array.isArray(source.removed)) {
      next[list].removed = source.removed.filter((k) => typeof k === "string");
    }
  });
  return next;
}

function persist() {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* storage penuh atau diblokir - perubahan tetap berlaku untuk sesi ini */
  }
}

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Muat override dari localStorage (dipanggil sekali saat modul dimuat). */
export function loadOverrides() {
  const store = storage();
  if (!store) return;
  try {
    const raw = store.getItem(STORAGE_KEY);
    overrides = sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    overrides = emptyOverrides();
  }
}

loadOverrides();

export function getVersion() {
  return version;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOverrides() {
  return overrides;
}

/* --------------------------------------------------------------- effective */

function effective(base, list) {
  const state = overrides[list];
  const removed = new Set(state.removed);
  const seen = new Set();
  const out = [];

  const push = (agent) => {
    const entry = cleanEntry(agent);
    if (!entry.name) return;
    const key = agentKey(entry);
    if (removed.has(key) || seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };

  base.forEach(push);
  state.added.forEach(push);
  return out;
}

export function getEffectiveAgentMaster() {
  return effective(BASE_AGENT_MASTER, AGENT_LISTS.REGULAR);
}

export function getEffectiveSupportMaster() {
  return effective(BASE_SUPPORT_MASTER, AGENT_LISTS.SUPPORT);
}

export function getMasterAgentCount() {
  return getEffectiveAgentMaster().length;
}

export function getSupportAgentCount() {
  return getEffectiveSupportMaster().length;
}

function effectiveFor(list) {
  return list === AGENT_LISTS.SUPPORT
    ? getEffectiveSupportMaster()
    : getEffectiveAgentMaster();
}

function baseFor(list) {
  return list === AGENT_LISTS.SUPPORT ? BASE_SUPPORT_MASTER : BASE_AGENT_MASTER;
}

/** Agent dasar yang saat ini disembunyikan admin (untuk tombol Pulihkan). */
export function getRemovedAgents(list) {
  const removed = new Set(overrides[list].removed);
  return baseFor(list)
    .map(cleanEntry)
    .filter((agent) => removed.has(agentKey(agent)));
}

/** True bila agent ini ditambahkan admin (bukan bagian daftar dasar). */
export function isAddedAgent(list, agent) {
  const key = agentKey(agent);
  return overrides[list].added.some((added) => agentKey(added) === key);
}

/* --------------------------------------------------------------- mutations */

function findDuplicate(list, entry) {
  const nameKey = normalizeKey(entry.name);
  const ldapKey = normalizeKey(entry.ldap);
  return effectiveFor(list).find((agent) => {
    if (nameKey && normalizeKey(agent.name) === nameKey) return true;
    if (ldapKey && normalizeKey(agent.ldap) === ldapKey) return true;
    return false;
  });
}

export function addAgent(list, input) {
  const entry = cleanEntry(input);
  if (!entry.name) return { ok: false, message: "Nama agent wajib diisi." };

  const duplicate = findDuplicate(list, entry);
  if (duplicate) {
    return { ok: false, message: `"${duplicate.name}" sudah ada di daftar ini.` };
  }

  overrides[list].added.push(entry);
  persist();
  emit();
  return { ok: true };
}

export function removeAgent(list, key) {
  const state = overrides[list];
  const addedIndex = state.added.findIndex((agent) => agentKey(agent) === key);

  if (addedIndex !== -1) {
    state.added.splice(addedIndex, 1);
  } else if (!state.removed.includes(key)) {
    state.removed.push(key);
  }

  persist();
  emit();
  return { ok: true };
}

export function restoreAgent(list, key) {
  const index = overrides[list].removed.indexOf(key);
  if (index !== -1) overrides[list].removed.splice(index, 1);
  persist();
  emit();
  return { ok: true };
}

export function resetOverrides() {
  overrides = emptyOverrides();
  persist();
  emit();
  return { ok: true };
}
