"use client";

import { Card } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";
import { monthLabel } from "@/lib/month";
import { formatCurrency } from "@/lib/utils";
import type { MonthTotal } from "@/lib/analytics-math";

const INCOME = "#16a34a";
const EXPENSE = "#64748b";

export function IncomeExpenseChart({ monthly }: { monthly: MonthTotal[] }) {
  const groups = monthly.map((m) => ({
    label: monthLabel(m.month).slice(0, 3),
    bars: [
      { value: m.income, color: INCOME },
      { value: m.expense, color: EXPENSE },
    ],
  }));
  const net = monthly.length ? monthly[monthly.length - 1].net : 0;
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Income vs expense</h2>
        <span className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: INCOME }} /> Income
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: EXPENSE }} /> Expense
          </span>
        </span>
      </div>
      <BarChart groups={groups} formatValue={formatCurrency} />
      <p className="text-sm text-muted-foreground">
        This month net:{" "}
        <span className="font-semibold tabular-nums" style={{ color: net >= 0 ? "var(--positive)" : "var(--negative)" }}>
          {formatCurrency(net)}
        </span>
      </p>
    </Card>
  );
}
