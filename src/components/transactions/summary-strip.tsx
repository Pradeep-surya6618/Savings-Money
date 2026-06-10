import { cn, formatCurrency } from "@/lib/utils";

export function SummaryStrip({
  income,
  expense,
  net,
}: {
  income: number;
  expense: number;
  net: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Income</p>
        <p className="mt-1 text-base font-semibold tabular-nums text-positive sm:text-lg">
          {formatCurrency(income)}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Expense</p>
        <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">{formatCurrency(expense)}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Net</p>
        <p
          className={cn(
            "mt-1 text-base font-semibold tabular-nums sm:text-lg",
            net >= 0 ? "text-positive" : "text-negative",
          )}
        >
          {formatCurrency(net)}
        </p>
      </div>
    </div>
  );
}
