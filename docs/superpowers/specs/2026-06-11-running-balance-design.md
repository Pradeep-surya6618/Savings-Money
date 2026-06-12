# Running Balance Design

**Project:** FuFi — Future Financial (single-user)
**Date:** 2026-06-11
**Status:** Approved (pending written-spec review)
**Builds on:** Phases 0–4 + the premium UI redesign (all merged to `main`)

---

## 1. Context

Add a **carry-over running balance** — the true cumulative cash the user has, derived from their salary income and actual spending, carried month to month. Today FuFi tracks each month independently; this introduces a single rolling total: `opening balance + Σ(salary + income − expenses)` across all months.

**Decisions locked during brainstorming:**
| Decision | Choice |
|---|---|
| What moves the balance | **Actual transactions only** — `income = Salary.amount + income transactions`; `expense = expense transactions`. Salary *allocations* are the plan/budget and never touch the balance (avoids double-counting). |
| Opening balance | A **one-time `openingBalance`** the user sets (their existing cash before the app). |
| Relationship to Savings page | **Separate** — the Savings page stays a goal tracker. Running balance is "total cash on hand." |
| Display | **Dashboard "Total Balance" headline** + a dedicated **`/balance` ledger view** (month-by-month opening → income → expenses → closing). |
| Fresh start | A **working "Reset all data"** in Settings wipes the user's financial data so they can begin clean. |

The balance is **computed, not stored** (no per-month carry-over rows). The only new persisted value is `openingBalance`. Per-month income/expense reuse the already-TDD'd `monthlyTotals` from `src/lib/analytics-math.ts`.

**Stack (unchanged):** Next 16 App Router, React 19 (React Compiler ON), Mongoose, Tailwind v4, server-first, Vitest.

---

## 2. Scope

### 2.1 Settings model — `openingBalance`
Add `openingBalance: { type: Number, default: 0, min: 0 }` to `src/models/Settings.ts`. Surface it in `getCurrentUser().settings.openingBalance` (mapping with `?? 0`).

### 2.2 Pure month helper — `monthRange` (`src/lib/month.ts`, TDD)
```ts
/** Every "YYYY-MM" from start to end inclusive, oldest first. Empty if start > end. */
export function monthRange(start: string, end: string): string[];
```
e.g. `monthRange("2026-04", "2026-06")` → `["2026-04","2026-05","2026-06"]`; `monthRange("2026-06","2026-06")` → `["2026-06"]`; `monthRange("2026-07","2026-06")` → `[]`.

### 2.3 Pure balance logic — `src/lib/balance-math.ts` (TDD)
```ts
import type { MonthTotal } from "@/lib/analytics-math";

export type LedgerRow = {
  month: string;
  income: number;
  expense: number;
  net: number;     // income − expense
  opening: number; // = previous row's closing (first row = openingBalance)
  closing: number; // opening + net
};
export type Balance = { openingBalance: number; total: number; ledger: LedgerRow[] };

/** Carry-over ledger. `monthly` is per-month income/expense (oldest→newest). */
export function runningBalance(openingBalance: number, monthly: MonthTotal[]): Balance;
```
- First row opens at `openingBalance`; each subsequent row opens at the prior `closing`.
- `total` = last row's `closing` (or `openingBalance` when there are no months).
- Edge cases (tested): no months → `{ openingBalance, total: openingBalance, ledger: [] }`; single month; negative net (spent more than earned that month) → balance can drop.

### 2.4 Read service — `src/services/balance.ts`
```ts
export type BalanceDTO = Balance; // { openingBalance, total, ledger }
export async function getBalance(): Promise<BalanceDTO>;
```
`connect` → `getCurrentUser` (for `openingBalance`). Fetch **all** the user's `Transaction`s and `Salary` docs. Determine the data range: earliest month = min(earliest salary `month`, earliest transaction month); end = `currentMonth()`. If no data at all → range is just `currentMonth()` (so the ledger shows the current month opening at `openingBalance`). Build `salaryByMonth` + tag txns by month, call `monthlyTotals(monthRange(start, end), salaryByMonth, txns)`, then `runningBalance(openingBalance, monthly)`. DTO is plain numbers/strings.

