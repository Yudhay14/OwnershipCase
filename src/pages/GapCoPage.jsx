import { Info } from "lucide-react";
import MetricBar from "../components/MetricBar.jsx";
import GapCoTable from "../components/GapCoTable.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingState from "../components/LoadingState.jsx";

/**
 * Workspace kanan menu GAP CO: header compact, banner format, metric bar, lalu
 * tabel hasil. Tabel mengisi sisa tinggi layar dengan scroll internal sendiri.
 */
export default function GapCoPage({ app }) {
  const { hasProcessed, finalData, counts, usesNewFormat, isProcessing, processStage } = app;

  return (
    <div id="gapco-workspace" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-[56px] shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 sm:px-5">
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold leading-tight tracking-tight text-ink">
            GAP CO
          </h1>
          <p className="truncate text-[11px] leading-tight text-slate-500">
            Validasi CO hasil export Ownership Digital terhadap file SC &amp; WCT
          </p>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 sm:px-5">
        {isProcessing ? (
          <LoadingState stage={processStage} />
        ) : !hasProcessed ? (
          <EmptyState
            title="Belum ada hasil GAP"
            subtitle='Unggah file GAP Export, SC, dan WCT lalu klik "1. Proses Data".'
          />
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-md border border-steel-100 bg-steel-50 px-3 py-2.5">
              <Info size={14} className="mt-0.5 shrink-0 text-steel-600" />
              <p className="text-[11px] leading-relaxed text-slate-600">
                Format GAP baru: gunakan file{" "}
                <span className="font-semibold text-slate-700">
                  Final_Checker_Distribution_Report.xlsx
                </span>{" "}
                hasil export dari Ownership Digital. Data ditampilkan apa adanya, lalu sistem
                menambahkan kolom <span className="font-semibold text-slate-700">Result</span> dan{" "}
                <span className="font-semibold text-slate-700">Keterangan</span>.
                {usesNewFormat ? (
                  <>
                    {" "}
                    File export tidak memiliki kolom REASON ID, jadi validasi memakai kecocokan Case
                    ID dan Direction (BIASA) / Case Type Interaction Ticket (WCT).
                  </>
                ) : null}
              </p>
            </div>

            <MetricBar
              items={[
                { label: "Total GAP", value: counts.total },
                { label: "Done CO", value: counts.done, valueClass: "text-success-600" },
                { label: "Belum CO", value: counts.belum, valueClass: "text-amber-600" },
                { label: "CO Tidak Sesuai", value: counts.tidak, valueClass: "text-red-600" },
              ]}
            />

            <GapCoTable rows={finalData} />
          </>
        )}
      </main>
    </div>
  );
}
