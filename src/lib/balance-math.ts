import type { MonthTotal } from "@/lib/analytics-math";

export type LedgerRow = {
  month: string;
  income: number;
  expense: number;
  net: number; // income − expense
  opening: number; // previous row's closing (first row = openingBalance)
  closing: number; // opening + net
};

export type Balance = { openingBalance: number; total: number; ledger: LedgerRow[] };

/** Carry-over ledger from a per-month income/expense series (oldest→newest). */
export function runningBalance(openingBalance: number, monthly: MonthTotal[]): Balance {
  const ledger: LedgerRow[] = [];
  for (const m of monthly) {
    const opening = ledger.length ? ledger[ledger.length - 1].closing : openingBalance;
    const net = m.income - m.expense;
    ledger.push({ month: m.month, income: m.income, expense: m.expense, net, opening, closing: opening + net });
  }
  const total = ledger.length ? ledger[ledger.length - 1].closing : openingBalance;
  return { openingBalance, total, ledger };
}
