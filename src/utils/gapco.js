import XLSX from "xlsx-js-style";
import { freezeHeaderRow } from "./xlsxFreeze.js";

/**
 * GAP CO - validasi hasil export Ownership Digital terhadap file SC dan WCT.
 *
 * LOCKED: seluruh aturan di bawah adalah port apa adanya dari GAPCO_v2.html
 * (index SC/WCT, perbandingan REASON ID, Direction, Case Type, dan urutan kolom
 * hasil). Yang ditambahkan hanya formatting Excel (header berwarna, rata tengah,
 * border, freeze, autofilter) supaya seragam dengan export Ownership Digital.
 *
 * Input GAP = file `Final_Checker_Distribution_Report.xlsx` hasil export menu
 * Ownership Digital, jadi hasil export di menu itu bisa langsung dipakai di sini.
 */

export const GAP_EXPORT_FILENAME = "Hasil_Proses_GAP_CO.xlsx";

/** Kolom tambahan yang ditulis sistem di sebelah kanan data GAP. */
export const GAP_RESULT_KEYS = ["Result", "Keterangan"];

export const GAP_RESULT_LABELS = {
  done: "Done CO",
  belum: "Belum CO",
  tidak: "CO Tidak Sesuai",
};

/* ------------------------------------------------------------------ helpers */

export function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function getValue(row, candidates) {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const target = normalizeHeader(c);
    const exact = keys.find((k) => normalizeHeader(k) === target);
    if (
      exact !== undefined &&
      row[exact] !== undefined &&
      row[exact] !== null &&
      String(row[exact]).trim() !== ""
    ) {
      return row[exact];
    }
  }
  return "";
}

