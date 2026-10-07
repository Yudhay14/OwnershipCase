/**
 * Generates the Excel fixtures used by the browser smoke test.
 * Usage: node scripts/make-fixtures.mjs
 */
import XLSX from "xlsx-js-style";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../tests/fixtures");
mkdirSync(outDir, { recursive: true });

export const FILE_DATE = "2026-10-07";

function write(rows, file, sheetName = "Sheet1") {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
  writeFileSync(resolve(outDir, file), buffer);
}

write(
  [
    ["AGENT", "CREATE DATE", "CASE ID", "LOG IN ID", "MSISDN", "ID 1"],
    ["Yulia Prihatini", FILE_DATE, "1401294160510001", "VADS.YULI1524", "628110001", "ID-1"],
    ["Selfin Rahmansyah", FILE_DATE, "CASE-2", "VADS.SELFINR", "628110002", "ID-2"],
    ["Not A Real Agent", FILE_DATE, "CASE-3", "VADS.GHOST", "628110003", "ID-3"],
  ],
  "LogBiasa.xlsx"
);

write(
  [
    ["Creator", "Case Creation Time", "Case Code", "LOG IN ID", "Service Number", "ID1"],
    ["Arpin", FILE_DATE, "W-1", "VADS.Arpin1534", "628220001", "WID-1"],
    ["Eka Arsyad Handayani", FILE_DATE, "W-2", "VADS.EKAA", "628220002", "WID-2"],
    ["Gilang Ramadhan", FILE_DATE, "W-3", "VADS.GRAMADH", "628220003", "WID-3"],
  ],
  "CO_WCT.xlsx",
  "Log."
);

write(
  [
    ["No", "Agent Name", "x", "y", "Schedule WFM"],
    [1, "Yulia Prihatini", "", "", "5"],
    [2, "Arpin", "", "", "6a"],
    [3, "Selfin Rahmansyah", "", "", "15"],
  ],
  "ScheduleJakarta.xlsx",
  "Absenteeism"
);

write(
  [
    ["No", "Agent Name", "x", "y", "z", "Schedule WFM"],
    [1, "Gilang Ramadhan", "", "", "", "7"],
  ],
  "ScheduleJogja.xlsx",
  "Absenteism"
);

/* --------------------------------------------------------------- GAP CO */

// File GAP Export meniru hasil export menu Ownership Digital.
write(
  [
    [
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
    ],
    [1, "BIASA", "C100", FILE_DATE, "Yulia Prihatini", "5", "VADS.YULI1524", "628110001", "ID-1", "Yulia Prihatini"],
    [2, "BIASA", "C101", FILE_DATE, "Arpin", "6a", "VADS.Arpin1534", "628110002", "ID-2", "Arpin"],
    // CASE_ID sengaja ditulis sebagai teks agar tidak jadi notasi ilmiah.
    [3, "WCT", "6281234567890123", FILE_DATE, "Gilang Ramadhan", "7", "VADS.GRAMADH", "628110003", "ID-3", "Gilang Ramadhan"],
  ],
  "GapExport.xlsx"
);

write(
  [
    ["Title", "Reason 1", "Reason 2", "Reason 3", "Direction"],
    ["C100 - keluhan jaringan", "R-JARINGAN", "", "", "Outbound"],
    ["C101 - keluhan tagihan", "R-TAGIHAN", "", "", "Inbound"],
  ],
  "SC.xlsx"
);

write(
  [
    ["Title", "Case Type", "Case Service Type"],
    ["6281234567890123 - WCT", "Interaction Ticket", "CS-PAKET"],
  ],
  "WCTRef.xlsx"
);

console.log(`Fixtures written to ${outDir}`);
