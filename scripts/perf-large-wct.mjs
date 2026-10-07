/**
 * Uji performa file besar (WCT puluhan MB) di Chrome asli.
 *
 * Yang dibuktikan:
 *  1. Main thread TIDAK beku selama file besar diparse - diukur dari jeda
 *     terpanjang antar-tick heartbeat 50 ms di halaman.
 *  2. Hasilnya tetap benar - jumlah case WCT dibandingkan dengan hitungan
 *     yang ditulis generator fixture (CO_WCT_large.plan.json).
 *
 * Usage: node scripts/perf-large-wct.mjs [baseUrl] [fileBesar]
 */
import { chromium } from "playwright-core";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const fixtures = resolve(root, "tests/fixtures");

const baseUrl = process.argv[2] || "http://localhost:4188/";
const largeFile = resolve(fixtures, process.argv[3] || "CO_WCT_large.xlsx");
const planFile = largeFile.replace(/\.xlsx$/, ".plan.json");
const TEST_DATE = "2026-10-07";

for (const [label, path] of [
  ["file besar", largeFile],
  ["rencana fixture", planFile],
]) {
  if (!existsSync(path)) throw new Error(`${label} tidak ada: ${path}. Jalankan npm run fixture:large`);
}

const plan = JSON.parse(readFileSync(planFile, "utf8"));
const expectedWCT = plan.perDate[TEST_DATE];
const sizeMb = (readFileSync(largeFile).length / 1024 / 1024).toFixed(1);

const failures = [];
function check(label, condition, detail = "") {
  const ok = !!condition;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` -> ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 800 } });

const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() !== "error") return;
  const text = msg.text();
  if (/Failed to load resource/i.test(text)) return;
  pageErrors.push(`console: ${text}`);
});

await page.goto(baseUrl, { waitUntil: "networkidle" });

console.log(`\nFile  : ${largeFile}`);
console.log(`Ukuran: ${sizeMb} MB (${plan.totalRows} baris)`);
console.log(`Target: ${TEST_DATE} -> ${expectedWCT} case WCT\n`);

/* ----------------------------------------------------------- file pendukung */
async function upload(index, file) {
  await page.locator('input[type="file"]').nth(index).setInputFiles(file);
}

await upload(0, resolve(fixtures, "LogBiasa.xlsx"));
await upload(2, resolve(fixtures, "ScheduleJakarta.xlsx"));
await upload(3, resolve(fixtures, "ScheduleJogja.xlsx"));
await page.waitForTimeout(800);

/* ----------------------------------------------------- heartbeat main thread */
await page.evaluate(() => {
  window.__gaps = [];
  let last = performance.now();
  window.__hb = setInterval(() => {
    const now = performance.now();
    window.__gaps.push(now - last);
    last = now;
  }, 50);
});

/* ------------------------------------------------------------- parse WCT besar */
const startedAt = Date.now();
await upload(1, largeFile); // File CO WCT

// Tunggu sampai field WCT sendiri melaporkan jumlah barisnya. Tidak bisa memakai
// hitungan "Loaded" karena file schedule juga berstatus Loaded.
await page.waitForFunction(
  (needle) => document.querySelector("#control-panel")?.innerText.includes(needle),
  `${plan.totalRows} baris`,
  { timeout: 240000 }
);

const parseSeconds = (Date.now() - startedAt) / 1000;
const gaps = await page.evaluate(() => {
  clearInterval(window.__hb);
  return window.__gaps;
});
const maxGap = Math.max(...gaps);

console.log(`Parse WCT selesai dalam ${parseSeconds.toFixed(1)}s`);
console.log(`Jeda main thread terpanjang: ${Math.round(maxGap)} ms (dari ${gaps.length} tick)\n`);

check(
  "main thread tetap responsif selama file besar diparse",
  maxGap < 1000,
  `jeda terpanjang ${Math.round(maxGap)} ms`
);

const panelText = (await page.locator("#control-panel").innerText()).replace(/\u00A0/g, " ");
check(
  "file besar terbaca lengkap",
  panelText.includes(`${sizeMb} MB`) && panelText.includes(`${plan.totalRows} baris`),
  `${sizeMb} MB, ${plan.totalRows} baris`
);

/* ------------------------------------------------------------- proses & hasil */
await page.locator('input[type="date"]').nth(0).fill(TEST_DATE);

const processStartedAt = Date.now();
await page.getByRole("button", { name: /1\. Munculkan Data/ }).click();
await page.waitForFunction(
  () => {
    const el = document.querySelector('[data-metric="Total Case WCT"]');
    return el && el.textContent.trim() !== "" && el.textContent.trim() !== "0";
  },
  null,
  { timeout: 240000 }
);

const actualWCT = await page.$eval('[data-metric="Total Case WCT"]', (el) =>
  el.textContent.trim()
);
const actualBiasa = await page.$eval('[data-metric="Total Case Biasa"]', (el) =>
  el.textContent.trim()
);

console.log(`\nProses selesai dalam ${((Date.now() - processStartedAt) / 1000).toFixed(1)}s`);
console.log(`Total Case WCT: ${actualWCT} (harusnya ${expectedWCT})`);

check(
  "semua baris file besar diproses dengan benar",
  actualWCT === String(expectedWCT),
  `${actualWCT} vs ${expectedWCT}`
);
check("file Log Biasa tetap diproses", actualBiasa === "2", actualBiasa);

// Tabel memuat baris WCT hasil filter tanggal + 2 baris Log Biasa dari fixture kecil.
const expectedTableRows = expectedWCT + 2;
const renderedRows = await page.locator("#result-scroll table tbody tr").count();
check(
  "tabel hanya merender baris hasil filter tanggal",
  renderedRows === expectedTableRows,
  `${renderedRows} baris (harusnya ${expectedTableRows})`
);

check("tidak ada error di halaman", pageErrors.length === 0, pageErrors.join(" | "));

await browser.close();

console.log(`\n${failures.length === 0 ? "SEMUA CHECK PERFORMA PASSED" : `${failures.length} CHECK GAGAL`}`);
process.exit(failures.length === 0 ? 0 : 1);
