/**
 * Header compact milik workspace kanan. Master Agent = ukuran master list (statis),
 * Eligible Checker = jumlah dinamis dari schedule yang sudah diunggah.
 */
function StatusBlock({ label, value, tone = "neutral" }) {
  const tones = {
    neutral: "border-line bg-white text-ink",
    success: "border-success-200 bg-success-50 text-success-700",
    brand: "border-brand-200 bg-brand-50 text-brand-700",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${
        tones[tone] || tones.neutral
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.06em] opacity-70">{label}</span>
      <span className="tnum text-[12.5px] font-bold">{value}</span>
    </div>
  );
}

export default function Header({ masterAgentCount, eligibleCount, hasSchedule }) {
  return (
    <header className="flex h-[56px] shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 sm:px-5">
      <div className="min-w-0">
        <h1 className="truncate text-[18px] font-bold leading-tight tracking-tight text-ink">
          Ownership Digital
        </h1>
        <p className="truncate text-[11px] leading-tight text-slate-500">
          Merged Ownership Data &amp; Checker Distribution
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden sm:block">
          <StatusBlock label="Master Agent" value={masterAgentCount} />
        </div>
        <div className="relative">
          <StatusBlock label="Eligible Checker" value={eligibleCount} tone="success" />
          {hasSchedule ? (
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-success-500" />
          ) : null}
        </div>
      </div>
    </header>
  );
}
