import { HeroCard } from "@/components/dashboard/hero-card";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { SalaryDistribution } from "@/components/dashboard/salary-distribution";
import { SmartInsights } from "@/components/dashboard/smart-insights";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { getMonthSummary } from "@/services/salary";
import { currentMonth, isValidMonth } from "@/lib/month";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();

  const summary = await getMonthSummary(month);
  if (!summary) return <DashboardEmptyState month={month} />;

  return (
    <div className="space-y-6">
      <HeroCard month={month} amount={summary.amount} remaining={summary.stats.remaining} />
      <QuickStats stats={summary.stats} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SalaryDistribution amount={summary.amount} allocations={summary.allocations} />
        <SmartInsights insights={summary.insights} />
      </div>
    </div>
  );
}
