import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import XLSX from "xlsx-js-style";
import { unzipSync, strFromU8 } from "fflate";

import { readLogBiasa, readLogWCT } from "../src/utils/readWorkbooks.js";
import { parseScheduleWorkbook, getEligibleCount } from "../src/utils/schedule.js";
import { computeMergedData, distributeCheckers } from "../src/utils/processing.js";
import {
  buildExportFile,
  EXPORT_FILENAME,
  EXPORT_HEADERS,
} from "../src/utils/exportExcel.js";
import { formatDateToString } from "../src/utils/dates.js";

/**
 * Pipeline test: drives the ported readers + algorithm with synthetic workbooks
 * and asserts the LOCKED rules (ownership, redistribution, Support handling,
 * creator preservation, export shape).
 */

// Cell value written into every fixture; the filter date is whatever the shared
// date normaliser produces from it, so the test is timezone independent.
const FILE_DATE = "2026-10-07";
const DAY = formatDateToString(FILE_DATE);

function makeFile(aoa, name, options = {}) {
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, options.sheetName || "Sheet1");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new File([buffer], name);
}

/* --------------------------------------------------------------- fixtures */

// Schedule WFM is a text value ("5", "6a", "15", "OFF") exactly as the real files.
const jakartaRows = [
  ["No", "Agent Name", "x", "y", "Schedule WFM"],
  [1, "Yulia Prihatini", "", "", "5"],
  [2, "Arpin", "", "", "6a"],
  [3, "Selfin Rahmansyah", "", "", "15"],
  [4, "Ennita Batubara", "", "", "OFF"],
  [5, "Eka Arsyad Handayani", "", "", "7"], // Support agent -> ignored in schedule
  [6, "Not A Real Agent", "", "", "8"], // unknown -> ignored
];

const jogjaRows = [
  ["No", "Agent Name", "x", "y", "z", "Schedule WFM"],
  [1, "Gilang Ramadhan", "", "", "", "7"],
  [2, "Selfin Rahmansyah", "", "", "", "16"],
];

const biasaRows = [
  ["AGENT", "CREATE DATE", "CASE ID", "LOG IN ID", "MSISDN", "ID 1"],
  ["Yulia Prihatini", FILE_DATE, "1401294160510001", "VADS.YULI1524", "62811", "ID-1"],
  ["Selfin Rahmansyah", FILE_DATE, "CASE-2", "VADS.SELFINR", "62812", "ID-2"],
  ["Not A Real Agent", FILE_DATE, "CASE-3", "VADS.GHOST", "62813", "ID-3"],
  ["Yulia Prihatini", "2026-09-01", "CASE-4", "VADS.YULI1524", "62814", "ID-4"],
];

const wctRows = [
  ["Creator", "Case Creation Time", "Case Code", "LOG IN ID", "Service Number", "ID1"],
  ["Arpin", FILE_DATE, "W-1", "VADS.Arpin1534", "62821", "WID-1"],
  ["Eka Arsyad Handayani", FILE_DATE, "W-2", "VADS.EKAA", "62822", "WID-2"],
  ["Gilang Ramadhan", FILE_DATE, "W-3", "VADS.GRAMADH", "62823", "WID-3"],
  ["Imeilia Salma", FILE_DATE, "W-4", "VADS.IMEILIA", "62824", "WID-4"],
  ["Totally Unknown", FILE_DATE, "W-5", "VADS.NOPE", "62825", "WID-5"],
];

/* ------------------------------------------------------------------ tests */

test("readers load the Log Biasa first sheet and the WCT Log. sheet", async () => {
  const biasa = await readLogBiasa(makeFile(biasaRows, "log-biasa.xlsx"));
  assert.equal(biasa.ok, true);
  assert.equal(biasa.rows.length, 4);
  assert.equal(biasa.rows[0].AGENT, "Yulia Prihatini");

  const wct = await readLogWCT(makeFile(wctRows, "wct.xlsx", { sheetName: "Log." }));
  assert.equal(wct.ok, true);
  assert.equal(wct.rows.length, 5);
});

test("WCT reader rejects a workbook without a Log. sheet", async () => {
  const res = await readLogWCT(makeFile(wctRows, "wct.xlsx", { sheetName: "Other" }));
  assert.equal(res.ok, false);
  assert.equal(res.message, 'Sheet "Log." tidak ditemukan.');
});