export function clean(value) {
  return String(value ?? "")
    .replace(/->/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function cleanCaseId(value) {
  return String(value ?? "").trim();
}

/* ------------------------------------------------------------------- index */

export function buildSCIndex(rows) {
  const index = {};
  rows.forEach((sc) => {
    const title = String(sc.Title ?? "").trim();
    const match = title.match(/C\d+/i);
    if (!match) return;
    const id = match[0];
    (index[id] ??= []).push(sc);
  });
  return index;
}

export function buildWCTIndex(rows) {
  const index = {};
  rows.forEach((wct) => {
    const title = String(wct.Title ?? "").trim();
    const match = title.match(/\d{16}/);
    if (!match) return;
    const id = match[0];
    (index[id] ??= []).push(wct);
  });
  return index;
}

/* ------------------------------------------------------------------ evaluasi */

export function evaluateRow(row, scIndex, wctIndex) {
  const id = cleanCaseId(getValue(row, ["CASE_ID", "Case ID", "Case Code"]));
  const kategori = String(getValue(row, ["KATEGORI DATA", "Kategori", "CATEGORY"]))
    .trim()
    .toUpperCase();
  const reasonRaw = getValue(row, ["REASON ID", "Reason ID", "REASON", "Reason"]);
  const reason = clean(reasonRaw);

  // Pertahankan validasi lama ketika file masih punya kolom REASON ID.
  if (kategori === "BIASA" || (kategori === "" && id.startsWith("C"))) {
    const matches = scIndex[id];
    if (!matches) return { Result: "Belum CO", Keterangan: "Case ID tidak ditemukan" };
    let found = false;
    let reasonMatch = false;
    for (const match of matches) {
      const reasonSC = clean(
        `${match["Reason 1"] || ""} ${match["Reason 2"] || ""} ${match["Reason 3"] || ""}`
      );
      const direction = String(match.Direction || "").trim();
      if (reason) {
        if (reasonSC === reason) {
          reasonMatch = true;
          if (direction === "Outbound") {
            found = true;
            break;
          }
        }
      } else if (direction === "Outbound") {
        found = true;
        break;
      }
    }
    if (found) return { Result: "Done CO", Keterangan: "OK" };
    if (reason) {
      return {
        Result: "CO Tidak Sesuai",
        Keterangan: reasonMatch ? "Direction bukan Outbound" : "Reason ID berbeda",
      };
    }
    return { Result: "CO Tidak Sesuai", Keterangan: "Direction bukan Outbound" };
  }

  // Cabang WCT. Export Ownership Digital tidak punya REASON ID, jadi validasi
  // memakai kecocokan Case ID dan status Case Type. Jika REASON ID ada,
  // perbandingan reason lama tetap dijalankan.
  if (kategori === "WCT" || (kategori === "" && /^\d{15,}$/.test(id))) {
    const matches = wctIndex[id];
    if (!matches) return { Result: "Belum CO", Keterangan: "Case ID tidak ditemukan" };
    let found = false;
    let reasonMatch = false;
    for (const match of matches) {
      const reasonWCT = clean(match["Case Service Type"]);
      const caseType = String(match["Case Type"] || "").trim();
      if (reason) {
        if (reasonWCT === reason) {
          reasonMatch = true;
          if (caseType === "Interaction Ticket") {
            found = true;
            break;
          }
        }
      } else if (caseType === "Interaction Ticket") {
        found = true;
        break;
      }
    }
    if (found) return { Result: "Done CO", Keterangan: "OK" };
    if (reason) {
      return {
        Result: "CO Tidak Sesuai",
        Keterangan: reasonMatch ? "Case Type bukan Interaction Ticket" : "Reason ID berbeda",
      };
    }
    return { Result: "CO Tidak Sesuai", Keterangan: "Case Type bukan Interaction Ticket" };
  }

  // Fallback untuk baris tak terduga / format lama.
  if (id.startsWith("C")) return { Result: "Belum CO", Keterangan: "Case ID tidak ditemukan" };
  if (/^\d{15,}$/.test(id)) return { Result: "Belum CO", Keterangan: "Case ID tidak ditemukan" };
  return { Result: "Belum CO", Keterangan: "Format Case ID tidak dikenali" };
}

/* -------------------------------------------------------------- processing */

/** Menilai seluruh baris GAP. Setiap baris = data GAP apa adanya + Result + Keterangan. */
export function processGapRows({ gapRows, scRows, wctRows }) {
  const scIndex = buildSCIndex(scRows || []);
  const wctIndex = buildWCTIndex(wctRows || []);
  return (gapRows || []).map((row) => ({ ...row, ...evaluateRow(row, scIndex, wctIndex) }));
}

/** Ringkasan untuk kartu metrik. */
export function summarizeGapResult(finalData) {
  const rows = finalData || [];
  return {
    total: rows.length,
    done: rows.filter((x) => x.Result === "Done CO").length,
    belum: rows.filter((x) => x.Result === "Belum CO").length,
    tidak: rows.filter((x) => x.Result === "CO Tidak Sesuai").length,
  };
}

/** True bila file GAP memakai format export baru (tanpa REASON ID). */
export function usesNewGapFormat(rows) {
  if (!rows.length) return true;
  return "KATEGORI DATA" in rows[0] || "CASE_ID" in rows[0];
}

/* ------------------------------------------------------------------ reading */

/**
 * Membaca sheet pertama sebuah file (.xlsx/.xls/.csv) menjadi array baris.
 * Sama seperti readFile() di GAPCO_v2.html: CSV dibaca binary, sisanya array.
 */
export async function readSheetRows(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  const workbook = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb =
          ext === "csv"
            ? XLSX.read(e.target.result, { type: "binary" })
            : XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        resolve(wb);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    if (ext === "csv") reader.readAsBinaryString(file);
    else reader.readAsArrayBuffer(file);
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Sheet pertama tidak ditemukan");
  return XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" });
}

/* ------------------------------------------------------------------- export */

const HEADER_FILL_RGB = "FF1F4E79"; // navy, sama dengan identitas aplikasi
const BORDER = { style: "thin", color: { rgb: "FFDDE4EC" } };
const CELL_BORDER = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

const HEADER_STYLE = {
  fill: { patternType: "solid", fgColor: { rgb: HEADER_FILL_RGB } },
  font: { bold: true, color: { rgb: "FFFFFFFF" }, sz: 11 },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: CELL_BORDER,
};

const CELL_STYLE = {
  alignment: { horizontal: "center", vertical: "center" },
  border: CELL_BORDER,
};

/**
 * Membangun isi file hasil (tanpa efek samping, bisa diuji di Node).
 * Kolom mengikuti data GAP apa adanya lalu Result + Keterangan - sama seperti
 * `XLSX.utils.json_to_sheet(window.finalData)` di GAPCO_v2.html.
 */
export function buildGapExportFile(finalData) {
  const worksheet = XLSX.utils.json_to_sheet(finalData || []);

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = row === 0 ? HEADER_STYLE : CELL_STYLE;
    }
  }

  const columnCount = range.e.c + 1;
  worksheet["!cols"] = Array.from({ length: columnCount }, (_, index) =>
    index === 0 ? { wch: 6 } : { wch: 22 }
  );
  worksheet["!autofilter"] = { ref: worksheet["!ref"] };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil");

  const array = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return freezeHeaderRow(array);
}

/** Unduh di browser dengan nama file yang sama seperti GAPCO_v2.html. */
export function exportGapExcel(finalData) {
  if (!finalData || finalData.length === 0) return;

  const bytes = buildGapExportFile(finalData);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = GAP_EXPORT_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
