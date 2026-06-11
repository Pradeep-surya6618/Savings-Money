import { describe, it, expect } from "vitest";
import { reconcileBudget } from "./budget-math";

const allocations = [
  { category: "food", amount: 10000 },
  { category: "transport", amount: 5000 },
  { category: "shopping", amount: 4000 },
];

describe("reconcileBudget", () => {
  it("computes per-category planned/actual/remaining/status", () => {
    const r = reconcileBudget(allocations, { food: 8000, transport: 5200, shopping: 1000 });
    expect(r.rows.find((x) => x.category === "food")).toMatchObject({
      planned: 10000, actual: 8000, remaining: 2000, status: "near", // 80%
    });
    expect(r.rows.find((x) => x.category === "transport")).toMatchObject({
      actual: 5200, remaining: -200, status: "over",
    });
    expect(r.rows.find((x) => x.category === "shopping")?.status).toBe("under"); // 25%
  });

  it("treats spend with no allocation as unbudgeted (planned 0, over, pct 100)", () => {
    const r = reconcileBudget(allocations, { entertainment: 1500 });
    expect(r.rows.every((x) => x.actual === 0)).toBe(true);
    expect(r.unbudgeted).toHaveLength(1);
    expect(r.unbudgeted[0]).toMatchObject({
      category: "entertainment", planned: 0, actual: 1500, pct: 100, status: "over",
    });
  });

  it("ignores zero-amount unbudgeted categories", () => {
    expect(reconcileBudget(allocations, { entertainment: 0 }).unbudgeted).toHaveLength(0);
  });

  it("totals include unbudgeted spend", () => {
    const r = reconcileBudget(allocations, { food: 9000, entertainment: 1500 });
    expect(r.totals).toEqual({ planned: 19000, actual: 10500, remaining: 8500 });
  });

  it("is under with pct 0 when nothing is spent", () => {
    const r = reconcileBudget([{ category: "food", amount: 1000 }], {});
    expect(r.rows[0]).toMatchObject({ actual: 0, pct: 0, status: "under" });
  });
});
