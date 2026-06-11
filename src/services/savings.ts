import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Savings } from "@/models/Savings";
import { savingsStats, type SavingsStats } from "@/lib/tracker-math";

export type SavingsDTO = {
  currentAmount: number;
  targetAmount: number;
  monthlyContribution: number;
  stats: SavingsStats;
};

export async function getSavings(): Promise<SavingsDTO> {
  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Savings.findOneAndUpdate(
    { userId: user.id },
    { $setOnInsert: { userId: user.id } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  if (!doc) throw new Error("Failed to resolve savings");
  return {
    currentAmount: doc.currentAmount,
    targetAmount: doc.targetAmount,
    monthlyContribution: doc.monthlyContribution,
    stats: savingsStats(doc.currentAmount, doc.targetAmount, doc.monthlyContribution),
  };
}
