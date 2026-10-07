import { ScanSearch, Table2 } from "lucide-react";

/**
 * Menu utama aplikasi. Rail tipis navy di kiri (desktop) / bar horizontal (mobile)
 * untuk berpindah antara menu Ownership Digital dan GAP CO.
 *
 * Murni navigasi UI - tidak menyentuh logic menu mana pun.
 */

const ITEMS = [
  {
    id: "ownership",
    label: "Ownership",
    title: "Ownership Digital",
    Icon: Table2,
  },
  {
    id: "gapco",
    label: "GAP CO",
    title: "GAP CO",
    Icon: ScanSearch,
  },
];

export default function AppMenu({ active, onChange }) {
  return (
    <nav
      id="app-menu"
      aria-label="Menu utama"
      className="flex shrink-0 items-stretch gap-1 border-b border-brand-700 bg-brand-800 p-1.5 lg:h-full lg:w-[78px] lg:flex-col lg:gap-1.5 lg:border-b-0 lg:border-r lg:p-2"
    >
      {ITEMS.map((item) => {
        const isActive = active === item.id;
        const Icon = item.Icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            title={item.title}
            className={`focus-ring flex flex-1 items-center justify-center gap-2 rounded-md px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[0.05em] transition-colors lg:flex-none lg:flex-col lg:gap-1 lg:py-3 ${
              isActive
                ? "bg-white text-brand-800"
                : "text-brand-100 hover:bg-brand-700 hover:text-white"
            }`}
          >
            <Icon size={17} />
            <span className="lg:mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
