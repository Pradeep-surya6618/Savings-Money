import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ACTION_KINDS, ACTION_SCHEMAS, parseActionInput, summarizeAction, isLargeAmount, AI_LARGE_AMOUNT } from "./action-kinds";

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
  it("lists all ten kinds", () => {
    expect(ACTION_KINDS).toHaveLength(10);
    expect(ACTION_KINDS).toContain("add_loan");
    expect(ACTION_KINDS).toContain("edit_loan");
    expect(ACTION_KINDS).toContain("delete_loan");
    expect(ACTION_KINDS).not.toContain("set_loan");
  });
  it("accepts a valid add_loan and rejects a bad type", () => {
    const ok = { type: "vehicle", name: "Car", totalLoan: 100000, paidAmount: 0, emiAmount: 5000, startDate: "2026-01-01" };
    expect(parseActionInput("add_loan", ok).success).toBe(true);
    expect(parseActionInput("add_loan", { ...ok, type: "nope" }).success).toBe(false);
  });
  it("requires loanId for record_loan_payment", () => {
    expect(parseActionInput("record_loan_payment", { amount: 100 }).success).toBe(false);
    expect(parseActionInput("record_loan_payment", { loanId: "abc", amount: 100 }).success).toBe(true);
  });
  it("requires id for edit_loan / delete_loan", () => {
    expect(parseActionInput("delete_loan", {}).success).toBe(false);
    expect(parseActionInput("delete_loan", { id: "abc" }).success).toBe(true);
  });
});

describe("large-amount boundaries", () => {
  it("flags add_loan at threshold via totalLoan", () => {
    expect(isLargeAmount("add_loan", { totalLoan: AI_LARGE_AMOUNT, paidAmount: 0, emiAmount: 0, startDate: "2026-01-01" })).toBe(true);
  });
  it("flags set_savings_goal by targetAmount", () => {
    expect(isLargeAmount("set_savings_goal", { targetAmount: AI_LARGE_AMOUNT, currentAmount: 0, monthlyContribution: 0 })).toBe(true);
  });
  it("does not flag a small contribution", () => {
    expect(isLargeAmount("contribute_to_savings", { amount: 500 })).toBe(false);
  });
});

describe("tool schemas are JSON-Schema serializable (Groq function-calling)", () => {
  it("every action schema converts to a root object schema without throwing", () => {
    for (const kind of ACTION_KINDS) {
      const convert = () => z.toJSONSchema(ACTION_SCHEMAS[kind]);
      expect(convert, `${kind} should convert`).not.toThrow();
      const js = convert() as { type?: string; allOf?: unknown };
      // Groq needs a plain object schema at the root (no allOf / non-object root).
      expect(js.type, `${kind} root should be an object`).toBe("object");
    }
  });
});
