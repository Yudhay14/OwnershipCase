import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

/**
 * Menyuntikkan freeze pane pada baris header.
 *
 * File .xlsx adalah arsip zip: dibuka, elemen <pane> ditambahkan ke <sheetView>,
 * lalu dibungkus ulang. Dipakai bersama oleh export Ownership Digital dan GAP CO
 * supaya formatting Excel keduanya konsisten.
 *
 * Catatan: SheetJS community tidak bisa menulis freeze pane, karena itu XML-nya
 * disuntik manual lewat fflate.
 */
export function freezeHeaderRow(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const sheetPath = Object.keys(files).find((path) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(path)
  );
  if (!sheetPath) return new Uint8Array(buffer);

  let xml = strFromU8(files[sheetPath]);
  if (xml.includes("<pane ")) return new Uint8Array(buffer);

  const pane =
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>';

  if (/<sheetView\b[^>]*\/>/.test(xml)) {
    xml = xml.replace(/(<sheetView\b[^>]*?)\/>/, `$1>${pane}</sheetView>`);
  } else {
    xml = xml.replace(/(<sheetView\b[^>]*?>)/, `$1${pane}`);
  }

  files[sheetPath] = strToU8(xml);
  return zipSync(files, { level: 6 });
}
