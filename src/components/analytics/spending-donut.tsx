"use client";

import { Card } from "@/components/ui/card";
import { DonutChart } from "@/components/charts/donut-chart";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { formatCurrency } from "@/lib/utils";
import type { CategoryShare } from "@/lib/analytics-math";

function meta(category: string): { label: string; color: string } {
  return TXN_CATEGORY_MAP[category as TxnCategoryKey] ?? { label: category, color: "#64748b" };
}

export function SpendingDonut({ breakdown }: { breakdown: CategoryShare[] }) {
  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  const segments = breakdown.map((b) => ({ label: b.category, value: b.amount, color: meta(b.category).color }));
  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Spending by category</h2>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No spending this month.</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <DonutChart segments={segments}>
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-lg font-bold tabular-nums">{formatCurrency(total)}</span>
          </DonutChart>
          <ul className="w-full space-y-1.5">
            {breakdown.slice(0, 6).map((b) => (
              <li key={b.category} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta(b.category).color }} />
                  {meta(b.category).label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(b.amount)} · {Math.round(b.pct)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