test("schedule parser maps Jakarta (E) and Jogja (F) and ignores non-master rows", async () => {
  const jakarta = await parseScheduleWorkbook(
    makeFile(jakartaRows, "jakarta.xlsx", { sheetName: "Absenteeism" }),
    "JAKARTA"
  );
  assert.equal(jakarta.ok, true);
  // 4 primary agents mapped; Support + unknown row dropped.
  assert.equal(Object.keys(jakarta.result).length, 4);

  const jogja = await parseScheduleWorkbook(
    makeFile(jogjaRows, "jogja.xlsx", { sheetName: "Absenteism" }),
    "JOGJA"
  );
  assert.equal(jogja.ok, true);
  assert.equal(Object.keys(jogja.result).length, 2);
});

test("schedule parser reports a missing sheet", async () => {
  const res = await parseScheduleWorkbook(
    makeFile(jakartaRows, "jakarta.xlsx", { sheetName: "Wrong" }),
    "JAKARTA"
  );
  assert.equal(res.ok, false);
  assert.equal(res.message, 'Sheet "Absenteeism" tidak ditemukan pada Schedule JAKARTA.');
});

test("processing applies ownership, redistribution and Support rules", async () => {
  const biasa = await readLogBiasa(makeFile(biasaRows, "log-biasa.xlsx"));
  const wct = await readLogWCT(makeFile(wctRows, "wct.xlsx", { sheetName: "Log." }));
  const jakarta = await parseScheduleWorkbook(
    makeFile(jakartaRows, "jakarta.xlsx", { sheetName: "Absenteeism" }),
    "JAKARTA"
  );
  const jogja = await parseScheduleWorkbook(
    makeFile(jogjaRows, "jogja.xlsx", { sheetName: "Absenteism" }),
    "JOGJA"
  );

  const result = computeMergedData({
    rawDataBiasa: biasa.rows,
    rawDataWCT: wct.rows,
    scheduleJakarta: jakarta.result,
    scheduleJogja: jogja.result,
    date1: DAY,
    date2: "",
  });

  // Unknown creators and out-of-range dates must be dropped.
  assert.equal(result.cBiasaGlobal, 2);
  assert.equal(result.cWCTGlobal, 4);
  assert.equal(result.finalMergedData.length, 6);

  const byCase = Object.fromEntries(result.finalMergedData.map((r) => [r.caseId, r]));

  // Creator is preserved verbatim; schedule comes from the schedule files.
  assert.equal(byCase["1401294160510001"].creator, "Yulia Prihatini");
  assert.equal(byCase["1401294160510001"].schedule, "5");
  assert.equal(byCase["CASE-2"].schedule, "15");

  // Support keeps schedule "Support" and never becomes the checker.
  assert.equal(byCase["W-2"].creator, "Eka Arsyad Handayani");
  assert.equal(byCase["W-2"].schedule, "Support");
  assert.equal(byCase["W-2"].checkerType, "support");

  // Imeilia alias resolves to the primary agent VADS.IMEILIA.
  assert.equal(byCase["W-4"].creator, "Imeilia Salma");
  assert.equal(byCase["W-4"].creatorCanonical, "Imeilia yulinda salma");

  // Jogja schedule is picked up for Gilang.
  assert.equal(byCase["W-3"].schedule, "7");
  assert.equal(byCase["W-3"].scheduleLocation, "JOGJA");

  // ------------------------------------------------------------ distribute
  const distributed = distributeCheckers(result.finalMergedData, jakarta.result, jogja.result);
  assert.equal(distributed.ok, true);

  // Eligible agents duty 05-14, in master order: Yulia, Arpin, Gilang.
  assert.equal(distributed.eligibleAgentsCount, 3);
  // Redistribution pool: Selfin's Biasa case (15), the Support WCT case, and
  // Imeilia's WCT case (valid agent, but no schedule in either file).
  assert.equal(distributed.redisCount, 3);

  const after = Object.fromEntries(distributed.finalMergedData.map((r) => [r.caseId, r]));

  // Creator with an eligible schedule keeps ownership.
  assert.equal(after["1401294160510001"].checkerType, "ownership");
  assert.equal(after["1401294160510001"].checker, "Yulia Prihatini");
  assert.equal(after["W-1"].checker, "Arpin");
  assert.equal(after["W-3"].checker, "Gilang Ramadhan");

  // Round-robin over the pool: pool[0] -> Yulia, pool[1] -> Arpin, pool[2] -> Gilang.
  assert.equal(after["CASE-2"].checkerType, "redistribution");
  assert.equal(after["CASE-2"].checker, "Yulia Prihatini");
  assert.equal(after["W-2"].checkerType, "redistribution");
  assert.equal(after["W-2"].checker, "Arpin");
  assert.equal(after["W-4"].checkerType, "redistribution");
  assert.equal(after["W-4"].checker, "Gilang Ramadhan");

  // Creator is never rewritten, and the checker is a name (never an LDAP).
  distributed.finalMergedData.forEach((row) => {
    assert.equal(/VADS\./i.test(row.checker), false, `checker is an LDAP: ${row.checker}`);
  });
  assert.equal(after["W-2"].creator, "Eka Arsyad Handayani");
});

