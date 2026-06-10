import Link from "next/link";
import { Pencil } from "lucide-react";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { CountUp } from "@/components/dashboard/count-up";
import { HeroSection } from "@/components/ui/hero-section";
import { formatCurrency } from "@/lib/utils";

export function HeroCard({
  month,
  amount,
  remaining,
}: {
  month: string;
  amount: number;
  remaining: number;
}) {
  const pctLeft = amount > 0 ? Math.round((remaining / amount) * 100) : 0;
  return (
    <HeroSection>
      <div className="flex items-center justify-between">
        <MonthSwitcher month={month} />
        <Link
          href={`/salary?month=${month}`}
          className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 transition hover:bg-white/25"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
      </div>
      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-widest text-white/70">Remaining balance</p>
        <CountUp value={remaining} className="mt-1 block text-5xl font-bold tracking-tight" />
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80">
          <span>of {formatCurrency(amount)} monthly salary</span>
          {amount > 0 && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium tabular-nums ring-1 ring-white/20">
              {pctLeft}% left
            </span>
          )}
        </div>
      </div>
    </HeroSection>
  );
}
