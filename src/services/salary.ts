import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary, type AllocationDoc } from "@/models/Salary";
import { addMonths } from "@/lib/month";
import {
  computeStats,
  generateInsights,
  type AllocationInput,
  type Insight,
  type MonthStats,
} from "@/services/salary-stats";

export type MonthSummary = {
  month: string;
  amount: number;
  receivedDate: string | null;
  allocations: AllocationInput[];
  stats: MonthStats;
  insights: Insight[];
};

function toAllocations(raw: AllocationDoc[] | undefined): AllocationInput[] {
  return (raw ?? []).map((a) => ({ category: a.category, amount: a.amount }));
}

export async function getMonthSummary(month: string): Promise<MonthSummary | null> {
  await connectDB();
  const { user } = await getCurrentUser();

  const doc = await Salary.findOne({ userId: user.id, month }).lean();
  if (!doc) return null;

  const allocations = toAllocations(doc.allocations as AllocationDoc[]);
  const stats = computeStats(doc.amount, allocations);

  const prevDoc = await Salary.findOne({ userId: user.id, month: addMonths(month, -1) }).lean();
  const previous = prevDoc
    ? { amount: prevDoc.amount, stats: computeStats(prevDoc.amount, toAllocations(prevDoc.allocations as AllocationDoc[])) }
    : null;

  return {
    month,
    amount: doc.amount,
    receivedDate: doc.receivedDate ? new Date(doc.receivedDate).toISOString() : null,
    allocations,
    stats,
    insights: generateInsights({ amount: doc.amount, stats }, previous),
  };
}

export async function getSalaryForEditor(
  month: string,
): Promise<{ amount: number; allocations: AllocationInput[] } | null> {
  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Salary.findOne({ userId: user.id, month }).lean();
  if (!doc) return null;
  return { amount: doc.amount, allocations: toAllocations(doc.allocations as AllocationDoc[]) };
}
