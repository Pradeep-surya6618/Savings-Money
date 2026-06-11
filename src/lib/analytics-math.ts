export type MonthTotal = { month: string; income: number; expense: number; net: number };
export type RatePoint = { month: string; rate: number };
export type CategoryShare = { category: string; amount: number; pct: number };
export type CategoryChange = { category: string; amount: number; prevAmount: number; delta: number };

type TxnLite = { month: string; type: "income" | "expense"; amount: number };

/** income(month) = salaryByMonth[month] (??0) + Σ income txns; expense(month) = Σ expense txns. */
export function monthlyTotals(
  months: string[],
  salaryByMonth: Record<string, number>,
  txns: TxnLite[],
): MonthTotal[] {
  return months.map((month) => {
    let income = salaryByMonth[month] ?? 0;
    let expense = 0;
    for (const t of txns) {
      if (t.month !== month) continue;
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { month, income, expense, net: income - expense };
  });
}

export function savingsRateSeries(totals: MonthTotal[]): RatePoint[] {
  return totals.map((t) => ({
    month: t.month,
    rate: t.income > 0 ? Math.round((t.net / t.income) * 100) : 0,
  }));
}

function aggregate(expense: { category: string; amount: number }[]): Record<string, number> {
  const byCat: Record<string, number> = {};
  for (const e of expense) byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  return byCat;
}

export function categoryBreakdown(expense: { category: string; amount: number }[]): CategoryShare[] {
  const byCat = aggregate(expense);
  const total = Object.values(byCat).reduce((s, a) => s + a, 0);
  return Object.entries(byCat)
    .map(([category, amount]) => ({ category, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function topCategoriesAndChanges(
  current: { category: string; amount: number }[],
  previous: { category: string; amount: number }[],
): { top: CategoryShare[]; changes: CategoryChange[] } {
  const top = categoryBreakdown(current).slice(0, 5);
  const cur = aggregate(current);
  const prev = aggregate(previous);
  const cats = new Set([...Object.keys(cur), ...Object.keys(prev)]);
  const changes = [...cats]
    .map((category) => ({
      category,
      amount: cur[category] ?? 0,
      prevAmount: prev[category] ?? 0,
      delta: (cur[category] ?? 0) - (prev[category] ?? 0),
    }))
    .filter((c) => c.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);
  return { top, changes };
}
