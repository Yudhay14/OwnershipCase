import { useState } from "react";
import { Check, Copy } from "lucide-react";
import StatusBadge from "./StatusBadge.jsx";
import { isEligibleSchedule } from "../utils/schedule.js";

/**
 * Tabel hasil. Urutan kolom TERKUNCI:
 * No, Kategori, Case ID, Create Date, Creator, Schedule, Log In ID, MSISDN, ID 1, Checker.
 * Tabel mengisi sisa tinggi workspace dan punya scroll sendiri (horizontal + vertikal).
 */

const COLUMNS = [
  { key: "no", label: "No", className: "w-[54px] text-right" },
  { key: "kategori", label: "Kategori", className: "w-[104px]" },
  { key: "caseId", label: "Case ID", className: "min-w-[190px]" },
  { key: "createDate", label: "Create Date", className: "w-[124px]" },
  { key: "creator", label: "Creator", className: "min-w-[210px]" },
  { key: "schedule", label: "Schedule", className: "w-[150px]" },
  { key: "loginId", label: "Log In ID", className: "min-w-[155px]" },
  { key: "msisdn", label: "MSISDN", className: "min-w-[145px]" },
  { key: "id1", label: "ID 1", className: "min-w-[170px]" },
  { key: "checker", label: "Checker", className: "min-w-[190px]" },
];

const TH =
  "sticky top-0 z-10 h-[40px] border-b border-line bg-[#E7EDF4] px-3 text-[12px] font-semibold text-[#1F4E79] whitespace-nowrap";
const TD = "px-3 align-middle text-[12.5px]";

function renderSchedule(item) {
  if (item.schedule === "Support") return <StatusBadge variant="support">Support</StatusBadge>;
  if (item.schedule === "TIDAK TERPETAKAN")
    return <StatusBadge variant="unknown">TIDAK TERPETAKAN</StatusBadge>;
  if (item.schedule && item.schedule !== "-") {
    return (
      <StatusBadge variant={isEligibleSchedule(item.schedule) ? "eligible" : "ineligible"}>
        {item.schedule}
      </StatusBadge>
    );
  }
  return <span className="text-slate-300">-</span>;
}

function renderChecker(item) {
  if (item.checkerType === "ownership")
    return <StatusBadge variant="ownership">{item.checker}</StatusBadge>;
  if (item.checkerType === "redistribution")
    return <StatusBadge variant="redistribution">{item.checker}</StatusBadge>;
  if (item.checkerType === "unmapped")
    return <StatusBadge variant="unknown">UNMAPPED</StatusBadge>;
  return <span className="text-slate-300">-</span>;
}

function Ellipsis({ value, className = "" }) {
  const text = String(value ?? "");
  return (
    <span className={`block max-w-[240px] truncate ${className}`} title={text}>
      {text}
    </span>
  );
}

export default function DataTable({ rows, onCopyCaseId }) {
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(null);

  async function copyCaseId(event, caseId, index) {
    event.stopPropagation();
    const text = String(caseId ?? "");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(index);
      setTimeout(() => setCopied((current) => (current === index ? null : current)), 1200);
      onCopyCaseId?.(text);
    } catch {
      /* clipboard tidak tersedia - abaikan */
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-line bg-white px-4 py-10 text-center">
        <div>
          <p className="text-[13px] font-semibold text-ink">Tidak ada data sesuai filter.</p>
          <p className="mt-1 text-[11.5px] text-slate-500">
            Periksa file log, schedule, dan tanggal filter yang dipilih.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line bg-white max-lg:max-h-[70vh] max-lg:min-h-[380px]">
      <div id="result-scroll" className="sd-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1280px] border-collapse text-left">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} scope="col" className={`${TH} ${col.className}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((item, index) => {
              const isSelected = selected === index;
              return (
                <tr
                  key={`${item.kategori}-${item.caseId}-${index}`}
                  onClick={() => setSelected(isSelected ? null : index)}
                  className={`sd-row-in h-[46px] border-b border-line/70 transition-colors last:border-b-0 ${
                    isSelected
                      ? "bg-brand-50/60"
                      : index % 2 === 1
                        ? "bg-slate-50/50 hover:bg-slate-100/60"
                        : "bg-white hover:bg-slate-50"
                  }`}
                  style={{ animationDelay: `${Math.min(index, 12) * 12}ms` }}
                >
                  <td className={`${TD} tnum text-right font-semibold text-slate-400`}>
                    {index + 1}
                  </td>

                  <td className={TD}>
                    <StatusBadge variant={item.kategori === "WCT" ? "wct" : "biasa"}>
                      {item.kategori}
                    </StatusBadge>
                  </td>

                  <td className={TD}>
                    <div className="group flex items-center gap-1.5">
                      <span
                        className="tnum block max-w-[240px] truncate font-semibold text-ink"
                        title={String(item.caseId ?? "")}
                      >
                        {String(item.caseId ?? "")}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => copyCaseId(event, item.caseId, index)}
                        className="focus-ring rounded p-0.5 text-slate-300 opacity-0 transition-opacity hover:text-slate-600 focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={`Copy Case ID ${item.caseId}`}
                        title="Copy Case ID"
                      >
                        {copied === index ? (
                          <Check size={12} className="text-success-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className={`${TD} tnum text-slate-600`}>{item.createDate}</td>

                  <td className={`${TD} text-slate-700`}>
                    <Ellipsis value={item.creator} />
                  </td>

                  <td className={TD}>{renderSchedule(item)}</td>

                  <td className={TD}>
                    <Ellipsis value={item.loginId} className="tnum text-slate-600" />
                  </td>

                  <td className={TD}>
                    <Ellipsis value={item.msisdn} className="tnum text-slate-600" />
                  </td>

                  <td className={TD}>
                    <Ellipsis value={item.id1} className="tnum text-slate-600" />
                  </td>

                  <td className={TD}>{renderChecker(item)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-line bg-[#EDF1F6] px-3 py-1.5">
        <p className="tnum text-[11px] text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700">{rows.length}</span> baris
        </p>
        <p className="hidden text-[11px] text-slate-400 sm:block">
          Klik baris untuk menandai &middot; ikon copy menyalin Case ID
        </p>
      </div>
    </div>
  );
}
