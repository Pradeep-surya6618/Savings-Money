"use client";

import { cn, formatCurrency } from "@/lib/utils";

export function RemainingMeter({ amount, allocated }: { amount: number; allocated: number }) {
  const remaining = amount - allocated;
  const over = remaining < 0;
  const pct = amount > 0 ? Math.min(100, Math.round((allocated / amount) * 100)) : 0;
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/25 ring-1 ring-inset ring-white/10">
        <div
          className={cn("h-full rounded-full bg-white/90 transition-[width] duration-500 ease-out")}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-xs tabular-nums">
        <span className="text-white/75">{formatCurrency(allocated)} allocated</span>
        {over ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-negative">
            ⚠ {formatCurrency(-remaining)} over
          </span>
        ) : (
          <span className="font-semibold text-white">{formatCurrency(remaining)} left</span>
        )}
      </div>
    </div>
  );
}
