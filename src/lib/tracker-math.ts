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
