import XLSX from "xlsx-js-style";
import { freezeHeaderRow } from "./xlsxFreeze.js";

/**
 * Export Excel.
 *
 * LOCKED: kolom, urutan, isi, tipe CASE_ID (text), dan nama file tidak berubah.
 * Yang ditambahkan hanya formatting (diminta pemilik aplikasi):
 * header berwarna + teks putih bold, semua sel rata tengah, border tipis,
 * autofilter, dan baris header yang dibekukan (freeze).
 *
 * Catatan teknis: SheetJS community tidak bisa menulis style maupun freeze pane,
 * jadi penulisan memakai xlsx-js-style (fork SheetJS yang menambahkan dukungan
 * style) dan freeze pane disuntikkan lewat util bersama src/utils/xlsxFreeze.js.
 */

export const EXPORT_FILENAME = "Final_Checker_Distribution_Report.xlsx";

export const EXPORT_HEADERS = [
  "No",
  "KATEGORI DATA",
  "CASE_ID",
  "CREATE_DATE",
  "CREATOR",
  "SCHEDULE",
  "LOG IN ID",
  "MSISDN",
  "ID 1",
  "CHECKER",
];

const HEADER_FILL_RGB = "FF1F4E79"; // navy, sama dengan warna identitas aplikasi
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

const COLUMN_WIDTHS = [
  { wch: 6 },
  { wch: 15 },
  { wch: 22 },
  { wch: 14 },
  { wch: 28 },
  { wch: 12 },
  { wch: 20 },
  { wch: 16 },
  { wch: 22 },
  { wch: 28 },
];

/** Baris export. Nama kolom dan urutannya terkunci. */
export function buildExportRows(finalMergedData) {
  return finalMergedData.map((item, index) => ({
    No: index + 1,
    "KATEGORI DATA": item.kategori,
    CASE_ID: String(item.caseId ?? ""),
    CREATE_DATE: String(item.createDate ?? ""),
    CREATOR: String(item.creator ?? ""),
    SCHEDULE: String(item.schedule ?? ""),
    "LOG IN ID": String(item.loginId ?? ""),
    MSISDN: String(item.msisdn ?? ""),
    "ID 1": String(item.id1 ?? ""),
    CHECKER: String(item.checker ?? ""),
  }));
}

/** Membangun isi file .xlsx (tanpa efek samping, bisa diuji di Node). */
export function buildExportFile(finalMergedData) {
  const worksheet = XLSX.utils.json_to_sheet(buildExportRows(finalMergedData), {
    header: EXPORT_HEADERS,
  });

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[address];
      if (!cell) continue;
      cell.s = row === 0 ? HEADER_STYLE : CELL_STYLE;
    }
  }

  worksheet["!cols"] = COLUMN_WIDTHS;
  worksheet["!autofilter"] = { ref: worksheet["!ref"] };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Checker Distribution");

  const array = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return freezeHeaderRow(array);
}

/** Unduh di browser dengan nama file yang sama seperti sebelumnya. */
export function exportExcelCombined(finalMergedData) {
  if (finalMergedData.length === 0) return;

  const bytes = buildExportFile(finalMergedData);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = EXPORT_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
