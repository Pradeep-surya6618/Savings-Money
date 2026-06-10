import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { HeroSection } from "@/components/dashboard/hero-section";
import { monthLabel } from "@/lib/month";

export function DashboardEmptyState({ month }: { month: string }) {
  return (
    <div className="space-y-6">
      <HeroSection>
        <MonthSwitcher month={month} />
      </HeroSection>
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card-elevated text-muted-foreground">
          <Wallet className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">No salary set for {monthLabel(month)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your salary and allocate it across categories.
          </p>
        </div>
        <Link href={`/salary?month=${month}`}>
          <Button>Set up {monthLabel(month)} →</Button>
        </Link>
      </div>
    </div>
  );
}
