import { Download, HelpCircle, Loader2, Play } from "lucide-react";
import FileField from "./FileField.jsx";

/**
 * Control panel kiri menu GAP CO. Urutan field tetap:
 * 1 File GAP Export (hasil export Ownership Digital), 2 File SC, 3 File WCT,
 * lalu tombol Proses Data + Download Excel.
 * Panel ini punya scroll sendiri seperti control panel Ownership Digital.
 */

const BUTTON_BASE =
  "focus-ring inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-md px-3 text-[12px] font-bold uppercase tracking-[0.05em] transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0";

export default function GapCoPanel({ app, onOpenHelp }) {
  const { files, handleFile, removeFile, runProcess, runExport, canProcess, hasRows, isProcessing } =
    app;

  return (
    <aside
      id="gapco-panel"
      className="sd-scroll flex w-full flex-col border-b border-line bg-surface lg:h-full lg:w-[304px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r"
    >
      {/* Brand */}
      <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-line bg-steel-50 px-4 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-steel-600 text-[11px] font-bold tracking-tight text-white">
          GC
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold leading-tight text-brand-800">GAP CO</p>
          <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
            CO Validation &amp; Gap Matching
          </p>
        </div>
      </div>

      {/* Field */}
      <div className="flex-1 divide-y divide-line px-4">
        <FileField
          index="1"
          title="File GAP Export"
          meta={files.gap}
          accept=".xlsx,.xls,.csv"
          onSelect={(file) => handleFile("gap", file)}
          onRemove={() => removeFile("gap")}
        />

        <FileField
          index="2"
          title="File SC"
          meta={files.sc}
          accept=".xlsx,.xls,.csv"
          onSelect={(file) => handleFile("sc", file)}
          onRemove={() => removeFile("sc")}
        />

        <FileField
          index="3"
          title="File WCT"
          meta={files.wct}
          accept=".xlsx,.xls,.csv"
          onSelect={(file) => handleFile("wct", file)}
          onRemove={() => removeFile("wct")}
        />

        <div className="py-3.5">
          <p className="text-[10.5px] leading-relaxed text-slate-500">
            Gunakan file <span className="font-semibold text-slate-700">
              Final_Checker_Distribution_Report.xlsx
            </span>{" "}
            hasil export dari menu Ownership Digital sebagai File GAP Export.
          </p>
        </div>
      </div>

      {/* Tombol */}
      <div className="space-y-2 border-t border-line px-4 py-3.5">
        <button
          type="button"
          onClick={runProcess}
          disabled={!canProcess || isProcessing}
          className={`${BUTTON_BASE} bg-brand-600 text-white hover:bg-brand-700`}
        >
          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          1. Proses Data
        </button>

        <button
          type="button"
          onClick={runExport}
          disabled={!hasRows}
          className={`${BUTTON_BASE} bg-steel-600 text-white hover:bg-steel-700`}
        >
          <Download size={14} />
          2. Download Excel
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          className="focus-ring mt-1 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          <HelpCircle size={13} />
          Bantuan
        </button>
      </div>
    </aside>
  );
}
