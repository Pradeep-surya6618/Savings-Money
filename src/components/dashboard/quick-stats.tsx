import { ArrowDownCircle, GraduationCap, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import type { MonthStats } from "@/services/salary-stats";

export function QuickStats({ stats }: { stats: MonthStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Expenses" value={stats.expenses} icon={ArrowDownCircle} />
      <StatCard label="Savings" value={stats.savings} icon={PiggyBank} accent="positive" />
      <StatCard label="Investments" value={stats.investments} icon={TrendingUp} accent="investment" />
      <StatCard label="Loan paid" value={stats.loan} icon={GraduationCap} accent="loan" />
      <StatCard label="Remaining" value={stats.remaining} icon={Wallet} />
    </div>
  );
}
