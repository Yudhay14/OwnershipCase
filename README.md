# Ownership Digital

**Creator Ownership & Checker Distribution System** — professional internal operations tool.

Migrasi frontend dari `ownership_digital_checker_v6.html` (HTML + JS + SheetJS) ke
**React + Tailwind CSS + Lucide React + Framer Motion**, ditambah menu **GAP CO** yang
di-port dari `GAPCO_v2.html`.

> **UI/UX dirombak. Business logic, data flow, dan algoritma TIDAK diubah.**
> Dua file legacy (`ownership_digital_checker_v6.html` dan `GAPCO_v2.html`) tetap disimpan
> sebagai sumber kebenaran uji parity — **jangan dihapus**.

---

## Menjalankan

```bash
npm install
npm run dev        # development server
npm run build      # production build ke ./dist
npm run preview    # serve hasil build
```

## Verifikasi

```bash
npm test                         # 20 test: parity (OD + GAPCO) + pipeline + export
node scripts/make-fixtures.mjs   # generate Excel fixture (OD + GAP CO)
npm run preview -- --port 4188   # jalankan di terminal lain (pakai port yang bebas)
node scripts/e2e-smoke.mjs http://localhost:4188/   # 67 check e2e di Chrome asli
```

`tests/parity.test.mjs` membandingkan helper hasil port dengan fungsi asli di
`ownership_digital_checker_v6.html`. **File legacy itu jangan dihapus** — dipakai sebagai
sumber kebenaran uji parity.

---

## Layout: Operational Workspace

```
┌──────┬──────────────────────┬────────────────────────────────────┐
│ MENU │  CONTROL PANEL 304px │  Header compact                    │
│ 78px │                      ├────────────────────────────────────┤
│      │  1. File Log Biasa   │  Metric bar (4 metrik, satu baris) │
│  OD  │  2. File CO WCT      ├────────────────────────────────────┤
│ GAP  │  3. Schedule Jakarta │  Data Table                        │
│  CO  │  4. Schedule Jogja   │  (sticky header, scroll internal)  │
│      │  5. Filter Tanggal   │                                    │
│      │                      │                                    │
│      │  1. Munculkan Data   │                                    │
│      │  2. Bagi Checker     │                                    │
│      │  3. Export Excel     │                                    │
└──────┴──────────────────────┴────────────────────────────────────┘
```

Menu rail kiri berisi **OD** (Ownership Digital) dan **GAP CO**. Menu aktif menentukan control
panel + workspace yang dirender, jadi tiap menu memakai pola yang sama: panel kiri + workspace
kanan.

- **Desktop** tinggi terkunci `100vh`: halaman tidak ikut memanjang, tabel punya scroll sendiri.
- **Mobile** satu kolom: control panel di atas, workspace di bawah, halaman boleh di-scroll.
- Control panel punya `overflow-y: auto` sendiri untuk layar pendek.

## Arsitektur

```
src/
├── App.jsx                  # shell: menu rail + control panel + workspace
├── pages/
│   ├── WorkspacePage.jsx    # workspace Ownership Digital: header + metric bar + table
│   └── GapCoPage.jsx        # workspace GAP CO: header + banner + metric bar + table
├── components/              # presentation only
│   ├── AppMenu.jsx          # menu rail (Ownership Digital / GAP CO)
│   ├── LeftPanel.jsx        # control panel Ownership Digital (field 1-5 + tombol)
│   ├── GapCoPanel.jsx       # control panel GAP CO (field 1-3 + tombol)
│   ├── FileField.jsx        # field upload + status + nama file
│   ├── DateFilter.jsx       # filter tanggal vertikal
│   ├── MetricBar.jsx        # metric bar horizontal compact
│   ├── DataTable.jsx        # tabel hasil Ownership Digital
│   ├── GapCoTable.jsx       # tabel hasil GAP CO (kolom dinamis + Result/Keterangan)
│   ├── StatusBadge.jsx      # termasuk badge Done CO / Belum CO / CO Tidak Sesuai
│   ├── Header.jsx           # header compact workspace Ownership Digital
│   ├── EmptyState.jsx
│   ├── LoadingState.jsx
│   ├── HelpDialog.jsx       # bantuan Ownership Digital
│   ├── GapCoHelpDialog.jsx  # bantuan GAP CO
│   ├── ToastNotification.jsx
│   └── CountUp.jsx
├── hooks/
│   ├── useToasts.js         # tumpukan notifikasi bersama
│   ├── useCheckerApp.js     # orkestrasi Ownership Digital (tanpa algoritma)
│   └── useGapCoApp.js       # orkestrasi GAP CO (tanpa algoritma)
├── utils/                   # LOCKED business logic
│   ├── text.js · dates.js · columns.js · agents.js
│   ├── schedule.js          # parsing Absenteeism/Absenteism, eligibility 05-14
│   ├── processing.js        # computeMergedData, distributeCheckers
│   ├── readWorkbooks.js     # reader Log Biasa + WCT
│   ├── exportExcel.js       # export Final_Checker_Distribution_Report.xlsx
│   ├── gapco.js             # validasi GAP CO (port GAPCO_v2.html) + export
│   └── xlsxFreeze.js        # util freeze header, dipakai kedua export
└── data/
    └── agents.js            # 234 Agent Utama + 27 Support (LOCKED, verbatim)
```

