import Link from "next/link";
import { Coins, ArrowUpRight } from "lucide-react";
import { CountUp } from "@/components/dashboard/count-up";
import { HeroSection } from "@/components/ui/hero-section";
import { formatCurrency } from "@/lib/utils";

export function TotalBalanceBanner({ total, opening }: { total: number; opening: number }) {
  return (
    <Link href="/balance" className="block">
      <HeroSection className="min-h-[9rem] transition hover:brightness-105">
        <Coins
          aria-hidden
          className="pointer-events-none absolute right-5 top-1/2 h-24 w-24 -translate-y-1/2 text-white/15 lg:right-6 lg:h-32 lg:w-32"
        />
        <div className="flex h-full flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-medium uppercase tracking-widest text-white/70">
              Total Balance · across all months
            </p>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-white/70" />
          </div>
          <div>
            <CountUp value={total} className="block text-4xl font-bold tracking-tight sm:text-5xl" />
            <p className="mt-2 text-sm text-white/80">Opening {formatCurrency(opening)}</p>
          </div>
        </div>
      </HeroSection>
    </Link>
  );
}
