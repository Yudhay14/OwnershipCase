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
npm test                         # 29 test: parity (OD + GAPCO) + pipeline + export + agentStore
node scripts/make-fixtures.mjs   # generate Excel fixture (OD + GAP CO)
npm run preview -- --port 4188   # jalankan di terminal lain (pakai port yang bebas)
node scripts/e2e-smoke.mjs http://localhost:4188/   # 80 check e2e di Chrome asli
```

Uji berkas besar (opsional, butuh file WCT puluhan MB):

```bash
npm run fixture:large            # bikin tests/fixtures/CO_WCT_large.xlsx (~65 MB, 100 ribu baris)
npm run check:dense              # buktikan parsing mode dense identik dengan mode default
npm run perf:large -- http://localhost:4188/   # uji UI tetap responsif + hasil tetap benar
```

`tests/parity.test.mjs` membandingkan helper hasil port dengan fungsi asli di
`ownership_digital_checker_v6.html`. **File legacy itu jangan dihapus** — dipakai sebagai
sumber kebenaran uji parity.

---

## Layout: Operational Workspace

```
┌──────┬──────────────────────┬────────────────────────────────────┐
│ MENU │  CONTROL PANEL 304px │  Header compact                    │
│ 96px │                      ├────────────────────────────────────┤
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

Menu rail kiri berisi **Ownership** dan **GAP CO**, plus tombol **admin** di pojok bawah. Menu
aktif menentukan control panel + workspace yang dirender, jadi tiap menu memakai pola yang sama:
panel kiri + workspace kanan. Lebar rail 96px dipilih agar label muat tanpa terpotong (dijaga oleh
check e2e “menu labels fit inside the rail”).

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
│   ├── AppMenu.jsx          # menu rail (Ownership Digital / GAP CO) + logo admin
│   ├── AdminDialog.jsx      # login admin + kelola daftar Agent Utama/Support
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
├── config/
│   ├── admin.js             # kredensial gerbang admin (gerbang UI, bukan keamanan)
│   └── app.js               # nama pemilik, tahun, dan versi aplikasi
├── workers/
│   └── checker.worker.js    # parse + gabung log di luar main thread (file besar)
├── hooks/
│   ├── useToasts.js         # tumpukan notifikasi bersama
│   ├── useAgentStore.js     # binding React untuk daftar agent yang bisa diubah
│   ├── useCheckerApp.js     # orkestrasi Ownership Digital (tanpa algoritma)
│   └── useGapCoApp.js       # orkestrasi GAP CO (tanpa algoritma)
├── utils/                   # LOCKED business logic
│   ├── text.js · dates.js · columns.js · agents.js
│   ├── agentStore.js        # override tambah/hapus agent (localStorage)
│   ├── schedule.js          # parsing Absenteeism/Absenteism, eligibility 05-14
│   ├── processing.js        # computeMergedData, distributeCheckers
│   ├── readWorkbooks.js     # reader Log Biasa + WCT (mode dense)
│   ├── checkerWorker.js     # klien Web Worker (postMessage -> Promise)
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
| Agent list | Daftar dasar di `src/data/agents.js` (234 Agent Utama + 27 Support) tidak pernah ditulis ulang. Admin bisa menambah/menghapus lewat lapisan override (lihat bagian Admin) |

---

## Admin: kelola daftar agent

Klik **logo di pojok bawah menu rail** untuk membuka login admin, lalu masuk dengan
kredensial di `src/config/admin.js`. Setelah masuk, panel memungkinkan:

- **Tambah Agent Utama** (nama + LDAP opsional)
- **Hapus Agent Utama** (dengan konfirmasi dua langkah, bisa dipulihkan)
- **Tambah / hapus agent Support**
- **Kembalikan daftar awal** untuk membatalkan semua perubahan

Cara kerjanya:

- Daftar dasar tetap utuh di `src/data/agents.js`; perubahan disimpan sebagai override di
  `localStorage` (`od.agentOverrides.v1`).
- `agentStore.js` menggabungkan daftar dasar + tambahan - hapus, lalu `agents.js` membangun
  ulang index lookup-nya. Aturan pencocokan (nama/LDAP, alias `Imeilia Salma`) tidak berubah.
- Tanpa override, daftar efektif **identik** dengan daftar dasar (diuji di
  `tests/agentStore.test.mjs`).
- Setelah mengubah daftar, klik **“1. Munculkan Data”** lagi agar data diproses ulang
  dengan daftar yang baru.

> **Catatan keamanan:** aplikasi ini murni front-end, jadi login admin hanyalah **gerbang UI**,
> bukan proteksi data. Kredensial ada di dalam bundle JavaScript dan `localStorage` bisa diubah
> manual oleh siapa pun yang memakai browser ini. Bila butuh proteksi nyata, diperlukan
> backend/autentikasi server.

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

## Berkas besar (WCT 39-50 MB)

File WCT bisa puluhan MB. Dua hal yang dikerjakan supaya aplikasi tidak beku:

1. **Parsing mode `dense`.** SheetJS memakai array internal, bukan objek per sel.
   Terukur pada file 65 MB / 100 ribu baris: `XLSX.read` turun dari **16,8 s ke 5,7 s**
   (±3x). Isi barisnya tetap identik - dikunci oleh `npm run check:dense` dan test
   "mode dense menghasilkan baris identik" di `tests/pipeline.test.mjs`.
2. **Pindah ke Web Worker.** Parsing dan penggabungan dijalankan di
   `src/workers/checker.worker.js`, jadi main thread tidak diblokir. Baris mentah
   tetap tinggal di worker; yang dikirim balik ke UI hanya hasil akhir yang sudah
   difilter. Worker memakai fungsi yang sama dari `src/utils/*`, tidak ada logika baru.

Hasil uji di Chrome asli dengan file 65 MB (100 ribu baris):

| Ukuran | Tahap | Hasil |
|---|---|---|
| Parse WCT | 9,8 s | main thread **tetap responsif** - jeda terpanjang hanya 66 ms |
| Munculkan Data | 9,1 s | 3.572 case WCT - sama persis dengan hitungan fixture |

Sebelumnya, `XLSX.read` berjalan di main thread sehingga UI beku total selama
belasan detik tanpa umpan balik apa pun.

Catatan: karena worker tidak punya akses `localStorage`, daftar agent efektif
(termasuk tambahan admin) dikirim dari main thread setiap kali pemrosesan dijalankan.

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
- Kartu **“Master Agent”** di header mengikuti daftar efektif, jadi angkanya naik/turun
  setelah admin menambah atau menghapus agent.
- Copyright pemilik dan versi aplikasi tampil di bawah tombol **Bantuan** pada kedua
  control panel, diambil dari `src/config/app.js` (saat ini “© 2026 Wira Yudha · Versi 3.1”).
  Untuk menaikkan versi, cukup ubah `APP_VERSION` di file itu.
