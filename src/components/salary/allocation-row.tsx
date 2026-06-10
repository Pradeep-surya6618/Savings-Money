"use client";

import type { CSSProperties } from "react";
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
    <label
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      style={{ "--cat": color } as CSSProperties}
    >
      {/* category color accent rail */}
      <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-full" style={{ backgroundColor: color }} />
      <span
        className="ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1f`, color }}
      >
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
