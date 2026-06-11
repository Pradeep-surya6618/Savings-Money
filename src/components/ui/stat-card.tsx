import type { ComponentType, ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";

export function StatCard({
  label,
  value,
  pct,
  icon: Icon,
  accentColor,
  chart,
}: {
  label: string;
  value: number;
  pct?: number;
  icon?: ComponentType<{ className?: string }>;
  accentColor?: string;
  chart?: ReactNode; // a <MiniSparkline /> or similar
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(value)}</p>
          {pct != null && <p className="text-xs text-muted-foreground tabular-nums">{pct}%</p>}
        </div>
        {Icon && (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: accentColor ? `${accentColor}1f` : "var(--card-elevated)",
              color: accentColor ?? "var(--muted-foreground)",
            }}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      {chart && (
        <div className="mt-auto pt-2" style={{ color: accentColor }}>
          {chart}
        </div>
      )}
    </div>
  );
}
