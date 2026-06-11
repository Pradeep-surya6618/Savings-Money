# Phase 4 — Budget & Analytics Design

**Project:** FuFi — Future Financial (single-user)
**Date:** 2026-06-11
**Status:** Approved (pending written-spec review)
**Builds on:** Phase 1 (salary + planned allocations), Phase 2 (transactions ledger), Phase 3 (savings & loan trackers) — all merged to `main`

---

## 1. Context

Phase 4 closes the loop between **planned** (Phase 1 salary allocations) and **actual** (Phase 2 transactions):

- **Budget** (`/budget`) — per-category **planned-vs-actual** reconciliation for a month, with over-budget warnings.
- **Analytics** (`/analytics`) — four read-only views over a trailing window: spending breakdown, income-vs-expense trend, savings-rate trend, and top categories & changes.

This is a **read-only** phase: **no new Mongoose models, no server actions, no validation schemas.** Everything derives from the existing `Salary` (amount + `allocations[]`) and `Transaction` (income/expense, category, date) documents. The bulk of the work is **pure aggregation logic (TDD'd)**, two read services, hand-built SVG chart primitives, and the two pages.

**Stack (unchanged):** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Mongoose, Tailwind v4, framer-motion, server-first (Server Components read via services), `formatCurrency`, `cn`, `Card`/`Button` primitives, `month.ts` helpers, category maps.

### Decisions locked during brainstorming
| Decision | Choice |
|---|---|
| Budget basis | **Reuse the salary allocation** as the plan — no separate/editable budget model |
| Reconcile scope | **Spending via transactions only** — the Savings & Loan *trackers* stay standalone (not cross-referenced here) |
| Analytics views | **All four** — spending by category, income-vs-expense over time, savings-rate trend, top categories & changes |
| Phase scope | **Both** Budget + Analytics (they share transaction-aggregation logic) |
| Charts | **Hand-built SVG/CSS** (DonutChart / BarChart / Sparkline) — no new dependency, consistent with the hand-built `ProgressRing` |
| Analytics window | **Trailing 6 months** ending at the selected month |

### Income definition (drives the analytics math)
Per the Phase 2 decision, the **`Salary` doc is the primary income**; income *transactions* are "extra on top." So for analytics:
`income(month) = Salary.amount(month) + Σ income transactions(month)`; `expense(month) = Σ expense transactions(month)`; `net = income − expense`; `savingsRate = net ÷ income`.

### Category reconciliation
Allocation categories (`src/lib/categories.ts`, 10) and transaction expense categories (`src/lib/transaction-categories.ts`, 10) **share 8 keys** (family, loan, food, recharge, transport, shopping, savings, investments, misc). Differences: allocation-only `emergency`; transaction-only `entertainment`. Reconciliation **matches by category key** across the full allocation list; transaction categories spent with **no matching allocation** (e.g. `entertainment`) surface under **Unbudgeted**; an allocation with no matching spend (e.g. `emergency`) simply shows `actual = 0`. Rows are grouped in the UI by the allocation's `group` (expense / loan / savings / investment) so non-expense rows read clearly. *(Note: savings/investment "actual" reflects logged transactions, not Savings/Loan tracker contributions — those remain standalone per the scope decision.)*

---

## 2. Scope

### 2.1 Pure budget logic — `src/lib/budget-math.ts` (unit-tested, TDD)
No DB/category-metadata dependencies — operates on plain inputs so it is fully testable.
```ts
export type BudgetStatus = "under" | "near" | "over";
export type BudgetRow = {
  category: string;   // category key
  planned: number;
  actual: number;
  remaining: number;  // planned − actual (may be negative)
  pct: number;        // planned > 0 ? (actual/planned)*100 : (actual > 0 ? 100 : 0); may exceed 100
  status: BudgetStatus; // over: actual > planned; near: planned>0 && pct>=80; else under
};
export type BudgetReconciliation = {
  rows: BudgetRow[];        // one per allocation category, in allocation order
  unbudgeted: BudgetRow[];  // actual categories with no allocation (planned 0, status "over")
  totals: { planned: number; actual: number; remaining: number }; // actual incl. unbudgeted
};
export function reconcileBudget(
  allocations: { category: string; amount: number }[],
  actualByCategory: Record<string, number>,
): BudgetReconciliation;
```
**Edge cases (tested):** planned 0 + actual 0 → under, pct 0; planned 0 + actual > 0 → unbudgeted/over, pct 100; actual > planned → over, negative remaining; pct caps for display only (raw value returned). Totals sum rows + unbudgeted.

### 2.2 Pure analytics logic — `src/lib/analytics-math.ts` (unit-tested, TDD)
```ts
export type MonthTotal = { month: string; income: number; expense: number; net: number };
export type RatePoint = { month: string; rate: number };           // rate = round(net/income*100); 0 when income<=0
export type CategoryShare = { category: string; amount: number; pct: number }; // pct of total, sorted desc
export type CategoryChange = { category: string; amount: number; prevAmount: number; delta: number };

// income(month) = salaryByMonth[month] (??0) + Σ income txns; expense(month) = Σ expense txns
export function monthlyTotals(
  months: string[],
  salaryByMonth: Record<string, number>,
  txns: { month: string; type: "income" | "expense"; amount: number }[],
): MonthTotal[];                                   // one row per month, in given order, zeros when no data
export function savingsRateSeries(totals: MonthTotal[]): RatePoint[];
export function categoryBreakdown(expense: { category: string; amount: number }[]): CategoryShare[];
export function topCategoriesAndChanges(
  current: { category: string; amount: number }[],
  previous: { category: string; amount: number }[],
): { top: CategoryShare[]; changes: CategoryChange[] }; // top 5 by amount; changes = biggest |delta| (top 5)
```
Pure and deterministic (no `Date.now()`); the month list is supplied by the caller.

### 2.3 Read service — `src/services/budget.ts`
```ts
export type BudgetDTO = {
  month: string;
  salaryAmount: number;
  reconciliation: BudgetReconciliation;
};
export async function getBudget(month: string): Promise<BudgetDTO | null>;
```
`connectDB` → `getCurrentUser` → `Salary.findOne({ userId, month })`. **Returns `null` when there is no salary doc** (empty state). Sums the month's **expense** transactions by category into `actualByCategory` (date range = `[firstDay(month), firstDay(month+1))`, queried with `$gte/$lt`), then `reconcileBudget(allocations, actualByCategory)`. DTO carries category keys + numbers only (UI resolves label/color from the category maps).

### 2.4 Read service — `src/services/analytics.ts`
```ts
export type AnalyticsDTO = {
  months: string[];               // 6 oldest→newest, ending at `month`
  monthly: MonthTotal[];
  savingsRate: RatePoint[];
  breakdown: CategoryShare[];      // selected month's expense spending
  top: CategoryShare[];
  changes: CategoryChange[];       // selected vs previous month
};
export async function getAnalytics(month: string): Promise<AnalyticsDTO>;
```
Window = `recentMonths(month, 6)` (add a small `recentMonths(month, n)` helper to `src/lib/month.ts`, TDD'd). Fetch transactions in `[firstDay(months[0]), firstDay(month+1))`; tag each with its `month` (`date.toISOString().slice(0,7)`). Fetch `Salary` docs for the window → `salaryByMonth`. Compute the aggregates via the pure functions. Always returns a DTO (zeros when empty).

### 2.5 Chart primitives — `src/components/charts/` (client)
Lightweight SVG, framer-motion entrance (like `ProgressRing`), `useReducedMotion`-aware, colors passed in.
- **`DonutChart`** — `{ segments: { label: string; value: number; color: string }[]; size?; strokeWidth?; children? }`. Multi-segment ring (cumulative `stroke-dasharray`/`offset` arcs); center slot for the total.
- **`BarChart`** — `{ groups: { label: string; bars: { value: number; color: string }[] }[]; formatValue?; max? }`. Vertical grouped bars (income/expense per month); heights scaled to `max`.
- **`Sparkline`** — `{ points: number[]; color?; height?; formatValue? }`. SVG `polyline`/area for the savings-rate trend; markers + last-value label.

### 2.6 Pages & view components

**`src/app/(app)/budget/page.tsx`** (server, `force-dynamic`) — reads `?month=` (default `currentMonth()`, validated like the dashboard), `const data = await getBudget(month)` → `<BudgetEmptyState/>` when `null` else `<BudgetView data={data} month={month} />`.

**`src/components/budget/`** (client):
- `budget-view.tsx` — header strip (`planned · actual · remaining`, remaining red when negative), a `MonthNav`, the grouped per-category `BudgetRow`s, then the **Unbudgeted** section.
- `budget-row.tsx` — category color icon + label, a progress bar (green `under` / amber `near` / red `over`, capped at 100%), `actual / planned` and remaining (or "over by ₹X").
- `budget-empty-state.tsx` — "No salary set for {month}. Set it up to see your budget →" linking to `/salary`.

**`src/app/(app)/analytics/page.tsx`** (server, `force-dynamic`) — reads `?month=`, `const data = await getAnalytics(month)` → `<AnalyticsView data={data} month={month} />` (its own empty hint per card when a series is all zeros).

**`src/components/analytics/`** (client):
- `analytics-view.tsx` — `MonthNav` + a responsive grid of the four cards.
- `spending-donut.tsx` — `DonutChart` of `breakdown` + a category legend with amounts/percentages.
- `income-expense-chart.tsx` — `BarChart` of `monthly` (income vs expense) with a net line/value and month labels.
- `savings-rate-trend.tsx` — `Sparkline` of `savingsRate` + current-rate headline.
- `top-categories.tsx` — `top` list with mini bars; `changes` list with ▲/▼ deltas vs last month.

**`src/components/ui/month-nav.tsx`** (client) — prev/label/next using `addMonths` + `?month=` links (shared by both pages). *(If the dashboard already has an equivalent control, reuse it instead; the plan will confirm during file mapping.)*

### 2.7 Folder structure (Phase 4 additions)
```
src/
├── app/(app)/
│   ├── budget/page.tsx                 # was placeholder
│   └── analytics/page.tsx              # was placeholder
├── components/
│   ├── charts/                         # donut-chart, bar-chart, sparkline
│   ├── budget/                         # budget-view, budget-row, budget-empty-state
│   ├── analytics/                      # analytics-view, spending-donut,
│   │                                   #   income-expense-chart, savings-rate-trend, top-categories
│   └── ui/month-nav.tsx
├── lib/
│   ├── budget-math.ts                  # + .test.ts
│   ├── analytics-math.ts               # + .test.ts
│   └── month.ts                        # + recentMonths(month, n)  (extend; + .test)
└── services/
    ├── budget.ts
    └── analytics.ts
```

### 2.8 New dependencies
**None.**

---

## 3. Definition of Done
1. `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build` all pass. *(Note: `npm run lint`/`test` are unreliable in this Windows harness — verify with the `npx` forms.)*
2. Unit tests (TDD) pass for `reconcileBudget`, the four `analytics-math` functions, and `recentMonths` — covering the documented edge cases (unbudgeted, over-budget, zero income, empty window).
3. `/budget` shows planned-vs-actual per category for the selected month with correct over/near/under states and an Unbudgeted section; the header totals are correct; month nav works; empty state when no salary.
4. `/analytics` renders all four views from real transaction + salary data over the trailing 6 months, degrading gracefully to empty/zero states.
5. Charts animate in (and respect reduced motion); category colors match the rest of the app.
6. Responsive: comfortable single-column on mobile, multi-column on desktop.

---

## 4. Out of Scope (Phase 4)
- Editable/standalone budget limits (the allocation **is** the budget).
- Reconciling the Savings & Loan **trackers** against allocations (they stay standalone — Phase 3).
- Dashboard over-budget widgets (the `/budget` page owns reconciliation; revisit later).
- CSV/PDF export, custom/arbitrary date-range pickers (fixed 6-month trailing window), category drill-down pages.
- Editing categories or the taxonomy.

---

## 5. Open Questions
None blocking. Exact chart sizing, the donut legend layout, and whether `MonthNav` is new vs. reused will be settled against the live UI during the plan.
