import { parseLogBiasaBuffer, parseLogWCTBuffer } from "../utils/readWorkbooks.js";
import { computeMergedData } from "../utils/processing.js";
import { setOverrides } from "../utils/agentStore.js";

/**
 * Web Worker untuk file besar (WCT bisa 39-50 MB).
 *
 * `XLSX.read` pada file 65 MB memakan ±6 detik (setelah mode dense) dan ratusan
 * MB memori. Dijalankan di main thread, UI beku selama itu. Karena itu parsing
 * DAN penggabungan dijalankan di sini; yang dikirim balik ke UI hanya hasil
 * akhir yang sudah difilter, bukan ratusan ribu baris mentah.
 *
 * Algorithmenya tetap yang ada di src/utils/* - tidak ada logika baru di sini.
 */

const rawRows = { biasa: [], wct: [] };

function reply(payload) {
  self.postMessage(payload);
}

self.onmessage = (event) => {
  const message = event.data || {};
  const { id, type } = message;

  try {
    if (type === "parse") {
      const parsed =
        message.kind === "wct"
          ? parseLogWCTBuffer(message.buffer)
          : parseLogBiasaBuffer(message.buffer);

      if (!parsed.ok) {
        reply({ id, ok: false, message: parsed.message });
        return;
      }

      rawRows[message.kind] = parsed.rows;
      reply({ id, ok: true, rows: parsed.rows.length });
      return;
    }

    if (type === "merge") {
      // Worker tidak punya localStorage, jadi daftar agent efektif (termasuk
      // tambahan admin) dikirim dari main thread.
      if (message.overrides) setOverrides(message.overrides);

      const result = computeMergedData({
        rawDataBiasa: rawRows.biasa,
        rawDataWCT: rawRows.wct,
        scheduleJakarta: message.scheduleJakarta || {},
        scheduleJogja: message.scheduleJogja || {},
        date1: message.date1,
        date2: message.date2,
      });

      reply({
        id,
        ok: true,
        finalMergedData: result.finalMergedData,
        cBiasaGlobal: result.cBiasaGlobal,
        cWCTGlobal: result.cWCTGlobal,
      });
      return;
    }

    if (type === "clear") {
      rawRows[message.kind] = [];
      reply({ id, ok: true });
      return;
    }

    reply({ id, ok: false, message: `Perintah tidak dikenal: ${type}` });
  } catch (err) {
    reply({ id, ok: false, message: (err && err.message) || "Worker gagal memproses data." });
  }
};
