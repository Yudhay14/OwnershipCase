import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import XLSX from "xlsx-js-style";
import { unzipSync, strFromU8 } from "fflate";

import {
  normalizeHeader,
  getValue,
  clean,
  cleanCaseId,
  buildSCIndex,
  buildWCTIndex,
  evaluateRow,
  processGapRows,
  summarizeGapResult,
  usesNewGapFormat,
  buildGapExportFile,
  GAP_EXPORT_FILENAME,
  GAP_RESULT_KEYS,
} from "../src/utils/gapco.js";

/**
 * Parity test GAP CO: helper ported harus berperilaku persis sama dengan fungsi
 * yang masih ada di GAPCO_v2.html. Fungsi diekstrak dari file HTML apa adanya.
 */

const here = dirname(fileURLToPath(import.meta.url));
const legacyHtml = readFileSync(resolve(here, "../GAPCO_v2.html"), "utf8");

function extractFunction(name) {
  const start = legacyHtml.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `legacy function ${name} not found`);
  const open = legacyHtml.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < legacyHtml.length; i += 1) {
    const ch = legacyHtml[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return legacyHtml.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const HELPERS = [
  "normalizeHeader",
  "getValue",
  "clean",
  "cleanCaseId",
  "buildSCIndex",
  "buildWCTIndex",
  "evaluateRow",
];

const legacySource =
  HELPERS.map(extractFunction).join("\n") + `\nreturn { ${HELPERS.join(", ")} };`;
// eslint-disable-next-line no-new-func
const legacy = new Function(legacySource)();

const ported = {
  normalizeHeader,
  getValue,
  clean,
  cleanCaseId,
  buildSCIndex,
  buildWCTIndex,
  evaluateRow,
};

/* --------------------------------------------------------------- mock files */

const scRows = [
  {
    Title: "C100 - keluhan jaringan",
    "Reason 1": "R-JARINGAN",
    "Reason 2": "",
    "Reason 3": "",
    Direction: "Outbound",
  },
  {
    Title: "C101 - keluhan tagihan",
    "Reason 1": "R-TAGIHAN",
    "Reason 2": "",
    "Reason 3": "",
    Direction: "Inbound",
  },
  {
    Title: "C102 - keluhan lain",
    "Reason 1": "R-A",
    "Reason 2": "R-B",
    "Reason 3": "",
    Direction: "Outbound",
  },
];

const wctRows = [
  {
    Title: "6281234567890123 - WCT",
    "Case Type": "Interaction Ticket",
    "Case Service Type": "CS-PAKET",
  },
  { Title: "6281234567890124 - WCT", "Case Type": "Request", "Case Service Type": "CS-LAIN" },
];

const gapRows = [
  { "KATEGORI DATA": "BIASA", CASE_ID: "C100" },
  { "KATEGORI DATA": "BIASA", CASE_ID: "C101" },
  { "KATEGORI DATA": "BIASA", CASE_ID: "C102" },
  { "KATEGORI DATA": "BIASA", CASE_ID: "C999" },
  { "KATEGORI DATA": "WCT", CASE_ID: "6281234567890123" },
  { "KATEGORI DATA": "WCT", CASE_ID: "6281234567890124" },
  { "KATEGORI DATA": "WCT", CASE_ID: "6281234567899999" },
  { "REASON ID": "R-JARINGAN", CASE_ID: "C100" },
  { "REASON ID": "R-TAGIHAN", CASE_ID: "C101" },
  { "REASON ID": "R-TAGIHAN", CASE_ID: "C102" },
  { CASE_ID: "ABC" },
  { CASE_ID: "" },
  { KATEGORI: "biasa", CASE_ID: "c100" },
  { CATEGORY: "wct", "Case ID": "6281234567890123" },
];

/* ------------------------------------------------------------------- tests */

test("GAP CO helpers match the legacy implementation", () => {
  const valueCases = ["", "  hello world ", "KATEGORI DATA", "kategori  data", null, undefined];
  for (const value of valueCases) {
    assert.equal(ported.normalizeHeader(value), legacy.normalizeHeader(value));
  }

  const row = { "CASE ID": "C-1", "Case Code": "  ", "KATEGORI DATA": "BIASA" };
  const candidateSets = [
    ["CASE_ID", "Case ID", "Case Code"],
    ["KATEGORI DATA", "Kategori", "CATEGORY"],
    ["REASON ID", "Reason"],
    ["NOTHING"],
  ];
  for (const candidates of candidateSets) {
    assert.equal(
      JSON.stringify(ported.getValue(row, candidates)),
      JSON.stringify(legacy.getValue(row, candidates))
    );
  }

  for (const value of ["", " A -> B ", "R-JARINGAN", null, undefined, "  x   y "]) {
    assert.equal(ported.clean(value), legacy.clean(value));
    assert.equal(ported.cleanCaseId(value), legacy.cleanCaseId(value));
  }
});

test("GAP CO indexes match the legacy implementation", () => {
  assert.equal(
    JSON.stringify(ported.buildSCIndex(scRows)),
    JSON.stringify(legacy.buildSCIndex(scRows))
  );
  assert.equal(
    JSON.stringify(ported.buildWCTIndex(wctRows)),
    JSON.stringify(legacy.buildWCTIndex(wctRows))
  );
});

test("evaluateRow matches the legacy implementation on every row", () => {
  const portedSC = ported.buildSCIndex(scRows);
  const portedWCT = ported.buildWCTIndex(wctRows);
  const legacySC = legacy.buildSCIndex(scRows);
  const legacyWCT = legacy.buildWCTIndex(wctRows);

  for (const row of gapRows) {
    const expected = legacy.evaluateRow(row, legacySC, legacyWCT);
    const actual = ported.evaluateRow(row, portedSC, portedWCT);
    assert.deepEqual(actual, expected, `evaluateRow(${JSON.stringify(row)})`);
  }
});

test("GAP CO result rules are locked", () => {
  const scIndex = buildSCIndex(scRows);
  const wctIndex = buildWCTIndex(wctRows);

  // BIASA dengan Direction Outbound -> Done CO.
  assert.deepEqual(evaluateRow({ "KATEGORI DATA": "BIASA", CASE_ID: "C100" }, scIndex, wctIndex), {
    Result: "Done CO",
    Keterangan: "OK",
  });

  // BIASA dengan Direction Inbound -> CO Tidak Sesuai.
  assert.deepEqual(evaluateRow({ "KATEGORI DATA": "BIASA", CASE_ID: "C101" }, scIndex, wctIndex), {
    Result: "CO Tidak Sesuai",
    Keterangan: "Direction bukan Outbound",
  });

  // Case ID tidak ada di SC -> Belum CO.
  assert.deepEqual(evaluateRow({ "KATEGORI DATA": "BIASA", CASE_ID: "C999" }, scIndex, wctIndex), {
    Result: "Belum CO",
    Keterangan: "Case ID tidak ditemukan",
  });

  // WCT dengan Case Type Interaction Ticket -> Done CO.
  assert.deepEqual(
    evaluateRow({ "KATEGORI DATA": "WCT", CASE_ID: "6281234567890123" }, scIndex, wctIndex),
    { Result: "Done CO", Keterangan: "OK" }
  );

  // WCT dengan Case Type lain -> CO Tidak Sesuai.
  assert.deepEqual(
    evaluateRow({ "KATEGORI DATA": "WCT", CASE_ID: "6281234567890124" }, scIndex, wctIndex),
    { Result: "CO Tidak Sesuai", Keterangan: "Case Type bukan Interaction Ticket" }
  );

  // REASON ID lama tetap dipakai bila kolomnya masih ada.
  assert.deepEqual(
    evaluateRow({ "REASON ID": "R-TAGIHAN", CASE_ID: "C101" }, scIndex, wctIndex),
    { Result: "CO Tidak Sesuai", Keterangan: "Direction bukan Outbound" }
  );
  assert.deepEqual(
    evaluateRow({ "REASON ID": "R-TAGIHAN", CASE_ID: "C102" }, scIndex, wctIndex),
    { Result: "CO Tidak Sesuai", Keterangan: "Reason ID berbeda" }
  );

  // Format Case ID tak dikenali tetap jatuh ke Belum CO.
  assert.deepEqual(evaluateRow({ CASE_ID: "ABC" }, scIndex, wctIndex), {
    Result: "Belum CO",
    Keterangan: "Format Case ID tidak dikenali",
  });
});

test("processGapRows keeps GAP data as-is and appends Result + Keterangan", () => {
  const result = processGapRows({ gapRows, scRows, wctRows });

  assert.equal(result.length, gapRows.length);
  assert.deepEqual(Object.keys(result[0]), ["KATEGORI DATA", "CASE_ID", ...GAP_RESULT_KEYS]);
  assert.equal(result[0]["KATEGORI DATA"], "BIASA");
  assert.equal(result[0].CASE_ID, "C100");
  assert.equal(result[0].Result, "Done CO");

  assert.deepEqual(summarizeGapResult(result), {
    total: 14,
    done: 5,
    belum: 5,
    tidak: 4,
  });
});

test("usesNewGapFormat detects the Ownership Digital export shape", () => {
  assert.equal(usesNewGapFormat([]), true);
  assert.equal(usesNewGapFormat(gapRows), true);
  assert.equal(usesNewGapFormat([{ "REASON ID": "R1", "CASE ID": "C1" }]), false);
});

test("GAP CO export keeps the data columns and adds the requested formatting", () => {
  // Baris seragam supaya header export deterministik (json_to_sheet memakai
  // union kunci dari seluruh baris, sama seperti GAPCO_v2.html).
  const finalData = processGapRows({ gapRows: gapRows.slice(0, 7), scRows, wctRows });
  const bytes = buildGapExportFile(finalData);

  const archive = unzipSync(new Uint8Array(bytes));
  const sheetXml = strFromU8(archive["xl/worksheets/sheet1.xml"]);
  const stylesXml = strFromU8(archive["xl/styles.xml"]);

  // Formatting sama seperti export Ownership Digital.
  assert.match(stylesXml, /1F4E79/, "header fill colour is missing");
  assert.match(stylesXml, /FFFFFFFF/, "white bold header font is missing");
  assert.match(stylesXml, /horizontal="center"/);
  assert.match(stylesXml, /vertical="center"/);
  assert.match(stylesXml, /<left style="thin"/);
  assert.match(sheetXml, /<pane[^>]*state="frozen"/, "header row is not frozen");
  assert.match(sheetXml, /<autoFilter /);

  // Kontrak data: kolom GAP apa adanya lalu Result + Keterangan.
  const book = XLSX.read(Buffer.from(bytes), { type: "buffer" });
  assert.deepEqual(book.SheetNames, ["Hasil"]);

  const sheet = book.Sheets.Hasil;
  const header = XLSX.utils
    .sheet_to_json(sheet, { header: 1, raw: true })[0]
    .map(String);
  assert.deepEqual(header, ["KATEGORI DATA", "CASE_ID", ...GAP_RESULT_KEYS]);

  // CASE_ID harus tetap sel teks.
  assert.equal(sheet.B2.t, "s");
  assert.equal(sheet.B2.v, "C100");

  assert.equal(GAP_EXPORT_FILENAME, "Hasil_Proses_GAP_CO.xlsx");
});
