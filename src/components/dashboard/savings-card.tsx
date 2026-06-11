import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatCurrency } from "@/lib/utils";
import { SAVINGS_COLOR } from "@/lib/nav";
import type { SavingsDTO } from "@/services/savings";

const ACCENT = SAVINGS_COLOR;

export function SavingsCard({ data }: { data: SavingsDTO }) {
  const isSetUp = data.targetAmount > 0;
  return (
    <Link
      href="/savings"
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
    >
      <ProgressRing value={data.stats.pct} size={72} strokeWidth={7} color={ACCENT}>
        <span className="text-sm font-bold tabular-nums">
          {isSetUp ? `${Math.round(data.stats.pct)}%` : "—"}
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4" style={{ color: ACCENT }} />
          <p className="font-semibold">Savings</p>
        </div>
        {isSetUp ? (
          <>
            <p className="mt-1 truncate text-sm text-muted-foreground tabular-nums">
              {formatCurrency(data.currentAmount)} / {formatCurrency(data.targetAmount)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {data.stats.reached ? "Goal reached 🎉" : `${formatCurrency(data.stats.remaining)} to go`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Set a goal →</p>
        )}
      </div>
    </Link>
  );
}
