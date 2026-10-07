/**
 * Membuat file WCT sintetis berukuran besar untuk uji performa.
 * Output masuk ke tests/fixtures/ (gitignored), jadi tidak ikut ter-commit.
 *
 * Tanggal disebar ke beberapa hari supaya filter tanggal memilih sebagian kecil
 * baris - seperti pemakaian nyata, dan tabel tidak merender ratusan ribu baris.
 *
 * Usage: node scripts/make-large-wct.mjs [jumlahBaris] [namaFile] [jumlahHari]
 */
import XLSX from "xlsx-js-style";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../tests/fixtures");
mkdirSync(outDir, { recursive: true });

const totalRows = Number(process.argv[2] || 100000);
const fileName = process.argv[3] || "CO_WCT_large.xlsx";
const totalDays = Number(process.argv[4] || 28);

// Nama creator memakai agent nyata supaya baris lolos pencocokan master.
const CREATORS = [
  "Arpin",
  "Eka Arsyad Handayani",
  "Gilang Ramadhan",
  "Imeilia Salma",
  "Yulia Prihatini",
];
const REASONS = ["REASON-A", "REASON-B", "REASON-C", "REASON-D"];

const dayOf = (i) => String(1 + (i % totalDays)).padStart(2, "0");
const createdFor = (i) => `2026-10-${dayOf(i)} 08:30:00`;

const header = [
  "Creator",
  "Case Creation Time",
  "Case Code",
  "LOG IN ID",
  "Service Number",
  "ID1",
  "Channel",
  "Interaction Type",
  "Case Type",
  "Case Service Type",
  "Status",
  "Note",
];

const rows = [header];
const perDate = {};

for (let i = 0; i < totalRows; i += 1) {
  rows.push([
    CREATORS[i % CREATORS.length],
    createdFor(i),
    `62812${String(10000000 + i).padStart(11, "0")}`,
    `VADS.AGENT${i % 200}/OUTBOUND`,
    `62811${String(20000000 + i).padStart(11, "0")}`,
    `ID1-${i}`,
    "CALL",
    "OUTBOUND",
    "Interaction Ticket",
    REASONS[i % REASONS.length],
    "CLOSED",
    `Catatan kasus nomor ${i} untuk pengujian beban data besar`,
  ]);

  const date = `2026-10-${dayOf(i)}`;
  perDate[date] = (perDate[date] || 0) + 1;
}

console.log(`Menyusun ${totalRows} baris dalam ${totalDays} tanggal...`);
const sheet = XLSX.utils.aoa_to_sheet(rows);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, "Log.");

const target = resolve(outDir, fileName);
XLSX.writeFile(book, target);

// Rencana fixture: dipakai skrip uji performa untuk tahu angka yang benar tanpa
// menebak atau menduplikasi rumus.
writeFileSync(
  resolve(outDir, fileName.replace(/\.xlsx$/, ".plan.json")),
  JSON.stringify({ totalRows, totalDays, perDate }, null, 2)
);

const size = statSync(target).size;
console.log(`Tersimpan: ${target}`);
console.log(`Ukuran   : ${(size / 1024 / 1024).toFixed(1)} MB (${size} bytes)`);
console.log(`Tanggal  : ${Object.keys(perDate).length} hari, contoh 2026-10-07 = ${perDate["2026-10-07"]} baris`);
