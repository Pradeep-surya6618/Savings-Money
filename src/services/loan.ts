import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Loan } from "@/models/Loan";
import { loanStats, type LoanStats } from "@/lib/tracker-math";

export type LoanDTO = {
  totalLoan: number;
  paidAmount: number;
  emiAmount: number;
  startDate: string | null; // ISO, or null when unset
  stats: LoanStats;
};

export async function getLoan(): Promise<LoanDTO> {
  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Loan.findOneAndUpdate(
    { userId: user.id },
    { $setOnInsert: { userId: user.id } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  if (!doc) throw new Error("Failed to resolve loan");
  return {
    totalLoan: doc.totalLoan,
    paidAmount: doc.paidAmount,
    emiAmount: doc.emiAmount,
    startDate: doc.startDate ? new Date(doc.startDate).toISOString() : null,
    stats: loanStats(doc.totalLoan, doc.paidAmount, doc.emiAmount),
  };
}
