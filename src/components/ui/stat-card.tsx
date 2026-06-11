import type { ComponentType, ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";

export function StatCard({
  label,
  shortLabel,
  value,
  pct,
  icon: Icon,
  accentColor,
  chart,
}: {
  label: string;
  shortLabel?: string; // shown on mobile (< sm); falls back to label
  value: number;
  pct?: number;
  icon?: ComponentType<{ className?: string }>;
  accentColor?: string;
  chart?: ReactNode; // a <MiniSparkline /> — rendered on the right
}) {
  return (
    <div className="relative flex h-full items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4">
      {Icon && (
        <span
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl sm:right-4 sm:top-4 sm:h-9 sm:w-9"
          style={{
            backgroundColor: accentColor ? `${accentColor}1f` : "var(--card-elevated)",
            color: accentColor ?? "var(--muted-foreground)",
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {shortLabel ? (
            <>
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{formatCurrency(value)}</p>
        {pct != null && <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">{pct}%</p>}
      </div>
      {chart && (
        <div className="h-10 w-16 shrink-0 self-center sm:h-12 sm:w-24" style={{ color: accentColor }}>
          {chart}
        </div>
      )}
    </div>
  );
}
