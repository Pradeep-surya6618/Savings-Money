import Link from "next/link";
import { Pencil, Wallet } from "lucide-react";
import { CountUp } from "@/components/dashboard/count-up";
import { HeroSection } from "@/components/ui/hero-section";
import { monthLabel } from "@/lib/month";

export function HeroCard({
  month,
  amount,
  receivedDate,
}: {
  month: string;
  amount: number;
  receivedDate: string | null;
}) {
  const received = receivedDate
    ? new Date(receivedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;
  return (
    <HeroSection>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-white/70">
            Total Salary ({monthLabel(month)})
          </p>
          <CountUp value={amount} className="mt-2 block text-4xl font-bold tracking-tight sm:text-5xl" />
          <p className="mt-2 text-sm text-white/80">{received ? `Received on ${received}` : "Not received yet"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/salary?month=${month}`}
            aria-label="Edit salary"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition hover:bg-white/25"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/70">
            <Wallet className="h-6 w-6" />
          </span>
        </div>
      </div>
    </HeroSection>
  );
}
