import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary } from "@/models/Salary";
import { Transaction } from "@/models/Transaction";
import { addMonths, recentMonths } from "@/lib/month";
import {
  monthlyTotals,
  savingsRateSeries,
  categoryBreakdown,
  topCategoriesAndChanges,
  type MonthTotal,
  type RatePoint,
  type CategoryShare,
  type CategoryChange,
} from "@/lib/analytics-math";

const WINDOW = 6;

export type AnalyticsDTO = {
  months: string[];
  monthly: MonthTotal[];
  savingsRate: RatePoint[];
  breakdown: CategoryShare[];
  top: CategoryShare[];
  changes: CategoryChange[];
};

export async function getAnalytics(month: string): Promise<AnalyticsDTO> {
  await connectDB();
  const { user } = await getCurrentUser();

  const months = recentMonths(month, WINDOW);
  const start = new Date(`${months[0]}-01T00:00:00.000Z`);
  const end = new Date(`${addMonths(month, 1)}-01T00:00:00.000Z`);

  const [txnDocs, salaryDocs] = await Promise.all([
    Transaction.find({ userId: user.id, date: { $gte: start, $lt: end } }).lean(),
    Salary.find({ userId: user.id, month: { $in: months } }).lean(),
  ]);

  const txns = txnDocs.map((t) => ({
    category: t.category,
    month: new Date(t.date).toISOString().slice(0, 7),
    type: t.type as "income" | "expense",
    amount: t.amount,
  }));

  const salaryByMonth: Record<string, number> = {};
  for (const s of salaryDocs) salaryByMonth[s.month] = s.amount;

  const monthly = monthlyTotals(months, salaryByMonth, txns);

  const prevMonth = addMonths(month, -1);
  const expenseIn = (m: string) =>
    txns
      .filter((t) => t.type === "expense" && t.month === m)
      .map((t) => ({ category: t.category, amount: t.amount }));
  const currentExpense = expenseIn(month);
  const { top, changes } = topCategoriesAndChanges(currentExpense, expenseIn(prevMonth));

  return {
    months,
    monthly,
    savingsRate: savingsRateSeries(monthly),
    breakdown: categoryBreakdown(currentExpense),
    top,
    changes,
  };
}
