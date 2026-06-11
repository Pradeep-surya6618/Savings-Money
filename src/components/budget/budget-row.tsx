import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { formatCurrency } from "@/lib/utils";
import type { BudgetRow as Row } from "@/lib/budget-math";

const STATUS_COLOR: Record<Row["status"], string> = {
  under: "var(--positive)",
  near: "var(--warning)",
  over: "var(--negative)",
};

function meta(category: string): { label: string; color: string } {
  return (
    CATEGORY_MAP[category as CategoryKey] ??
    TXN_CATEGORY_MAP[category as TxnCategoryKey] ?? { label: category, color: "#64748b" }
  );
}

export function BudgetRow({ row }: { row: Row }) {
  const m = meta(row.category);
  const width = Math.min(100, Math.max(row.pct, row.actual > 0 ? 4 : 0));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
          <span className="font-medium">{m.label}</span>
        </span>
        <span className="tabular-nums text-muted-foreground">
          {formatCurrency(row.actual)} / {formatCurrency(row.planned)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-card-elevated">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: STATUS_COLOR[row.status] }} />
      </div>
      <div
        className="text-right text-xs tabular-nums"
        style={{ color: row.remaining < 0 ? "var(--negative)" : "var(--muted-foreground)" }}
      >
        {row.remaining < 0 ? `Over by ${formatCurrency(-row.remaining)}` : `${formatCurrency(row.remaining)} left`}
      </div>
    </div>
  );
}
