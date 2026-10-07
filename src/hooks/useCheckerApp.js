import { useCallback, useMemo, useRef, useState } from "react";
import { readLogBiasa, readLogWCT } from "../utils/readWorkbooks.js";
import { parseScheduleWorkbook, getEligibleCount } from "../utils/schedule.js";
import { computeMergedData, distributeCheckers } from "../utils/processing.js";
import { exportExcelCombined } from "../utils/exportExcel.js";
import { getOverrides } from "../utils/agentStore.js";
import {
  WORKER_SUPPORTED,
  clearLogInWorker,
  mergeInWorker,
  parseLogInWorker,
} from "../utils/checkerWorker.js";
import { useAgentStore } from "./useAgentStore.js";

/**
 * Orchestrates the LOCKED business flow (upload -> schedule -> filter -> process
 * -> distribute -> export) and exposes it to the presentation layer.
 *
 * No algorithm lives here: every rule is delegated to src/utils/*, which are
 * ports of the legacy code.
 *
 * File log (WCT bisa 39-50 MB) diparse dan digabung di Web Worker supaya main
 * thread tidak beku. Worker memakai fungsi yang sama dari src/utils/*, jadi
 * hasilnya identik dengan jalur main thread.
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
  // Jumlah Master Agent ikut daftar efektif, jadi berubah saat admin menambah/menghapus.
  const { masterCount } = useAgentStore();

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
  const [isParsing, setIsParsing] = useState(false);
  const [processStage, setProcessStage] = useState(PROCESS_STAGES[0]);

  // Raw log rows: hanya dipakai di jalur fallback main thread (tanpa Worker).
  const rawBiasaRef = useRef([]);
  const rawWCTRef = useRef([]);

  const setFileState = useCallback((key, patch) => {
    setFiles((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }, []);

  /**
   * Parse satu file log. Di mode Worker, baris mentah tetap tinggal di worker
   * dan yang kembali hanya jumlah baris.
   */
  const parseLog = useCallback(async (kind, file) => {
    const message = `Gagal membaca File ${kind === "wct" ? "WCT" : "Log Biasa"}.`;
    try {
      if (WORKER_SUPPORTED) {
        const res = await parseLogInWorker(kind, await file.arrayBuffer());
        if (!res.ok) return { ok: false, message: res.message || message };
        return { ok: true, rowCount: res.rows };
      }

      const res = kind === "wct" ? await readLogWCT(file) : await readLogBiasa(file);
      if (!res.ok) return res;
      return { ok: true, rowCount: res.rows.length, rows: res.rows };
    } catch (err) {
      console.error(err);
      return { ok: false, message };
    }
  }, []);

  /* ---------------------------------------------------------------- uploads */

  const loadLog = useCallback(
    async (key, file) => {
      if (!file) return;
      setFileState(key, {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        status: "processing",
        rows: 0,
      });
      setIsParsing(true);

      try {
        const res = await parseLog(key, file);
        if (!res.ok) {
          setFileState(key, { status: "error" });
          pushToast("danger", res.message);
          return;
        }

        if (res.rows) {
          if (key === "biasa") rawBiasaRef.current = res.rows;
          else rawWCTRef.current = res.rows;
        }

        setFileState(key, { status: "ready", rows: res.rowCount });
      } finally {
        setIsParsing(false);
      }
    },
    [parseLog, pushToast, setFileState]
  );

  const handleLogBiasa = useCallback((file) => loadLog("biasa", file), [loadLog]);
  const handleLogWCT = useCallback((file) => loadLog("wct", file), [loadLog]);

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

    // Baris mentah di worker juga dibuang supaya memori langsung kembali.
    if (WORKER_SUPPORTED && (key === "biasa" || key === "wct")) {
      clearLogInWorker(key).catch((err) => console.error(err));
    }
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

    // Visual staging only - the computation itself is unchanged.
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setProcessStage(PROCESS_STAGES[Math.min(step, PROCESS_STAGES.length - 1)]);
    }, 140);

    try {
      await new Promise((resolve) => setTimeout(resolve, 560));

      const result = WORKER_SUPPORTED
        ? await mergeInWorker({
            scheduleJakarta,
            scheduleJogja,
            date1,
            date2,
            // Worker tidak punya localStorage, jadi daftar agent efektif
            // (termasuk tambahan admin) dikirim eksplisit.
            overrides: getOverrides(),
          })
        : computeMergedData({
            rawDataBiasa: rawBiasaRef.current,
            rawDataWCT: rawWCTRef.current,
            scheduleJakarta,
            scheduleJogja,
            date1,
            date2,
          });

      if (!result.ok) {
        pushToast("danger", result.message || "Gagal memproses data.");
        return;
      }

      setFinalMergedData(result.finalMergedData);
      setHasProcessed(true);
      setCounts({ biasa: result.cBiasaGlobal, wct: result.cWCTGlobal, redis: 0 });
    } catch (err) {
      console.error(err);
      pushToast("danger", "Gagal memproses data.");
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
    masterAgentCount: masterCount,
    hasSchedule,
    isProcessing,
    isParsing,
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
