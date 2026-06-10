"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, currentMonth, monthLabel } from "@/lib/month";

export function MonthSwitcher({ month }: { month: string }) {
  const atOrAfterCurrent = month >= currentMonth();
  const linkCls =
    "flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25";
  return (
    <div className="flex items-center gap-2 text-white">
      <Link href={`/?month=${addMonths(month, -1)}`} aria-label="Previous month" className={linkCls}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-28 text-center text-xs font-semibold uppercase tracking-wide">
        {monthLabel(month)}
      </span>
      {atOrAfterCurrent ? (
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/30">
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link href={`/?month=${addMonths(month, 1)}`} aria-label="Next month" className={linkCls}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
