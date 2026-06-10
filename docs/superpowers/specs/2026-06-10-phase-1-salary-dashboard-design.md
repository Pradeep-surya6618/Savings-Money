# Phase 1 — Salary & Dashboard Design

**Project:** Personal Finance Manager (single-user)
**Date:** 2026-06-10
**Status:** Approved (pending written-spec review)
**Builds on:** Phase 0 foundation (merged to `main`)

---

## 1. Context

Phase 1 delivers the core loop: enter a monthly salary, distribute it across fixed categories, and see it visualized on the dashboard. Every later phase reads this data.

**Stack reminder (from Phase 0):** Next.js 16 App Router, React 19 (React Compiler ON — no manual memoization), Tailwind v4, Mongoose, Server-first (Server Components read, Server Actions mutate), single-user (`getCurrentUser()` resolves the one account), Midnight Aurora theme, `formatCurrency()` (₹/en-IN), `Card`/`Button`/`Tooltip` primitives, global pointer-cursor + tooltip conventions.

### Decisions locked during brainstorming
| Decision | Choice |
|---|---|
| Allocation input | Enter **₹ amounts**; live % + remaining shown |
| Month model | **One `Salary` record per calendar month**; dashboard shows a selected month (default = current) |
| Dashboard stats source | **Planned allocations** drive all stats; `remaining = salary − allocated` (actual spending arrives Phase 2) |
| Categories | **Preset, fixed list of 10** |
| Dashboard layout | **Stack + grid** (hero → 5 quick stats → distribution + insights side-by-side; mobile stacks to one column) |
| Allocation editor | **Full-screen editor page** (`/salary`), sticky salary + remaining meter, scrollable rows, sticky Save; over-allocation blocks Save |
| Data model | **Allocations embedded in the `Salary` doc** (not a separate collection); percentage computed, not stored |

---

## 2. Scope

### 2.1 Data model — `src/models/Salary.ts`
One document per (user, month). Hot-reload-safe registration like Phase 0 models.
```ts
Allocation (subdocument): { category: string, amount: number }   // _id: false
Salary {
  userId: ObjectId (ref User, required),
  month: string,            // "YYYY-MM"
  amount: number,           // gross salary, >= 0
  receivedDate?: Date,
  allocations: Allocation[],
  createdAt, updatedAt
}
// compound unique index: { userId: 1, month: 1 }
```
Percentage is never stored — it's `allocation.amount / salary.amount` computed at read time.

### 2.2 Categories — `src/lib/categories.ts`
A constant array; the single source of truth for allocation categories. Each entry: `{ key, label, icon (LucideIcon), group }` where `group ∈ "expense" | "savings" | "investment" | "loan"`.

| key | label | group | icon (lucide) |
|---|---|---|---|
| family | Family | expense | HeartHandshake |
| loan | Loan | loan | GraduationCap |
| food | Food | expense | UtensilsCrossed |
| recharge | Recharge | expense | Smartphone |
| transport | Transport | expense | Bus |
| shopping | Shopping | expense | ShoppingBag |
| savings | Savings | savings | PiggyBank |
| investments | Investments | investment | TrendingUp |
| emergency | Emergency | savings | ShieldCheck |
| misc | Miscellaneous | expense | MoreHorizontal |

Export `CATEGORY_KEYS` (string union source) and a `CATEGORY_MAP` (key → entry) for lookups.

### 2.3 Month helpers — `src/lib/month.ts`
Pure, unit-tested string helpers (no heavy date lib):
- `currentMonth(): string` → `"YYYY-MM"` from `new Date()`.
- `monthLabel(month): string` → `"June 2026"`.
- `addMonths(month, n): string` → shifted `"YYYY-MM"` (handles year rollover).
- `isValidMonth(month): boolean` → matches `^\d{4}-(0[1-9]|1[0-2])$`.

### 2.4 Stats & insights — `src/services/salary.ts`
- `computeStats(amount, allocations): MonthStats` where
  `MonthStats = { expenses, savings, investments, loan, allocated, remaining }`.
  Each bucket = sum of allocation amounts whose category `group` matches (`expenses` = group "expense"; etc.); `allocated` = sum of all; `remaining = amount − allocated`.
- `generateInsights(current, previous?): Insight[]` (`Insight = { id, tone: "positive"|"neutral"|"warning", text }`), 2–4 cards from these rules:
  1. `remaining > 0` → neutral: "₹{remaining} still unallocated."
  2. `remaining === 0 && amount > 0` → positive: "You've allocated 100% of your salary."
  3. `amount > 0` → positive/neutral: "You're putting {savingsRate}% toward savings." (savingsRate = (savings+investments)/amount)
  4. `previous` exists → compare savings rate: "You saved {±N}% {more|less} than last month."
  Deterministic order; cap at 4.
