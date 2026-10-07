import { Database } from "lucide-react";

/** Empty state minimal di workspace kanan (bukan card besar). */
export default function EmptyState({
  title = "Belum ada data",
  subtitle = 'Upload file terlebih dahulu kemudian klik "Munculkan Data".',
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Database size={22} strokeWidth={1.75} className="text-slate-300" />
      <p className="mt-3 text-[13px] font-semibold text-slate-600">{title}</p>
      <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-slate-400">{subtitle}</p>
    </div>
  );
}
