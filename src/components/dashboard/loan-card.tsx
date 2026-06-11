import Link from "next/link";
import { Landmark } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatCurrency } from "@/lib/utils";
import { LOAN_COLOR } from "@/lib/nav";
import type { LoanDTO } from "@/services/loan";

const ACCENT = LOAN_COLOR;

export function LoanCard({ data }: { data: LoanDTO }) {
  const isSetUp = data.totalLoan > 0;
  return (
    <Link
      href="/loan"
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
    >
      <ProgressRing value={data.stats.pct} size={72} strokeWidth={7} color={ACCENT}>
        <span className="text-sm font-bold tabular-nums">
          {isSetUp ? `${Math.round(data.stats.pct)}%` : "—"}
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4" style={{ color: ACCENT }} />
          <p className="font-semibold">Loan</p>
        </div>
        {isSetUp ? (
          <>
            <p className="mt-1 truncate text-sm text-muted-foreground tabular-nums">
              {formatCurrency(data.paidAmount)} / {formatCurrency(data.totalLoan)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {data.stats.paidOff ? "Paid off 🎉" : `${formatCurrency(data.stats.remaining)} left`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Add loan →</p>
        )}
      </div>
    </Link>
  );
}
