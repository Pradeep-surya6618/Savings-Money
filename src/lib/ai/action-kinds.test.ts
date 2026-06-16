import { describe, it, expect } from "vitest";
import { ACTION_KINDS, parseActionInput, summarizeAction, isLargeAmount, AI_LARGE_AMOUNT } from "./action-kinds";

describe("parseActionInput", () => {
  it("accepts a valid add_transaction", () => {
    const r = parseActionInput("add_transaction", {
      title: "Lunch", amount: 200, type: "expense", category: "food", date: "2026-06-10",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a category that doesn't match the type", () => {
    const r = parseActionInput("add_transaction", {
      title: "X", amount: 10, type: "income", category: "food", date: "2026-06-10",
    });
    expect(r.success).toBe(false);
  });
  it("rejects edit_transaction without an id", () => {
    const r = parseActionInput("edit_transaction", {
      title: "X", amount: 10, type: "expense", category: "food", date: "2026-06-10",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a non-positive contribution", () => {
    expect(parseActionInput("contribute_to_savings", { amount: 0 }).success).toBe(false);
  });
});

describe("summarizeAction", () => {
  it("describes an expense add", () => {
    const s = summarizeAction("add_transaction", {
      title: "Lunch", amount: 200, type: "expense", category: "food", date: "2026-06-10",
    });
    expect(s).toContain("Add expense");
    expect(s).toContain("₹200");
    expect(s).toContain("Food");
  });
  it("describes a delete", () => {
    expect(summarizeAction("delete_transaction", { id: "abc" })).toContain("Delete");
  });
});

describe("isLargeAmount", () => {
  it("flags amounts at/above the threshold", () => {
    expect(isLargeAmount("add_transaction", { title: "x", amount: AI_LARGE_AMOUNT, type: "expense", category: "food", date: "2026-06-10" })).toBe(true);
    expect(isLargeAmount("add_transaction", { title: "x", amount: 100, type: "expense", category: "food", date: "2026-06-10" })).toBe(false);
  });
  it("always flags deletes", () => {
    expect(isLargeAmount("delete_transaction", { id: "abc" })).toBe(true);
  });
  it("lists all eight kinds", () => {
    expect(ACTION_KINDS).toHaveLength(8);
  });
});

describe("large-amount boundaries", () => {
  it("flags set_loan at threshold via totalLoan", () => {
    expect(isLargeAmount("set_loan", { totalLoan: AI_LARGE_AMOUNT, paidAmount: 0, emiAmount: 0, startDate: "2026-01-01" })).toBe(true);
  });
  it("flags set_savings_goal by targetAmount", () => {
    expect(isLargeAmount("set_savings_goal", { targetAmount: AI_LARGE_AMOUNT, currentAmount: 0, monthlyContribution: 0 })).toBe(true);
  });
  it("does not flag a small contribution", () => {
    expect(isLargeAmount("contribute_to_savings", { amount: 500 })).toBe(false);
  });
});
