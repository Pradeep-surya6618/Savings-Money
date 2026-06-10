# Phase 2 — Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone income/expense ledger — record, list, edit, delete transactions with client-side search, filter, sort, and a summary, plus an add/edit dialog form.

**Architecture:** Server-first. A `Transaction` Mongoose model; pure logic (categories, filter/sort/summarize, validation) in dependency-light, unit-tested modules. The `/transactions` page (Server Component) fetches all transactions and hands them to a client `TransactionsView` that filters/sorts in memory; mutations go through Server Actions (`revalidatePath` refreshes the list). Add/edit uses React Hook Form + Zod in a Radix dialog (modal on desktop, bottom sheet on mobile).

**Tech Stack:** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Tailwind v4, Mongoose, zod, react-hook-form + @hookform/resolvers, @radix-ui/react-dialog.

**Spec:** `docs/superpowers/specs/2026-06-10-phase-2-transactions-design.md`

**Conventions:** Branch `phase-2-transactions` (do NOT switch branches). Tests: `npx vitest run`; typecheck `npx tsc --noEmit`; build `npx next build` (avoid `npm` script wrappers — they garble ANSI on this Windows shell, and `npm run dev` now binds 0.0.0.0:3050). End every commit with a blank line then `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Do NOT modify Phase 1's `src/lib/categories.ts`.

**Note (spec refinement):** the spec described one self-contained category file; for test purity we split it into pure data (`transaction-categories.ts`, no lucide) + an icon map (`transaction-category-icons.ts`), mirroring Phase 1. And `date` is handled as a `"YYYY-MM-DD"` string through the form/validation and converted to a `Date` only when writing to Mongo — avoiding RHF/zod coercion-typing friction.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/transaction-categories.ts` | Pure txn category taxonomy (key/label/type/color) |
| `src/lib/transaction-category-icons.ts` | key → lucide icon (UI only) |
| `src/lib/transaction-filters.ts` (+ `.test.ts`) | Pure filter / sort / summarize |
| `src/models/Transaction.ts` | Mongoose model |
| `src/validations/transaction.ts` (+ `.test.ts`) | Zod save schema (category↔type) |
| `src/services/transactions.ts` | `listTransactions()` → DTO[] |
| `src/lib/actions/transactions.ts` | create / update / delete Server Actions |
| `src/components/ui/dialog.tsx` | Reusable Radix dialog (modal / sheet) |
| `src/components/transactions/transaction-form.tsx` | RHF + Zod add/edit form |
| `src/components/transactions/{transaction-row,summary-strip,empty-state,confirm-delete,transaction-toolbar}.tsx` | Presentational pieces |
| `src/components/transactions/transactions-view.tsx` | Client orchestrator |
| `src/app/(app)/transactions/page.tsx` | Server page (fetch → view) |

---

## Task 1: Install dependencies

- [ ] **Step 1: Install**

Run: `npm install react-hook-form @hookform/resolvers @radix-ui/react-dialog`
Expected: installs succeed (React 19 peer warnings OK; report a hard ERESOLVE if it blocks).

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-hook-form, resolvers, radix dialog"
```

---

## Task 2: Transaction category taxonomy

**Files:** Create `src/lib/transaction-categories.ts`, `src/lib/transaction-category-icons.ts`

- [ ] **Step 1: Create the pure taxonomy**

Create `src/lib/transaction-categories.ts`:
```ts
export type TxnType = "income" | "expense";

