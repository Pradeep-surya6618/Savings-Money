import type { CSSProperties } from "react";
import { SectionCard } from "@/components/ui/section-card";
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
    <SectionCard title="Budget Allocation">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No allocations yet.</p>
      ) : (
        <div>
          {/* Column headers */}
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_5.5rem_3.5rem] items-center gap-3 px-1 text-xs font-medium text-muted-foreground">
            <span>Category</span>
            <span className="text-right">Amount</span>
            <span className="text-right">% of Salary</span>
          </div>
          <ul className="space-y-3.5">
            {rows.map((a) => {
              const cat = CATEGORY_MAP[a.category as CategoryKey];
              const Icon = CATEGORY_ICONS[a.category as CategoryKey];
              const pct = amount > 0 ? Math.round((a.amount / amount) * 100) : 0;
              return (
                <li
                  key={a.category}
                  className="grid grid-cols-[minmax(0,1fr)_5.5rem_3.5rem] items-center gap-3 px-1"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${cat.color}1f`, color: cat.color } as CSSProperties}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{cat.label}</p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-elevated">
                        <div
                          className="h-full rounded-full transition-[width] duration-500 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: cat.color } as CSSProperties}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-right text-sm font-medium tabular-nums">{formatCurrency(a.amount)}</span>
                  <span className="text-right text-sm tabular-nums text-muted-foreground">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
