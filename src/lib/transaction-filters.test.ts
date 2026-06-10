import { describe, it, expect } from "vitest";
import { filterTransactions, sortTransactions, summarize, type TxnFilters } from "./transaction-filters";

const list = [
  { title: "Salary", amount: 40000, type: "income" as const, category: "salary_income", date: "2026-06-01T00:00:00.000Z" },
  { title: "Groceries", amount: 1200, type: "expense" as const, category: "food", date: "2026-06-09T00:00:00.000Z" },
  { title: "Movie", amount: 500, type: "expense" as const, category: "entertainment", date: "2026-05-20T00:00:00.000Z" },
];
const ALL: TxnFilters = { search: "", type: "all", category: "all", month: "all" };

describe("filterTransactions", () => {
  it("returns everything with the default filter", () => {
    expect(filterTransactions(list, ALL)).toHaveLength(3);
  });
  it("searches the title (case-insensitive)", () => {
    expect(filterTransactions(list, { ...ALL, search: "gro" })).toHaveLength(1);
  });
  it("filters by type", () => {
    expect(filterTransactions(list, { ...ALL, type: "income" })).toHaveLength(1);
  });
  it("filters by category", () => {
    expect(filterTransactions(list, { ...ALL, category: "food" })).toHaveLength(1);
  });
  it("filters by month (YYYY-MM)", () => {
    expect(filterTransactions(list, { ...ALL, month: "2026-05" })).toHaveLength(1);
  });
});

describe("sortTransactions", () => {
  it("sorts by date descending", () => {
    expect(sortTransactions(list, "date-desc")[0].title).toBe("Groceries");
  });
  it("sorts by amount ascending", () => {
    expect(sortTransactions(list, "amount-asc")[0].title).toBe("Movie");
  });
});

describe("summarize", () => {
  it("totals income, expense and net", () => {
    expect(summarize(list)).toEqual({ income: 40000, expense: 1700, net: 38300 });
  });
});
