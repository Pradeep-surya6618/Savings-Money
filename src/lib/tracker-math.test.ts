import { describe, it, expect } from "vitest";
import { savingsStats, loanStats, loanSummary } from "./tracker-math";

describe("savingsStats", () => {
  it("computes pct, remaining, monthsToGoal and milestones", () => {
    const s = savingsStats(65000, 100000, 10000);
    expect(s.pct).toBe(65);
    expect(s.remaining).toBe(35000);
    expect(s.monthsToGoal).toBe(4); // ceil(35000 / 10000)
    expect(s.reached).toBe(false);
    expect(s.milestones).toEqual([
      { value: 25, reached: true },
      { value: 50, reached: true },
      { value: 75, reached: false },
      { value: 100, reached: false },
    ]);
  });

  it("treats target 0 as not-set-up (zeros, no months, no milestones reached)", () => {
    const s = savingsStats(0, 0, 0);
    expect(s.pct).toBe(0);
    expect(s.remaining).toBe(0);
    expect(s.monthsToGoal).toBeNull();
    expect(s.reached).toBe(false);
    expect(s.milestones.every((m) => !m.reached)).toBe(true);
  });

  it("caps pct at 100 and marks reached when current >= target", () => {
    const s = savingsStats(120000, 100000, 5000);
    expect(s.pct).toBe(100);
    expect(s.remaining).toBe(0);
    expect(s.monthsToGoal).toBeNull();
    expect(s.reached).toBe(true);
    expect(s.milestones.every((m) => m.reached)).toBe(true);
  });

  it("returns null monthsToGoal when there is no monthly contribution", () => {
    expect(savingsStats(50000, 100000, 0).monthsToGoal).toBeNull();
  });
});

describe("loanStats", () => {
  it("computes pct, remaining and monthsLeft", () => {
    const l = loanStats(500000, 100000, 25000);
    expect(l.pct).toBe(20);
    expect(l.remaining).toBe(400000);
    expect(l.monthsLeft).toBe(16); // ceil(400000 / 25000)
    expect(l.paidOff).toBe(false);
  });

  it("treats total 0 as not-set-up", () => {
    const l = loanStats(0, 0, 0);
    expect(l.pct).toBe(0);
    expect(l.remaining).toBe(0);
    expect(l.monthsLeft).toBeNull();
    expect(l.paidOff).toBe(false);
  });

  it("caps pct at 100 and marks paidOff when paid >= total", () => {
    const l = loanStats(500000, 500000, 25000);
    expect(l.pct).toBe(100);
    expect(l.remaining).toBe(0);
    expect(l.monthsLeft).toBeNull();
    expect(l.paidOff).toBe(true);
  });

  it("returns null monthsLeft when there is no EMI", () => {
    expect(loanStats(500000, 0, 0).monthsLeft).toBeNull();
  });
});

describe("loanSummary", () => {
  it("is all-zero for no loans", () => {
    expect(loanSummary([])).toEqual({
      count: 0, totalBorrowed: 0, totalPaid: 0, totalRemaining: 0,
      totalMonthlyEmi: 0, overallPct: 0, allPaidOff: false,
    });
  });
  it("aggregates multiple loans", () => {
    const s = loanSummary([
      { totalLoan: 100000, paidAmount: 25000, emiAmount: 5000 },
      { totalLoan: 50000, paidAmount: 25000, emiAmount: 2000 },
    ]);
    expect(s.count).toBe(2);
    expect(s.totalBorrowed).toBe(150000);
    expect(s.totalPaid).toBe(50000);
    expect(s.totalRemaining).toBe(100000);
    expect(s.totalMonthlyEmi).toBe(7000);
    expect(Math.round(s.overallPct)).toBe(33);
    expect(s.allPaidOff).toBe(false);
  });
  it("flags allPaidOff only when every loan is fully paid", () => {
    expect(loanSummary([{ totalLoan: 100, paidAmount: 100, emiAmount: 0 }]).allPaidOff).toBe(true);
    expect(loanSummary([
      { totalLoan: 100, paidAmount: 100, emiAmount: 0 },
      { totalLoan: 100, paidAmount: 50, emiAmount: 0 },
    ]).allPaidOff).toBe(false);
  });
  it("clamps overallPct and treats zero borrowed as 0%", () => {
    expect(loanSummary([{ totalLoan: 0, paidAmount: 0, emiAmount: 0 }]).overallPct).toBe(0);
  });
});
