import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary, type AllocationDoc } from "@/models/Salary";
import { Transaction } from "@/models/Transaction";
import { addMonths } from "@/lib/month";
import { reconcileBudget, type BudgetReconciliation } from "@/lib/budget-math";

export type BudgetDTO = {
  month: string;
  salaryAmount: number;
  reconciliation: BudgetReconciliation;
};

export async function getBudget(month: string): Promise<BudgetDTO | null> {
  await connectDB();
  const { user } = await getCurrentUser();

  const salary = await Salary.findOne({ userId: user.id, month }).lean();
  if (!salary) return null;

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(`${addMonths(month, 1)}-01T00:00:00.000Z`);
  const txns = await Transaction.find({
    userId: user.id,
    type: "expense",
    date: { $gte: start, $lt: end },
  }).lean();

  const actualByCategory: Record<string, number> = {};
  for (const t of txns) actualByCategory[t.category] = (actualByCategory[t.category] ?? 0) + t.amount;

  const allocations = (((salary.allocations as AllocationDoc[] | undefined) ?? []) as AllocationDoc[]).map((a) => ({
    category: a.category,
    amount: a.amount,
  }));

  return {
    month,
    salaryAmount: salary.amount,
    reconciliation: reconcileBudget(allocations, actualByCategory),
  };
}
