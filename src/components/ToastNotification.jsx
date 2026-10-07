import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/**
 * Toast host. Message text is passed straight through from the same code paths
 * that produced the legacy alerts; only the presentation changed.
 */

const TONES = {
  success: {
    icon: CheckCircle2,
    wrap: "border-success-200 bg-white",
    bar: "bg-success-600",
    iconClass: "text-success-600",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "border-amber-200 bg-white",
    bar: "bg-amber-500",
    iconClass: "text-amber-600",
  },
  danger: {
    icon: XCircle,
    wrap: "border-red-200 bg-white",
    bar: "bg-red-600",
    iconClass: "text-red-600",
  },
  info: {
    icon: Info,
    wrap: "border-steel-100 bg-white",
    bar: "bg-steel-600",
    iconClass: "text-steel-600",
  },
};

export default function ToastNotification({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = TONES[toast.type] || TONES.info;
          const Icon = tone.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 16, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto relative flex items-start gap-2.5 overflow-hidden rounded-md border py-2.5 pl-3 pr-2 shadow-[0_6px_20px_rgba(16,24,40,0.10)] ${tone.wrap}`}
              role="status"
              aria-live="polite"
            >
              <span className={`absolute inset-y-0 left-0 w-0.5 ${tone.bar}`} />
              <Icon size={15} className={`mt-0.5 shrink-0 ${tone.iconClass}`} />
              <p className="flex-1 text-[11.5px] font-medium leading-relaxed text-slate-700">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="focus-ring -mr-0.5 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Tutup notifikasi"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
