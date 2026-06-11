import { MonthNav } from "@/components/ui/month-nav";
import { SpendingDonut } from "./spending-donut";
import { IncomeExpenseChart } from "./income-expense-chart";
import { SavingsRateTrend } from "./savings-rate-trend";
import { TopCategories } from "./top-categories";
import type { AnalyticsDTO } from "@/services/analytics";

export function AnalyticsView({ data, month }: { data: AnalyticsDTO; month: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <MonthNav month={month} basePath="/analytics" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingDonut breakdown={data.breakdown} />
        <IncomeExpenseChart monthly={data.monthly} />
        <SavingsRateTrend savingsRate={data.savingsRate} />
        <TopCategories top={data.top} changes={data.changes} />
      </div>
    </div>
  );
}
