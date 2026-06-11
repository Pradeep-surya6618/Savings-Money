# Running Balance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a carry-over running balance (opening balance + cumulative salary/income − expenses across all months), a `/balance` ledger page, a dashboard Total Balance headline, and a working "Reset all data" in Settings.

**Architecture:** The balance is **computed** from existing `Salary` + `Transaction` data; only a one-time `openingBalance` is persisted on `Settings`. Pure TDD'd logic (`monthRange`, `runningBalance`) reuses the existing `monthlyTotals` (income = salary + income txns; expense = expense txns). A read service spans the full history; server actions set the opening balance and reset data.

**Tech Stack:** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Mongoose, Tailwind v4, framer-motion, Vitest. **No new dependencies.**

**Verify with `npx` (npm scripts unreliable in this Windows harness):** `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`. Commit after each task.

---

## File Structure
| File | Responsibility |
|---|---|
| `src/models/Settings.ts` | + `openingBalance` field |
| `src/lib/user.ts` | surface `settings.openingBalance` |
| `src/lib/month.ts` (+test) | + `monthRange(start, end)` |
| `src/lib/balance-math.ts` (+test) | pure `runningBalance` → ledger + total |
| `src/services/balance.ts` | `getBalance()` over full history |
| `src/lib/actions/balance.ts` | `setOpeningBalance`, `resetAllData` |
| `src/lib/nav.ts` | + Balance nav item |
| `src/components/balance/opening-balance-form.tsx` | edit opening balance (RHF-free, one field) |
| `src/components/balance/balance-view.tsx` | Total Balance hero + ledger table |
| `src/app/(app)/balance/page.tsx` | route |
| `src/components/dashboard/total-balance-banner.tsx` | dashboard headline |
| `src/app/(app)/page.tsx` | render the banner (fetch getBalance) |
| `src/components/settings/settings-view.tsx` | wire "Reset all data" |

---

## Task 1: `openingBalance` on Settings

**Files:** `src/models/Settings.ts`, `src/lib/user.ts`

- [ ] **Step 1: Add the field** — in `src/models/Settings.ts`, inside the schema (after `defaultView`):
```ts
    openingBalance: { type: Number, default: 0, min: 0 },
```

- [ ] **Step 2: Surface it in `getCurrentUser`** — in `src/lib/user.ts`, add `openingBalance: number;` to `CurrentUser.settings`, and in the returned `settings` object add:
```ts
      openingBalance: settingsDoc.openingBalance ?? 0,
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit`
```bash
git add src/models/Settings.ts src/lib/user.ts
git commit -m "feat: add openingBalance to settings"
```

---

## Task 2: `monthRange` helper (TDD)

**Files:** `src/lib/month.ts`, `src/lib/month.test.ts`

- [ ] **Step 1: Failing test** — append inside `describe("month helpers", …)` in `src/lib/month.test.ts`, and add `monthRange` to the import on line 2:
```ts
  it("monthRange lists all months inclusive, oldest first", () => {
    expect(monthRange("2026-04", "2026-06")).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(monthRange("2026-06", "2026-06")).toEqual(["2026-06"]);
    expect(monthRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthRange("2026-07", "2026-06")).toEqual([]);
  });
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/lib/month.test.ts`).

- [ ] **Step 3: Implement** — append to `src/lib/month.ts`:
```ts
/** Every "YYYY-MM" from start to end inclusive, oldest first. Empty if start > end. */
export function monthRange(start: string, end: string): string[] {
  if (start > end) return [];
  const out: string[] = [];
  let m = start;
  while (m <= end) {
    out.push(m);
    m = addMonths(m, 1);
  }
  return out;
}
```

- [ ] **Step 4: Run → PASS.** Commit:
```bash
git add src/lib/month.ts src/lib/month.test.ts
git commit -m "feat: add monthRange helper"
```

---

## Task 3: `balance-math` — runningBalance (TDD)

**Files:** `src/lib/balance-math.ts`, `src/lib/balance-math.test.ts`

- [ ] **Step 1: Failing test** — `src/lib/balance-math.test.ts`:
```ts
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
});
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/lib/balance-math.test.ts`).

