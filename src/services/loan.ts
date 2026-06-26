import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Loan } from "@/models/Loan";
import { loanStats, type LoanStats, loanSummary, type LoanSummary } from "@/lib/tracker-math";
import { loanTypeLabel, type LoanTypeKey } from "@/lib/loan-types";


export type LoanItemDTO = {
  id: string;
  type: LoanTypeKey;
  typeLabel: string;
  name: string | null;
  displayName: string;
  totalLoan: number;
  paidAmount: number;
  emiAmount: number;
  startDate: string | null;
  stats: LoanStats;
};

export async function getLoans(): Promise<{ loans: LoanItemDTO[]; summary: LoanSummary }> {
  await connectDB();
  const { user } = await getCurrentUser();
  const docs = await Loan.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
  const loans: LoanItemDTO[] = docs.map((d) => {
    const type = (d.type as LoanTypeKey) ?? "other";
    const typeLabel = loanTypeLabel(type);
    const name = d.name && d.name.trim() ? d.name.trim() : null;
    return {
      id: String(d._id),
      type,
      typeLabel,
      name,
      displayName: name ?? typeLabel,
      totalLoan: d.totalLoan,
      paidAmount: d.paidAmount,
      emiAmount: d.emiAmount,
      startDate: d.startDate ? new Date(d.startDate).toISOString() : null,
      stats: loanStats(d.totalLoan, d.paidAmount, d.emiAmount),
    };
  });
  return { loans, summary: loanSummary(loans) };
}
