# Phase 4 — Budget & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/budget` page (planned-vs-actual reconciliation of salary allocations against transactions) and an `/analytics` page (spending donut, income-vs-expense bars, savings-rate sparkline, top categories & changes) over a trailing 6-month window.

**Architecture:** Read-only — no new models, actions, or validation. Two pure aggregation modules (`budget-math`, `analytics-math`, TDD'd), a `recentMonths` helper, two read services over existing `Salary` + `Transaction` docs, three hand-built SVG chart primitives, and the two pages. Server Components read via services; charts are client components animated with framer-motion.

**Tech Stack:** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Mongoose, Tailwind v4, framer-motion, lucide-react, Vitest. **No new dependencies.**

**Conventions (verified against the codebase):**
- Pure modules live in `src/lib/*.ts` with a co-located `*.test.ts` (see `src/lib/transaction-filters.test.ts`, `src/services/salary-stats.ts`).
- Services: `await connectDB(); const { user } = await getCurrentUser();` then Mongoose `.lean()` + map to serializable DTOs (numbers, strings). See `src/services/salary.ts`, `src/services/transactions.ts`.
- Pages that read the DB use `export const dynamic = "force-dynamic"` and read `?month=` via `searchParams: Promise<{ month?: string }>` → validate with `isValidMonth`, default `currentMonth()` (see `src/app/(app)/salary/page.tsx`).
- Category metadata: `CATEGORY_MAP`/`CategoryGroup` from `@/lib/categories`; `TXN_CATEGORY_MAP` from `@/lib/transaction-categories`. `formatCurrency`/`cn` from `@/lib/utils`. `addMonths`/`currentMonth`/`monthLabel`/`isValidMonth` from `@/lib/month`.
- Theme tokens usable as classes: `text-negative`, `text-warning`, `bg-card`, `bg-card-elevated`, `border-border`, `text-muted-foreground`, `stroke-border`; and CSS vars `var(--positive)`, `var(--negative)`, `var(--warning)`, `var(--primary)`, `var(--muted-foreground)`, `var(--card-elevated)`.
- **Verify with `npx` forms — `npm run lint`/`npm run test` are unreliable in this Windows harness:** `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`.
- No manual memoization (React Compiler). Chart entrance animations are declarative framer-motion (no `useEffect`); respect `useReducedMotion()`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/month.ts` (+test) | add `recentMonths(month, n)` |
| `src/lib/budget-math.ts` (+test) | pure `reconcileBudget` |
| `src/lib/analytics-math.ts` (+test) | pure `monthlyTotals`/`savingsRateSeries`/`categoryBreakdown`/`topCategoriesAndChanges` |
| `src/services/budget.ts` | `getBudget(month)` → `BudgetDTO \| null` |
| `src/services/analytics.ts` | `getAnalytics(month)` → `AnalyticsDTO` |
| `src/components/charts/donut-chart.tsx` | multi-segment SVG donut |
| `src/components/charts/bar-chart.tsx` | grouped vertical bars |
| `src/components/charts/sparkline.tsx` | SVG line/trend |
| `src/components/ui/month-nav.tsx` | generic `?month=` prev/next nav |
| `src/components/budget/budget-row.tsx` | one reconciliation row (bar) |
| `src/components/budget/budget-empty-state.tsx` | no-salary state |
| `src/components/budget/budget-view.tsx` | budget page body |
| `src/app/(app)/budget/page.tsx` | budget route (replaces placeholder) |
| `src/components/analytics/spending-donut.tsx` | donut + legend card |
| `src/components/analytics/income-expense-chart.tsx` | bars + net card |
| `src/components/analytics/savings-rate-trend.tsx` | sparkline card |
| `src/components/analytics/top-categories.tsx` | top + changes card |
| `src/components/analytics/analytics-view.tsx` | analytics page body |
| `src/app/(app)/analytics/page.tsx` | analytics route (replaces placeholder) |

---

## Task 1: `recentMonths` helper (TDD)

**Files:**
- Modify: `src/lib/month.ts`
- Test: `src/lib/month.test.ts`

- [ ] **Step 1: Add the failing test** — append inside the `describe("month helpers", ...)` block in `src/lib/month.test.ts`, and add `recentMonths` to the import on line 2 (`import { currentMonth, isValidMonth, monthLabel, addMonths, recentMonths } from "./month";`):

```ts
  it("recentMonths returns count months ending at month, oldest first", () => {
    expect(recentMonths("2026-06", 3)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(recentMonths("2026-01", 2)).toEqual(["2025-12", "2026-01"]);
    expect(recentMonths("2026-06", 1)).toEqual(["2026-06"]);
  });
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run src/lib/month.test.ts`
Expected: FAIL — `recentMonths is not a function`.

- [ ] **Step 3: Implement** — append to `src/lib/month.ts`:

```ts
/** The `count` most recent months ending at `month`, oldest first.
 *  recentMonths("2026-06", 3) => ["2026-04", "2026-05", "2026-06"]. */
export function recentMonths(month: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(month, i - (count - 1)));
}
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run src/lib/month.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/month.ts src/lib/month.test.ts
git commit -m "feat: add recentMonths month helper"
```

---

## Task 2: `budget-math.ts` — reconciliation (TDD)

**Files:**
- Create: `src/lib/budget-math.ts`
- Test: `src/lib/budget-math.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/budget-math.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reconcileBudget } from "./budget-math";