- [ ] **Step 3: Implement `src/lib/balance-math.ts`**
```ts
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
```

- [ ] **Step 4: Run → PASS.** Commit:
```bash
git add src/lib/balance-math.ts src/lib/balance-math.test.ts
git commit -m "feat: add running-balance ledger math with tests"
```

---

## Task 4: `getBalance()` service

**Files:** `src/services/balance.ts`

- [ ] **Step 1: Implement**
```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";
import { Salary } from "@/models/Salary";
import { monthRange, currentMonth } from "@/lib/month";
import { monthlyTotals } from "@/lib/analytics-math";
import { runningBalance, type Balance } from "@/lib/balance-math";

export type BalanceDTO = Balance;

export async function getBalance(): Promise<BalanceDTO> {
  await connectDB();
  const { user, settings } = await getCurrentUser();

  const [txnDocs, salaryDocs] = await Promise.all([
    Transaction.find({ userId: user.id }).lean(),
    Salary.find({ userId: user.id }).lean(),
  ]);

  const txns = txnDocs.map((t) => ({
    month: new Date(t.date).toISOString().slice(0, 7),
    type: t.type as "income" | "expense",
    amount: t.amount,
  }));
  const salaryByMonth: Record<string, number> = {};
  for (const s of salaryDocs) salaryByMonth[s.month] = s.amount;

  const cur = currentMonth();
  const dataMonths = [...txns.map((t) => t.month), ...salaryDocs.map((s) => s.month)].filter((m) => m <= cur);
  const start = dataMonths.length ? dataMonths.reduce((a, b) => (a < b ? a : b)) : cur;
  const months = monthRange(start, cur);

  return runningBalance(settings.openingBalance, monthlyTotals(months, salaryByMonth, txns));
}
```

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit`
```bash
git add src/services/balance.ts
git commit -m "feat: add balance read service"
```

---

## Task 5: actions — `setOpeningBalance`, `resetAllData`

**Files:** `src/lib/actions/balance.ts`

- [ ] **Step 1: Implement**
```ts
"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Settings } from "@/models/Settings";
import { Transaction } from "@/models/Transaction";
import { Salary } from "@/models/Salary";
import { Savings } from "@/models/Savings";
import { Loan } from "@/models/Loan";

type Result = { ok: true } | { ok: false; error: string };

export async function setOpeningBalance(amount: number): Promise<Result> {
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: "Enter a valid amount (0 or more)" };
  await connectDB();
  const { user } = await getCurrentUser();
  await Settings.updateOne({ userId: user.id }, { $set: { openingBalance: amount } }, { upsert: true });
  revalidatePath("/balance");
  revalidatePath("/");
  return { ok: true };
}

export async function resetAllData(): Promise<Result> {
  await connectDB();
  const { user } = await getCurrentUser();
  await Promise.all([
    Transaction.deleteMany({ userId: user.id }),
    Salary.deleteMany({ userId: user.id }),
    Savings.deleteMany({ userId: user.id }),
    Loan.deleteMany({ userId: user.id }),
  ]);
  await Settings.updateOne({ userId: user.id }, { $set: { openingBalance: 0 } });
  revalidatePath("/");
  revalidatePath("/balance");
  return { ok: true };
}
```

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit`
```bash
git add src/lib/actions/balance.ts
git commit -m "feat: add setOpeningBalance and resetAllData actions"
```

---

## Task 6: `/balance` page + view + nav

**Files:** `src/lib/nav.ts`, `src/components/balance/opening-balance-form.tsx`, `src/components/balance/balance-view.tsx`, `src/app/(app)/balance/page.tsx`

- [ ] **Step 1: Add the nav item** — in `src/lib/nav.ts`, add to `SECONDARY_NAV` (after Loan):
```ts
  { href: "/balance", label: "Balance", icon: Wallet, color: "#f59e0b" },
```
And add `Wallet` to the lucide import at the top (it already imports several icons — include `Wallet`).

