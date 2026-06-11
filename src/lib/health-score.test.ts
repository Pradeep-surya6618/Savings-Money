import { describe, it, expect } from "vitest";
import { financialHealthScore } from "./health-score";

describe("financialHealthScore", () => {
  it("weights savings (40%), budget adherence (35%), loan progress (25%)", () => {
    const r = financialHealthScore({ savingsRate: 30, budgetAdherence: 100, loanProgress: 80, hasLoan: true });
    expect(r.score).toBe(95); // 0.4*100 + 0.35*100 + 0.25*80
    expect(r.band).toBe("Excellent");
  });
  it("caps the savings component at a 30% rate and floors negatives", () => {
    expect(financialHealthScore({ savingsRate: 50, budgetAdherence: 0, loanProgress: 0, hasLoan: true }).score).toBe(40);
    expect(financialHealthScore({ savingsRate: -10, budgetAdherence: 0, loanProgress: 0, hasLoan: true }).score).toBe(0);
  });
  it("treats no-loan as full loan-progress credit", () => {
    expect(financialHealthScore({ savingsRate: 0, budgetAdherence: 0, loanProgress: 0, hasLoan: false }).score).toBe(25);
  });
  it("bands: >=85 Excellent, >=70 Good, >=50 Fair, else Needs work", () => {
    expect(financialHealthScore({ savingsRate: 24, budgetAdherence: 90, loanProgress: 42, hasLoan: true }).band).toBe("Good");
  });
});