const allocations = [
  { category: "food", amount: 10000 },
  { category: "transport", amount: 5000 },
  { category: "shopping", amount: 4000 },
];

describe("reconcileBudget", () => {
  it("computes per-category planned/actual/remaining/status", () => {
    const r = reconcileBudget(allocations, { food: 8000, transport: 5200, shopping: 1000 });
    expect(r.rows.find((x) => x.category === "food")).toMatchObject({
      planned: 10000, actual: 8000, remaining: 2000, status: "near", // 80%
    });
    expect(r.rows.find((x) => x.category === "transport")).toMatchObject({
      actual: 5200, remaining: -200, status: "over",
    });
    expect(r.rows.find((x) => x.category === "shopping")?.status).toBe("under"); // 25%
  });

  it("treats spend with no allocation as unbudgeted (planned 0, over, pct 100)", () => {
    const r = reconcileBudget(allocations, { entertainment: 1500 });
    expect(r.rows.every((x) => x.actual === 0)).toBe(true);
    expect(r.unbudgeted).toHaveLength(1);
    expect(r.unbudgeted[0]).toMatchObject({
      category: "entertainment", planned: 0, actual: 1500, pct: 100, status: "over",
    });
  });

  it("ignores zero-amount unbudgeted categories", () => {
    expect(reconcileBudget(allocations, { entertainment: 0 }).unbudgeted).toHaveLength(0);
  });

  it("totals include unbudgeted spend", () => {
    const r = reconcileBudget(allocations, { food: 9000, entertainment: 1500 });
    expect(r.totals).toEqual({ planned: 19000, actual: 10500, remaining: 8500 });
  });

  it("is under with pct 0 when nothing is spent", () => {
    const r = reconcileBudget([{ category: "food", amount: 1000 }], {});
    expect(r.rows[0]).toMatchObject({ actual: 0, pct: 0, status: "under" });
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run src/lib/budget-math.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/budget-math.ts`**

```ts
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
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run src/lib/budget-math.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/budget-math.ts src/lib/budget-math.test.ts
git commit -m "feat: add budget reconciliation math with tests"
```

---

## Task 3: `analytics-math.ts` — aggregations (TDD)

**Files:**
- Create: `src/lib/analytics-math.ts`
- Test: `src/lib/analytics-math.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/analytics-math.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  monthlyTotals,
  savingsRateSeries,
  categoryBreakdown,
  topCategoriesAndChanges,
} from "./analytics-math";

describe("monthlyTotals", () => {
  it("adds salary to income transactions and sums expenses per month", () => {
    const months = ["2026-05", "2026-06"];
    const salary = { "2026-05": 40000, "2026-06": 40000 };
    const txns = [
      { month: "2026-06", type: "income" as const, amount: 5000 },
      { month: "2026-06", type: "expense" as const, amount: 12000 },
      { month: "2026-05", type: "expense" as const, amount: 10000 },
    ];
    expect(monthlyTotals(months, salary, txns)).toEqual([
      { month: "2026-05", income: 40000, expense: 10000, net: 30000 },
      { month: "2026-06", income: 45000, expense: 12000, net: 33000 },
    ]);
  });
  it("zeros months with no data", () => {
    expect(monthlyTotals(["2026-01"], {}, [])).toEqual([
      { month: "2026-01", income: 0, expense: 0, net: 0 },
    ]);
  });
});

describe("savingsRateSeries", () => {
  it("computes net/income as a rounded percent", () => {
    expect(savingsRateSeries([{ month: "2026-06", income: 50000, expense: 35000, net: 15000 }])).toEqual([
      { month: "2026-06", rate: 30 },
    ]);
  });
  it("returns 0 when income is 0", () => {
    expect(savingsRateSeries([{ month: "2026-06", income: 0, expense: 0, net: 0 }])[0].rate).toBe(0);
  });
});

describe("categoryBreakdown", () => {
  it("aggregates, computes pct of total, sorts desc", () => {
    const r = categoryBreakdown([
      { category: "food", amount: 3000 },
      { category: "shopping", amount: 1000 },
      { category: "food", amount: 1000 },
    ]);
    expect(r[0]).toEqual({ category: "food", amount: 4000, pct: 80 });
    expect(r[1]).toEqual({ category: "shopping", amount: 1000, pct: 20 });
  });
  it("returns empty for no expenses", () => {
    expect(categoryBreakdown([])).toEqual([]);
  });
});

describe("topCategoriesAndChanges", () => {
  it("returns top categories by amount and biggest month-over-month deltas", () => {
    const current = [
      { category: "food", amount: 5000 },
      { category: "shopping", amount: 2000 },
    ];
    const previous = [
      { category: "food", amount: 3000 },
      { category: "transport", amount: 1000 },
    ];
    const { top, changes } = topCategoriesAndChanges(current, previous);
    expect(top[0]).toMatchObject({ category: "food", amount: 5000 });
    expect(changes.find((c) => c.category === "transport")).toMatchObject({
      delta: -1000, amount: 0, prevAmount: 1000,
    });
    expect(changes[0].delta === 2000 || Math.abs(changes[0].delta) === 2000).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run src/lib/analytics-math.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/analytics-math.ts`**

```ts
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
```

- [ ] **Step 4: Run it, expect PASS**

Run: `npx vitest run src/lib/analytics-math.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics-math.ts src/lib/analytics-math.test.ts
git commit -m "feat: add analytics aggregation math with tests"
```

---

## Task 4: `services/budget.ts`

**Files:**
- Create: `src/services/budget.ts`

- [ ] **Step 1: Implement `src/services/budget.ts`**

```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary, type AllocationDoc } from "@/models/Salary";
import { Transaction } from "@/models/Transaction";
import { addMonths } from "@/lib/month";
import { reconcileBudget, type BudgetReconciliation } from "@/lib/budget-math";

export type BudgetDTO = {
  month: string;
  salaryAmount: number;
  reconciliation: BudgetReconciliation;
};

export async function getBudget(month: string): Promise<BudgetDTO | null> {
  await connectDB();
  const { user } = await getCurrentUser();

  const salary = await Salary.findOne({ userId: user.id, month }).lean();
  if (!salary) return null;

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(`${addMonths(month, 1)}-01T00:00:00.000Z`);
  const txns = await Transaction.find({
    userId: user.id,
    type: "expense",
    date: { $gte: start, $lt: end },
  }).lean();

  const actualByCategory: Record<string, number> = {};
  for (const t of txns) actualByCategory[t.category] = (actualByCategory[t.category] ?? 0) + t.amount;

  const allocations = (((salary.allocations as AllocationDoc[] | undefined) ?? []) as AllocationDoc[]).map((a) => ({
    category: a.category,
    amount: a.amount,
  }));

  return {
    month,
    salaryAmount: salary.amount,
    reconciliation: reconcileBudget(allocations, actualByCategory),
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/budget.ts
git commit -m "feat: add budget read service"
```

---

## Task 5: `services/analytics.ts`

**Files:**
- Create: `src/services/analytics.ts`

- [ ] **Step 1: Implement `src/services/analytics.ts`**

```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary } from "@/models/Salary";
import { Transaction } from "@/models/Transaction";
import { addMonths, recentMonths } from "@/lib/month";
import {
  monthlyTotals,
  savingsRateSeries,
  categoryBreakdown,
  topCategoriesAndChanges,
  type MonthTotal,
  type RatePoint,
  type CategoryShare,
  type CategoryChange,
} from "@/lib/analytics-math";

const WINDOW = 6;

export type AnalyticsDTO = {
  months: string[];
  monthly: MonthTotal[];
  savingsRate: RatePoint[];
  breakdown: CategoryShare[];
  top: CategoryShare[];
  changes: CategoryChange[];
};

export async function getAnalytics(month: string): Promise<AnalyticsDTO> {
  await connectDB();
  const { user } = await getCurrentUser();

  const months = recentMonths(month, WINDOW);
  const start = new Date(`${months[0]}-01T00:00:00.000Z`);
  const end = new Date(`${addMonths(month, 1)}-01T00:00:00.000Z`);

  const [txnDocs, salaryDocs] = await Promise.all([
    Transaction.find({ userId: user.id, date: { $gte: start, $lt: end } }).lean(),
    Salary.find({ userId: user.id, month: { $in: months } }).lean(),
  ]);

  const txns = txnDocs.map((t) => ({
    category: t.category,
    month: new Date(t.date).toISOString().slice(0, 7),
    type: t.type as "income" | "expense",
    amount: t.amount,
  }));

  const salaryByMonth: Record<string, number> = {};
  for (const s of salaryDocs) salaryByMonth[s.month] = s.amount;

  const monthly = monthlyTotals(months, salaryByMonth, txns);

  const prevMonth = addMonths(month, -1);
  const expenseIn = (m: string) =>
    txns
      .filter((t) => t.type === "expense" && t.month === m)
      .map((t) => ({ category: t.category, amount: t.amount }));
  const currentExpense = expenseIn(month);
  const { top, changes } = topCategoriesAndChanges(currentExpense, expenseIn(prevMonth));

  return {
    months,
    monthly,
    savingsRate: savingsRateSeries(monthly),
    breakdown: categoryBreakdown(currentExpense),
    top,
    changes,
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/analytics.ts
git commit -m "feat: add analytics read service"
```

---

## Task 6: Chart primitives

**Files:**
- Create: `src/components/charts/donut-chart.tsx`
- Create: `src/components/charts/bar-chart.tsx`
- Create: `src/components/charts/sparkline.tsx`

- [ ] **Step 1: Create `src/components/charts/donut-chart.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DonutSegment = { label: string; value: number; color: string };

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 18,
  children,
  className,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let acc = 0;
  const arcs = segments.map((seg) => {
    const dash = total > 0 ? (seg.value / total) * circumference : 0;
    const start = acc;
    acc += dash;
    return { ...seg, dash, start };
  });

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-border" />
        {arcs.map((a) => (
          <motion.circle
            key={a.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={a.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${a.dash} ${circumference - a.dash}`}
            strokeDashoffset={-a.start}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/charts/bar-chart.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type BarGroup = { label: string; bars: { value: number; color: string }[] };

export function BarChart({
  groups,
  formatValue,
  className,
}: {
  groups: BarGroup[];
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...groups.flatMap((g) => g.bars.map((b) => b.value)));
  return (
    <div className={cn("flex items-end justify-between gap-2", className)} style={{ height: 160 }}>
      {groups.map((g) => (
        <div key={g.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div className="flex h-full w-full items-end justify-center gap-1">
            {g.bars.map((b, i) => (
              <motion.div
                key={i}
                className="w-2.5 rounded-t-md sm:w-3.5"
                style={{ backgroundColor: b.color }}
                initial={reduce ? false : { height: 0 }}
                animate={{ height: `${(b.value / max) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                title={formatValue ? formatValue(b.value) : String(b.value)}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">{g.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/charts/sparkline.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Sparkline({
  points,
  color = "currentColor",
  height = 56,
  className,
}: {
  points: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const width = 240;
  const min = Math.min(0, ...points);
  const max = Math.max(1, ...points);
  const range = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * height;
    return [x, y] as const;
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-auto w-full", className)} aria-hidden="true">
      {coords.length > 1 && (
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}
      {coords.length > 0 && (
        <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={3.5} fill={color} />
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Verify compile + lint**

Run: `npx tsc --noEmit` then `npx eslint .`
Expected: both clean (no `react-hooks` warnings — animations are declarative, no `useEffect`).

- [ ] **Step 5: Commit**

```bash
git add src/components/charts
git commit -m "feat: add donut, bar, and sparkline chart primitives"
```

---

## Task 7: Generic `MonthNav`

**Files:**
- Create: `src/components/ui/month-nav.tsx`

- [ ] **Step 1: Create `src/components/ui/month-nav.tsx`** (a neutral-styled sibling of the dashboard's white-on-gradient `MonthSwitcher`, parameterized by `basePath`)

```tsx
"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, currentMonth, monthLabel } from "@/lib/month";

/** Month prev/next navigation for pages that read `?month=` (budget, analytics). */
export function MonthNav({ month, basePath }: { month: string; basePath: string }) {
  const atOrAfterCurrent = month >= currentMonth();
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-card-elevated hover:text-foreground";
  return (
    <div className="flex items-center gap-3">
      <Link href={`${basePath}?month=${addMonths(month, -1)}`} aria-label="Previous month" className={btn}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-32 text-center text-sm font-semibold">{monthLabel(month)}</span>
      {atOrAfterCurrent ? (
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground/30">
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link href={`${basePath}?month=${addMonths(month, 1)}`} aria-label="Next month" className={btn}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify compile + lint**

Run: `npx tsc --noEmit` then `npx eslint .`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/month-nav.tsx
git commit -m "feat: add generic MonthNav for ?month= pages"
```

---

## Task 8: Budget page

**Files:**
- Create: `src/components/budget/budget-row.tsx`
- Create: `src/components/budget/budget-empty-state.tsx`
- Create: `src/components/budget/budget-view.tsx`
- Modify: `src/app/(app)/budget/page.tsx` (replace placeholder)

- [ ] **Step 1: Create `src/components/budget/budget-row.tsx`** (server component — no hooks)

```tsx
import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { formatCurrency } from "@/lib/utils";
import type { BudgetRow as Row } from "@/lib/budget-math";

const STATUS_COLOR: Record<Row["status"], string> = {
  under: "var(--positive)",
  near: "var(--warning)",
  over: "var(--negative)",
};

function meta(category: string): { label: string; color: string } {
  return (
    CATEGORY_MAP[category as CategoryKey] ??
    TXN_CATEGORY_MAP[category as TxnCategoryKey] ?? { label: category, color: "#64748b" }
  );
}

export function BudgetRow({ row }: { row: Row }) {
  const m = meta(row.category);
  const width = Math.min(100, Math.max(row.pct, row.actual > 0 ? 4 : 0));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
          <span className="font-medium">{m.label}</span>
        </span>
        <span className="tabular-nums text-muted-foreground">
          {formatCurrency(row.actual)} / {formatCurrency(row.planned)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-card-elevated">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: STATUS_COLOR[row.status] }} />
      </div>
      <div
        className="text-right text-xs tabular-nums"
        style={{ color: row.remaining < 0 ? "var(--negative)" : "var(--muted-foreground)" }}
      >
        {row.remaining < 0 ? `Over by ${formatCurrency(-row.remaining)}` : `${formatCurrency(row.remaining)} left`}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/budget/budget-empty-state.tsx`**

```tsx
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/month";

export function BudgetEmptyState({ month }: { month: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <Wallet className="h-10 w-10 text-muted-foreground" />
      <div>
        <p className="font-semibold">No salary set for {monthLabel(month)}</p>
        <p className="text-sm text-muted-foreground">Set your salary and allocation to see the budget.</p>
      </div>
      <Link href={`/salary?month=${month}`}>
        <Button>Set up salary →</Button>
      </Link>
    </Card>
  );
}
```

- [ ] **Step 3: Create `src/components/budget/budget-view.tsx`** (server component)

```tsx
import { Card } from "@/components/ui/card";
import { MonthNav } from "@/components/ui/month-nav";
import { BudgetRow } from "./budget-row";
import { CATEGORY_MAP, type CategoryKey, type CategoryGroup } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
import type { BudgetDTO } from "@/services/budget";

const GROUP_LABELS: Record<CategoryGroup, string> = {
  expense: "Expenses",
  loan: "Loan",
  savings: "Savings",
  investment: "Investments",
};
const GROUP_ORDER: CategoryGroup[] = ["expense", "loan", "savings", "investment"];

export function BudgetView({ data, month }: { data: BudgetDTO; month: string }) {
  const r = data.reconciliation;
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    rows: r.rows.filter((row) => CATEGORY_MAP[row.category as CategoryKey]?.group === group),
  })).filter((g) => g.rows.length > 0);

  const over = r.totals.remaining < 0;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
        <MonthNav month={month} basePath="/budget" />
      </div>

      <Card className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Planned" value={formatCurrency(r.totals.planned)} />
        <Stat label="Actual" value={formatCurrency(r.totals.actual)} />
        <Stat
          label={over ? "Over" : "Remaining"}
          value={formatCurrency(Math.abs(r.totals.remaining))}
          negative={over}
        />
      </Card>

      {grouped.map((g) => (
        <Card key={g.group} className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">{GROUP_LABELS[g.group]}</h2>
          {g.rows.map((row) => (
            <BudgetRow key={row.category} row={row} />
          ))}
        </Card>
      ))}

      {r.unbudgeted.length > 0 && (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-warning">Unbudgeted spending</h2>
          {r.unbudgeted.map((row) => (
            <BudgetRow key={row.category} row={row} />
          ))}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${negative ? "text-negative" : ""}`}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: Replace `src/app/(app)/budget/page.tsx`**

```tsx
import { BudgetView } from "@/components/budget/budget-view";
import { BudgetEmptyState } from "@/components/budget/budget-empty-state";
import { getBudget } from "@/services/budget";
import { currentMonth, isValidMonth } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();
  const data = await getBudget(month);
  if (!data) return <BudgetEmptyState month={month} />;
  return <BudgetView data={data} month={month} />;
}
```

- [ ] **Step 5: Verify compile + lint**

Run: `npx tsc --noEmit` then `npx eslint .`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/budget "src/app/(app)/budget/page.tsx"
git commit -m "feat: build budget page (planned-vs-actual reconciliation)"
```

---

## Task 9: Analytics page

**Files:**
- Create: `src/components/analytics/spending-donut.tsx`
- Create: `src/components/analytics/income-expense-chart.tsx`
- Create: `src/components/analytics/savings-rate-trend.tsx`
- Create: `src/components/analytics/top-categories.tsx`
- Create: `src/components/analytics/analytics-view.tsx`
- Modify: `src/app/(app)/analytics/page.tsx` (replace placeholder)

- [ ] **Step 1: Create `src/components/analytics/spending-donut.tsx`**

```tsx
"use client";

import { Card } from "@/components/ui/card";
import { DonutChart } from "@/components/charts/donut-chart";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { formatCurrency } from "@/lib/utils";
import type { CategoryShare } from "@/lib/analytics-math";

function meta(category: string): { label: string; color: string } {
  return TXN_CATEGORY_MAP[category as TxnCategoryKey] ?? { label: category, color: "#64748b" };
}

export function SpendingDonut({ breakdown }: { breakdown: CategoryShare[] }) {
  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  const segments = breakdown.map((b) => ({ label: b.category, value: b.amount, color: meta(b.category).color }));
  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Spending by category</h2>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No spending this month.</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <DonutChart segments={segments}>
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-lg font-bold tabular-nums">{formatCurrency(total)}</span>
          </DonutChart>
          <ul className="w-full space-y-1.5">
            {breakdown.slice(0, 6).map((b) => (
              <li key={b.category} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta(b.category).color }} />
                  {meta(b.category).label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCurrency(b.amount)} · {Math.round(b.pct)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
```

> Note: the wrapper class is `"flex flex-col items-center gap-5 sm:flex-row"` (donut stacks above the legend on mobile, side-by-side on desktop).

- [ ] **Step 2: Create `src/components/analytics/income-expense-chart.tsx`**

```tsx
"use client";

import { Card } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";
import { monthLabel } from "@/lib/month";
import { formatCurrency } from "@/lib/utils";
import type { MonthTotal } from "@/lib/analytics-math";

const INCOME = "#16a34a";
const EXPENSE = "#64748b";

export function IncomeExpenseChart({ monthly }: { monthly: MonthTotal[] }) {
  const groups = monthly.map((m) => ({
    label: monthLabel(m.month).slice(0, 3),
    bars: [
      { value: m.income, color: INCOME },
      { value: m.expense, color: EXPENSE },
    ],
  }));
  const net = monthly.length ? monthly[monthly.length - 1].net : 0;
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Income vs expense</h2>
        <span className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: INCOME }} /> Income
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: EXPENSE }} /> Expense
          </span>
        </span>
      </div>
      <BarChart groups={groups} formatValue={formatCurrency} />
      <p className="text-sm text-muted-foreground">
        This month net:{" "}
        <span className="font-semibold tabular-nums" style={{ color: net >= 0 ? "var(--positive)" : "var(--negative)" }}>
          {formatCurrency(net)}
        </span>
      </p>
    </Card>
  );
}
```

- [ ] **Step 3: Create `src/components/analytics/savings-rate-trend.tsx`**

```tsx
"use client";

import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { monthLabel } from "@/lib/month";
import type { RatePoint } from "@/lib/analytics-math";

export function SavingsRateTrend({ savingsRate }: { savingsRate: RatePoint[] }) {
  const current = savingsRate.length ? savingsRate[savingsRate.length - 1].rate : 0;
  const points = savingsRate.map((p) => p.rate);
  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Savings rate</h2>
        <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>
          {current}%
        </span>
      </div>
      <Sparkline points={points} color="var(--primary)" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{savingsRate.length ? monthLabel(savingsRate[0].month).slice(0, 3) : ""}</span>
        <span>{savingsRate.length ? monthLabel(savingsRate[savingsRate.length - 1].month).slice(0, 3) : ""}</span>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create `src/components/analytics/top-categories.tsx`**

```tsx
"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { formatCurrency } from "@/lib/utils";
import type { CategoryShare, CategoryChange } from "@/lib/analytics-math";

function meta(category: string): { label: string; color: string } {
  return TXN_CATEGORY_MAP[category as TxnCategoryKey] ?? { label: category, color: "#64748b" };
}

export function TopCategories({ top, changes }: { top: CategoryShare[]; changes: CategoryChange[] }) {
  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Top categories</h2>
      {top.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No spending yet.</p>
      ) : (
        <ul className="space-y-2">
          {top.map((t) => (
            <li key={t.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta(t.category).color }} />
                  {meta(t.category).label}
                </span>
                <span className="tabular-nums text-muted-foreground">{formatCurrency(t.amount)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-card-elevated">
                <div className="h-full rounded-full" style={{ width: `${Math.round(t.pct)}%`, backgroundColor: meta(t.category).color }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {changes.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-xs font-semibold text-muted-foreground">Biggest changes vs last month</h3>
          <ul className="space-y-1.5">
            {changes.map((c) => {
              const up = c.delta > 0; // more spending = worse (red)
              return (
                <li key={c.category} className="flex items-center justify-between text-sm">
                  <span>{meta(c.category).label}</span>
                  <span
                    className="flex items-center gap-1 tabular-nums"
                    style={{ color: up ? "var(--negative)" : "var(--positive)" }}
                  >
                    {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                    {formatCurrency(Math.abs(c.delta))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 5: Create `src/components/analytics/analytics-view.tsx`** (server component)

```tsx
import { MonthNav } from "@/components/ui/month-nav";
import { SpendingDonut } from "./spending-donut";
import { IncomeExpenseChart } from "./income-expense-chart";
import { SavingsRateTrend } from "./savings-rate-trend";
import { TopCategories } from "./top-categories";
import type { AnalyticsDTO } from "@/services/analytics";

export function AnalyticsView({ data, month }: { data: AnalyticsDTO; month: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <MonthNav month={month} basePath="/analytics" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingDonut breakdown={data.breakdown} />
        <IncomeExpenseChart monthly={data.monthly} />
        <SavingsRateTrend savingsRate={data.savingsRate} />
        <TopCategories top={data.top} changes={data.changes} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Replace `src/app/(app)/analytics/page.tsx`**

```tsx
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { getAnalytics } from "@/services/analytics";
import { currentMonth, isValidMonth } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();
  const data = await getAnalytics(month);
  return <AnalyticsView data={data} month={month} />;
}
```

- [ ] **Step 7: Verify compile + lint**

Run: `npx tsc --noEmit` then `npx eslint .`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/analytics "src/app/(app)/analytics/page.tsx"
git commit -m "feat: build analytics page (donut, trend, savings rate, top categories)"
```

---

## Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all suites pass (existing + `month` `recentMonths`, `budget-math`, `analytics-math`). If a worker fails to spawn (Windows fork flakiness), re-run with `npx vitest run --no-file-parallelism`.

- [ ] **Step 2: Lint**

Run: `npx eslint .`
Expected: exit 0, no output.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Production build**

Run: `npx next build`
Expected: succeeds; `/budget` and `/analytics` listed as `ƒ (Dynamic)`.

- [ ] **Step 5: Live walkthrough (manual, against Atlas)**

Run `npm run dev` and verify:
- `/budget` for a month with a salary: header totals (planned/actual/remaining), per-group category bars colored by status (green under / amber near / red over), and an Unbudgeted section if any expense category has no allocation (e.g. Entertainment). Month nav moves between months; a month with no salary shows the empty state linking to `/salary`.
- `/analytics`: spending donut + legend, income-vs-expense bars across 6 months with the net line, savings-rate sparkline + current %, and top categories + "biggest changes vs last month" with up/down arrows. Empty/zero months degrade gracefully.

---

## Self-Review

**1. Spec coverage:**
- §2.1 `budget-math` → Task 2. §2.2 `analytics-math` → Task 3. §2.3 `getBudget` → Task 4. §2.4 `getAnalytics` (+ `recentMonths`) → Tasks 1 & 5. §2.5 charts → Task 6. §2.6 pages/views (+ `MonthNav`) → Tasks 7–9. §2.7 folder structure → matches. §2.8 no new deps → confirmed. DoD 1–6 → Task 10 + per-task verifies.

**2. Placeholder scan:** No TBD/TODO/"handle edge cases". Every code step has complete code. (The `MonthNav` "reuse vs new" open question from the spec is resolved here: it's **new**, since the dashboard `MonthSwitcher` is gradient/hardcoded-path specific.)

**3. Type consistency:** `BudgetReconciliation`/`BudgetRow` (Task 2) ↔ `BudgetDTO.reconciliation` (Task 4) ↔ `BudgetView`/`BudgetRow` props (Task 8). `MonthTotal`/`RatePoint`/`CategoryShare`/`CategoryChange` (Task 3) ↔ `AnalyticsDTO` (Task 5) ↔ analytics card props (Task 9). `recentMonths(month, n)` (Task 1) used in Task 5. `DonutSegment`/`BarGroup` (Task 6) match the `segments`/`groups` props passed by the cards. `reconcileBudget` actual map is built from **expense** transactions only (Task 4); `monthlyTotals` consumes `{month,type,amount}` and the service's `txns` include those fields (Task 5). Category metadata lookups fall back to a default `{label, color}` so unknown keys never crash.
