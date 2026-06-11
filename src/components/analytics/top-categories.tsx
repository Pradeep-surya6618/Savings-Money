"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { txnCategoryMeta as meta } from "@/lib/category-meta";
import { formatCurrency } from "@/lib/utils";
import type { CategoryShare, CategoryChange } from "@/lib/analytics-math";

export function TopCategories({ top, changes }: { top: CategoryShare[]; changes: CategoryChange[] }) {
  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Top categories</h2>
      {top.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No spending yet.</p>
      ) : (
        <ul className="space-y-2">
          {top.map((t) => (
            <li key={t.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta(t.category).color }} />
                  {meta(t.category).label}
                </span>
                <span className="tabular-nums text-muted-foreground">{formatCurrency(t.amount)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-card-elevated">
                <div className="h-full rounded-full" style={{ width: `${Math.round(t.pct)}%`, backgroundColor: meta(t.category).color }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {changes.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-xs font-semibold text-muted-foreground">Biggest changes vs last month</h3>
          <ul className="space-y-1.5">
            {changes.map((c) => {
              const up = c.delta > 0; // more spending = worse (red)
              return (
                <li key={c.category} className="flex items-center justify-between text-sm">
                  <span>{meta(c.category).label}</span>
                  <span
                    className="flex items-center gap-1 tabular-nums"
                    style={{ color: up ? "var(--negative)" : "var(--positive)" }}
                  >
                    {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                    {formatCurrency(Math.abs(c.delta))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
