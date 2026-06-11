export type HealthBand = "Excellent" | "Good" | "Fair" | "Needs work";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 0–100 score from savings rate (%), budget adherence (%), loan progress (%). */
export function financialHealthScore(input: {
  savingsRate: number; // net/income %
  budgetAdherence: number; // % of budget within plan, 0–100
  loanProgress: number; // % repaid, 0–100
  hasLoan: boolean;
}): { score: number; band: HealthBand } {
  const savings = clamp((input.savingsRate / 30) * 100, 0, 100); // 30%+ rate = full marks
  const budget = clamp(input.budgetAdherence, 0, 100);
  const loan = input.hasLoan ? clamp(input.loanProgress, 0, 100) : 100;
  const score = Math.round(0.4 * savings + 0.35 * budget + 0.25 * loan);
  const band: HealthBand =
    score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : "Needs work";
  return { score, band };
}
