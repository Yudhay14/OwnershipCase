import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CalendarRange,
  Download,
  Eye,
  Info,
  Shuffle,
  UploadCloud,
  X,
} from "lucide-react";

/**
 * Panduan penggunaan. Hanya konten bantuan - tidak menyentuh logic apa pun.
 */

const STEPS = [
  {
    icon: UploadCloud,
    title: "Unggah file log",
    text: "Pilih file Log Biasa dan file CO WCT (.xlsx / .xls). Pastikan sheet-nya sesuai format yang sudah ditetapkan.",
  },
  {
    icon: CalendarDays,
    title: "Unggah file schedule",
    text: "Schedule Jakarta dibaca dari sheet Absenteeism, Schedule Jogja dari sheet Absenteism. Hanya nama yang ada di master Agent Utama yang dipetakan.",
  },
  {
    icon: CalendarRange,
    title: "Pilih tanggal log",
    text: "Tanggal Utama wajib diisi. Tanggal Kedua opsional untuk memperluas rentang filter.",
  },
  {
    icon: Eye,
    title: 'Klik "1. Munculkan Data"',
    text: "Log Biasa dan WCT digabung, lalu schedule tiap creator dipetakan. Tabel hasil dan ringkasan akan muncul di bawah.",
  },
  {
    icon: Shuffle,
    title: 'Klik "2. Bagi Checker"',
    text: "Creator dengan schedule 05-14 mengerjakan case-nya sendiri. Case lain dibagi rata ke agent yang duty 05-14.",
  },
  {
    icon: Download,
    title: 'Klik "3. Export Excel"',
    text: "Hasil distribusi diunduh sebagai Final_Checker_Distribution_Report.xlsx.",
  },
];

const RULES = [
  "Checker hanya dibagikan ke agent dengan schedule mulai jam 05 sampai 14.",
  "Creator dengan schedule 05-14 tetap menjadi checker untuk case-nya sendiri.",
  "Schedule 15 ke atas, X, OFF, dan agent Support masuk ke pool redistribusi.",
  "Creator yang tidak ada di master Agent Utama maupun Support tidak diproses.",
  "Nama Creator di tabel selalu nilai asli dari file WCT, tidak pernah diganti.",
];

const LEGEND = [
  { tone: "bg-success-50 text-success-700 border-success-200", label: "Eligible 05-14 / ownership" },
  { tone: "bg-steel-50 text-steel-700 border-steel-100", label: "Hasil redistribusi" },
  { tone: "bg-red-50 text-red-700 border-red-200", label: "Tidak eligible (15+, X, OFF)" },
  { tone: "bg-slate-100 text-slate-600 border-slate-200", label: "Support" },
];

export default function HelpDialog({ open, onClose }) {
  // Tutup dengan tombol Escape.
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
            aria-labelledby="help-title"
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative my-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_18px_50px_rgba(16,24,40,0.22)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <div>
                <h2 id="help-title" className="text-[13px] font-bold text-slate-800">
                  Cara Penggunaan
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Ownership Digital - Creator Ownership &amp; Checker Distribution System
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
                          <Icon size={12.5} className="shrink-0 text-brand-600" />
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
                  Aturan checker
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
                      <span
                        className={`inline-block h-3.5 w-7 shrink-0 rounded border ${item.tone}`}
                      />
                      <span className="text-[11px] text-slate-600">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <footer className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
              <button
                type="button"
                onClick={onClose}                        className="focus-ring rounded bg-brand-600 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.05em] text-white transition-all hover:-translate-y-px hover:bg-brand-700 active:translate-y-0"
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
