"use client";

import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { CountUp } from "@/components/dashboard/count-up";
import { SAVINGS_COLOR } from "@/lib/nav";

/** Premium app-bar chip showing the user's total savings, with a count-up animation. */
export function SavingsChip({ amount }: { amount: number }) {
  return (
    <Link
      href="/savings"
      aria-label="Total savings"
      className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-3 py-1.5 shadow-[var(--shadow-card)] transition hover:border-foreground/15 hover:bg-card-elevated"
    >
      <span className="flex items-center gap-1.5 leading-none">
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${SAVINGS_COLOR}24`, color: SAVINGS_COLOR }}
        >
          <PiggyBank className="h-2.5 w-2.5" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Savings</span>
      </span>
      <CountUp value={amount} className="text-sm font-bold leading-none" />
    </Link>
  );
}
