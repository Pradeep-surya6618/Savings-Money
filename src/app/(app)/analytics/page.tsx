import { AnalyticsView } from "@/components/analytics/analytics-view";
import { getAnalytics } from "@/services/analytics";
import { getBudget } from "@/services/budget";
import { getLoans } from "@/services/loan";
import { financialHealthScore } from "@/lib/health-score";
import { currentMonth, isValidMonth } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();

  const [data, budget, loanData] = await Promise.all([getAnalytics(month), getBudget(month), getLoans()]);

  const savingsRate = data.savingsRate.length ? data.savingsRate[data.savingsRate.length - 1].rate : 0;
  const budgetRows = (budget?.reconciliation.rows ?? []).filter((row) => row.planned > 0);
  const budgetAdherence = budgetRows.length
    ? (budgetRows.filter((row) => row.status !== "over").length / budgetRows.length) * 100
    : 100;
  const health = financialHealthScore({
    savingsRate,
    budgetAdherence,
    loanProgress: loanData.summary.overallPct,
    hasLoan: loanData.summary.count > 0,
  });

  return <AnalyticsView data={data} month={month} health={health} loan={loanData} />;
}
