import { Download, Eye, HelpCircle, Loader2, Shuffle } from "lucide-react";
import FileField from "./FileField.jsx";
import DateFilter from "./DateFilter.jsx";
import { APP_AUTHOR, APP_VERSION, APP_YEAR } from "../config/app.js";

/**
 * Control panel kiri. Urutan field wajib tetap:
 * 1 File Log Biasa, 2 File CO WCT, 3 Schedule Jakarta, 4 Schedule Jogja,
 * 5 Filter Tanggal Log, lalu tombol 1-2-3.
 * Panel ini punya scroll sendiri supaya layar pendek tidak perlu mengecilkan UI.
 */

const BUTTON_BASE =
  "focus-ring inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-md px-3 text-[12px] font-bold uppercase tracking-[0.05em] transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0";

export default function LeftPanel({ app, onOpenHelp }) {
  const {
    files,
    date1,
    date2,
    setDate1,
    setDate2,
    handleLogBiasa,
    handleLogWCT,
    handleSchedule,
    removeFile,
    runProcessing,
    runDistribution,
    runExport,
    finalMergedData,
    isProcessing,
    isParsing,
  } = app;

  const canProcess = files.jakarta.status === "ready" || files.jogja.status === "ready";
  const hasRows = finalMergedData.length > 0;

  return (
    <aside
      id="control-panel"
      className="sd-scroll flex w-full flex-col border-b border-line bg-surface lg:h-full lg:w-[304px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r"
    >
      {/* Brand */}
      <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-line bg-brand-50 px-4 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-600 text-[11px] font-bold tracking-tight text-white">
          OD
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold leading-tight text-brand-800">
            Ownership Digital
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
            Creator Ownership &amp; Checker Distribution System
          </p>
        </div>
      </div>

      {/* Field */}
      <div className="flex-1 divide-y divide-line px-4">
        <FileField
          index="1"
          title="File Log Biasa"
          meta={files.biasa}
          onSelect={handleLogBiasa}
          onRemove={() => removeFile("biasa")}
        />

        <FileField
          index="2"
          title="File CO WCT"
          meta={files.wct}
          onSelect={handleLogWCT}
          onRemove={() => removeFile("wct")}
        />

        <FileField
          index="3"
          title="File Schedule Jakarta"
          meta={files.jakarta}
          onSelect={(file) => handleSchedule("JAKARTA", file)}
          onRemove={() => removeFile("jakarta")}
        />

        <FileField
          index="4"
          title="File Schedule Jogja"
          meta={files.jogja}
          onSelect={(file) => handleSchedule("JOGJA", file)}
          onRemove={() => removeFile("jogja")}
        />

        <div className="py-3.5">
          <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-slate-700">
            5. Filter Tanggal Log
          </p>
          <div className="mt-2.5">
            <DateFilter
              date1={date1}
              date2={date2}
              onDate1Change={setDate1}
              onDate2Change={setDate2}
            />
          </div>
        </div>
      </div>

      {/* Tombol */}
      <div className="space-y-2 border-t border-line px-4 py-3.5">
        {isParsing ? (
          <p className="flex items-center gap-1.5 rounded border border-steel-100 bg-steel-50 px-2.5 py-1.5 text-[10.5px] font-medium text-steel-700">
            <Loader2 size={12} className="animate-spin" />
            Membaca file, mohon tunggu...
          </p>
        ) : null}

        <button
          type="button"
          onClick={runProcessing}
          disabled={!canProcess || isProcessing || isParsing}
          className={`${BUTTON_BASE} bg-brand-600 text-white hover:bg-brand-700`}
        >
          {isProcessing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Eye size={14} />
          )}
          1. Munculkan Data
        </button>

        <button
          type="button"
          onClick={runDistribution}
          disabled={!hasRows || isProcessing || isParsing}
          className={`${BUTTON_BASE} bg-amber-500 text-white hover:bg-amber-600`}
        >
          <Shuffle size={14} />
          2. Bagi Checker
        </button>

        <button
          type="button"
          onClick={runExport}
          disabled={!hasRows || isProcessing || isParsing}
          className={`${BUTTON_BASE} bg-steel-600 text-white hover:bg-steel-700`}
        >
          <Download size={14} />
          3. Export Excel
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          className="focus-ring mt-1 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <HelpCircle size={13} />
          Bantuan
        </button>

        <p className="pt-1 text-center text-[10px] leading-relaxed text-slate-400">
          &copy; {APP_YEAR} {APP_AUTHOR} &middot; Versi {APP_VERSION}
        </p>
      </div>
    </aside>
  );
}
