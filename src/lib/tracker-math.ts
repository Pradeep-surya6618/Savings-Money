export type Milestone = { value: 25 | 50 | 75 | 100; reached: boolean };

const MILESTONE_VALUES = [25, 50, 75, 100] as const;

/** Clamp a percentage into [0, 100], treating non-finite/negative as 0. */
function clampPct(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

export type SavingsStats = {
  pct: number; // clamped 0–100
  remaining: number; // max(0, target − current)
  monthsToGoal: number | null; // ceil(remaining / monthly) when both positive, else null
  reached: boolean; // target > 0 && current >= target
  milestones: Milestone[];
};

export function savingsStats(current: number, target: number, monthly: number): SavingsStats {
  const pct = target > 0 ? clampPct((current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);
  const monthsToGoal = monthly > 0 && remaining > 0 ? Math.ceil(remaining / monthly) : null;
  const reached = target > 0 && current >= target;
  const milestones: Milestone[] = MILESTONE_VALUES.map((value) => ({ value, reached: pct >= value }));
  return { pct, remaining, monthsToGoal, reached, milestones };
}

export type LoanStats = {
  pct: number; // clamped 0–100
  remaining: number; // max(0, total − paid)
  monthsLeft: number | null; // ceil(remaining / emi) when both positive, else null
  paidOff: boolean; // total > 0 && paid >= total
};

export function loanStats(total: number, paid: number, emi: number): LoanStats {
  const pct = total > 0 ? clampPct((paid / total) * 100) : 0;
  const remaining = Math.max(0, total - paid);
  const monthsLeft = emi > 0 && remaining > 0 ? Math.ceil(remaining / emi) : null;
  const paidOff = total > 0 && paid >= total;
  return { pct, remaining, monthsLeft, paidOff };
}

export type LoanSummary = {
  count: number;
  totalBorrowed: number;
  totalPaid: number;
  totalRemaining: number;
  totalMonthlyEmi: number;
  overallPct: number;
  allPaidOff: boolean;
};

export function loanSummary(
  loans: { totalLoan: number; paidAmount: number; emiAmount: number }[],
): LoanSummary {
  const totalBorrowed = loans.reduce((s, l) => s + l.totalLoan, 0);
  const totalPaid = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalMonthlyEmi = loans.reduce((s, l) => s + l.emiAmount, 0);
  const totalRemaining = Math.max(0, totalBorrowed - totalPaid);
  const overallPct = totalBorrowed > 0 ? clampPct((totalPaid / totalBorrowed) * 100) : 0;
  const allPaidOff = loans.length > 0 && loans.every((l) => l.totalLoan > 0 && l.paidAmount >= l.totalLoan);
  return { count: loans.length, totalBorrowed, totalPaid, totalRemaining, totalMonthlyEmi, overallPct, allPaidOff };
}
