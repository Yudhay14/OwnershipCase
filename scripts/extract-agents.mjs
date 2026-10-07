/**
 * Extracts the agentMaster and supportMaster arrays from the legacy HTML file
 * and writes them to src/data/agents.js.
 *
 * Data is LOCKED: this script copies the arrays verbatim (JSON) so no agent is
 * added, removed or renamed during the UI migration.
 *
 * Usage: node scripts/extract-agents.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const legacyPath = resolve(root, "ownership_digital_checker_v6.html");
const html = readFileSync(legacyPath, "utf8");

function extractArray(name) {
  const declIndex = html.indexOf(`const ${name} = [`);
  if (declIndex === -1) throw new Error(`Array ${name} not found in legacy HTML.`);
  const open = html.indexOf("[", declIndex);
  const close = html.indexOf("\n];", open);
  if (close === -1) throw new Error(`Could not find end of ${name}.`);
  const literal = html.slice(open, close + 2);
  return JSON.parse(literal);
}

const agentMaster = extractArray("agentMaster");
const supportMaster = extractArray("supportMaster");

function assertShape(list, label) {
  list.forEach((entry, i) => {
    if (typeof entry?.name !== "string" || typeof entry?.ldap !== "string") {
      throw new Error(`${label}[${i}] is missing name/ldap: ${JSON.stringify(entry)}`);
    }
  });
}

assertShape(agentMaster, "agentMaster");
assertShape(supportMaster, "supportMaster");

const outDir = resolve(root, "src/data");
mkdirSync(outDir, { recursive: true });

const banner = `/**
 * LOCKED DATA - ported verbatim from ownership_digital_checker_v6.html.
 * Do not edit by hand. Regenerate with: node scripts/extract-agents.mjs
 *
 * agentMaster  : ${agentMaster.length} entries
 * supportMaster: ${supportMaster.length} entries
 */`;

const body = `${banner}

export const agentMaster = ${JSON.stringify(agentMaster, null, 2)};

export const supportMaster = ${JSON.stringify(supportMaster, null, 2)};
`;

writeFileSync(resolve(outDir, "agents.js"), body, "utf8");

console.log(
  `Wrote src/data/agents.js -> agentMaster:${agentMaster.length} supportMaster:${supportMaster.length}`
);
