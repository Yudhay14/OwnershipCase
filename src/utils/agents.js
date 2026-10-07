import { agentMaster, supportMaster } from "../data/agents.js";
import { cleanText, normalizeKey } from "./text.js";

/**
 * Agent master lookup - ported verbatim from ownership_digital_checker_v6.html.
 *
 * LOCKED RULES:
 *  - agentMaster is the primary Agent Utama list (234 agents).
 *  - supportMaster is the separate extra Support list (27 agents).
 *  - "Imeilia Salma" is an alias that still resolves to the primary agent
 *    VADS.IMEILIA (never Support).
 *  - "VADS.IMEILIA" ("Imeilia yulinda salma") is Agent Utama.
 *  - Names are matched by normalised name OR normalised LDAP.
 */

const masterByName = {};
const masterByLdap = {};

agentMaster.forEach((agent) => {
  const name = cleanText(agent.name);
  const ldap = cleanText(agent.ldap);
  masterByName[normalizeKey(name)] = { ...agent, name, ldap };
  masterByLdap[normalizeKey(ldap)] = { ...agent, name, ldap };
});

// Alias creator untuk agent utama: Imeilia dapat muncul di WCT
// sebagai nama lengkap maupun nama singkat. Keduanya tetap dianggap
// agent utama (bukan Support) dan mengarah ke master yang sama.
const imeiliaMaster = masterByLdap[normalizeKey("VADS.IMEILIA")];
if (imeiliaMaster) {
  masterByName[normalizeKey("Imeilia Salma")] = imeiliaMaster;
}

export const supportByName = {};
export const supportByLdap = {};
supportMaster.forEach((agent) => {
  const name = cleanText(agent.name);
  const ldap = cleanText(agent.ldap);
  supportByName[normalizeKey(name)] = { ...agent, name, ldap };
  supportByLdap[normalizeKey(ldap)] = { ...agent, name, ldap };
});

export function findRegularAgent(value) {
  const key = normalizeKey(value);
  if (!key) return null;
  return masterByName[key] || masterByLdap[key] || null;
}

export function findSupportAgent(value) {
  const key = normalizeKey(value);
  if (!key) return null;
  return supportByName[key] || supportByLdap[key] || null;
}

export function findMasterAgent(value) {
  return findRegularAgent(value);
}

export const MASTER_AGENT_COUNT = agentMaster.length;
