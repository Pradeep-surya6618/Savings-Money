import { describe, it, expect } from "vitest";
import { saveTransactionSchema } from "./transaction";

const base = {
  title: "Groceries",
  amount: 1200,
  type: "expense" as const,
  category: "food",
  date: "2026-06-09",
  notes: "",
};

describe("saveTransactionSchema", () => {
  it("accepts a valid expense", () => {
    expect(saveTransactionSchema.safeParse(base).success).toBe(true);
  });
  it("accepts a valid income", () => {
    const r = saveTransactionSchema.safeParse({ ...base, type: "income", category: "salary_income" });
    expect(r.success).toBe(true);
  });
  it("rejects an empty title", () => {
    expect(saveTransactionSchema.safeParse({ ...base, title: "" }).success).toBe(false);
  });
  it("rejects a non-positive amount", () => {
    expect(saveTransactionSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });
  it("rejects a category that doesn't match the type", () => {
    const r = saveTransactionSchema.safeParse({ ...base, type: "income", category: "food" });
    expect(r.success).toBe(false);
  });
  it("rejects an unknown category", () => {
    expect(saveTransactionSchema.safeParse({ ...base, category: "bogus" }).success).toBe(false);
  });
});
