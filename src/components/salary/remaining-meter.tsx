"use client";

import { cn, formatCurrency } from "@/lib/utils";

export function RemainingMeter({ amount, allocated }: { amount: number; allocated: number }) {
  const remaining = amount - allocated;
  const over = remaining < 0;
  const pct = amount > 0 ? Math.min(100, Math.round((allocated / amount) * 100)) : 0;
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full",
            over ? "bg-negative" : "bg-gradient-to-r from-primary to-primary-end",
          )}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>
      <p className={cn("mt-2 text-xs", over ? "font-medium text-negative" : "text-white/80")}>
        {over
          ? `⚠ ${formatCurrency(allocated)} allocated · ${formatCurrency(-remaining)} over budget`
          : `${formatCurrency(allocated)} allocated · ${formatCurrency(remaining)} left`}
      </p>
    </div>
  );
}