- `getMonthSummary(month): MonthSummary | null` — `connectDB()`, `getCurrentUser()`, find the month's doc; returns `null` if none, else `{ month, amount, receivedDate, allocations, stats, insights }` (plain serializable; reads previous month for rule 4).
- `listMonths(): string[]` — months that have a `Salary` doc for the user, plus the current month, sorted descending (for the switcher).

### 2.5 Mutation — `src/lib/actions/salary.ts`
`"use server"` `saveSalaryAllocations(input)`:
- Validate with `src/validations/salary.ts` Zod schema: `month` valid, `amount ≥ 0`, each allocation `category ∈ CATEGORY_KEYS` & `amount ≥ 0`, and **sum(allocations) ≤ amount** (refine). Unknown/duplicate categories rejected.
- `connectDB()`, `getCurrentUser()`, upsert `Salary` for `(userId, month)` (`$set` amount/receivedDate/allocations).
- `revalidatePath("/")`; return `{ ok: true }` or `{ ok: false, error }`.

### 2.6 Routes & flow
- **`/`** — `src/app/(app)/page.tsx` (replaces the Phase 0 placeholder). Reads `searchParams` (Promise in Next 16) `?month=YYYY-MM`, defaults to `currentMonth()`. Calls `getMonthSummary`. If `null` → `<DashboardEmptyState month=.../>`; else renders the dashboard (layout A).
- **`/salary`** — `src/app/(app)/salary/page.tsx`. Reads `?month=`, default current; loads the existing doc (if any) to prefill; renders `<AllocationEditor/>`. After save, the action redirects/revalidates back to `/?month=`.

### 2.7 Components
**Dashboard — `src/components/dashboard/`**
- `hero-card.tsx` (server) — gradient card: `MonthSwitcher`, salary amount, remaining (CountUp), "Edit" link → `/salary?month=`.
- `month-switcher.tsx` (client) — prev/next chevrons + month label; navigates to `/?month=` (Links built from `addMonths`).
- `quick-stats.tsx` (server) → five `stat-card.tsx` (Expenses, Savings, Investments, Loan paid, Remaining).
- `count-up.tsx` (client) — animates 0→value with framer-motion, formats via `formatCurrency`; respects `prefers-reduced-motion`.
- `salary-distribution.tsx` (server) — allocated categories (amount > 0) sorted desc, each a labelled bar with % and icon.
- `smart-insights.tsx` (server) — renders the `Insight[]` as toned cards.
- `empty-state.tsx` — icon + "No salary set for {Month}" + Button link "Set up {Month} →".

**Editor — `src/components/salary/`**
- `allocation-editor.tsx` (client) — `useState` holds `amount` + per-category amounts; derives allocated/remaining/% live; salary input; renders rows + `RemainingMeter`; sticky Save (disabled when over-allocated or amount invalid) calling `saveSalaryAllocations`, then `router.push("/?month=")`.
- `allocation-row.tsx` (client) — icon · label · ₹ input · computed %.
- `remaining-meter.tsx` (client) — progress bar + "₹X allocated · ₹Y left"; over-allocated → red bar + warning text.

### 2.8 Folder structure (Phase 1 additions)
```
src/
├── app/(app)/
│   ├── page.tsx                 # dashboard (was placeholder)
│   └── salary/page.tsx          # full-screen allocation editor
├── components/
│   ├── dashboard/               # hero-card, month-switcher, quick-stats,
│   │                            #   stat-card, count-up, salary-distribution,
│   │                            #   smart-insights, empty-state
│   └── salary/                  # allocation-editor, allocation-row, remaining-meter
├── lib/
│   ├── categories.ts
│   ├── month.ts
│   └── actions/salary.ts
├── services/salary.ts
├── validations/salary.ts
└── models/Salary.ts
```

---

## 3. Definition of Done
1. `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npx next build` all pass.
2. Unit tests (TDD) for pure logic pass: `computeStats`, `generateInsights`, the `month.ts` helpers, and the save validation schema.
3. Setting salary + allocations for the current month **persists to Atlas** and the dashboard immediately reflects it (hero, 5 stats, distribution, insights).
4. Over-allocation is blocked **client-side** (Save disabled, meter red) **and server-side** (action rejects sum > amount).
5. Month switcher navigates between months; a month with no salary shows the empty state with a working "Set up" CTA into the editor.
6. Quick stats are computed correctly from category groups; remaining = salary − allocated; count-up animates (and is skipped under reduced-motion).

---

## 4. Out of Scope (Phase 1)
- Charts / analytics and the health-score gauge (Phase 4).
- Real transaction actuals vs planned (Phase 2).
- Savings & Loan dashboard cards + trackers (Phase 3).
- Custom / user-editable categories.
- Notifications.
- Rich `receivedDate` UX beyond an optional field (defaults to save time).
- React Hook Form (deferred to Phase 2's transaction forms; the editor uses `useState`).

---

## 5. Open Questions
None blocking. Exact insight wording and bar sort/threshold details will be tuned against the live UI.
