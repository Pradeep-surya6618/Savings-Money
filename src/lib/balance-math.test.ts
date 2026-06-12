import { describe, it, expect } from "vitest";
import { runningBalance } from "./balance-math";

const M = (month: string, income: number, expense: number) => ({ month, income, expense, net: income - expense });

describe("runningBalance", () => {
  it("carries each month's closing into the next month's opening", () => {
    const r = runningBalance(6000, [M("2026-05", 12000, 7200), M("2026-06", 12000, 9000)]);
    expect(r.ledger[0]).toMatchObject({ opening: 6000, net: 4800, closing: 10800 });
    expect(r.ledger[1]).toMatchObject({ opening: 10800, net: 3000, closing: 13800 });
    expect(r.total).toBe(13800);
  });
  it("with no months, total is the opening balance", () => {
    expect(runningBalance(5000, [])).toEqual({ openingBalance: 5000, total: 5000, ledger: [] });
  });
  it("lets the balance drop when a month spends more than it earns", () => {
    const r = runningBalance(1000, [M("2026-06", 5000, 8000)]);
    expect(r.ledger[0].closing).toBe(-2000);
    expect(r.total).toBe(-2000);
  });
  it("carries the balance unchanged through a zero-activity month", () => {
    const r = runningBalance(1000, [M("2026-05", 0, 0), M("2026-06", 5000, 2000)]);
    expect(r.ledger[0]).toMatchObject({ opening: 1000, net: 0, closing: 1000 });
    expect(r.ledger[1]).toMatchObject({ opening: 1000, net: 3000, closing: 4000 });
  });
});
