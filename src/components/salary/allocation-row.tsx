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
  const label = CATEGORY_MAP[category].label;
  return (
    <label className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card-elevated text-muted-foreground transition group-focus-within:bg-primary/15 group-focus-within:text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{percent}% of salary</span>
      </span>
      <span className="flex items-center gap-0.5 rounded-xl bg-card-elevated px-2.5 py-2 ring-1 ring-inset ring-transparent transition group-focus-within:ring-primary/30">
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
          className="w-20 bg-transparent text-right text-sm font-medium tabular-nums outline-none placeholder:text-muted-foreground/50"
        />
      </span>
    </label>
  );
}
