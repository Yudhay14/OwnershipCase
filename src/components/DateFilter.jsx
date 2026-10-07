/**
 * Filter tanggal log: tersusun vertikal mengikuti lebar control panel.
 * Aturan filter tetap di src/utils/processing.js.
 */
export default function DateFilter({ date1, date2, onDate1Change, onDate2Change }) {
  return (
    <div className="space-y-2.5">
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-slate-500">
          Tanggal Utama <span className="text-red-500">*</span>
        </span>
        <input
          type="date"
          value={date1}
          onChange={(e) => onDate1Change(e.target.value)}
          className="focus-ring tnum h-[38px] w-full rounded-md border border-line bg-white px-2.5 text-[12.5px] text-ink transition-colors hover:border-slate-300"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-slate-500">Tanggal Kedua</span>
        <input
          type="date"
          value={date2}
          onChange={(e) => onDate2Change(e.target.value)}
          className="focus-ring tnum h-[38px] w-full rounded-md border border-line bg-white px-2.5 text-[12.5px] text-ink transition-colors hover:border-slate-300"
        />
      </label>
    </div>
  );
}