test("distribution bails out when no agent is duty 05-14", async () => {
  const ineligible = [
    ["No", "Agent Name", "x", "y", "Schedule WFM"],
    [1, "Yulia Prihatini", "", "", "16"],
  ];
  const jakarta = await parseScheduleWorkbook(
    makeFile(ineligible, "jakarta.xlsx", { sheetName: "Absenteeism" }),
    "JAKARTA"
  );
  assert.equal(jakarta.ok, true);

  const res = distributeCheckers([], jakarta.result, {});
  assert.equal(res.ok, false);
  assert.equal(res.message, "Tidak ada agent dengan schedule 05-14 yang ditemukan.");
});

test("eligible count prefers Jakarta over Jogja and only counts 05-14", async () => {
  const jakarta = await parseScheduleWorkbook(
    makeFile(jakartaRows, "jakarta.xlsx", { sheetName: "Absenteeism" }),
    "JAKARTA"
  );
  const jogja = await parseScheduleWorkbook(
    makeFile(jogjaRows, "jogja.xlsx", { sheetName: "Absenteism" }),
    "JOGJA"
  );
  // Yulia(5), Arpin(6a) from Jakarta + Gilang(7) from Jogja = 3
  // Selfin is in both files with ineligible values, so it is not counted.
  assert.equal(getEligibleCount(jakarta.result, jogja.result), 3);
});

test("export keeps the locked data shape and adds the requested formatting", () => {
  const rows = [
    {
      kategori: "BIASA",
      caseId: "1401294160510001",
      createDate: DAY,
      creator: "Yulia Prihatini",
      schedule: "5",
      loginId: "VADS.YULI1524",
      msisdn: "62811",
      id1: "ID-1",
      checker: "Yulia Prihatini",
      checkerType: "ownership",
    },
    {
      kategori: "WCT",
      caseId: "CASE-2",
      createDate: DAY,
      creator: "Selfin Rahmansyah",
      schedule: "15",
      loginId: "VADS.SELFINR",
      msisdn: "62812",
      id1: "ID-2",
      checker: "Yulia Prihatini",
      checkerType: "redistribution",
    },
  ];

  const bytes = buildExportFile(rows);
  const dir = mkdtempSync(resolve(tmpdir(), "od-export-"));
  const file = resolve(dir, EXPORT_FILENAME);
  writeFileSync(file, bytes);

  try {
    const archive = unzipSync(new Uint8Array(bytes));
    const sheetXml = strFromU8(archive["xl/worksheets/sheet1.xml"]);
    const stylesXml = strFromU8(archive["xl/styles.xml"]);

    // Header: warna navy + teks putih bold.
    assert.match(stylesXml, /1F4E79/, "header fill colour is missing");
    assert.match(stylesXml, /FFFFFFFF/, "white bold header font is missing");

    // Semua sel rata tengah + border tipis.
    assert.match(stylesXml, /horizontal="center"/);
    assert.match(stylesXml, /vertical="center"/);
    assert.match(stylesXml, /<left style="thin"/);

    // Freeze header + autofilter.
    assert.match(sheetXml, /<pane[^>]*state="frozen"/, "header row is not frozen");
    assert.match(sheetXml, /<autoFilter /);

    // Setiap sel harus punya style index.
    const cells = [...sheetXml.matchAll(/<c r="[A-Z]+\d+"[^>]*>/g)].map((m) => m[0]);
    // 1 baris header + 2 baris data, 10 kolom.
    assert.equal(cells.length, 30, "expected 3 rows x 10 columns");
    assert.ok(
      cells.every((cell) => /\bs="\d+"/.test(cell)),
      "every exported cell must carry a style index"
    );

    // Kontrak data tidak boleh berubah.
    const book = XLSX.read(readFileSync(file), { type: "buffer" });
    assert.deepEqual(book.SheetNames, ["Checker Distribution"]);

    const sheet = book.Sheets["Checker Distribution"];
    const header = XLSX.utils
      .sheet_to_json(sheet, { header: 1, raw: true })[0]
      .map(String);

    assert.deepEqual(header, EXPORT_HEADERS);
    assert.equal(header.includes("CHECKER TYPE"), false);

    // Case ID must stay a string cell (no scientific notation).
    assert.equal(sheet.C2.t, "s");
    assert.equal(sheet.C2.v, "1401294160510001");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
