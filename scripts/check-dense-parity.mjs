/**
 * Memverifikasi bahwa parsing mode `dense: true` menghasilkan baris yang IDENTIK
 * dengan mode default, untuk sheet dan opsi yang sama seperti yang dipakai app.
 *
 * Usage: node scripts/check-dense-parity.mjs <file.xlsx> [sheetName]
 * Keluar dengan kode 1 kalau ada perbedaan.
 */
import XLSX from "xlsx-js-style";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const file = resolve(process.argv[2] || "tests/fixtures/CO_WCT.xlsx");
const requestedSheet = process.argv[3] || null;

const buffer = readFileSync(file);

function parse({ dense, sheetName }) {
  const options = { type: "array" };
  if (dense) options.dense = true;

  const workbook = XLSX.read(new Uint8Array(buffer), options);
  const name =
    sheetName ||
    workbook.SheetNames.find((n) => String(n).trim().toLowerCase() === "log.") ||
    workbook.SheetNames[0];

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
    raw: false,
    defval: "",
  });

  const hash = createHash("sha256");
  hash.update(`sheets=${JSON.stringify(workbook.SheetNames)}|sheet=${name}`);
  rows.forEach((row) => {
    hash.update(JSON.stringify(row));
    hash.update("\n");
  });

  return { sheetName: name, sheetNames: workbook.SheetNames, count: rows.length, digest: hash.digest("hex") };
}

const normal = parse({ dense: false, sheetName: requestedSheet });
const dense = parse({ dense: true, sheetName: requestedSheet });

const same =
  normal.digest === dense.digest &&
  normal.sheetName === dense.sheetName &&
  JSON.stringify(normal.sheetNames) === JSON.stringify(dense.sheetNames);

console.log(`${basename(file)}`);
console.log(`  sheet      : ${normal.sheetName} (${normal.sheetNames.length} sheet)`);
console.log(`  baris      : ${normal.count}`);
console.log(`  default    : ${normal.digest.slice(0, 16)}`);
console.log(`  dense      : ${dense.digest.slice(0, 16)}`);
console.log(`  hasil      : ${same ? "IDENTIK" : "BERBEDA"}`);

process.exit(same ? 0 : 1);
