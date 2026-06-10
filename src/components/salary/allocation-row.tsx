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
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card-elevated text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm">{CATEGORY_MAP[category].label}</span>
      <span className="w-10 text-right text-xs text-muted-foreground">{percent}%</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={amount === 0 ? "" : amount}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-right text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
