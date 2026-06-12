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
      className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 shadow-[var(--shadow-card)] transition hover:border-foreground/15 hover:bg-card-elevated"
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${SAVINGS_COLOR}24`, color: SAVINGS_COLOR }}
      >
        <PiggyBank className="h-3.5 w-3.5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Savings</span>
        <CountUp value={amount} className="mt-0.5 text-sm font-semibold" />
      </span>
    </Link>
  );
}
