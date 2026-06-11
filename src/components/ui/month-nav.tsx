import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, currentMonth, monthLabel } from "@/lib/month";

/** Month prev/next navigation for pages that read `?month=` (budget, analytics). */
export function MonthNav({ month, basePath }: { month: string; basePath: string }) {
  const atOrAfterCurrent = month >= currentMonth();
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-card-elevated hover:text-foreground";
  return (
    <div className="flex items-center gap-3">
      <Link href={`${basePath}?month=${addMonths(month, -1)}`} aria-label="Previous month" className={btn}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-32 text-center text-sm font-semibold">{monthLabel(month)}</span>
      {atOrAfterCurrent ? (
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground/30">
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link href={`${basePath}?month=${addMonths(month, 1)}`} aria-label="Next month" className={btn}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
