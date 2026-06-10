import Link from "next/link";
import { Pencil } from "lucide-react";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { CountUp } from "@/components/dashboard/count-up";
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
  return (
    <section className="rounded-3xl bg-gradient-to-br from-primary to-primary-end p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <MonthSwitcher month={month} />
        <Link
          href={`/salary?month=${month}`}
          className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/25"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
      </div>
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-white/80">Remaining balance</p>
        <CountUp value={remaining} className="mt-1 block text-4xl font-bold tracking-tight" />
        <p className="mt-1 text-sm text-white/80">of {formatCurrency(amount)} monthly salary</p>
      </div>
    </section>
  );
}
