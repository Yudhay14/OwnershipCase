import XLSX from "xlsx-js-style";
import { cleanText } from "./text.js";

/**
 * Workbook readers - ported verbatim from ownership_digital_checker_v6.html.
 * LOCKED: sheet selection dan opsi sheet_to_json harus tetap seperti aslinya.
 *
 * Dua penyesuaian yang TIDAK mengubah hasil:
 *  - `dense: true` membuat SheetJS memakai array internal, ±3x lebih cepat dan
 *    jauh lebih hemat pada file besar. Isi baris tetap identik, dibuktikan
 *    `scripts/check-dense-parity.mjs` dan test "mode dense menghasilkan baris
 *    identik" di tests/pipeline.test.mjs.
 *  - Fungsi dipisah menjadi varian berbasis buffer supaya bisa dijalankan di
 *    Web Worker (file besar ±40-50 MB bikin main thread beku kalau di sini).
 */

const READ_OPTIONS = { type: "array", dense: true };
const SHEET_OPTIONS = { raw: false, defval: "" };

/** Log Biasa: sheet pertama, raw:false. */
export function parseLogBiasaBuffer(buffer) {
  try {
    const workbook = XLSX.read(new Uint8Array(buffer), READ_OPTIONS);
    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
      SHEET_OPTIONS
    );
    return { ok: true, rows };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Gagal membaca File Log Biasa." };
  }
}

/** CO WCT: sheet bernama "Log." (case-insensitive), raw:false. */
export function parseLogWCTBuffer(buffer) {
  try {
    const workbook = XLSX.read(new Uint8Array(buffer), READ_OPTIONS);
    const sheetName = workbook.SheetNames.find(
      (name) => cleanText(name).toLowerCase() === "log."
    );
    if (!sheetName) {
      return { ok: false, message: 'Sheet "Log." tidak ditemukan.' };
    }
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], SHEET_OPTIONS);
    return { ok: true, rows };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Gagal membaca File WCT." };
  }
}

/**
 * Wrapper berbasis File. Dipakai sebagai jalur utama di Node/test dan sebagai
 * fallback di browser kalau Web Worker tidak tersedia.
 */
export async function readLogBiasa(file) {
  try {
    return parseLogBiasaBuffer(await file.arrayBuffer());
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Gagal membaca File Log Biasa." };
  }
}

export async function readLogWCT(file) {
  try {
    return parseLogWCTBuffer(await file.arrayBuffer());
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Gagal membaca File WCT." };
  }
}
