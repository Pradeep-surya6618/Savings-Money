export type BudgetStatus = "under" | "near" | "over";

export type BudgetRow = {
  category: string;
  planned: number;
  actual: number;
  remaining: number; // planned − actual (may be negative)
  pct: number; // planned>0 ? actual/planned*100 : (actual>0 ? 100 : 0); may exceed 100
  status: BudgetStatus;
};

export type BudgetReconciliation = {
  rows: BudgetRow[];
  unbudgeted: BudgetRow[];
  totals: { planned: number; actual: number; remaining: number };
};

function makeRow(category: string, planned: number, actual: number): BudgetRow {
  const pct = planned > 0 ? (actual / planned) * 100 : actual > 0 ? 100 : 0;
  const status: BudgetStatus =
    actual > planned ? "over" : planned > 0 && pct >= 80 ? "near" : "under";
  return { category, planned, actual, remaining: planned - actual, pct, status };
}

export function reconcileBudget(
  allocations: { category: string; amount: number }[],
  actualByCategory: Record<string, number>,
): BudgetReconciliation {
  const rows = allocations.map((a) => makeRow(a.category, a.amount, actualByCategory[a.category] ?? 0));
  const planned = new Set(allocations.map((a) => a.category));
  const unbudgeted = Object.entries(actualByCategory)
    .filter(([cat, amt]) => !planned.has(cat) && amt > 0)
    .map(([cat, amt]) => makeRow(cat, 0, amt));

  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const totalActual =
    rows.reduce((s, r) => s + r.actual, 0) + unbudgeted.reduce((s, r) => s + r.actual, 0);

  return {
    rows,
    unbudgeted,
    totals: { planned: totalPlanned, actual: totalActual, remaining: totalPlanned - totalActual },
  };
}