### 2.5 Mutations — `src/lib/actions/balance.ts` (`"use server"`)
- `setOpeningBalance(amount: number): Result` — Zod `amount ≥ 0`; `Settings.updateOne({ userId }, { $set: { openingBalance } }, { upsert: true })`; `revalidatePath("/balance")` + `revalidatePath("/")`.
- `resetAllData(): Result` — deletes the user's financial data: `Transaction.deleteMany({ userId })`, `Salary.deleteMany({ userId })`, `Savings.deleteMany({ userId })`, `Loan.deleteMany({ userId })`, and resets `Settings.openingBalance` to 0. **Keeps** the `User` and the rest of `Settings` (theme/currency/prefs). Revalidate `/`. (Powers Settings → Data & Privacy.)

### 2.6 Dashboard — Total Balance headline
On `/`, fetch `getBalance()` alongside the month summary and render a prominent **"Total Balance"** figure (the cumulative `total`), as a `Link` to `/balance`. Distinct from the per-month **"Remaining Balance"** stat card (which stays this-month = salary − allocated); the Total Balance headline is labeled clearly to avoid confusion (e.g. caption "across all months").

### 2.7 `/balance` page + nav
- **`src/app/(app)/balance/page.tsx`** (server, `force-dynamic`): `getBalance()` → `<BalanceView data={...} />`.
- **`src/components/balance/balance-view.tsx`**: a hero-style **Total Balance** card; an **"Edit opening balance"** action (dialog → `setOpeningBalance` + toast); and a **ledger `DataTable`**: `Month · Opening · Income · Expenses · Closing` (income green `+`, expense `−`, closing bold; rows oldest→newest or newest-first). Empty/zero handled (just shows the opening balance).
- **Nav:** add `{ href: "/balance", label: "Balance", icon: Wallet, color: "#f59e0b" }` to `SECONDARY_NAV` in `src/lib/nav.ts` (sidebar + mobile "More" sheet; also reachable via the dashboard headline link).

### 2.8 Settings — working "Reset all data"
Replace the no-op in **Settings → Data & Privacy / Security** with a real **"Reset all data"** flow: a confirmation dialog requiring typed confirmation (e.g. type `reset`), then `resetAllData()` + a toast, then it lands on a clean dashboard. Clearly worded as permanent.

### 2.9 Folder structure (additions / changes)
```
src/
├── lib/
│   ├── month.ts                  # + monthRange (+ test)
│   ├── balance-math.ts           # + .test.ts
│   └── actions/balance.ts        # setOpeningBalance, resetAllData
├── services/balance.ts
├── models/Settings.ts            # + openingBalance
├── lib/user.ts                   # surface openingBalance
├── lib/nav.ts                    # + Balance nav item
├── components/balance/
│   ├── balance-view.tsx
│   └── opening-balance-form.tsx
├── app/(app)/balance/page.tsx
├── app/(app)/page.tsx            # + Total Balance headline (getBalance)
└── components/settings/settings-view.tsx  # wire Reset all data
```

### 2.10 New dependencies
**None.**

---

## 3. Definition of Done
1. `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build` all pass.
2. Unit tests (TDD) pass for `monthRange` and `runningBalance` (incl. no-data, single-month, negative-net, opening-balance carry).
3. Setting an opening balance persists; the dashboard **Total Balance** and the `/balance` ledger reflect it + all salary/transaction history, carrying over correctly month to month.
4. The ledger shows each month's opening → income → expenses → closing, with the closing carried into the next month's opening.
5. **Reset all data** (typed confirmation) deletes Salary/Transaction/Savings/Loan + resets opening balance; the user starts clean; login/settings remain.
6. Balance uses **actual transactions only** (allocations never affect it). Empty/no-data states render gracefully.
7. No regressions; React Compiler discipline; charts/toasts unaffected.

---

## 4. Out of Scope
Multi-currency balance, bank/UPI sync, multiple accounts/wallets, editing historical closing balances directly, undo for reset.

---

## 5. Open Questions
None blocking. Exact dashboard placement of the Total Balance headline and ledger row ordering are finalized during live polish.
