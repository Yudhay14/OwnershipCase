import XLSX from "xlsx-js-style";
import { cleanText, normalizeKey } from "./text.js";
import { findRegularAgent, findMasterAgent } from "./agents.js";

/**
 * Schedule helpers.
 *
 * LOCKED RULES:
 *  - Jakarta sheet "Absenteeism" (case-insensitive), Agent Name col B, Schedule WFM col E.
 *  - Jogja   sheet "Absenteism"  (case-insensitive), Agent Name col B, Schedule WFM col F.
 *  - The whole sheet is scanned, so extra section/header rows are skipped naturally.
 *  - Only names that match the primary Agent Utama list are mapped.
 *  - Eligible window is schedule start >= 05:00 and < 15:00.
 */

export function scheduleHour(scheduleValue) {
  const s = cleanText(scheduleValue).toUpperCase();
  if (!s || ["X", "OFF", "L", "AL", "ML", "-"].includes(s)) return null;

  // Supports 5, 5a, 5b, 5:30, 12:30, 18:30, etc.
  const match = s.match(/^(\d{1,2})(?::(\d{1,2}))?/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  return hour + minute / 60;
}

export function isEligibleSchedule(scheduleValue) {
  const hour = scheduleHour(scheduleValue);
  return hour !== null && hour >= 5 && hour < 15;
}

export function scheduleStatus(scheduleValue) {
  const s = cleanText(scheduleValue);
  if (!s) return "TIDAK ADA SCHEDULE";
  if (isEligibleSchedule(s)) return "ELIGIBLE 05-14";
  return "TIDAK ELIGIBLE";
}

/**
 * Legacy `getScheduleForAgent(agentValue)`: resolves the agent first, then looks
 * the schedule up by canonical name. Jakarta is the deterministic fallback.
 */
export function getScheduleForAgent(agentValue, scheduleJakarta, scheduleJogja) {
  const master = findMasterAgent(agentValue);
  if (!master) return null;
  const key = normalizeKey(master.name);

  // If an agent exists in both files, Jakarta is preferred only as a deterministic
  // fallback. Normally an agent should belong to one location.
  return scheduleJakarta[key] || scheduleJogja[key] || null;
}

/** Legacy `getEligibleCountText()`: Jakarta wins over Jogja per agent. */
export function getEligibleCount(scheduleJakarta, scheduleJogja) {
  const map = {};
  Object.values(scheduleJakarta).forEach((x) => (map[normalizeKey(x.agentName)] = x));
  Object.values(scheduleJogja).forEach((x) => {
    if (!map[normalizeKey(x.agentName)]) map[normalizeKey(x.agentName)] = x;
  });
  return Object.values(map).filter((x) => isEligibleSchedule(x.schedule)).length;
}

/**
 * Reads one Schedule workbook and returns { ok, result } or { ok:false, message }.
 *
 * IMPORTANT:
 * Use raw:false so Excel time-formatted cells are returned by SheetJS as their
 * displayed values (for example 0.7708333333333334 -> "18:30") instead of the
 * raw Excel serial. This keeps the existing schedule logic compatible while
 * avoiding an extra conversion pass over the full sheet.
 */
export async function parseScheduleWorkbook(file, location) {
  const targetSheetName = location === "JAKARTA" ? "Absenteeism" : "Absenteism";

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", dense: true });

    const sheetName = workbook.SheetNames.find(
      (name) => cleanText(name).toLowerCase() === targetSheetName.toLowerCase()
    );

    if (!sheetName) {
      return {
        ok: false,
        message: `Sheet "${targetSheetName}" tidak ditemukan pada Schedule ${location}.`,
      };
    }

    const sheet = workbook.Sheets[sheetName];

    // raw:false preserves Excel's visible time format, e.g. 18:30.
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: "",
      dense: true,
    });

    const result = {};

    const nameCol = 1; // B
    const scheduleCol = location === "JAKARTA" ? 4 : 5; // E / F

    rows.forEach((row) => {
      const rawName = cleanText(row[nameCol]);
      const rawSchedule = cleanText(row[scheduleCol]);

      if (!rawName || !rawSchedule) return;
      if (normalizeKey(rawName) === "agentname") return;
      if (normalizeKey(rawSchedule) === "schedulewfm") return;

      const master = findRegularAgent(rawName);
      if (!master) return; // section titles/header rows/support agents are ignored

      result[normalizeKey(master.name)] = {
        agentName: master.name,
        ldap: master.ldap,
        schedule: rawSchedule,
        location,
      };
    });

    return { ok: true, result };
  } catch (err) {
    console.error(err);
    return { ok: false, message: `Gagal membaca Schedule ${location}.` };
  }
}
