import Header from "../components/Header.jsx";
import MetricBar from "../components/MetricBar.jsx";
import DataTable from "../components/DataTable.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingState from "../components/LoadingState.jsx";

/**
 * Workspace kanan: header compact, metric bar, lalu tabel hasil.
 * Tabel mengisi sisa tinggi layar dan punya scroll internal sendiri,
 * sehingga di desktop hasil TIDAK pernah turun ke bawah control panel.
 */
export default function WorkspacePage({ app }) {
  const {
    hasProcessed,
    finalMergedData,
    counts,
    eligibleCount,
    isProcessing,
    processStage,
    masterAgentCount,
    hasSchedule,
  } = app;

  return (
    <div id="workspace" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Header
        masterAgentCount={masterAgentCount}
        eligibleCount={eligibleCount}
        hasSchedule={hasSchedule}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4 sm:px-5">
        {isProcessing ? (
          <LoadingState stage={processStage} />
        ) : !hasProcessed ? (
          <EmptyState />
        ) : (
          <>
            <MetricBar
              items={[
                { label: "Total Case Biasa", value: counts.biasa },
                { label: "Total Case WCT", value: counts.wct },
                { label: "Case Redistribusi", value: counts.redis },
                { label: "Agent WCT Eligible", value: eligibleCount },
              ]}
            />
            <DataTable rows={finalMergedData} />
          </>
        )}
      </main>
    </div>
  );
}
