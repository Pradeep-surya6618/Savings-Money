import type { ComponentType } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp, CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RingStat } from "@/components/ui/ring-stat";
import { MonthPicker } from "@/components/ui/month-picker";
import { BudgetTable } from "./budget-table";
import { cn, formatCurrency } from "@/lib/utils";
import type { BudgetDTO } from "@/services/budget";

const TONE = {
  negative: { text: "text-negative", chip: "bg-negative/10 text-negative" },
  positive: { text: "text-positive", chip: "bg-positive/10 text-positive" },
  warning: { text: "text-warning", chip: "bg-warning/10 text-warning" },
} as const;

export function BudgetView({ data, month }: { data: BudgetDTO; month: string }) {
  const r = data.reconciliation;
  const rows = [...r.rows, ...r.unbudgeted];
  const usedPct = data.salaryAmount > 0 ? (r.totals.actual / data.salaryAmount) * 100 : 0;

  const over = rows.filter((x) => x.status === "over");
  const under = rows.filter((x) => x.status === "under");
  const near = rows.filter((x) => x.status === "near");
  const overAmt = over.reduce((s, x) => s + (x.actual - x.planned), 0);
  const underAmt = under.reduce((s, x) => s + (x.planned - x.actual), 0);
  const nearAmt = near.reduce((s, x) => s + x.remaining, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} basePath="/budget" />
          <Link href={`/salary?month=${month}`}>
            <Button className="gap-2">Edit budget</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Budget Overview</h2>
          <Card className="flex flex-col items-center justify-center py-8">
            <RingStat
              pct={usedPct}
              caption="of budget used"
              sub={
                <>
                  {formatCurrency(r.totals.actual)} of {formatCurrency(data.salaryAmount)}
                </>
              }
            />
            <p className="mt-2 text-xs text-muted-foreground">Total Budget</p>
          </Card>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Category Budget</h2>
          <BudgetTable rows={rows} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatusCard label="Over Budget" amount={overAmt} count={over.length} tone="negative" icon={TrendingUp} />
        <StatusCard label="Under Budget" amount={underAmt} count={under.length} tone="positive" icon={TrendingDown} />
        <StatusCard label="On Track" amount={nearAmt} count={near.length} tone="warning" icon={CircleCheck} />
      </div>
    </div>
  );
}

function StatusCard({
  label,
  amount,
  count,
  tone,
  icon: Icon,
}: {
  label: string;
  amount: number;
  count: number;
  tone: keyof typeof TONE;
  icon: ComponentType<{ className?: string }>;
}) {
  const t = TONE[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", t.chip)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-2 text-xl font-bold tabular-nums", t.text)}>{formatCurrency(amount)}</p>
      <p className="text-xs text-muted-foreground">
        in {count} {count === 1 ? "category" : "categories"}
      </p>
    </div>
  );
}