export const TRANSACTION_CATEGORIES = [
  { key: "family", label: "Family", type: "expense", color: "#f43f5e" },
  { key: "loan", label: "Loan", type: "expense", color: "#8b5cf6" },
  { key: "food", label: "Food", type: "expense", color: "#f59e0b" },
  { key: "recharge", label: "Recharge", type: "expense", color: "#0ea5e9" },
  { key: "transport", label: "Transport", type: "expense", color: "#14b8a6" },
  { key: "shopping", label: "Shopping", type: "expense", color: "#ec4899" },
  { key: "entertainment", label: "Entertainment", type: "expense", color: "#a855f7" },
  { key: "savings", label: "Savings", type: "expense", color: "#22c55e" },
  { key: "investments", label: "Investments", type: "expense", color: "#6366f1" },
  { key: "misc", label: "Miscellaneous", type: "expense", color: "#64748b" },
  { key: "salary_income", label: "Salary", type: "income", color: "#16a34a" },
  { key: "freelance", label: "Freelance", type: "income", color: "#0ea5e9" },
  { key: "gift", label: "Gift", type: "income", color: "#ec4899" },
  { key: "other_income", label: "Other", type: "income", color: "#64748b" },
] as const satisfies readonly { key: string; label: string; type: TxnType; color: string }[];

export type TxnCategoryKey = (typeof TRANSACTION_CATEGORIES)[number]["key"];

export const TXN_CATEGORY_KEYS = TRANSACTION_CATEGORIES.map((c) => c.key) as [
  TxnCategoryKey,
  ...TxnCategoryKey[],
];

export const TXN_CATEGORY_MAP = Object.fromEntries(
  TRANSACTION_CATEGORIES.map((c) => [c.key, c]),
) as Record<TxnCategoryKey, (typeof TRANSACTION_CATEGORIES)[number]>;

export function categoriesForType(type: TxnType) {
  return TRANSACTION_CATEGORIES.filter((c) => c.type === type);
}
```

- [ ] **Step 2: Create the icon map**

Create `src/lib/transaction-category-icons.ts`:
```ts
import {
  Banknote,
  Briefcase,
  Bus,
  Film,
  Gift,
  GraduationCap,
  HeartHandshake,
  MoreHorizontal,
  PiggyBank,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { TxnCategoryKey } from "./transaction-categories";

export const TXN_CATEGORY_ICONS: Record<TxnCategoryKey, LucideIcon> = {
  family: HeartHandshake,
  loan: GraduationCap,
  food: UtensilsCrossed,
  recharge: Smartphone,
  transport: Bus,
  shopping: ShoppingBag,
  entertainment: Film,
  savings: PiggyBank,
  investments: TrendingUp,
  misc: MoreHorizontal,
  salary_income: Banknote,
  freelance: Briefcase,
  gift: Gift,
  other_income: TrendingUp,
};
```

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/transaction-categories.ts src/lib/transaction-category-icons.ts
git commit -m "feat: add transaction category taxonomy + icons"
```

---

## Task 3: Transaction model

**Files:** Create `src/models/Transaction.ts`

- [ ] **Step 1: Implement**

Create `src/models/Transaction.ts`:
```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    notes: { type: String },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, date: -1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema>;

export const Transaction: Model<TransactionDoc> =
  (models.Transaction as Model<TransactionDoc>) ?? model<TransactionDoc>("Transaction", transactionSchema);
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/models/Transaction.ts
git commit -m "feat: add Transaction model"
```

---

## Task 4: Validation schema (TDD)

**Files:** Create `src/validations/transaction.ts`, `src/validations/transaction.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/validations/transaction.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { saveTransactionSchema } from "./transaction";

const base = {
  title: "Groceries",
  amount: 1200,
  type: "expense" as const,
  category: "food",
  date: "2026-06-09",
  notes: "",
};

describe("saveTransactionSchema", () => {
  it("accepts a valid expense", () => {
    expect(saveTransactionSchema.safeParse(base).success).toBe(true);
  });
  it("accepts a valid income", () => {
    const r = saveTransactionSchema.safeParse({ ...base, type: "income", category: "salary_income" });
    expect(r.success).toBe(true);
  });
  it("rejects an empty title", () => {
    expect(saveTransactionSchema.safeParse({ ...base, title: "" }).success).toBe(false);
  });
  it("rejects a non-positive amount", () => {
    expect(saveTransactionSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });
  it("rejects a category that doesn't match the type", () => {
    const r = saveTransactionSchema.safeParse({ ...base, type: "income", category: "food" });
    expect(r.success).toBe(false);
  });
  it("rejects an unknown category", () => {
    expect(saveTransactionSchema.safeParse({ ...base, category: "bogus" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run src/validations/transaction.test.ts` — Expected: FAIL (cannot resolve `./transaction`).

- [ ] **Step 3: Implement**

Create `src/validations/transaction.ts`:
```ts
import { z } from "zod";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";

export const saveTransactionSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(80),
    amount: z.number().positive("Amount must be greater than 0"),
    type: z.enum(["income", "expense"]),
    category: z.string().min(1, "Pick a category"),
    date: z.string().min(1, "Pick a date"), // "YYYY-MM-DD"; converted to Date in the action
    notes: z.string().trim().max(300).optional(),
  })
  .refine(
    (d) => {
      const cat = TXN_CATEGORY_MAP[d.category as TxnCategoryKey];
      return cat !== undefined && cat.type === d.type;
    },
    { message: "Category doesn't match the transaction type", path: ["category"] },
  );

export type SaveTransactionInput = z.infer<typeof saveTransactionSchema>;
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npx vitest run src/validations/transaction.test.ts` — Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/validations/transaction.ts src/validations/transaction.test.ts
git commit -m "feat: add transaction validation schema"
```

---

## Task 5: Pure filter/sort/summarize (TDD)

**Files:** Create `src/lib/transaction-filters.ts`, `src/lib/transaction-filters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/transaction-filters.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npx vitest run src/lib/transaction-filters.test.ts` — Expected: FAIL (cannot resolve `./transaction-filters`).

- [ ] **Step 3: Implement**

Create `src/lib/transaction-filters.ts`:
```ts
export type FilterableTxn = {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string; // ISO string
};

export type TxnFilters = {
  search: string;
  type: "all" | "income" | "expense";
  category: string; // "all" | category key
  month: string; // "all" | "YYYY-MM"
};

export type TxnSort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export function filterTransactions<T extends FilterableTxn>(list: T[], f: TxnFilters): T[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (f.type !== "all" && t.type !== f.type) return false;
    if (f.category !== "all" && t.category !== f.category) return false;
    if (f.month !== "all" && t.date.slice(0, 7) !== f.month) return false;
    return true;
  });
}

