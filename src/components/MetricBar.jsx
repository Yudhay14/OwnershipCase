import { motion } from "framer-motion";
import CountUp from "./CountUp.jsx";

/**
 * Bar metrik ringkas: satu baris, satu border, pemisah tipis.
 * Nilai selalu dari pemanggil - komponen ini tidak menghitung apa pun.
 */
export default function MetricBar({ items }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-stretch divide-x divide-line rounded-md border border-line bg-brand-50"
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 items-baseline gap-2 px-3.5 py-2.5">
          <span
            className="truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500"
            title={item.label}
          >
            {item.label}
          </span>
          <span
            data-metric={item.label}
            className={`tnum ml-auto text-[17px] font-bold leading-none ${
              item.valueClass || "text-brand-800"
            }`}
          >
            <CountUp value={item.value} />
          </span>
        </div>
      ))}
    </motion.div>
  );
}
