import { describe, it, expect } from "vitest";
import { savingsStats, loanStats } from "./tracker-math";

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
