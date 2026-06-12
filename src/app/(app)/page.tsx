import { HeroCard } from "@/components/dashboard/hero-card";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { SalaryDistribution } from "@/components/dashboard/salary-distribution";
import { SmartInsights } from "@/components/dashboard/smart-insights";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { MonthPicker } from "@/components/ui/month-picker";
import { getMonthSummary } from "@/services/salary";
import { getAnalytics } from "@/services/analytics";
import { getBalance } from "@/services/balance";
import { currentMonth, isValidMonth } from "@/lib/month";
import { TotalBalanceBanner } from "@/components/dashboard/total-balance-banner";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();

  const [summary, balance] = await Promise.all([getMonthSummary(month), getBalance()]);
  if (!summary) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <MonthPicker month={month} basePath="/" />
        </div>
        <TotalBalanceBanner total={balance.total} opening={balance.openingBalance} />
        <DashboardEmptyState month={month} />
      </div>
    );
  }

  const analytics = await getAnalytics(month);
  const expenseTrend = analytics.monthly.map((m) => m.expense);
  const savingsTrend = analytics.monthly.map((m) => m.net);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <MonthPicker month={month} basePath="/" />
      </div>
      <TotalBalanceBanner total={balance.total} opening={balance.openingBalance} />
      {/* Top row: salary hero + 2×2 stat grid */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
        <HeroCard month={month} amount={summary.amount} receivedDate={summary.receivedDate} />
        <DashboardStats
          stats={summary.stats}
          salary={summary.amount}
          expenseTrend={expenseTrend}
          savingsTrend={savingsTrend}
        />
      </div>
      {/* Bottom row: budget allocation (wide) + smart insights */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <SalaryDistribution amount={summary.amount} allocations={summary.allocations} />
        <SmartInsights insights={summary.insights} />
      </div>
    </div>
  );
}
