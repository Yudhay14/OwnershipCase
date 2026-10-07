import { cleanText } from "./text.js";

/**
 * Column resolver - ported verbatim from ownership_digital_checker_v6.html.
 * LOCKED: exact-match first, then the case-insensitive "includes" fallback.
 */
export function getColumn(row, candidates, fallback = "") {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const exact = keys.find((k) => cleanText(k).toLowerCase() === candidate.toLowerCase());
    if (
      exact !== undefined &&
      row[exact] !== undefined &&
      row[exact] !== null &&
      String(row[exact]).trim() !== ""
    ) {
      return row[exact];
    }
  }
  for (const key of keys) {
    const ck = cleanText(key).toLowerCase();
    for (const candidate of candidates) {
      const cc = candidate.toLowerCase();
      if (ck.includes(cc)) {
        return row[key];
      }
    }
  }
  return fallback;
}
