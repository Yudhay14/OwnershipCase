import XLSX from "xlsx-js-style";
import { cleanText } from "./text.js";

/**
 * Workbook readers - ported verbatim from ownership_digital_checker_v6.html.
 * LOCKED: sheet selection and sheet_to_json options must stay as-is.
 */

/** Log Biasa: first sheet, raw:false. */
export async function readLogBiasa(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      raw: false,
      defval: "",
    });
    return { ok: true, rows };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Gagal membaca File Log Biasa." };
  }
}

/** CO WCT: sheet named "Log." (case-insensitive), raw:false. */
export async function readLogWCT(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const sheetName = workbook.SheetNames.find(
      (name) => cleanText(name).toLowerCase() === "log."
    );
    if (!sheetName) {
      return { ok: false, message: 'Sheet "Log." tidak ditemukan.' };
    }
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,
      defval: "",
    });
    return { ok: true, rows };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Gagal membaca File WCT." };
  }
}
