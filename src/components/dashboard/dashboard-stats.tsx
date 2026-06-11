import { GraduationCap, Wallet } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { MiniSparkline } from "@/components/ui/mini-sparkline";
import type { MonthStats } from "@/services/salary-stats";

export function DashboardStats({
  stats,
  salary,
  expenseTrend,
  savingsTrend,
}: {
  stats: MonthStats;
  salary: number;
  expenseTrend: number[];
  savingsTrend: number[];
}) {
  const pct = (v: number) => (salary > 0 ? Math.round((v / salary) * 100) : 0);
  return (
    <div className="grid h-full auto-rows-fr grid-cols-2 gap-3">
      <StatCard
        label="Total Expenses"
        shortLabel="Expenses"
        value={stats.expenses}
        pct={pct(stats.expenses)}
        accentColor="#e11d48"
        chart={<MiniSparkline points={expenseTrend} color="#e11d48" className="h-full w-full" />}
      />
      <StatCard
        label="Savings"
        value={stats.savings}
        pct={pct(stats.savings)}
        accentColor="#16a34a"
        chart={<MiniSparkline points={savingsTrend} color="#16a34a" className="h-full w-full" />}
      />
      <StatCard label="Loan Paid" value={stats.loan} pct={pct(stats.loan)} icon={GraduationCap} accentColor="#8b5cf6" />
      <StatCard
        label="Remaining Balance"
        shortLabel="Balance"
        value={stats.remaining}
        pct={pct(stats.remaining)}
        icon={Wallet}
        accentColor="#f59e0b"
      />
    </div>
  );
}
