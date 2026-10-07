import { Loader2 } from "lucide-react";

/**
 * Loading state visual-only di workspace kanan: spinner tipis + progress line.
 * Tidak mengubah proses pemrosesan yang sebenarnya.
 */
export default function LoadingState({ stage = "Processing..." }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
      <Loader2 size={20} className="animate-spin text-brand-600" />
      <p className="text-[12.5px] font-semibold text-slate-600">{stage}</p>
      <div className="relative h-[3px] w-[220px] overflow-hidden rounded-full bg-slate-200 sd-progress" />
    </div>
  );
}
