import { Card } from "@/components/ui/card";
import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { formatCurrency } from "@/lib/utils";
import type { AllocationInput } from "@/services/salary-stats";

export function SalaryDistribution({
  amount,
  allocations,
}: {
  amount: number;
  allocations: AllocationInput[];
}) {
  const rows = allocations
    .filter((a) => a.amount > 0 && CATEGORY_MAP[a.category as CategoryKey])
    .sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold">Salary distribution</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No allocations yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const cat = CATEGORY_MAP[a.category as CategoryKey];
            const Icon = CATEGORY_ICONS[a.category as CategoryKey];
            const pct = amount > 0 ? Math.round((a.amount / amount) * 100) : 0;
            return (
              <li key={a.category} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-elevated text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{cat.label}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(a.amount)} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-card-elevated">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-end"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
