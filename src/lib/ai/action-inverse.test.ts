import { describe, it, expect } from "vitest";
import { computeInverse } from "./action-inverse";

const txnSnap = {
  title: "Coffee", amount: 120, type: "expense" as const, category: "food", date: "2026-06-14", notes: null,
};

describe("computeInverse", () => {
  it("add → delete the created id", () => {
    expect(computeInverse("add_transaction", { input: {}, createdId: "new1" }))
      .toEqual({ op: "delete_txn", id: "new1" });
  });
  it("edit → restore the previous snapshot", () => {
    expect(computeInverse("edit_transaction", { input: { id: "t1" }, before: { txn: txnSnap } }))
      .toEqual({ op: "update_txn", id: "t1", doc: txnSnap });
  });
  it("delete → recreate the snapshot", () => {
    expect(computeInverse("delete_transaction", { input: { id: "t1" }, before: { txn: txnSnap } }))
      .toEqual({ op: "create_txn", doc: txnSnap });
  });
  it("contribute → negative inc", () => {
    expect(computeInverse("contribute_to_savings", { input: { amount: 500 } }))
      .toEqual({ op: "inc_savings", amount: -500 });
  });
  it("set savings goal → restore prior doc (or null)", () => {
    expect(computeInverse("set_savings_goal", { input: {}, before: { savings: null } }))
      .toEqual({ op: "set_savings", doc: null });
  });
  it("loan payment → restore prior paidAmount", () => {
    expect(computeInverse("record_loan_payment", { input: { amount: 1000 }, before: { loanPaid: 4000 } }))
      .toEqual({ op: "set_loan_paid", paidAmount: 4000 });
  });
  it("set loan → restore prior loan doc", () => {
    expect(computeInverse("set_loan", { input: {}, before: { loan: null } }))
      .toEqual({ op: "set_loan_doc", doc: null });
  });
  it("set budget → restore prior salary doc for the month", () => {
    expect(computeInverse("set_budget", { input: { month: "2026-06" }, before: { salary: null } }))
      .toEqual({ op: "set_salary", month: "2026-06", doc: null });
  });
});
