/**
 * Text helpers - ported verbatim from ownership_digital_checker_v6.html.
 * LOCKED: do not change the normalisation rules.
 */

export function cleanText(value) {
  return String(value ?? "")
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
