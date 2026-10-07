import { cleanText, normalizeKey } from "./text.js";
import {
  getEffectiveAgentMaster,
  getEffectiveSupportMaster,
  getVersion,
  getMasterAgentCount,
  getSupportAgentCount,
} from "./agentStore.js";

/**
 * Agent master lookup - ported verbatim from ownership_digital_checker_v6.html.
 *
 * LOCKED RULES (tidak berubah):
 *  - Agent Utama = daftar utama; Support = daftar terpisah.
 *  - "Imeilia Salma" adalah alias yang tetap mengarah ke Agent Utama VADS.IMEILIA.
 *  - Nama dicocokkan lewat nama ternormalisasi ATAU LDAP ternormalisasi.
 *
 * Satu-satunya perubahan: sumber daftarnya kini daftar EFEKTIF dari agentStore,
 * sehingga admin bisa menambah/menghapus agent dari UI. Ketika tidak ada
 * perubahan admin, daftar efektif identik dengan daftar dasar di src/data/agents.js.
 */

function buildIndex(list) {
  const byName = {};
  const byLdap = {};

  list.forEach((agent) => {
    const name = cleanText(agent.name);
    const ldap = cleanText(agent.ldap);
    byName[normalizeKey(name)] = { ...agent, name, ldap };
    byLdap[normalizeKey(ldap)] = { ...agent, name, ldap };
  });

  return { byName, byLdap };
}

let cache = null;
let cacheVersion = -1;

function index() {
  const currentVersion = getVersion();
  if (cache && cacheVersion === currentVersion) return cache;

  const master = buildIndex(getEffectiveAgentMaster());
  const support = buildIndex(getEffectiveSupportMaster());

  // Alias creator untuk agent utama: Imeilia dapat muncul di WCT sebagai nama
  // lengkap maupun nama singkat. Keduanya tetap Agent Utama (bukan Support).
  const imeiliaMaster = master.byLdap[normalizeKey("VADS.IMEILIA")];
  if (imeiliaMaster) {
    master.byName[normalizeKey("Imeilia Salma")] = imeiliaMaster;
  }

  cache = { master, support };
  cacheVersion = currentVersion;
  return cache;
}

export function findRegularAgent(value) {
  const key = normalizeKey(value);
  if (!key) return null;
  const { byName, byLdap } = index().master;
  return byName[key] || byLdap[key] || null;
}

export function findSupportAgent(value) {
  const key = normalizeKey(value);
  if (!key) return null;
  const { byName, byLdap } = index().support;
  return byName[key] || byLdap[key] || null;
}

export function findMasterAgent(value) {
  return findRegularAgent(value);
}

export { getMasterAgentCount, getSupportAgentCount };
