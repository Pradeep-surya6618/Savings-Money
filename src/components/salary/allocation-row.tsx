"use client";

import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { CATEGORY_ICONS } from "@/lib/category-icons";

export function AllocationRow({
  category,
  amount,
  percent,
  onChange,
}: {
  category: CategoryKey;
  amount: number;
  percent: number;
  onChange: (value: number) => void;
}) {
  const Icon = CATEGORY_ICONS[category];
  const { label, color } = CATEGORY_MAP[category];
  return (
    <label className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* decorative color bloom (grows + brightens on hover) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-7 -top-9 h-24 w-24 rounded-full opacity-[0.12] blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-30"
        style={{ backgroundColor: color }}
      />

      {/* circular icon badge with an expanding ripple ring + animated icon */}
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border opacity-40 transition-all duration-500 ease-out group-hover:scale-[1.35] group-hover:opacity-0"
          style={{ borderColor: color }}
        />
        <span
          className="relative flex h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon className="h-5 w-5 transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transform-none" />
        </span>
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{percent}% of salary</span>
      </span>

      <span className="relative flex items-center gap-0.5 rounded-xl bg-card-elevated px-2.5 py-2 ring-1 ring-inset ring-transparent transition group-focus-within:ring-primary/30">
        <span className="text-sm text-muted-foreground">₹</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={amount === 0 ? "" : amount}
          placeholder="0"
          onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          aria-label={`${label} amount`}
          className="w-20 bg-transparent text-right text-sm font-semibold tabular-nums outline-none placeholder:text-muted-foreground/50"
        />
      </span>
    </label>
  );
}
