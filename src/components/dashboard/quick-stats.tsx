import { StatCard } from "@/components/dashboard/stat-card";
import type { MonthStats } from "@/services/salary-stats";

export function QuickStats({ stats }: { stats: MonthStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Expenses" value={stats.expenses} />
      <StatCard label="Savings" value={stats.savings} accent="positive" />
      <StatCard label="Investments" value={stats.investments} accent="investment" />
      <StatCard label="Loan paid" value={stats.loan} accent="loan" />
      <StatCard label="Remaining" value={stats.remaining} />
    </div>
  );
}