- [ ] **Step 2: `opening-balance-form.tsx`**
```tsx
"use client";

import { useState } from "react";
import { setOpeningBalance } from "@/lib/actions/balance";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function OpeningBalanceForm({ initial, onDone }: { initial: number; onDone: () => void }) {
  const [amount, setAmount] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await setOpeningBalance(amount);
    if (res.ok) {
      toast.success("Opening balance saved");
      onDone();
    } else {
      setError(res.error);
      toast.error(res.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Opening balance (₹)</span>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          autoFocus
          value={amount === 0 ? "" : amount}
          placeholder="0"
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className={cn(fieldCls, "tabular-nums")}
        />
      </label>
      <p className="text-xs text-muted-foreground">The cash you had before tracking in FuFi. Everything builds from here.</p>
      {error && <p className="text-sm text-negative">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : "Save opening balance"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: `balance-view.tsx`**
```tsx
"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/ui/hero-section";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { OpeningBalanceForm } from "./opening-balance-form";
import { CountUp } from "@/components/dashboard/count-up";
import { monthLabel } from "@/lib/month";
import { cn, formatCurrency } from "@/lib/utils";
import type { BalanceDTO } from "@/services/balance";
import type { LedgerRow } from "@/lib/balance-math";

export function BalanceView({ data }: { data: BalanceDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const rows = [...data.ledger].reverse(); // newest first

  const columns: Column<LedgerRow>[] = [
    { key: "month", header: "Month", render: (r) => monthLabel(r.month) },
    { key: "opening", header: "Opening", align: "right", render: (r) => formatCurrency(r.opening) },
    {
      key: "income",
      header: "Income",
      align: "right",
      render: (r) => <span className="text-positive">+{formatCurrency(r.income)}</span>,
    },
    {
      key: "expense",
      header: "Expenses",
      align: "right",
      render: (r) => <span className="text-muted-foreground">−{formatCurrency(r.expense)}</span>,
    },
    {
      key: "closing",
      header: "Closing",
      align: "right",
      render: (r) => (
        <span className={cn("font-semibold", r.closing < 0 ? "text-negative" : "")}>{formatCurrency(r.closing)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Balance</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> Edit opening balance
        </Button>
      </div>

      <HeroSection>
        <p className="text-xs font-medium uppercase tracking-widest text-white/70">Total Balance</p>
        <CountUp value={data.total} className="mt-2 block text-4xl font-bold tracking-tight sm:text-5xl" />
        <p className="mt-2 text-sm text-white/80">Across all months · opening {formatCurrency(data.openingBalance)}</p>
      </HeroSection>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Monthly ledger</h2>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.month} empty="No activity yet." />
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit opening balance">
          <OpeningBalanceForm initial={data.openingBalance} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: `src/app/(app)/balance/page.tsx`**
```tsx
import { BalanceView } from "@/components/balance/balance-view";
import { getBalance } from "@/services/balance";

export const dynamic = "force-dynamic";

export default async function BalancePage() {
  const data = await getBalance();
  return <BalanceView data={data} />;
}
```

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint .`
```bash
git add src/lib/nav.ts src/components/balance "src/app/(app)/balance/page.tsx"
git commit -m "feat: build /balance ledger page + nav"
```

---

## Task 7: Dashboard Total Balance banner

**Files:** `src/components/dashboard/total-balance-banner.tsx`, `src/app/(app)/page.tsx`

- [ ] **Step 1: `total-balance-banner.tsx`** (server component)
```tsx
import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function TotalBalanceBanner({ total }: { total: number }) {
  return (
    <Link
      href="/balance"
      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "#f59e0b1f", color: "#f59e0b" }}>
          <Wallet className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Total Balance · across all months</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(total)}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
```

- [ ] **Step 2: Wire into `src/app/(app)/page.tsx`** — add imports:
```tsx
import { TotalBalanceBanner } from "@/components/dashboard/total-balance-banner";
import { getBalance } from "@/services/balance";
```
After the empty-state early return, fetch balance alongside analytics:
```tsx
  const [analytics, balance] = await Promise.all([getAnalytics(month), getBalance()]);
```
(Replace the existing `const analytics = await getAnalytics(month);` line.) Then render the banner as the first child inside the `space-y-5` wrapper, right after the `<div className="flex justify-end"><MonthPicker …/></div>`:
```tsx
      <TotalBalanceBanner total={balance.total} />
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint .`
```bash
git add src/components/dashboard/total-balance-banner.tsx "src/app/(app)/page.tsx"
git commit -m "feat: dashboard Total Balance banner linking to /balance"
```

---

## Task 8: Settings — working "Reset all data"

**Files:** `src/components/settings/settings-view.tsx`

- [ ] **Step 1: Add a reset confirmation dialog.** In `settings-view.tsx`, add imports:
```tsx
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { resetAllData } from "@/lib/actions/balance";
```
Inside `SettingsView`, add state + handler (near the other hooks):
```tsx
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  async function doReset() {
    setResetting(true);
    const res = await resetAllData();
    if (res.ok) {
      toast.success("All data reset");
      setResetOpen(false);
      setConfirmText("");
      router.push("/");
    } else {
      toast.error(res.error);
      setResetting(false);
    }
  }
```

- [ ] **Step 2: Replace the Security panel's Delete button** so it opens the dialog. Change the `security` panel's `ActionRow` button to:
```tsx
                button={
                  <Button onClick={() => setResetOpen(true)} className="from-negative to-negative">
                    Reset
                  </Button>
                }
```
and update its title/desc to: title `"Reset all data"`, desc `"Permanently delete all your salary, transactions, savings & loan data."`.

- [ ] **Step 3: Render the dialog** before the closing `</div>` of the component's root:
```tsx
      <Dialog open={resetOpen} onOpenChange={(o) => { if (!o) { setResetOpen(false); setConfirmText(""); } }}>
        <DialogContent title="Reset all data">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This permanently deletes your salary, transactions, savings and loan data and resets your opening
              balance. Your login and preferences stay. This can&rsquo;t be undone.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type reset to confirm"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setResetOpen(false); setConfirmText(""); }} disabled={resetting}>
                Cancel
              </Button>
              <Button
                onClick={doReset}
                disabled={resetting || confirmText !== "reset"}
                className="from-negative to-negative"
              >
                {resetting ? "Resetting…" : "Reset everything"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint .`
```bash
git add src/components/settings/settings-view.tsx
git commit -m "feat: working Reset all data in settings (typed confirmation)"
```

---

## Task 9: Final verification
- [ ] **Step 1:** `npx vitest run` — all pass (existing + `monthRange`, `runningBalance`). If a worker fails to spawn (Windows flakiness), re-run `npx vitest run --no-file-parallelism`.
- [ ] **Step 2:** `npx eslint .` — clean.
- [ ] **Step 3:** `npx tsc --noEmit` — clean.
- [ ] **Step 4:** `npx next build` — succeeds; `/balance` listed as `ƒ (Dynamic)`.
- [ ] **Step 5: Live walkthrough** — set an opening balance on `/balance`; confirm the Total Balance = opening + cumulative (salary + income − expenses) and the ledger carries each month's closing into the next opening; the dashboard banner matches; Settings → Reset all data (type `reset`) clears everything and lands on a clean dashboard.

---

## Self-Review
- **Spec coverage:** §2.1 openingBalance → T1; §2.2 monthRange → T2; §2.3 runningBalance → T3; §2.4 getBalance → T4; §2.5 actions → T5; §2.6 dashboard headline → T7; §2.7 /balance page + nav → T6; §2.8 reset → T8; DoD → T9. All covered.
- **Placeholder scan:** complete code in every step; no TBD/handle-later.
- **Type consistency:** `Balance`/`LedgerRow` (T3) ↔ `BalanceDTO` (T4) ↔ `balance-view`/banner props (T6/T7). `MonthTotal` consumed by `runningBalance` is produced by `monthlyTotals` (T4). `settings.openingBalance` (T1) read by `getBalance` (T4) and `setOpeningBalance` writes it (T5). `monthRange(start,end)` (T2) used in T4. `resetAllData` deletes via the existing model exports (`Transaction`/`Salary`/`Savings`/`Loan`/`Settings`).
