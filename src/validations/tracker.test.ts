import { describe, it, expect } from "vitest";
import { saveSavingsSchema, saveLoanSchema, quickAmountSchema } from "./tracker";

describe("saveSavingsSchema", () => {
  it("accepts non-negative amounts", () => {
    expect(
      saveSavingsSchema.safeParse({ targetAmount: 100000, currentAmount: 5000, monthlyContribution: 2000 }).success,
    ).toBe(true);
  });
  it("rejects negative amounts", () => {
    expect(
      saveSavingsSchema.safeParse({ targetAmount: -1, currentAmount: 0, monthlyContribution: 0 }).success,
    ).toBe(false);
  });
});

describe("saveLoanSchema", () => {
  const base = { type: "personal", totalLoan: 500000, paidAmount: 100000, emiAmount: 25000, startDate: "2026-01-15" };
  it("accepts a valid loan", () => {
    expect(saveLoanSchema.safeParse(base).success).toBe(true);
  });
  it("rejects paid greater than total", () => {
    const res = saveLoanSchema.safeParse({ ...base, paidAmount: 600000 });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path).toContain("paidAmount");
  });
  it("rejects an invalid start date", () => {
    expect(saveLoanSchema.safeParse({ ...base, startDate: "not-a-date" }).success).toBe(false);
  });
});

describe("quickAmountSchema", () => {
  it("requires a positive amount", () => {
    expect(quickAmountSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(quickAmountSchema.safeParse({ amount: 500 }).success).toBe(true);
  });
});

describe("saveLoanSchema (multi-loan)", () => {
  const ok = { type: "vehicle", name: "Car loan", totalLoan: 500000, paidAmount: 100000, emiAmount: 25000, startDate: "2026-01-15" };
  it("accepts a valid typed loan", () => {
    expect(saveLoanSchema.safeParse(ok).success).toBe(true);
  });
  it("accepts a missing name (optional)", () => {
    const { name, ...rest } = ok;
    expect(saveLoanSchema.safeParse(rest).success).toBe(true);
  });
  it("rejects an unknown type", () => {
    expect(saveLoanSchema.safeParse({ ...ok, type: "spaceship" }).success).toBe(false);
  });
  it("rejects paid > total", () => {
    expect(saveLoanSchema.safeParse({ ...ok, paidAmount: 600000 }).success).toBe(false);
  });
});
