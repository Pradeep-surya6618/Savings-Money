import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";
import { Salary } from "@/models/Salary";
import { monthRange, currentMonth } from "@/lib/month";
import { monthlyTotals } from "@/lib/analytics-math";
import { runningBalance, type Balance } from "@/lib/balance-math";

export type BalanceDTO = Balance;

export async function getBalance(): Promise<BalanceDTO> {
  await connectDB();
  const { user, settings } = await getCurrentUser();

  const [txnDocs, salaryDocs] = await Promise.all([
    Transaction.find({ userId: user.id }).lean(),
    Salary.find({ userId: user.id }).lean(),
  ]);

  const txns = txnDocs.map((t) => ({
    month: new Date(t.date).toISOString().slice(0, 7),
    type: t.type as "income" | "expense",
    amount: t.amount,
  }));
  const salaryByMonth: Record<string, number> = {};
  for (const s of salaryDocs) salaryByMonth[s.month] = s.amount;

  const cur = currentMonth();
  const dataMonths = [...txns.map((t) => t.month), ...salaryDocs.map((s) => s.month)].filter((m) => m <= cur);
  const start = dataMonths.length ? dataMonths.reduce((a, b) => (a < b ? a : b)) : cur;
  const months = monthRange(start, cur);

  return runningBalance(settings.openingBalance, monthlyTotals(months, salaryByMonth, txns));
}
