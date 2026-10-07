import StatusBadge from "./StatusBadge.jsx";
import { GAP_RESULT_KEYS } from "../utils/gapco.js";

/**
 * Tabel hasil GAP CO. Kolom mengikuti data GAP apa adanya (urutan kunci dari
 * file export Ownership Digital), lalu ditutup kolom Result dan Keterangan.
 * Tabel mengisi sisa tinggi workspace dan punya scroll sendiri.
 */

const RESULT_VARIANT = {
  "Done CO": "done",
  "Belum CO": "belum",
  "CO Tidak Sesuai": "tidak",
};

const TH =
  "sticky top-0 z-10 h-[40px] border-b border-line bg-[#E7EDF4] px-3 text-[12px] font-semibold text-[#1F4E79] whitespace-nowrap";
const TD = "px-3 align-middle text-[12.5px] whitespace-nowrap";

/** Header data GAP = kunci baris pertama tanpa kolom hasil tambahan. */
export function gapBaseHeaders(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter((key) => !GAP_RESULT_KEYS.includes(key));
}

export default function GapCoTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-line bg-white px-4 py-10 text-center">
        <div>
          <p className="text-[13px] font-semibold text-ink">Tidak ada data GAP yang terbaca.</p>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Periksa file GAP Export yang diunggah, lalu proses ulang.
          </p>
        </div>
      </div>
    );
  }

  const baseHeaders = gapBaseHeaders(rows);
  const minWidth = Math.max(760, baseHeaders.length * 160 + 300);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-white max-lg:max-h-[70vh] max-lg:min-h-[380px]">
      <div id="gapco-scroll" className="sd-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left" style={{ minWidth }}>
          <thead>
            <tr>
              <th scope="col" className={`${TH} w-[54px] text-right`}>
                No
              </th>
              {baseHeaders.map((header) => (
                <th key={header} scope="col" className={TH}>
                  {header}
                </th>
              ))}
              <th scope="col" className={`${TH} w-[128px]`}>
                Result
              </th>
              <th scope="col" className={`${TH} min-w-[190px]`}>
                Keterangan
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className={`sd-row-in h-[46px] border-b border-line/70 transition-colors last:border-b-0 ${
                  index % 2 === 1 ? "bg-slate-50/50 hover:bg-slate-100/60" : "bg-white hover:bg-slate-50"
                }`}
                style={{ animationDelay: `${Math.min(index, 12) * 12}ms` }}
              >
                <td className={`${TD} tnum text-right font-semibold text-slate-400`}>{index + 1}</td>

                {baseHeaders.map((header) => (
                  <td key={header} className={`${TD} max-w-[260px] truncate text-slate-600`} title={String(row[header] ?? "")}>
                    {String(row[header] ?? "")}
                  </td>
                ))}

                <td className={TD}>
                  <StatusBadge variant={RESULT_VARIANT[row.Result] || "neutral"}>
                    {row.Result}
                  </StatusBadge>
                </td>

                <td className={`${TD} max-w-[280px] truncate text-slate-500`} title={String(row.Keterangan ?? "")}>
                  {String(row.Keterangan ?? "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-line bg-[#EDF1F6] px-3 py-1.5">
        <p className="tnum text-[11px] text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700">{rows.length}</span> baris
        </p>
        <p className="hidden text-[11px] text-slate-400 sm:block">
          Data GAP ditampilkan apa adanya &middot; ditambah kolom Result dan Keterangan
        </p>
      </div>
    </div>
  );
}
