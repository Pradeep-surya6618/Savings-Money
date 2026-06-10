import { describe, it, expect } from "vitest";
import { computeStats } from "./salary-stats";
import { generateInsights } from "./salary-stats";

const allocations = [
  { category: "family", amount: 10000 },      // expense
  { category: "loan", amount: 8000 },          // loan
  { category: "food", amount: 5000 },          // expense
  { category: "savings", amount: 8000 },       // savings
  { category: "investments", amount: 2000 },   // investment
  { category: "emergency", amount: 3000 },     // savings
];

describe("computeStats", () => {
  it("buckets allocations by category group", () => {
    const s = computeStats(40000, allocations);
    expect(s.expenses).toBe(15000); // family + food
    expect(s.savings).toBe(11000); // savings + emergency
    expect(s.investments).toBe(2000);
    expect(s.loan).toBe(8000);
    expect(s.allocated).toBe(36000);
    expect(s.remaining).toBe(4000);
  });
  it("ignores unknown categories but still subtracts nothing extra", () => {
    const s = computeStats(1000, [{ category: "bogus", amount: 500 }]);
    expect(s.allocated).toBe(0);
    expect(s.remaining).toBe(1000);
  });
  it("handles empty allocations", () => {
    const s = computeStats(5000, []);
    expect(s.allocated).toBe(0);
    expect(s.remaining).toBe(5000);
  });
});

const stats = (over: Partial<import("./salary-stats").MonthStats> = {}) => ({
  expenses: 0, savings: 0, investments: 0, loan: 0, allocated: 0, remaining: 0, ...over,
});

describe("generateInsights", () => {
  it("reports unallocated funds", () => {
    const out = generateInsights({ amount: 40000, stats: stats({ allocated: 30000, remaining: 10000 }) });
    expect(out.some((i) => i.id === "unallocated")).toBe(true);
  });
  it("celebrates full allocation", () => {
    const out = generateInsights({ amount: 40000, stats: stats({ allocated: 40000, remaining: 0 }) });
    expect(out.some((i) => i.id === "fully-allocated" && i.tone === "positive")).toBe(true);
  });
  it("reports savings rate", () => {
    const out = generateInsights({ amount: 40000, stats: stats({ savings: 8000, investments: 2000, allocated: 40000, remaining: 0 }) });
    const rate = out.find((i) => i.id === "savings-rate");
    expect(rate?.text).toContain("25%");
  });
  it("compares to the previous month when present", () => {
    const out = generateInsights(
      { amount: 40000, stats: stats({ savings: 12000, allocated: 40000 }) },
      { amount: 40000, stats: stats({ savings: 8000, allocated: 40000 }) },
    );
    expect(out.some((i) => i.id === "vs-last-month")).toBe(true);
  });
  it("caps at 4 insights", () => {
    const out = generateInsights(
      { amount: 40000, stats: stats({ savings: 12000, allocated: 30000, remaining: 10000 }) },
      { amount: 40000, stats: stats({ savings: 8000, allocated: 40000 }) },
    );
    expect(out.length).toBeLessThanOrEqual(4);
  });
});