`src/data/agents.js` di-generate dari file legacy dan diverifikasi byte-identical:

```bash
node scripts/extract-agents.mjs
```

---

## Aturan yang dikunci

| Area | Aturan |
|---|---|
| Agent Utama | 234 agent dari list pertama; `VADS.IMEILIA` / "Imeilia yulinda salma" tetap Agent Utama; alias "Imeilia Salma" → agent yang sama |
| Support | List terpisah (27). Case Support: `schedule = "Support"`, masuk pool redistribusi |
| WCT | Sheet `Log.`; Creator harus match Agent Utama/Support; Creator di luar itu dibuang; **Creator yang ditampilkan tetap nilai asli** |
| Schedule Jakarta | Sheet `Absenteeism`, Agent Name kolom B, Schedule WFM kolom E |
| Schedule Jogja | Sheet `Absenteism`, Agent Name kolom B, Schedule WFM kolom F |
| Eligibility | Schedule mulai jam 05:00 s/d sebelum 15:00 |
| Checker | Creator duty 05-14 → ownership. Schedule 15+/X/OFF/Support → pool redistribusi, dibagi rata round-robin. Tanpa balancing tambahan |
| Export | `No, KATEGORI DATA, CASE_ID, CREATE_DATE, CREATOR, SCHEDULE, LOG IN ID, MSISDN, ID 1, CHECKER` — tanpa CHECKER TYPE; CASE_ID sebagai text; nama file tetap |

---

## Menu GAP CO

Menu kedua untuk memvalidasi hasil export Ownership Digital. Alurnya: export dari menu
**Ownership Digital** (`Final_Checker_Distribution_Report.xlsx`) dipakai sebagai **File GAP
Export**, lalu dicocokkan dengan file **SC** dan **WCT**.

Aturan validasi (port apa adanya dari `GAPCO_v2.html`):

| Area | Aturan |
|---|---|
| BIASA | Case ID diawali `C`; dicocokkan dengan `Title` file SC (`/C\d+/i`); `Direction` harus **Outbound** agar Done CO |
| WCT | Case ID 15 digit ke atas; dicocokkan dengan `Title` file WCT (`/\d{16}/`); `Case Type` harus **Interaction Ticket** agar Done CO |
| REASON ID | Bila file masih punya kolom REASON ID, perbandingan reason lama tetap dijalankan |
| Hasil | `Done CO` / `Belum CO` (Case ID tidak ditemukan) / `CO Tidak Sesuai` (Direction atau Case Type tidak sesuai) |
| Output | Data GAP apa adanya + kolom **Result** dan **Keterangan**; unduhan `Hasil_Proses_GAP_CO.xlsx` (sheet `Hasil`) |

`evaluateRow`, `buildSCIndex`, dan `buildWCTIndex` di `src/utils/gapco.js` diuji parity
langsung terhadap fungsi yang sama di `GAPCO_v2.html` (`tests/gapco.test.mjs`).

## Excel export

Isi dan urutan kolom tidak berubah. Formatting yang ditambahkan atas permintaan pemilik aplikasi:

- header berlatar **navy** dengan teks putih bold (rata tengah, wrap)
- **semua sel rata tengah** (horizontal + vertical)
- border tipis di setiap sel
- baris header **dibekukan** (freeze) + **AutoFilter**

Catatan teknis: SheetJS community **tidak bisa** menulis style maupun freeze pane (sudah diuji:
`A1.s` hilang dan `<pane>` tidak ditulis). Karena itu penulisan memakai **`xlsx-js-style`**
(fork SheetJS yang menambahkan dukungan style) dan freeze pane disuntikkan ke XML lewat
**`fflate`**. Parsing tetap memakai kode SheetJS yang sama.

`buildExportFile(rows)` mengembalikan isi .xlsx (bisa diuji di Node), sedangkan
`exportExcelCombined(rows)` memicu unduhan di browser.

Export GAP CO (`buildGapExportFile` / `exportGapExcel`) memakai formatting yang sama
(header navy, putih bold, rata tengah, border, freeze, autofilter). Freeze pane disuntikkan
oleh util bersama `src/utils/xlsxFreeze.js`.

### Perubahan yang disetujui pemilik aplikasi

Kartu **"Agent WCT Eligible"** pada versi lama menampilkan `cWCTGlobal` (identik dengan
"Total Case WCT"). Kini menampilkan **jumlah Eligible Checker** (agent dengan schedule 05-14).

---

## Catatan

- Semua dependency di-bundle lokal (SheetJS, fflate, Inter) sehingga aplikasi jalan offline.
- Bundle JS ~1.2 MB (434 kB gzip) karena `xlsx-js-style` menggantikan `xlsx`. Bisa dikecilkan
  dengan memuat modul Excel secara lazy (dynamic import) saat tombol diklik.
- Validasi dan isi pesan notifikasi identik dengan versi lama.
- Tidak ada pagination karena versi lama juga tidak memilikinya.
