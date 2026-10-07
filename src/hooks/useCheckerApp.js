import { useCallback, useMemo, useRef, useState } from "react";
import { readLogBiasa, readLogWCT } from "../utils/readWorkbooks.js";
import { parseScheduleWorkbook, getEligibleCount } from "../utils/schedule.js";
import { computeMergedData, distributeCheckers } from "../utils/processing.js";
import { exportExcelCombined } from "../utils/exportExcel.js";
import { MASTER_AGENT_COUNT } from "../utils/agents.js";

/**
 * Orchestrates the LOCKED business flow (upload -> schedule -> filter -> process
 * -> distribute -> export) and exposes it to the presentation layer.
 *
 * No algorithm lives here: every rule is delegated to src/utils/*, which are
 * ports of the legacy code.
 */

const EMPTY_FILE = { name: "", size: 0, lastModified: 0, status: "idle", rows: 0 };

const PROCESS_STAGES = [
  "Reading files...",
  "Processing data...",
  "Matching agents...",
  "Preparing results...",
];

/**
 * @param {{ pushToast: (type: string, message: string) => void }} deps
 *   pushToast berasal dari useToasts() supaya semua menu berbagi satu tumpukan
 *   notifikasi. Yang berubah hanya kepemilikan state toast - pesannya tetap sama.
 */
