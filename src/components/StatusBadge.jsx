/**
 * Badge kecil untuk tabel: kategori, schedule, checker.
 * Tanpa `uppercase` menyeluruh supaya nama agent tetap casing aslinya.
 */
const BASE =
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-[16px] whitespace-nowrap";

const VARIANTS = {
  // kategori
  biasa: "uppercase bg-sky-50 text-sky-700 border-sky-200",
  wct: "uppercase bg-indigo-50 text-indigo-700 border-indigo-200",

  // schedule
  eligible: "bg-success-50 text-success-700 border-success-200",
  ineligible: "bg-red-50 text-red-700 border-red-200",
  support: "bg-slate-100 text-slate-600 border-line",
  unknown: "bg-amber-50 text-amber-700 border-amber-200",

  // checker
  ownership: "bg-success-50 text-success-700 border-success-200",
  redistribution: "bg-steel-50 text-steel-700 border-steel-100",

  // hasil validasi GAP CO
  done: "bg-success-50 text-success-700 border-success-200",
  belum: "bg-amber-50 text-amber-700 border-amber-200",
  tidak: "bg-red-50 text-red-700 border-red-200",

  neutral: "bg-slate-100 text-slate-500 border-line",
};

export default function StatusBadge({ variant = "neutral", children, title, className = "" }) {
  return (
    <span className={`${BASE} ${VARIANTS[variant] || VARIANTS.neutral} ${className}`} title={title}>
      {children}
    </span>
  );
}
