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
      {/* Large faint watermark for depth */}
      <Wallet aria-hidden className="pointer-events-none absolute -bottom-5 right-2 h-32 w-32 text-white/10" />
      <div className="flex flex-col gap-7">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-white/70">
            Total Salary ({monthLabel(month)})
          </p>
          <Link
            href={`/salary?month=${month}`}
            aria-label="Edit salary"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition hover:bg-white/25"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </div>
        <div>
          <CountUp value={amount} className="block text-5xl font-bold tracking-tight" />
          <p className="mt-2 text-sm text-white/80">{received ? `Received on ${received}` : "Not received yet"}</p>
        </div>
      </div>
    </HeroSection>
  );
}
