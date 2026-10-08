/**
 * Klien Web Worker: mengubah pesan postMessage menjadi Promise ber-id.
 * Worker-nya dijalankan sebagai modul supaya bisa meng-import src/utils/*.
 */

export const WORKER_SUPPORTED = typeof Worker !== "undefined";

let worker = null;
let sequence = 0;
const pending = new Map();

function failAll(message) {
  pending.forEach((entry) => entry.reject(new Error(message)));
  pending.clear();
}

function getWorker() {
  if (worker) return worker;

  worker = new Worker(new URL("../workers/checker.worker.js", import.meta.url), {
    type: "module",
  });

  worker.onmessage = (event) => {
    const { id } = event.data || {};
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    entry.resolve(event.data);
  };

  worker.onerror = (event) => {
    failAll((event && event.message) || "Web Worker gagal dijalankan.");
    worker = null;
  };

  return worker;
}

function call(message, transfer) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    try {
      getWorker().postMessage({ ...message, id }, transfer || []);
    } catch (err) {
      pending.delete(id);
      reject(err);
    }
  });
}

/**
 * Parse satu file log (buffer) di worker; baris mentah tetap tinggal di worker.
 * Buffer ditransfer (bukan disalin) supaya file besar tidak menyalin 40-50 MB
 * lewat main thread.
 */
export function parseLogInWorker(kind, buffer) {
  return call({ type: "parse", kind, buffer }, [buffer]);
}

/**
 * Parse satu file Schedule di worker.
 * Buffer ditransfer agar parsing workbook tidak membekukan UI utama.
 * Hasil yang dikembalikan hanya object schedule yang sudah dipetakan.
 */
export function parseScheduleInWorker(location, buffer) {
  return call({ type: "parseSchedule", location, buffer }, [buffer]);
}

/** Jalankan penggabungan (computeMergedData) di worker atas baris yang tersimpan. */
export function mergeInWorker({ scheduleJakarta, scheduleJogja, date1, date2, overrides }) {
  return call({ type: "merge", scheduleJakarta, scheduleJogja, date1, date2, overrides });
}

/** Buang baris yang tersimpan di worker saat file di-reset. */
export function clearLogInWorker(kind) {
  return call({ type: "clear", kind });
}
