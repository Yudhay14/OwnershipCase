import { useCallback, useRef, useState } from "react";
import {
  readSheetRows,
  processGapRows,
  summarizeGapResult,
  usesNewGapFormat,
  exportGapExcel,
} from "../utils/gapco.js";

/**
 * Orchestrates menu GAP CO: upload GAP Export (hasil export Ownership Digital),
 * SC, dan WCT lalu validasi tiap baris.
 *
 * Tidak ada aturan bisnis di sini - semuanya didelegasikan ke src/utils/gapco.js,
 * yang merupakan port dari GAPCO_v2.html.
 */

const EMPTY_FILE = { name: "", size: 0, lastModified: 0, status: "idle", rows: 0 };

const PROCESS_STAGES = [
  "Reading GAP file...",
  "Reading reference files...",
  "Indexing SC & WCT...",
  "Matching GAP data...",
];

export function useGapCoApp({ pushToast }) {
  const [files, setFiles] = useState({
    gap: { ...EMPTY_FILE },
    sc: { ...EMPTY_FILE },
    wct: { ...EMPTY_FILE },
  });

  const [finalData, setFinalData] = useState([]);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [counts, setCounts] = useState({ total: 0, done: 0, belum: 0, tidak: 0 });
  const [usesNewFormat, setUsesNewFormat] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStage, setProcessStage] = useState(PROCESS_STAGES[0]);

  // Baris mentah tidak pernah dirender, jadi disimpan di ref.
  const gapRowsRef = useRef([]);
  const scRowsRef = useRef([]);
  const wctRowsRef = useRef([]);

  const setFileState = useCallback((key, patch) => {
    setFiles((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }, []);

  /* ---------------------------------------------------------------- uploads */

  const handleFile = useCallback(
    async (key, file) => {
      if (!file) return;

      setFileState(key, {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        status: "processing",
        rows: 0,
      });

      try {
        const rows = await readSheetRows(file);
        if (key === "gap") gapRowsRef.current = rows;
        if (key === "sc") scRowsRef.current = rows;
        if (key === "wct") wctRowsRef.current = rows;
        setFileState(key, { status: "ready", rows: rows.length });
      } catch (err) {
        console.error(err);
        setFileState(key, { status: "error" });
        pushToast("danger", "Gagal membaca file. Pastikan formatnya .xlsx, .xls, atau .csv.");
      }
    },
    [pushToast, setFileState]
  );

  const removeFile = useCallback((key) => {
    setFiles((current) => ({ ...current, [key]: { ...EMPTY_FILE } }));
    if (key === "gap") gapRowsRef.current = [];
    if (key === "sc") scRowsRef.current = [];
    if (key === "wct") wctRowsRef.current = [];
  }, []);

  /* --------------------------------------------------------------- workflow */

  const runProcess = useCallback(async () => {
    // Guard yang sama seperti processData() di GAPCO_v2.html.
    if (!files.gap.name) {
      pushToast("warning", "Upload file GAP Export terlebih dahulu.");
      return;
    }
    if (!files.sc.name && !files.wct.name) {
      pushToast("warning", "Upload minimal file SC atau WCT.");
      return;
    }

    setIsProcessing(true);
    setProcessStage(PROCESS_STAGES[0]);

    // Visual staging saja - perhitungannya sendiri tidak berubah.
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setProcessStage(PROCESS_STAGES[Math.min(step, PROCESS_STAGES.length - 1)]);
    }, 140);

    try {
      await new Promise((resolve) => setTimeout(resolve, 480));

      const result = processGapRows({
        gapRows: gapRowsRef.current,
        scRows: scRowsRef.current,
        wctRows: wctRowsRef.current,
      });

      setFinalData(result);
      setCounts(summarizeGapResult(result));
      setUsesNewFormat(usesNewGapFormat(gapRowsRef.current));
      setHasProcessed(true);
      pushToast("success", `${result.length} data GAP berhasil diproses.`);
    } catch (err) {
      console.error(err);
      pushToast("danger", "Gagal memproses data. Pastikan format file sesuai.");
    } finally {
      clearInterval(timer);
      setIsProcessing(false);
    }
  }, [files.gap.name, files.sc.name, files.wct.name, pushToast]);

  const runExport = useCallback(() => {
    if (finalData.length === 0) return;
    exportGapExcel(finalData);
  }, [finalData]);

  /* ----------------------------------------------------------------- derived */

  const canProcess = Boolean(files.gap.name) && Boolean(files.sc.name || files.wct.name);
  const hasRows = finalData.length > 0;

  return {
    // data + state
    files,
    finalData,
    hasProcessed,
    counts,
    usesNewFormat,
    isProcessing,
    processStage,
    canProcess,
    hasRows,

    // actions
    handleFile,
    removeFile,
    runProcess,
    runExport,
  };
}
