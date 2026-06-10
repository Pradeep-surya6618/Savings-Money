import { describe, it, expect } from "vitest";
import { computeStats } from "./salary-stats";

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
