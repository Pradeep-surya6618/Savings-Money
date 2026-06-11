import { Card } from "@/components/ui/card";
import { MonthNav } from "@/components/ui/month-nav";
import { BudgetRow } from "./budget-row";
import { CATEGORY_MAP, type CategoryKey, type CategoryGroup } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
import type { BudgetDTO } from "@/services/budget";

const GROUP_LABELS: Record<CategoryGroup, string> = {
  expense: "Expenses",
  loan: "Loan",
  savings: "Savings",
  investment: "Investments",
};
const GROUP_ORDER: CategoryGroup[] = ["expense", "loan", "savings", "investment"];

export function BudgetView({ data, month }: { data: BudgetDTO; month: string }) {
  const r = data.reconciliation;
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    rows: r.rows.filter((row) => CATEGORY_MAP[row.category as CategoryKey]?.group === group),
  })).filter((g) => g.rows.length > 0);

  const over = r.totals.remaining < 0;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
        <MonthNav month={month} basePath="/budget" />
      </div>

      <Card className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Planned" value={formatCurrency(r.totals.planned)} />
        <Stat label="Actual" value={formatCurrency(r.totals.actual)} />
        <Stat
          label={over ? "Over" : "Remaining"}
          value={formatCurrency(Math.abs(r.totals.remaining))}
          negative={over}
        />
      </Card>

      {grouped.map((g) => (
        <Card key={g.group} className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">{GROUP_LABELS[g.group]}</h2>
          {g.rows.map((row) => (
            <BudgetRow key={row.category} row={row} />
          ))}
        </Card>
      ))}

      {r.unbudgeted.length > 0 && (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-warning">Unbudgeted spending</h2>
          {r.unbudgeted.map((row) => (
            <BudgetRow key={row.category} row={row} />
          ))}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${negative ? "text-negative" : ""}`}>{value}</p>
    </div>
  );
}
