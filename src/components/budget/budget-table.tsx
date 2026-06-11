import { DataTable, type Column } from "@/components/ui/data-table";
import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { cn, formatCurrency } from "@/lib/utils";
import type { BudgetRow } from "@/lib/budget-math";

const STATUS_TEXT: Record<BudgetRow["status"], string> = {
  under: "text-positive",
  near: "text-warning",
  over: "text-negative",
};

function meta(category: string): { label: string; color: string } {
  return (
    CATEGORY_MAP[category as CategoryKey] ??
    TXN_CATEGORY_MAP[category as TxnCategoryKey] ?? { label: category, color: "#64748b" }
  );
}

export function BudgetTable({ rows }: { rows: BudgetRow[] }) {
  const columns: Column<BudgetRow>[] = [
    {
      key: "category",
      header: "Category",
      render: (r) => {
        const m = meta(r.category);
        return (
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
            {m.label}
          </span>
        );
      },
    },
    { key: "budget", header: "Budget", align: "right", render: (r) => formatCurrency(r.planned) },
    { key: "spent", header: "Spent", align: "right", render: (r) => formatCurrency(r.actual) },
    {
      key: "used",
      header: "% Used",
      align: "right",
      render: (r) => <span className={cn("font-semibold", STATUS_TEXT[r.status])}>{Math.round(r.pct)}%</span>,
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.category} empty="No categories budgeted yet." />;
}
