/**
 * Browser smoke test: drives the real UI in installed Chrome.
 *
 * Memverifikasi konsep "Operational Workspace":
 *  - LEFT  : control panel (input + filter + tombol)
 *  - RIGHT : workspace hasil (metric bar + table dengan scroll sendiri)
 * dan seluruh alur operator: upload 4 file -> tanggal -> Munculkan Data ->
 * Bagi Checker -> Export Excel.
 *
 * Usage: node scripts/e2e-smoke.mjs [baseUrl]
 */
import { chromium } from "playwright-core";
import { existsSync, readFileSync, mkdtempSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import XLSX from "xlsx-js-style";
import { unzipSync, strFromU8 } from "fflate";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const baseUrl = process.argv[2] || "http://localhost:4173/";
const fixtures = resolve(root, "tests/fixtures");

const failures = [];
function check(label, condition, detail = "") {
  const ok = !!condition;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` -> ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

function fixture(name) {
  const p = resolve(fixtures, name);
  if (!existsSync(p)) throw new Error(`Missing fixture ${p}. Run: node scripts/make-fixtures.mjs`);
  return p;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();

const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() !== "error") return;
  const text = msg.text();
  if (/Failed to load resource/i.test(text)) return; // favicon, bukan error app
  pageErrors.push(`console: ${text}`);
});

await page.goto(baseUrl, { waitUntil: "networkidle" });

/**
 * Baca nilai metric bar lewat atribut data-metric.
 * Menunggu sampai nilainya benar-benar settle (count-up selesai) sebelum dibandingkan.
 */
async function readMetric(label, expected) {
  await page.waitForFunction(
    ({ label, expected }) => {
      const el = document.querySelector(`[data-metric="${label}"]`);
      if (!el) return false;
      const value = el.textContent.trim();
      if (!value) return false;
      return expected === undefined ? true : value === expected;
    },
    { label, expected },
    { timeout: 8000 }
  );
  return page.$eval(`[data-metric="${label}"]`, (el) => el.textContent.trim());
}

/* ------------------------------------------------------------- struktur */
check(
  "workspace header shows Ownership Digital",
  await page.getByRole("heading", { name: "Ownership Digital" }).isVisible()
);
check("empty state is shown before processing", await page.getByText("Belum ada data").isVisible());
check(
  "date filter helper text is removed",
  (await page
    .getByText("Checker hanya dibagikan ke agent dengan schedule mulai jam 05 sampai 14.")
    .count()) === 0
);

const masterBlock = await page.locator("header").getByText("Master Agent").locator("..").innerText();
check("header shows Master Agent 234", /234/.test(masterBlock), masterBlock.replace(/\s+/g, " "));

// Label menu harus muat di dalam rail - pernah kejadian "Ownership" meluber keluar.
const railLabels = await page.evaluate(() =>
  [...document.querySelectorAll("[data-menu-label]")].map((el) => {
    const nav = el.closest("#app-menu");
    return {
      text: el.textContent.trim(),
      clipped: el.getBoundingClientRect().right > nav.getBoundingClientRect().right + 0.5,
      slack: Math.round(
        el.closest("button").getBoundingClientRect().width -
          el.getBoundingClientRect().width
      ),
    };
  })
);
check(
  "menu labels fit inside the rail",
  railLabels.length === 2 && railLabels.every((label) => !label.clipped),
  railLabels.map((label) => `${label.text}=${label.clipped ? "CLIPPED" : `ok(+${label.slack}px)`}`).join(", ")
);

check(
  "footer shows the copyright and app version",
  await page.getByText(/© 2026 Wira Yudha · Versi 3\.1/).first().isVisible()
);

/* --------------------------------------------------------- layout kiri/kanan */
const panelBox = await page.locator("#control-panel").boundingBox();
const workspaceBox = await page.locator("#workspace").boundingBox();

check(
  "control panel sits left of the workspace",
  panelBox.x + panelBox.width <= workspaceBox.x + 1,
  `panel ends ${Math.round(panelBox.x + panelBox.width)}, workspace starts ${Math.round(workspaceBox.x)}`
);
check(
  "control panel width is 280-320px",
  panelBox.width >= 280 && panelBox.width <= 320,
  `${Math.round(panelBox.width)}px`
);
check(
  "thinner right border separates the panels",
  await page
    .locator("#control-panel")
    .evaluate((el) => getComputedStyle(el).borderRightWidth)
    .then((w) => parseFloat(w) > 0)
);
check(
  "desktop page itself does not scroll",
  await page.evaluate(
    () => document.documentElement.scrollHeight <= window.innerHeight + 2
  ),
  await page.evaluate(
    () => `${document.documentElement.scrollHeight} vs ${window.innerHeight}`
  )
);

/* ------------------------------------------------------- field control panel */
for (const label of [
  "1. File Log Biasa",
  "2. File CO WCT",
  "3. File Schedule Jakarta",
  "4. File Schedule Jogja",
  "5. Filter Tanggal Log",
]) {
  check(`left panel shows "${label}"`, await page.getByText(label, { exact: true }).isVisible());
}
check(
  "schedule sheet/column info rows are removed",
  (await page.getByText("Sheet: Absenteeism").count()) === 0 &&
    (await page.getByText("Sheet: Absenteism").count()) === 0
);

/* ----------------------------------------------------------------- files */
async function upload(inputIndex, file) {
  await page.locator('input[type="file"]').nth(inputIndex).setInputFiles(file);
}

await upload(0, fixture("LogBiasa.xlsx"));
await upload(1, fixture("CO_WCT.xlsx"));
await upload(2, fixture("ScheduleJakarta.xlsx"));
await upload(3, fixture("ScheduleJogja.xlsx"));
await page.waitForTimeout(600);

check(
  "Schedule Jakarta toast is shown",
  await page.getByText(/Schedule Jakarta berhasil diproses: 3 agent terpetakan\./).isVisible()
);
check(
  "Schedule Jogja toast is shown",
  await page.getByText(/Schedule Jogja berhasil diproses: 1 agent terpetakan\./).isVisible()
);

const eligibleHeader = await page
  .locator("header")
  .getByText("Eligible Checker")
  .locator("..")
  .innerText();
check("header eligible checker shows 3", /3/.test(eligibleHeader), eligibleHeader.replace(/\s+/g, " "));

/* ------------------------------------------------------------ processing */
await page.getByRole("button", { name: /1\. Munculkan Data/ }).click();
check(
  "warns when no main date is chosen",
  await page.getByText("Pilih Tanggal Utama Filter.").isVisible()
);

await page.locator('input[type="date"]').nth(0).fill("2026-10-07");
await page.getByRole("button", { name: /1\. Munculkan Data/ }).click();
await page.waitForFunction(() => document.querySelectorAll("table tbody tr").length > 0, null, {
  timeout: 15000,
});

check("Total Case Biasa = 2", (await readMetric("Total Case Biasa", "2")) === "2");
check("Total Case WCT = 3", (await readMetric("Total Case WCT", "3")) === "3");
check(
  "Case Redistribusi = 0 before distribution",
  (await readMetric("Case Redistribusi", "0")) === "0"
);
check("Agent WCT Eligible = 3", (await readMetric("Agent WCT Eligible", "3")) === "3");

const rowTexts = await page.locator("table tbody tr").allInnerTexts();
const allText = rowTexts.join(" \n ");
check("table has 5 rows", rowTexts.length === 5, `rows=${rowTexts.length}`);
check("unknown creator row is dropped", !allText.includes("Not A Real Agent"));
check("WCT creator is preserved", allText.includes("Eka Arsyad Handayani"));
check("Support schedule badge is shown", allText.includes("Support"));

/* ---------------------------------------------------- workspace mengunci tinggi */
check(
  "result table has its own scroll container",
  (await page.locator("#result-scroll").evaluate((el) => getComputedStyle(el).overflowY)) === "auto"
);
check("table header is sticky", (await page.locator("thead th").first().evaluate((el) => getComputedStyle(el).position)) === "sticky");
check(
  "desktop page still does not scroll after data loads",
  await page.evaluate(
    () => document.documentElement.scrollHeight <= window.innerHeight + 2
  ),
  await page.evaluate(
    () => `${document.documentElement.scrollHeight} vs ${window.innerHeight}`
  )
);
check(
  "workspace bottom stays inside the viewport",
  workspaceBox.y + workspaceBox.height <= (await page.evaluate(() => window.innerHeight)) + 1
);

/* ----------------------------------------------------------- distribute */
await page.getByRole("button", { name: /2\. Bagi Checker/ }).click();
check(
  "distribution toast is shown",
  await page
    .getByText(/Checker berhasil dibagi\. 2 case masuk redistribusi ke 3 agent duty 05-14\./)
    .isVisible()
);
check(
  "Case Redistribusi = 2 after distribution",
  (await readMetric("Case Redistribusi", "2")) === "2"
);

const afterRows = await page.locator("table tbody tr").allInnerTexts();
check(
  "Selfin (schedule 15) is redistributed to Yulia",
  afterRows.some((r) => r.includes("CASE-2") && r.includes("Yulia Prihatini"))
);
check(
  "Support case is redistributed to Arpin",
  afterRows.some((r) => r.includes("W-2") && r.includes("Arpin"))
);
check(
  "checker badge preserves agent name casing",
  afterRows.some((r) => r.includes("Yulia Prihatini"))
);
check("schedule badge keeps the raw code casing", rowTexts.some((r) => r.includes("6a")));
check("category badge is uppercased", rowTexts.every((r) => !r.includes("Biasa") && !r.includes("Wct")));

/* --------------------------------------------------------------- export */
const downloadDir = mkdtempSync(resolve(tmpdir(), "od-download-"));
const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 15000 }),
  page.getByRole("button", { name: /3\. Export Excel/ }).click(),
]);

check(
  "export file name is Final_Checker_Distribution_Report.xlsx",
  download.suggestedFilename() === "Final_Checker_Distribution_Report.xlsx",
  download.suggestedFilename()
);

const savedTo = resolve(downloadDir, download.suggestedFilename());
await download.saveAs(savedTo);
const book = XLSX.read(readFileSync(savedTo), { type: "buffer" });
const sheet = book.Sheets[book.SheetNames[0]];
const header = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true })[0].map(String);

check(
  "export column order is locked",
  JSON.stringify(header) ===
    JSON.stringify([
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
    ]),
  header.join("|")
);
check("export has no CHECKER TYPE column", !header.includes("CHECKER TYPE"));
check("CASE_ID stays a text cell", sheet.C2?.t === "s", `type=${sheet.C2?.t} value=${sheet.C2?.v}`);

/* ------------------------------------------------ formatting excel hasil export */
const archive = unzipSync(new Uint8Array(readFileSync(savedTo)));
const sheetXml = strFromU8(archive["xl/worksheets/sheet1.xml"]);
const stylesXml = strFromU8(archive["xl/styles.xml"]);

check("export header has a coloured fill", stylesXml.includes("1F4E79"));
check("export header font is white and bold", stylesXml.includes("FFFFFFFF"));
check("export cells are centred", stylesXml.includes('horizontal="center"'));
check("export cells have thin borders", /<left style="thin"/.test(stylesXml));
check(
  "export header row is frozen",
  /<pane[^>]*state="frozen"/.test(sheetXml)
);
check("export has an autofilter", sheetXml.includes("<autoFilter"));

/* ---------------------------------------------------------------- bantuan */
await page.getByRole("button", { name: "Bantuan" }).click();
await page.waitForTimeout(350);
const dialog = page.getByRole("dialog");
check("help dialog opens from the control panel", await dialog.isVisible());
check(
  "help dialog shows the guide title",
  await page.getByRole("heading", { name: "Cara Penggunaan" }).isVisible()
);
check("help dialog lists the 6 steps", (await dialog.locator("ol > li").count()) === 6);

await page.keyboard.press("Escape");
await page.waitForTimeout(350);
check("help dialog closes with Escape", (await page.getByRole("dialog").count()) === 0);

await page.getByRole("button", { name: "Bantuan" }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Mengerti" }).click();
await page.waitForTimeout(350);
check("help dialog closes with the confirm button", (await page.getByRole("dialog").count()) === 0);

/* --------------------------------------------------------------- mobile */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);

const mobilePanel = await page.locator("#control-panel").boundingBox();
const mobileWorkspace = await page.locator("#workspace").boundingBox();
check(
  "mobile stacks the control panel above the workspace",
  mobilePanel.y + mobilePanel.height <= mobileWorkspace.y + 1,
  `panel bottom ${Math.round(mobilePanel.y + mobilePanel.height)}, workspace top ${Math.round(mobileWorkspace.y)}`
);
check(
  "mobile page can scroll",
  await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2)
);
check(
  "data table scrolls horizontally on mobile",
  await page
    .locator("#result-scroll")
    .evaluate((el) => el.scrollWidth > el.clientWidth + 20)
);

/* --------------------------------------------------------------- GAP CO */
await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(300);

await page.getByRole("button", { name: "GAP CO" }).click();
await page.waitForTimeout(350);

check(
  "menu switches to the GAP CO workspace",
  await page.getByRole("heading", { name: "GAP CO" }).isVisible()
);
check(
  "Ownership control panel is unmounted while GAP CO is active",
  (await page.locator("#control-panel").count()) === 0
);
check(
  "GAP CO panel shows the copyright and app version",
  await page.getByText(/© 2026 Wira Yudha · Versi 3\.1/).first().isVisible()
);

await upload(0, fixture("GapExport.xlsx")); // File GAP Export
await upload(1, fixture("SC.xlsx"));
await upload(2, fixture("WCTRef.xlsx"));
await page.waitForTimeout(500);

await page.getByRole("button", { name: /1\. Proses Data/ }).click();
await page.waitForFunction(() => document.querySelectorAll("table tbody tr").length > 0, null, {
  timeout: 15000,
});

check("GAP Total = 3", (await readMetric("Total GAP", "3")) === "3");
check("GAP Done CO = 2", (await readMetric("Done CO", "2")) === "2");
check("GAP Belum CO = 0", (await readMetric("Belum CO", "0")) === "0");
check("GAP CO Tidak Sesuai = 1", (await readMetric("CO Tidak Sesuai", "1")) === "1");

const gapRowsText = (await page.locator("table tbody tr").allInnerTexts()).join(" \n ");
check("GAP table shows a Done CO row", gapRowsText.includes("Done CO"));
check("GAP table shows a CO Tidak Sesuai row", gapRowsText.includes("CO Tidak Sesuai"));
check("GAP table keeps the CASE_ID text", gapRowsText.includes("6281234567890123"));

const [gapDownload] = await Promise.all([
  page.waitForEvent("download", { timeout: 15000 }),
  page.getByRole("button", { name: /2\. Download Excel/ }).click(),
]);
check(
  "GAP export file name is Hasil_Proses_GAP_CO.xlsx",
  gapDownload.suggestedFilename() === "Hasil_Proses_GAP_CO.xlsx",
  gapDownload.suggestedFilename()
);

const gapSaved = resolve(downloadDir, gapDownload.suggestedFilename());
await gapDownload.saveAs(gapSaved);
const gapBook = XLSX.read(readFileSync(gapSaved), { type: "buffer" });
const gapHeader = XLSX.utils
  .sheet_to_json(gapBook.Sheets[gapBook.SheetNames[0]], { header: 1, raw: true })[0]
  .map(String);
check(
  "GAP export appends Result and Keterangan",
  gapHeader.slice(-2).join("|") === "Result|Keterangan",
  gapHeader.join("|")
);
const gapArchive = unzipSync(new Uint8Array(readFileSync(gapSaved)));
check(
  "GAP export header row is frozen",
  /<pane[^>]*state="frozen"/.test(strFromU8(gapArchive["xl/worksheets/sheet1.xml"]))
);

await page.getByRole("button", { name: "Ownership" }).click();
await page.waitForTimeout(350);
check(
  "switching back restores the Ownership control panel",
  await page.locator("#control-panel").isVisible()
);

/* ------------------------------------------------------------------ admin */
await page.locator("#admin-open").click();
await page.waitForTimeout(350);
check("admin logo opens the login dialog", await page.getByRole("dialog").isVisible());

await page.locator("#admin-user").fill("Administrator");
await page.locator("#admin-pass").fill("salah");
await page.getByRole("button", { name: "Masuk" }).click();
await page.waitForTimeout(250);
check(
  "wrong admin password is rejected",
  await page.locator("#admin-login-error").isVisible()
);

await page.locator("#admin-pass").fill("Password*14");
await page.getByRole("button", { name: "Masuk" }).click();
await page.waitForTimeout(300);
check(
  "correct credentials open the agent panel",
  (await page.locator("#admin-regular-count").innerText()).trim() === "234"
);

await page.locator("#admin-add-name").fill("Test Admin Agent");
await page.locator("#admin-add-ldap").fill("VADS.TESTADMIN");
await page.locator("#admin-add-submit").click();
await page.waitForTimeout(250);
check(
  "adding an agent increases the Agent Utama count",
  (await page.locator("#admin-regular-count").innerText()).trim() === "235"
);

await page.getByRole("button", { name: "Selesai" }).click();
await page.waitForTimeout(350);
check("admin dialog closes", (await page.getByRole("dialog").count()) === 0);

const adminMasterBlock = await page
  .locator("header")
  .getByText("Master Agent")
  .locator("..")
  .innerText();
check(
  "header Master Agent follows the edited list",
  /235/.test(adminMasterBlock),
  adminMasterBlock.replace(/\s+/g, " ")
);

// Perubahan harus tersimpan di browser (localStorage), bukan hanya di memori.
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
const masterAfterReload = await page
  .locator("header")
  .getByText("Master Agent")
  .locator("..")
  .innerText();
check(
  "agent change survives a reload",
  /235/.test(masterAfterReload),
  masterAfterReload.replace(/\s+/g, " ")
);

await page.locator("#admin-open").click();
await page.waitForTimeout(300);
await page.locator("#admin-user").fill("Administrator");
await page.locator("#admin-pass").fill("Password*14");
await page.getByRole("button", { name: "Masuk" }).click();
await page.waitForTimeout(300);
await page.locator("#admin-reset").click();
await page.waitForTimeout(250);
check(
  "reset restores the base list",
  (await page.locator("#admin-regular-count").innerText()).trim() === "234"
);
await page.getByRole("button", { name: "Selesai" }).click();
await page.waitForTimeout(300);

/* --------------------------------------------------------------- health */
check("no page errors", pageErrors.length === 0, pageErrors.join(" | "));

await browser.close();

console.log(`\n${failures.length === 0 ? "ALL CHECKS PASSED" : `${failures.length} CHECK(S) FAILED`}`);
process.exit(failures.length === 0 ? 0 : 1);
