import { useRef } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, RotateCcw, TriangleAlert, Upload } from "lucide-react";

/**
 * Satu field upload di control panel: judul bernomor, tombol Choose File,
 * status, nama file, dan baris info (sheet/kolom) jika ada.
 * Parsing file tetap milik pemanggil.
 */

const STATUS = {
  idle: null,
  processing: { label: "Processing", className: "text-steel-600", Icon: Loader2 },
  ready: { label: "Loaded", className: "text-success-600", Icon: Check },
  error: { label: "Error", className: "text-red-600", Icon: TriangleAlert },
};

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileField({
  index,
  title,
  meta,
  accept = ".xlsx,.xls",
  onSelect,
  onRemove,
}) {
  const inputRef = useRef(null);
  const file = meta || {};
  const status = STATUS[file.status] || null;
  const StatusIcon = status?.Icon;
  const hasFile = Boolean(file.name);

  return (
    <div className="py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-slate-700">
          {index}. {title}
        </p>
        {status ? (
          <span className={`flex items-center gap-1 text-[11px] font-semibold ${status.className}`}>
            {StatusIcon ? (
              <StatusIcon
                size={12}
                className={file.status === "processing" ? "animate-spin" : ""}
              />
            ) : null}
            {status.label}
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onSelect(picked);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={file.status === "processing"}
        className="focus-ring mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-md border border-line bg-white text-[12.5px] font-semibold text-slate-700 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {file.status === "processing" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Upload size={14} />
        )}
        {hasFile ? "Ganti File" : "Choose File"}
      </button>

      {hasFile ? (
        <motion.div
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-1.5 flex items-start gap-1.5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-slate-600" title={file.name}>
              {file.name}
            </p>
            <p className="tnum text-[10.5px] text-slate-400">
              {[
                formatSize(file.size),
                file.status === "ready" && file.rows > 0 ? `${file.rows} baris` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onRemove();
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="focus-ring shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={`Reset ${title}`}
            title="Reset"
          >
            <RotateCcw size={12} />
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
