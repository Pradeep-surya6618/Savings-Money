import { describe, it, expect } from "vitest";
import {
  monthlyTotals,
  savingsRateSeries,
  categoryBreakdown,
  topCategoriesAndChanges,
} from "./analytics-math";

describe("monthlyTotals", () => {
  it("adds salary to income transactions and sums expenses per month", () => {
    const months = ["2026-05", "2026-06"];
    const salary = { "2026-05": 40000, "2026-06": 40000 };
    const txns = [
      { month: "2026-06", type: "income" as const, amount: 5000 },
      { month: "2026-06", type: "expense" as const, amount: 12000 },
      { month: "2026-05", type: "expense" as const, amount: 10000 },
    ];
    expect(monthlyTotals(months, salary, txns)).toEqual([
      { month: "2026-05", income: 40000, expense: 10000, net: 30000 },
      { month: "2026-06", income: 45000, expense: 12000, net: 33000 },
    ]);
  });
  it("zeros months with no data", () => {
    expect(monthlyTotals(["2026-01"], {}, [])).toEqual([
      { month: "2026-01", income: 0, expense: 0, net: 0 },
    ]);
  });
});

describe("savingsRateSeries", () => {
  it("computes net/income as a rounded percent", () => {
    expect(savingsRateSeries([{ month: "2026-06", income: 50000, expense: 35000, net: 15000 }])).toEqual([
      { month: "2026-06", rate: 30 },
    ]);
  });
  it("returns 0 when income is 0", () => {
    expect(savingsRateSeries([{ month: "2026-06", income: 0, expense: 0, net: 0 }])[0].rate).toBe(0);
  });
});

describe("categoryBreakdown", () => {
  it("aggregates, computes pct of total, sorts desc", () => {
    const r = categoryBreakdown([
      { category: "food", amount: 3000 },
      { category: "shopping", amount: 1000 },
      { category: "food", amount: 1000 },
    ]);
    expect(r[0]).toEqual({ category: "food", amount: 4000, pct: 80 });
    expect(r[1]).toEqual({ category: "shopping", amount: 1000, pct: 20 });
  });
  it("returns empty for no expenses", () => {
    expect(categoryBreakdown([])).toEqual([]);
  });
});

describe("topCategoriesAndChanges", () => {
  it("returns top categories by amount and biggest month-over-month deltas", () => {
    const current = [
      { category: "food", amount: 5000 },
      { category: "shopping", amount: 2000 },
    ];
    const previous = [
      { category: "food", amount: 3000 },
      { category: "transport", amount: 1000 },
    ];
    const { top, changes } = topCategoriesAndChanges(current, previous);
    expect(top[0]).toMatchObject({ category: "food", amount: 5000 });
    expect(changes.find((c) => c.category === "transport")).toMatchObject({
      delta: -1000, amount: 0, prevAmount: 1000,
    });
    expect(changes[0].delta === 2000 || Math.abs(changes[0].delta) === 2000).toBe(true);
  });
});