export function sortTransactions<T extends FilterableTxn>(list: T[], sort: TxnSort): T[] {
  const copy = [...list];
  copy.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      case "date-desc":
        return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
      case "amount-asc":
        return a.amount - b.amount;
      case "amount-desc":
        return b.amount - a.amount;
    }
  });
  return copy;
}

export function summarize(
  list: { amount: number; type: "income" | "expense" }[],
): { income: number; expense: number; net: number } {
  let income = 0;
  let expense = 0;
  for (const t of list) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npx vitest run src/lib/transaction-filters.test.ts` — Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transaction-filters.ts src/lib/transaction-filters.test.ts
git commit -m "feat: add pure transaction filter/sort/summarize"
```

---

## Task 6: Read service

**Files:** Create `src/services/transactions.ts`

(No unit test — DB-backed; verified via the live walkthrough.)

- [ ] **Step 1: Implement**

Create `src/services/transactions.ts`:
```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";

export type TransactionDTO = {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string; // ISO
  notes: string | null;
};

export async function listTransactions(): Promise<TransactionDTO[]> {
  await connectDB();
  const { user } = await getCurrentUser();
  const docs = await Transaction.find({ userId: user.id })
    .sort({ date: -1, createdAt: -1 })
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    title: d.title,
    amount: d.amount,
    type: d.type as "income" | "expense",
    category: d.category,
    date: new Date(d.date).toISOString(),
    notes: d.notes ?? null,
  }));
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: clean. (If `.lean()` widens a field, cast at the map site precisely — no broad `any`.)

- [ ] **Step 3: Commit**

```bash
git add src/services/transactions.ts
git commit -m "feat: add transactions read service"
```

---

## Task 7: CRUD Server Actions

**Files:** Create `src/lib/actions/transactions.ts`

- [ ] **Step 1: Implement**

Create `src/lib/actions/transactions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";
import { saveTransactionSchema, type SaveTransactionInput } from "@/validations/transaction";

type Result = { ok: true } | { ok: false; error: string };

export async function createTransaction(input: SaveTransactionInput): Promise<Result> {
  const parsed = saveTransactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { date, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  await Transaction.create({ userId: user.id, ...rest, date: new Date(date) });

  revalidatePath("/transactions");
  return { ok: true };
}

export async function updateTransaction(id: string, input: SaveTransactionInput): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid transaction" };
  const parsed = saveTransactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { date, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  const res = await Transaction.updateOne(
    { _id: id, userId: user.id },
    { $set: { ...rest, date: new Date(date) } },
  );
  if (res.matchedCount === 0) return { ok: false, error: "Transaction not found" };

  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid transaction" };
  await connectDB();
  const { user } = await getCurrentUser();
  await Transaction.deleteOne({ _id: id, userId: user.id });
  revalidatePath("/transactions");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/transactions.ts
git commit -m "feat: add transaction CRUD server actions"
```

---

## Task 8: Reusable Dialog (Radix)

**Files:** Create `src/components/ui/dialog.tsx`

- [ ] **Step 1: Implement**

Create `src/components/ui/dialog.tsx`:
```tsx
"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-4 border border-border bg-card p-5 shadow-2xl outline-none",
          // mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          // desktop: centered modal
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pb-5",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <DialogPrimitive.Title className="text-base font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat: add reusable Radix dialog (modal/sheet)"
```

---

## Task 9: Transaction form (RHF + Zod)

**Files:** Create `src/components/transactions/transaction-form.tsx`

- [ ] **Step 1: Implement**

Create `src/components/transactions/transaction-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveTransactionSchema, type SaveTransactionInput } from "@/validations/transaction";
import { categoriesForType, type TxnType } from "@/lib/transaction-categories";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/services/transactions";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function TransactionForm({ initial, onDone }: { initial?: TransactionDTO; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaveTransactionInput>({
    resolver: zodResolver(saveTransactionSchema),
    defaultValues: {
      title: initial?.title ?? "",
      amount: initial?.amount ?? 0,
      type: initial?.type ?? "expense",
      category: initial?.category ?? "",
      date: (initial?.date ?? new Date().toISOString()).slice(0, 10),
      notes: initial?.notes ?? "",
    },
  });

  const type = watch("type");

  function chooseType(next: TxnType) {
    setValue("type", next);
    setValue("category", ""); // categories differ per type; force re-pick
  }

  async function onSubmit(values: SaveTransactionInput) {
    setServerError(null);
    const res = initial ? await updateTransaction(initial.id, values) : await createTransaction(values);
    if (res.ok) onDone();
    else setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {/* type toggle */}
      <div className="inline-flex w-full rounded-xl border border-border bg-card p-1 text-sm">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => chooseType(t)}
            className={cn(
              "flex-1 rounded-lg py-1.5 capitalize transition",
              type === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <input {...register("title")} placeholder="Title" className={fieldCls} />
        {errors.title && <p className="mt-1 text-xs text-negative">{errors.title.message}</p>}
      </div>

      <div>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("amount", { valueAsNumber: true })}
          placeholder="Amount (₹)"
          className={cn(fieldCls, "tabular-nums")}
        />
        {errors.amount && <p className="mt-1 text-xs text-negative">{errors.amount.message}</p>}
      </div>

      <div>
        <select {...register("category")} className={fieldCls}>
          <option value="">Select category</option>
          {categoriesForType(type).map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-negative">{errors.category.message}</p>}
      </div>

      <div>
        <input type="date" {...register("date")} className={fieldCls} />
        {errors.date && <p className="mt-1 text-xs text-negative">{errors.date.message}</p>}
      </div>

      <textarea {...register("notes")} placeholder="Notes (optional)" rows={2} className={fieldCls} />

      {serverError && <p className="text-sm text-negative">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add transaction"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: clean. (If RHF's `useForm` generic complains about the resolver, ensure `@hookform/resolvers/zod`'s `zodResolver` is imported and the schema output type matches `SaveTransactionInput`; all fields are plain types, so no coercion mismatch.)

- [ ] **Step 3: Commit**

```bash
git add src/components/transactions/transaction-form.tsx
git commit -m "feat: add transaction add/edit form (RHF + Zod)"
```

---

## Task 10: Presentational pieces

**Files:** Create `src/components/transactions/{transaction-row,summary-strip,empty-state,confirm-delete,transaction-toolbar}.tsx`

- [ ] **Step 1: TransactionRow**

Create `src/components/transactions/transaction-row.tsx`:
```tsx
"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { TXN_CATEGORY_ICONS } from "@/lib/transaction-category-icons";
import { cn, formatCurrency } from "@/lib/utils";
import type { TransactionDTO } from "@/services/transactions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function TransactionRow({
  txn,
  onEdit,
  onDelete,
}: {
  txn: TransactionDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = TXN_CATEGORY_MAP[txn.category as TxnCategoryKey];
  const Icon = TXN_CATEGORY_ICONS[txn.category as TxnCategoryKey];
  const color = cat?.color ?? "#64748b";
  const income = txn.type === "income";
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-foreground/15">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        {Icon ? <Icon className="h-5 w-5" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{txn.title}</p>
        <p className="text-xs text-muted-foreground">
          {cat?.label ?? txn.category} · {formatDate(txn.date)}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          income ? "text-positive" : "text-foreground",
        )}
      >
        {income ? "+" : "−"}
        {formatCurrency(txn.amount)}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-negative/10 hover:text-negative"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: SummaryStrip**

Create `src/components/transactions/summary-strip.tsx`:
```tsx
import { cn, formatCurrency } from "@/lib/utils";

export function SummaryStrip({
  income,
  expense,
  net,
}: {
  income: number;
  expense: number;
  net: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Income</p>
        <p className="mt-1 text-base font-semibold tabular-nums text-positive sm:text-lg">
          {formatCurrency(income)}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Expense</p>
        <p className="mt-1 text-base font-semibold tabular-nums sm:text-lg">{formatCurrency(expense)}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Net</p>
        <p
          className={cn(
            "mt-1 text-base font-semibold tabular-nums sm:text-lg",
            net >= 0 ? "text-positive" : "text-negative",
          )}
        >
          {formatCurrency(net)}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: EmptyState**

Create `src/components/transactions/empty-state.tsx`:
```tsx
"use client";

import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TransactionsEmptyState({
  filtered,
  onAdd,
}: {
  filtered: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-end text-white shadow-lg shadow-primary/25">
        <Receipt className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">
          {filtered ? "No matching transactions" : "No transactions yet"}
        </h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {filtered
            ? "Try clearing the search or filters."
            : "Record your income and expenses to see them here."}
        </p>
      </div>
      {!filtered && <Button onClick={onAdd}>Add transaction</Button>}
    </div>
  );
}
```

- [ ] **Step 4: ConfirmDelete**

Create `src/components/transactions/confirm-delete.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "@/lib/actions/transactions";
import { formatCurrency } from "@/lib/utils";
import type { TransactionDTO } from "@/services/transactions";

export function ConfirmDelete({ txn, onDone }: { txn: TransactionDTO; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Delete &ldquo;<span className="font-medium text-foreground">{txn.title}</span>&rdquo; (
        {formatCurrency(txn.amount)})? This can&rsquo;t be undone.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={async () => {
            setBusy(true);
            await deleteTransaction(txn.id);
            onDone();
          }}
          disabled={busy}
          className="from-negative to-negative"
        >
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: TransactionToolbar**

Create `src/components/transactions/transaction-toolbar.tsx`:
```tsx
"use client";

import { Search } from "lucide-react";
import { TRANSACTION_CATEGORIES } from "@/lib/transaction-categories";
import { monthLabel } from "@/lib/month";
import { cn } from "@/lib/utils";
import type { TxnFilters, TxnSort } from "@/lib/transaction-filters";

const selectCls =
  "rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function TransactionToolbar({
  filters,
  setFilters,
  sort,
  setSort,
  months,
}: {
  filters: TxnFilters;
  setFilters: (f: TxnFilters) => void;
  sort: TxnSort;
  setSort: (s: TxnSort) => void;
  months: string[];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-48">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search transactions"
          className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="inline-flex rounded-xl border border-border bg-card p-1 text-sm">
        {(["all", "income", "expense"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilters({ ...filters, type: t })}
            className={cn(
              "rounded-lg px-3 py-1 capitalize transition",
              filters.type === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <select
        value={filters.category}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        className={selectCls}
      >
        <option value="all">All categories</option>
        {TRANSACTION_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={filters.month}
        onChange={(e) => setFilters({ ...filters, month: e.target.value })}
        className={selectCls}
      >
        <option value="all">All months</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
      <select value={sort} onChange={(e) => setSort(e.target.value as TxnSort)} className={selectCls}>
        <option value="date-desc">Newest</option>
        <option value="date-asc">Oldest</option>
        <option value="amount-desc">Amount ↓</option>
        <option value="amount-asc">Amount ↑</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck** — Run: `npx tsc --noEmit` — Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/transactions/transaction-row.tsx src/components/transactions/summary-strip.tsx src/components/transactions/empty-state.tsx src/components/transactions/confirm-delete.tsx src/components/transactions/transaction-toolbar.tsx
git commit -m "feat: add transaction presentational components"
```

---

## Task 11: TransactionsView + page

**Files:** Create `src/components/transactions/transactions-view.tsx`; modify `src/app/(app)/transactions/page.tsx`

- [ ] **Step 1: TransactionsView**

Create `src/components/transactions/transactions-view.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TransactionToolbar } from "./transaction-toolbar";
import { SummaryStrip } from "./summary-strip";
import { TransactionRow } from "./transaction-row";
import { TransactionsEmptyState } from "./empty-state";
import { TransactionForm } from "./transaction-form";
import { ConfirmDelete } from "./confirm-delete";
import {
  filterTransactions,
  sortTransactions,
  summarize,
  type TxnFilters,
  type TxnSort,
} from "@/lib/transaction-filters";
import type { TransactionDTO } from "@/services/transactions";

const DEFAULT_FILTERS: TxnFilters = { search: "", type: "all", category: "all", month: "all" };

export function TransactionsView({ transactions }: { transactions: TransactionDTO[] }) {
  const [filters, setFilters] = useState<TxnFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<TxnSort>("date-desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [deleting, setDeleting] = useState<TransactionDTO | null>(null);

  const months = useMemo(
    () =>
      Array.from(new Set(transactions.map((t) => t.date.slice(0, 7)))).sort((a, b) =>
        a < b ? 1 : -1,
      ),
    [transactions],
  );
  const visible = useMemo(
    () => sortTransactions(filterTransactions(transactions, filters), sort),
    [transactions, filters, sort],
  );
  const totals = useMemo(() => summarize(visible), [visible]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(t: TransactionDTO) {
    setEditing(t);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <SummaryStrip income={totals.income} expense={totals.expense} net={totals.net} />
      <TransactionToolbar
        filters={filters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
        months={months}
      />

      {visible.length === 0 ? (
        <TransactionsEmptyState filtered={transactions.length > 0} onAdd={openAdd} />
      ) : (
        <div className="space-y-2">
          {visible.map((t) => (
            <TransactionRow key={t.id} txn={t} onEdit={() => openEdit(t)} onDelete={() => setDeleting(t)} />
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent title={editing ? "Edit transaction" : "Add transaction"}>
          <TransactionForm
            key={editing?.id ?? "new"}
            initial={editing ?? undefined}
            onDone={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent title="Delete transaction">
          {deleting && <ConfirmDelete txn={deleting} onDone={() => setDeleting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Wire the page** — replace the entire contents of `src/app/(app)/transactions/page.tsx` with:
```tsx
import { TransactionsView } from "@/components/transactions/transactions-view";
import { listTransactions } from "@/services/transactions";

export default async function TransactionsPage() {
  const transactions = await listTransactions();
  return <TransactionsView transactions={transactions} />;
}
```

- [ ] **Step 3: Typecheck + build** — Run: `npx tsc --noEmit` (clean), then `npx next build` (must succeed; `/transactions` becomes dynamic `ƒ` since it reads the DB). If build fails, READ the error and report BLOCKED with the exact message.

- [ ] **Step 4: Commit**

```bash
git add src/components/transactions/transactions-view.tsx "src/app/(app)/transactions/page.tsx"
git commit -m "feat: wire up transactions page"
```

---

## Task 12: Final verification (Definition of Done)

- [ ] **Step 1: Lint, typecheck, unit tests**

Run: `npx eslint .` → 0 problems.
Run: `npx tsc --noEmit` → clean.
Run: `npx vitest run` → all pass (Phase 0/1 tests + transaction-filters ×8 + saveTransactionSchema ×6).

- [ ] **Step 2: Production build**

Run: `npx next build` → succeeds; `/transactions` listed (dynamic).

- [ ] **Step 3: Live walkthrough** (requires `.env.local`; dev runs on port 3050)

Run `npm run dev`, open `http://localhost:3050/transactions`:
- Empty state shows "No transactions yet" + Add.
- **Add**: open the dialog (bottom sheet on a narrow window, centered modal wide). Toggle Expense/Income → the category list changes. Try submitting with an empty title / 0 amount → inline errors. Add a valid expense and a valid income → both appear, newest first; income shows green `+`, expense neutral `−`; the summary strip shows Income / Expense / Net.
- **Filter/sort/search**: type filter, category, month, search by title, and sort by date/amount all update the list + summary.
- **Edit**: pencil opens the form prefilled; change the amount → saves and the row updates.
- **Delete**: trash opens the confirm dialog; confirm → row disappears.
- Reload → data persists (Atlas). `GET /api/health` still `{ ok: true }`.

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "chore: Phase 2 transactions verified"
```

---

## Self-Review Notes (author)

- **Spec coverage:** §2.1 model → T3; §2.2 categories → T2 (split pure/icons, noted); §2.3 filters → T5; §2.4 validation → T4; §2.5 service → T6; §2.6 actions → T7; §2.7 UI (page, view, toolbar, summary, row, form, empty, dialog) → T8–T11; §2.9 deps → T1; DoD §3 → T12.
- **Type consistency:** `TransactionDTO` (T6) is consumed unchanged by row/form/view (T9–T11). `TxnFilters`/`TxnSort` defined in `transaction-filters` (T5) used by toolbar + view. `SaveTransactionInput` (T4) is the form's resolver type and the actions' input (T7, T9). `categoriesForType`/`TXN_CATEGORY_MAP`/`TxnCategoryKey` from `transaction-categories` (T2) used by validation (T4), form (T9), row (T10), toolbar (T10). `Dialog`/`DialogContent` (T8) used by the view (T11).
- **Decisions honored:** standalone (dashboard untouched); income categories distinct keys; client-side filtering in the view; `date` kept as `"YYYY-MM-DD"` string end-to-end, converted to `Date` only in the action (no zod-coercion typing friction).
- **No placeholders:** complete code in every step; exact commands + expected results.
- **Caveats flagged inline:** ERESOLVE on install (T1), `.lean()` typing (T6), RHF resolver typing (T9), `/transactions` becoming dynamic (T11).