export function useCheckerApp({ pushToast }) {
  const [files, setFiles] = useState({
    biasa: { ...EMPTY_FILE },
    wct: { ...EMPTY_FILE },
    jakarta: { ...EMPTY_FILE },
    jogja: { ...EMPTY_FILE },
  });

  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");

  const [scheduleJakarta, setScheduleJakarta] = useState({});
  const [scheduleJogja, setScheduleJogja] = useState({});

  const [finalMergedData, setFinalMergedData] = useState([]);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [counts, setCounts] = useState({ biasa: 0, wct: 0, redis: 0 });

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStage, setProcessStage] = useState(PROCESS_STAGES[0]);

  // Raw log rows are never rendered, so they stay in refs.
  const rawBiasaRef = useRef([]);
  const rawWCTRef = useRef([]);

  const setFileState = useCallback((key, patch) => {
    setFiles((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }, []);

  /* ---------------------------------------------------------------- uploads */

  const handleLogBiasa = useCallback(
    async (file) => {
      if (!file) return;
      setFileState("biasa", {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        status: "processing",
        rows: 0,
      });

      const res = await readLogBiasa(file);
      if (!res.ok) {
        setFileState("biasa", { status: "error" });
        pushToast("danger", res.message);
        return;
      }
      rawBiasaRef.current = res.rows;
      setFileState("biasa", { status: "ready", rows: res.rows.length });
    },
    [pushToast, setFileState]
  );

  const handleLogWCT = useCallback(
    async (file) => {
      if (!file) return;
      setFileState("wct", {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        status: "processing",
        rows: 0,
      });

      const res = await readLogWCT(file);
      if (!res.ok) {
        setFileState("wct", { status: "error" });
        pushToast("danger", res.message);
        return;
      }
      rawWCTRef.current = res.rows;
      setFileState("wct", { status: "ready", rows: res.rows.length });
    },
    [pushToast, setFileState]
  );

  const handleSchedule = useCallback(
    async (location, file) => {
      if (!file) return;
      const key = location === "JAKARTA" ? "jakarta" : "jogja";
      const label = location === "JAKARTA" ? "Jakarta" : "Jogja";

      setFileState(key, {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        status: "processing",
        rows: 0,
      });

      const res = await parseScheduleWorkbook(file, location);
      if (!res.ok) {
        setFileState(key, { status: "error" });
        pushToast("danger", res.message);
        return;
      }

      if (location === "JAKARTA") setScheduleJakarta(res.result);
      else setScheduleJogja(res.result);

      setFileState(key, { status: "ready", rows: Object.keys(res.result).length });
      pushToast(
        "success",
        `Schedule ${label} berhasil diproses: ${Object.keys(res.result).length} agent terpetakan.`
      );
    },
    [pushToast, setFileState]
  );

  const removeFile = useCallback((key) => {
    setFiles((current) => ({ ...current, [key]: { ...EMPTY_FILE } }));
    if (key === "biasa") rawBiasaRef.current = [];
    if (key === "wct") rawWCTRef.current = [];
    if (key === "jakarta") setScheduleJakarta({});
    if (key === "jogja") setScheduleJogja({});
  }, []);

  /* --------------------------------------------------------------- workflow */

  const runProcessing = useCallback(async () => {
    // Same guard order as the legacy `prosesSemuaData()`.
    if (
      Object.keys(scheduleJakarta).length === 0 &&
      Object.keys(scheduleJogja).length === 0
    ) {
      pushToast("warning", "Upload minimal satu file Schedule Jakarta/Jogja terlebih dahulu.");
      return;
    }

    if (!date1) {
      pushToast("warning", "Pilih Tanggal Utama Filter.");
      return;
    }

    setIsProcessing(true);
    setProcessStage(PROCESS_STAGES[0]);

    // Visual staging only - the computation itself is unchanged and synchronous.
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setProcessStage(PROCESS_STAGES[Math.min(step, PROCESS_STAGES.length - 1)]);
    }, 140);

    try {
      await new Promise((resolve) => setTimeout(resolve, 560));

      const result = computeMergedData({
        rawDataBiasa: rawBiasaRef.current,
        rawDataWCT: rawWCTRef.current,
        scheduleJakarta,
        scheduleJogja,
        date1,
        date2,
      });

      setFinalMergedData(result.finalMergedData);
      setHasProcessed(true);
      setCounts({ biasa: result.cBiasaGlobal, wct: result.cWCTGlobal, redis: 0 });
    } finally {
      clearInterval(timer);
      setIsProcessing(false);
    }
  }, [date1, date2, pushToast, scheduleJakarta, scheduleJogja]);

  const runDistribution = useCallback(() => {
    if (finalMergedData.length === 0) return;

    // Work on copies so React state stays immutable; the algorithm is unchanged.
    const draft = finalMergedData.map((item) => ({ ...item }));
    const res = distributeCheckers(draft, scheduleJakarta, scheduleJogja);

    if (!res.ok) {
      pushToast("danger", res.message);
      return;
    }

    setFinalMergedData(res.finalMergedData);
    setCounts((current) => ({ ...current, redis: res.redisCount }));
    pushToast(
      "success",
      `Checker berhasil dibagi. ${res.redisCount} case masuk redistribusi ke ${res.eligibleAgentsCount} agent duty 05-14.`
    );
  }, [finalMergedData, pushToast, scheduleJakarta, scheduleJogja]);

  const runExport = useCallback(() => {
    if (finalMergedData.length === 0) return;
    exportExcelCombined(finalMergedData);
  }, [finalMergedData]);

  /* ----------------------------------------------------------------- derived */

  const eligibleCount = useMemo(
    () => getEligibleCount(scheduleJakarta, scheduleJogja),
    [scheduleJakarta, scheduleJogja]
  );

  const hasSchedule = useMemo(
    () => Object.keys(scheduleJakarta).length > 0 || Object.keys(scheduleJogja).length > 0,
    [scheduleJakarta, scheduleJogja]
  );

  return {
    // data + state
    files,
    date1,
    date2,
    finalMergedData,
    hasProcessed,
    counts,
    eligibleCount,
    masterAgentCount: MASTER_AGENT_COUNT,
    hasSchedule,
    isProcessing,
    processStage,

    // actions
    setDate1,
    setDate2,
    handleLogBiasa,
    handleLogWCT,
    handleSchedule,
    removeFile,
    runProcessing,
    runDistribution,
    runExport,
  };
}
