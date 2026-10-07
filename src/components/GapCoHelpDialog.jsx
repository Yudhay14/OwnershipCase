import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Info, Play, UploadCloud, X } from "lucide-react";

/**
 * Panduan penggunaan menu GAP CO. Hanya konten bantuan - tidak menyentuh logic.
 */

const STEPS = [
  {
    icon: UploadCloud,
    title: "Unggah file GAP Export",
    text: "Pilih file Final_Checker_Distribution_Report.xlsx hasil export dari menu Ownership Digital (.xlsx / .xls / .csv).",
  },
  {
    icon: UploadCloud,
    title: "Unggah file SC dan WCT",
    text: "SC dipakai untuk baris BIASA (Case ID diawali C), WCT untuk baris WCT (Case ID 15 digit ke atas). Minimal salah satu harus diunggah.",
  },
  {
    icon: Play,
    title: 'Klik "1. Proses Data"',
    text: "Setiap baris GAP dicocokkan dengan SC/WCT, lalu diberi kolom Result dan Keterangan. Data GAP ditampilkan apa adanya.",
  },
  {
    icon: Download,
    title: 'Klik "2. Download Excel"',
    text: "Hasil validasi diunduh sebagai Hasil_Proses_GAP_CO.xlsx.",
  },
];

const RULES = [
  "BIASA: Case ID dicocokkan dengan Title file SC; Direction harus Outbound agar Done CO.",
  "WCT: Case ID 16 digit dicocokkan dengan Title file WCT; Case Type harus Interaction Ticket agar Done CO.",
  "Tanpa REASON ID, validasi memakai kecocokan Case ID dan Direction / Case Type.",
  "Jika Case ID tidak ditemukan, baris dianggap Belum CO.",
  "Jika Case ID ditemukan tetapi Direction / Case Type tidak sesuai, baris menjadi CO Tidak Sesuai.",
];

const LEGEND = [
  { tone: "bg-success-50 text-success-700 border-success-200", label: "Done CO" },
  { tone: "bg-amber-50 text-amber-700 border-amber-200", label: "Belum CO" },
  { tone: "bg-red-50 text-red-700 border-red-200", label: "CO Tidak Sesuai" },
];

export default function GapCoHelpDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/45"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gapco-help-title"
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative my-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_18px_50px_rgba(16,24,40,0.22)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <div>
                <h2 id="gapco-help-title" className="text-[13px] font-bold text-slate-800">
                  Cara Penggunaan
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  GAP CO - CO Validation &amp; Gap Matching
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="focus-ring -mr-1 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup bantuan"
              >
                <X size={16} />
              </button>
            </header>

            <div className="sd-scroll flex-1 overflow-y-auto px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400">
                Langkah
              </p>

              <ol className="mt-2 space-y-2.5">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.title} className="flex items-start gap-3">
                      <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                          <Icon size={12.5} className="shrink-0 text-steel-600" />
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                          {step.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-5 rounded border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500">
                  <Info size={12} className="text-slate-400" />
                  Aturan validasi
                </p>
                <ul className="mt-2 space-y-1.5">
                  {RULES.map((rule) => (
                    <li key={rule} className="flex items-start gap-2">
                      <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      <span className="text-[11px] leading-relaxed text-slate-600">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400">
                  Arti warna badge
                </p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {LEGEND.map((item) => (
                    <li key={item.label} className="flex items-center gap-2">
                      <span className={`inline-block h-3.5 w-7 shrink-0 rounded border ${item.tone}`} />
                      <span className="text-[11px] text-slate-600">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <footer className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="focus-ring rounded bg-brand-600 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-px hover:bg-brand-700 active:translate-y-0"
              >
                Mengerti
              </button>
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
