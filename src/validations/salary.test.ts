import { describe, it, expect } from "vitest";
import { saveSalarySchema } from "./salary";

const base = {
  month: "2026-06",
  amount: 40000,
  allocations: [
    { category: "family", amount: 10000 },
    { category: "savings", amount: 8000 },
  ],
};

describe("saveSalarySchema", () => {
  it("accepts a valid payload", () => {
    expect(saveSalarySchema.safeParse(base).success).toBe(true);
  });
  it("rejects an invalid month", () => {
    expect(saveSalarySchema.safeParse({ ...base, month: "2026-13" }).success).toBe(false);
  });
  it("rejects allocations exceeding salary", () => {
    const r = saveSalarySchema.safeParse({ ...base, amount: 15000 });
    expect(r.success).toBe(false);
  });
  it("rejects unknown categories", () => {
    const r = saveSalarySchema.safeParse({ ...base, allocations: [{ category: "bogus", amount: 10 }] });
    expect(r.success).toBe(false);
  });
  it("rejects duplicate categories", () => {
    const r = saveSalarySchema.safeParse({
      ...base,
      allocations: [
        { category: "food", amount: 1000 },
        { category: "food", amount: 1000 },
      ],
    });
    expect(r.success).toBe(false);
  });
});
