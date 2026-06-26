# Multi-Loan Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-loan-per-user feature with multiple typed loans/EMIs per user — a per-loan list with an aggregate summary, full CRUD, and full AI parity.

**Architecture:** Each loan is its own `Loan` document (`userId` indexed, not unique) with a `type` (fixed list) + optional `name`. A `getLoans()` service returns the list plus a pure-computed aggregate `loanSummary`. Per-loan server actions (create/update/delete/pay-by-id) back both the UI (summary card + loan cards) and the AI write tools, which run through the existing AI-SDK-v6 approval gateway.

**Tech Stack:** Next.js 16 App Router, React 19 (+ React Compiler — NO manual memo), Mongoose, Zod v4, Vercel AI SDK v6 (`ai@6.0.204`), Radix Select, Tailwind v4, Vitest.

## Global Constraints

- Verify with `npx` forms ONLY: `npx tsc --noEmit`, `npx eslint <paths>`, `npx vitest run`, `npx next build`. Never `npm run lint`/`npm test` (non-zero in this harness).
- Commit trailer on every commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- React Compiler is ON — do NOT add `useMemo`/`useCallback`/`memo`.
- Repo enforces `@typescript-eslint/no-explicit-any` as an ERROR — scope any unavoidable `any` with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`.
- AI tool input schemas must stay JSON-Schema-safe for Groq: **flat `z.object`** (no `.and()`/intersection), **no `z.coerce.date()`** (use `z.string()` dates). The regression test "every tool schema converts" must keep passing.
- Mongoose model hot-reload guard: `(models.X as Model<DocType>) ?? model(...)`.

## Refactor sequencing (READ FIRST)

This is a coupled refactor. To avoid a long red build, the **old** `getLoan` service and **old** `saveLoan`/`recordLoanPayment` actions are kept alive until their consumers migrate:

- `getLoan` (old, single) stays until Stage 6 migrates analytics; `loan/page.tsx` (Stage 4) and the AI read tool (Stage 5) migrate off it earlier, but keeping the export compiling is harmless.
- Stage 3 replaces the loan **actions**. From the end of Stage 3 until Stage 5 completes, `tsc`/`build` WILL report errors in `loan-form.tsx`, `loan-view.tsx`, `action-gateway.ts`, `action-tools.ts` (they reference the removed `saveLoan`/old `recordLoanPayment`). This is expected. Per-task gates in Stages 3–5 use **eslint on changed files + the relevant unit tests**. The **first full `tsc` + `build` gate is the last task of Stage 5**; the final whole-suite gate is Stage 7.

---

# Stage 1 — Model, types, migration

### Task 1: Loan types catalog

**Files:**
- Create: `src/lib/loan-types.ts`

**Interfaces:**
- Produces: `LOAN_TYPES`, `type LoanTypeKey`, `LOAN_TYPE_KEYS` (`[LoanTypeKey, ...LoanTypeKey[]]`), `LOAN_TYPE_MAP`, `loanTypeLabel(key: string): string`.

- [ ] **Step 1: Create `src/lib/loan-types.ts`**

```ts
import {
  Car,
  GraduationCap,
  Home,
  Landmark,
  Smartphone,
  Sprout,
  Wallet,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

export const LOAN_TYPES = [
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "vehicle", label: "Vehicle", icon: Car },
  { key: "home", label: "Home", icon: Home },
  { key: "mobile", label: "Mobile / Gadget", icon: Smartphone },
  { key: "agriculture", label: "Agriculture", icon: Sprout },
  { key: "appliances", label: "Appliances", icon: WashingMachine },
  { key: "personal", label: "Personal", icon: Wallet },
  { key: "other", label: "Other", icon: Landmark },
] as const satisfies readonly { key: string; label: string; icon: LucideIcon }[];

export type LoanTypeKey = (typeof LOAN_TYPES)[number]["key"];

export const LOAN_TYPE_KEYS = LOAN_TYPES.map((t) => t.key) as [LoanTypeKey, ...LoanTypeKey[]];

export const LOAN_TYPE_MAP = Object.fromEntries(LOAN_TYPES.map((t) => [t.key, t])) as Record<
  LoanTypeKey,
  (typeof LOAN_TYPES)[number]
>;

export function loanTypeLabel(key: string): string {
  return LOAN_TYPE_MAP[key as LoanTypeKey]?.label ?? "Other";
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/loan-types.ts`
Expected: exit 0.

- [ ] **Step 3: Commit**

```
git add src/lib/loan-types.ts
git commit -m "feat(loan): loan-types catalog (8 typed loans + icons)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Loan model — many docs per user

**Files:**
- Modify: `src/models/Loan.ts` (full rewrite)

**Interfaces:**
- Produces: `Loan` model with fields `userId, type, name?, totalLoan, paidAmount, emiAmount, startDate?`; `type LoanDoc`.

- [ ] **Step 1: Replace `src/models/Loan.ts` entirely**

```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { LOAN_TYPE_KEYS } from "@/lib/loan-types";

const loanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: LOAN_TYPE_KEYS, required: true, default: "other" },
    name: { type: String, trim: true },
    totalLoan: { type: Number, required: true, default: 0, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    emiAmount: { type: Number, required: true, default: 0, min: 0 },
    startDate: { type: Date },
  },
  { timestamps: true },
);

loanSchema.index({ userId: 1, createdAt: -1 });

export type LoanDoc = InferSchemaType<typeof loanSchema>;

export const Loan: Model<LoanDoc> =
  (models.Loan as Model<LoanDoc>) ?? model<LoanDoc>("Loan", loanSchema);
```

> `userId` no longer has `unique: true`. The old `getLoan`/`saveLoan` still compile against this (they read/write `totalLoan` etc.).

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/models/Loan.ts`
Expected: exit 0. (The old `getLoan`/`saveLoan` still reference only fields that still exist — green.)

- [ ] **Step 3: Commit**

```
git add src/models/Loan.ts
git commit -m "feat(loan): multi-loan model (type+name, non-unique userId)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Fresh-start migration script

**Files:**
- Create: `scripts/migrate-multi-loan.mjs`

- [ ] **Step 1: Create the migration script**

```js
// One-time fresh-start migration for the multi-loan model:
//   1. Drop the old `userId_1` UNIQUE index on `loans` (Mongoose won't drop it
//      automatically when `unique: true` is removed from the schema).
//   2. Delete all existing loan docs (fresh start — no per-user single loan).
// Run once per environment: `node scripts/migrate-multi-loan.mjs`
import { readFileSync } from "node:fs";
import mongoose from "mongoose";

function readEnv(key) {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i === -1) continue;
      if (line.slice(0, i).trim() === key) {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* no .env.local — fall back to process.env */
  }
  return undefined;
}

const uri = process.env.MONGODB_URI ?? readEnv("MONGODB_URI");
if (!uri) {
  console.error("MONGODB_URI not found (set it or add to .env.local)");
  process.exit(1);
}

await mongoose.connect(uri);
const loans = mongoose.connection.collection("loans");

try {
  await loans.dropIndex("userId_1");
  console.log("Dropped unique index userId_1");
} catch (e) {
  console.log(`userId_1 index not dropped (ok): ${e.codeName ?? e.message}`);
}

const res = await loans.deleteMany({});
console.log(`Deleted ${res.deletedCount} loan doc(s) — fresh start.`);

await mongoose.disconnect();
console.log("Multi-loan migration complete.");
```

- [ ] **Step 2: Run the migration against the dev DB**

Run: `node scripts/migrate-multi-loan.mjs`
Expected: prints "Dropped unique index userId_1" (or "not dropped (ok)" if already gone) and "Deleted N loan doc(s)" then "complete". Re-running is safe (idempotent).

- [ ] **Step 3: Lint + commit**

Run: `npx eslint scripts/migrate-multi-loan.mjs` (expect 0; if eslint doesn't target `scripts/`, skip).

```
git add scripts/migrate-multi-loan.mjs
git commit -m "chore(loan): fresh-start migration (drop unique index, clear loans)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> Remember to also run this once against the **production** Atlas DB at deploy time.

---

# Stage 2 — Service + aggregate math

### Task 4: Pure `loanSummary` — TDD

**Files:**
- Modify: `src/lib/tracker-math.ts`
- Modify: `src/lib/tracker-math.test.ts` (create if absent)

**Interfaces:**
- Produces: `type LoanSummary`, `loanSummary(loans: { totalLoan; paidAmount; emiAmount }[]): LoanSummary`.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/tracker-math.test.ts` (create with the import line if the file doesn't exist):

```ts
import { describe, it, expect } from "vitest";
import { loanSummary } from "./tracker-math";

describe("loanSummary", () => {
  it("is all-zero for no loans", () => {
    expect(loanSummary([])).toEqual({
      count: 0, totalBorrowed: 0, totalPaid: 0, totalRemaining: 0,
      totalMonthlyEmi: 0, overallPct: 0, allPaidOff: false,
    });
  });
  it("aggregates multiple loans", () => {
    const s = loanSummary([
      { totalLoan: 100000, paidAmount: 25000, emiAmount: 5000 },
      { totalLoan: 50000, paidAmount: 25000, emiAmount: 2000 },
    ]);
    expect(s.count).toBe(2);
    expect(s.totalBorrowed).toBe(150000);
    expect(s.totalPaid).toBe(50000);
    expect(s.totalRemaining).toBe(100000);
    expect(s.totalMonthlyEmi).toBe(7000);
    expect(Math.round(s.overallPct)).toBe(33);
    expect(s.allPaidOff).toBe(false);
  });
  it("flags allPaidOff only when every loan is fully paid", () => {
    expect(loanSummary([{ totalLoan: 100, paidAmount: 100, emiAmount: 0 }]).allPaidOff).toBe(true);
    expect(loanSummary([
      { totalLoan: 100, paidAmount: 100, emiAmount: 0 },
      { totalLoan: 100, paidAmount: 50, emiAmount: 0 },
    ]).allPaidOff).toBe(false);
  });
  it("clamps overallPct and treats zero borrowed as 0%", () => {
    expect(loanSummary([{ totalLoan: 0, paidAmount: 0, emiAmount: 0 }]).overallPct).toBe(0);
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/lib/tracker-math.test.ts`
Expected: FAIL ("loanSummary is not a function" / not exported).

- [ ] **Step 3: Implement `loanSummary` in `src/lib/tracker-math.ts`**

Append at the end of the file (reuses the module-private `clampPct`):

```ts
export type LoanSummary = {
  count: number;
  totalBorrowed: number;
  totalPaid: number;
  totalRemaining: number;
  totalMonthlyEmi: number;
  overallPct: number;
  allPaidOff: boolean;
};

export function loanSummary(
  loans: { totalLoan: number; paidAmount: number; emiAmount: number }[],
): LoanSummary {
  const totalBorrowed = loans.reduce((s, l) => s + l.totalLoan, 0);
  const totalPaid = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalMonthlyEmi = loans.reduce((s, l) => s + l.emiAmount, 0);
  const totalRemaining = Math.max(0, totalBorrowed - totalPaid);
  const overallPct = totalBorrowed > 0 ? clampPct((totalPaid / totalBorrowed) * 100) : 0;
  const allPaidOff = loans.length > 0 && loans.every((l) => l.totalLoan > 0 && l.paidAmount >= l.totalLoan);
  return { count: loans.length, totalBorrowed, totalPaid, totalRemaining, totalMonthlyEmi, overallPct, allPaidOff };
}
```

- [ ] **Step 4: Run tests; verify pass**

Run: `npx vitest run src/lib/tracker-math.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck + commit**

Run: `npx eslint src/lib/tracker-math.ts src/lib/tracker-math.test.ts && npx tsc --noEmit`
Expected: exit 0.

```
git add src/lib/tracker-math.ts src/lib/tracker-math.test.ts
git commit -m "feat(loan): pure loanSummary aggregate (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `getLoans` service (kept alongside `getLoan`)

**Files:**
- Modify: `src/services/loan.ts` (add `getLoans` + DTOs; keep `getLoan`)

**Interfaces:**
- Consumes: `loanStats`, `loanSummary`, `LoanSummary` from `@/lib/tracker-math`; `loanTypeLabel`, `LoanTypeKey` from `@/lib/loan-types`.
- Produces: `type LoanItemDTO`, `getLoans(): Promise<{ loans: LoanItemDTO[]; summary: LoanSummary }>`.

- [ ] **Step 1: Add to `src/services/loan.ts`**

Keep the existing `getLoan`/`LoanDTO`. Add the imports `loanSummary`, `type LoanSummary` to the existing tracker-math import, add `import { loanTypeLabel, type LoanTypeKey } from "@/lib/loan-types";`, and append:

```ts
export type LoanItemDTO = {
  id: string;
  type: LoanTypeKey;
  typeLabel: string;
  name: string | null;
  displayName: string;
  totalLoan: number;
  paidAmount: number;
  emiAmount: number;
  startDate: string | null;
  stats: LoanStats;
};

export async function getLoans(): Promise<{ loans: LoanItemDTO[]; summary: LoanSummary }> {
  await connectDB();
  const { user } = await getCurrentUser();
  const docs = await Loan.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
  const loans: LoanItemDTO[] = docs.map((d) => {
    const type = ((d.type as LoanTypeKey) ?? "other");
    const typeLabel = loanTypeLabel(type);
    const name = d.name && d.name.trim() ? d.name.trim() : null;
    return {
      id: String(d._id),
      type,
      typeLabel,
      name,
      displayName: name ?? typeLabel,
      totalLoan: d.totalLoan,
      paidAmount: d.paidAmount,
      emiAmount: d.emiAmount,
      startDate: d.startDate ? new Date(d.startDate).toISOString() : null,
      stats: loanStats(d.totalLoan, d.paidAmount, d.emiAmount),
    };
  });
  return { loans, summary: loanSummary(loans) };
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/services/loan.ts`
Expected: exit 0 (additive — old `getLoan` still present).

- [ ] **Step 3: Commit**

```
git add src/services/loan.ts
git commit -m "feat(loan): getLoans service (list + aggregate summary)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Stage 3 — Validation + per-loan actions

### Task 6: `saveLoanSchema` gains type + name — TDD

**Files:**
- Modify: `src/validations/tracker.ts`
- Modify: `src/validations/tracker.test.ts`

**Interfaces:**
- Produces: `saveLoanSchema` now requires `type` (enum) + optional `name`; `SaveLoanInput` type updated.

- [ ] **Step 1: Write the failing test**

Append to `src/validations/tracker.test.ts`:

```ts
import { saveLoanSchema as loanSchemaMulti } from "./tracker";

describe("saveLoanSchema (multi-loan)", () => {
  const ok = { type: "vehicle", name: "Car loan", totalLoan: 500000, paidAmount: 100000, emiAmount: 25000, startDate: "2026-01-15" };
  it("accepts a valid typed loan", () => {
    expect(loanSchemaMulti.safeParse(ok).success).toBe(true);
  });
  it("accepts a missing name (optional)", () => {
    const { name, ...rest } = ok;
    expect(loanSchemaMulti.safeParse(rest).success).toBe(true);
  });
  it("rejects an unknown type", () => {
    expect(loanSchemaMulti.safeParse({ ...ok, type: "spaceship" }).success).toBe(false);
  });
  it("rejects paid > total", () => {
    expect(loanSchemaMulti.safeParse({ ...ok, paidAmount: 600000 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/validations/tracker.test.ts`
Expected: FAIL (unknown type currently accepted / type field ignored).

- [ ] **Step 3: Update `saveLoanSchema` in `src/validations/tracker.ts`**

Add the import `import { LOAN_TYPE_KEYS } from "@/lib/loan-types";` at the top, and replace the `saveLoanSchema` definition with:

```ts
export const saveLoanSchema = z
  .object({
    type: z.enum(LOAN_TYPE_KEYS),
    name: z.string().trim().max(60, "Name is too long").optional(),
    totalLoan: z.number().min(0, "Can't be negative"),
    paidAmount: z.number().min(0, "Can't be negative"),
    emiAmount: z.number().min(0, "Can't be negative"),
    startDate: z
      .string()
      .min(1, "Pick a start date")
      .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  })
  .refine((d) => d.paidAmount <= d.totalLoan, {
    message: "Paid can't exceed the loan total",
    path: ["paidAmount"],
  });
```

(Leave `saveSavingsSchema`, `quickAmountSchema`, `SaveLoanInput`/other type exports as-is — `SaveLoanInput = z.infer<typeof saveLoanSchema>` updates automatically.)

- [ ] **Step 4: Run tests; verify pass**

Run: `npx vitest run src/validations/tracker.test.ts`
Expected: PASS (existing loan tests + the new ones).

- [ ] **Step 5: Lint + commit**

Run: `npx eslint src/validations/tracker.ts src/validations/tracker.test.ts`
Expected: exit 0.

> `npx tsc --noEmit` now reports errors in `loan-form.tsx` (defaultValues), `action-kinds.ts` etc.? No — adding fields keeps consumers compiling (RHF defaultValues are DeepPartial; ACTION_SCHEMAS just reuse the schema). tsc stays green here.

```
git add src/validations/tracker.ts src/validations/tracker.test.ts
git commit -m "feat(loan): saveLoanSchema adds type + name (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Per-loan actions (create/update/delete/pay)

**Files:**
- Modify: `src/lib/actions/loan.ts` (full rewrite)

**Interfaces:**
- Produces: `createLoan(input: SaveLoanInput): Promise<{ ok: true; id: string } | { ok: false; error: string }>`, `updateLoan(id: string, input: SaveLoanInput): Promise<Result>`, `deleteLoan(id: string): Promise<Result>`, `recordLoanPayment(id: string, amount: number): Promise<Result>`.
- REMOVES: `saveLoan`, old `recordLoanPayment(input)`.

> ⚠️ After this task, `tsc`/`build` fail in `loan-form.tsx`, `loan-view.tsx`, `action-gateway.ts`, `action-tools.ts` (they use the removed exports). Expected — fixed in Stage 4 (UI) and Stage 5 (AI). This task's gate is eslint on the changed file only.

- [ ] **Step 1: Replace `src/lib/actions/loan.ts` entirely**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Loan } from "@/models/Loan";
import { saveLoanSchema, quickAmountSchema, type SaveLoanInput } from "@/validations/tracker";

type Result = { ok: true } | { ok: false; error: string };

function revalidateLoan() {
  revalidatePath("/loan");
  revalidatePath("/");
  revalidatePath("/analytics");
}

export async function createLoan(
  input: SaveLoanInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = saveLoanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { startDate, name, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Loan.create({
    userId: user.id,
    ...rest,
    name: name ?? null,
    startDate: new Date(startDate),
  });
  revalidateLoan();
  return { ok: true, id: String(doc._id) };
}

export async function updateLoan(id: string, input: SaveLoanInput): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid loan" };
  const parsed = saveLoanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { startDate, name, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  const res = await Loan.updateOne(
    { _id: id, userId: user.id },
    { $set: { ...rest, name: name ?? null, startDate: new Date(startDate) } },
  );
  if (res.matchedCount === 0) return { ok: false, error: "Loan not found" };
  revalidateLoan();
  return { ok: true };
}

export async function deleteLoan(id: string): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid loan" };
  await connectDB();
  const { user } = await getCurrentUser();
  const res = await Loan.deleteOne({ _id: id, userId: user.id });
  if (res.deletedCount === 0) return { ok: false, error: "Loan not found" };
  revalidateLoan();
  return { ok: true };
}

export async function recordLoanPayment(id: string, amount: number): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid loan" };
  const parsed = quickAmountSchema.safeParse({ amount });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid amount" };

  await connectDB();
  const { user } = await getCurrentUser();
  const loan = await Loan.findOne({ _id: id, userId: user.id }).lean();
  if (!loan || loan.totalLoan <= 0) return { ok: false, error: "Loan not found" };
  const newPaid = Math.min(loan.totalLoan, loan.paidAmount + parsed.data.amount);
  await Loan.updateOne({ _id: id, userId: user.id }, { $set: { paidAmount: newPaid } });
  revalidateLoan();
  return { ok: true };
}
```

- [ ] **Step 2: Lint the changed file**

Run: `npx eslint src/lib/actions/loan.ts`
Expected: exit 0. (Do NOT run full `tsc` — consumer errors are expected until Stages 4–5.)

- [ ] **Step 3: Commit**

```
git add src/lib/actions/loan.ts
git commit -m "feat(loan): per-loan create/update/delete/pay actions" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Stage 4 — UI (loan page, list, cards, form)

### Task 8: Loan form — type select + name

**Files:**
- Modify: `src/components/loan/loan-form.tsx` (full rewrite)

**Interfaces:**
- Consumes: `createLoan`, `updateLoan` from `@/lib/actions/loan`; `Select` from `@/components/ui/select`; `LOAN_TYPES` from `@/lib/loan-types`; `LoanItemDTO` from `@/services/loan`.
- Produces: `LoanForm({ initial?: LoanItemDTO; onDone: () => void })` — add when `initial` omitted, edit otherwise.

- [ ] **Step 1: Replace `src/components/loan/loan-form.tsx` entirely**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveLoanSchema, type SaveLoanInput } from "@/validations/tracker";
import { createLoan, updateLoan } from "@/lib/actions/loan";
import { LOAN_TYPES } from "@/lib/loan-types";
import { toast } from "@/lib/toast-store";
import { Field } from "@/components/trackers/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import type { LoanItemDTO } from "@/services/loan";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

const TYPE_OPTIONS = LOAN_TYPES.map((t) => ({ value: t.key, label: t.label }));

export function LoanForm({ initial, onDone }: { initial?: LoanItemDTO; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaveLoanInput>({
    resolver: zodResolver(saveLoanSchema),
    defaultValues: {
      type: initial?.type ?? "personal",
      name: initial?.name ?? "",
      totalLoan: initial?.totalLoan ?? 0,
      paidAmount: initial?.paidAmount ?? 0,
      emiAmount: initial?.emiAmount ?? 0,
      startDate: (initial?.startDate ?? new Date().toISOString()).slice(0, 10),
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch() opts this low-frequency form out of React Compiler memoization.
  const type = watch("type");
  // eslint-disable-next-line react-hooks/incompatible-library -- see above
  const startDate = watch("startDate");

  async function onSubmit(values: SaveLoanInput) {
    setServerError(null);
    const res = initial ? await updateLoan(initial.id, values) : await createLoan(values);
    if (res.ok) {
      toast.success(initial ? "Loan updated" : "Loan added");
      onDone();
    } else {
      setServerError(res.error);
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Loan type" error={errors.type?.message}>
        <Select
          value={type}
          onValueChange={(v) => setValue("type", v as SaveLoanInput["type"])}
          options={TYPE_OPTIONS}
          ariaLabel="Loan type"
          className="w-full"
        />
      </Field>
      <Field label="Name / lender (optional)" error={errors.name?.message}>
        <input type="text" maxLength={60} placeholder="e.g. HDFC Car Loan" {...register("name")} className={fieldCls} />
      </Field>
      <Field label="Total loan (₹)" error={errors.totalLoan?.message}>
        <input type="number" inputMode="decimal" step="any" min={0} {...register("totalLoan", { valueAsNumber: true })} className={cn(fieldCls, "tabular-nums")} />
      </Field>
      <Field label="Already paid (₹)" error={errors.paidAmount?.message}>
        <input type="number" inputMode="decimal" step="any" min={0} {...register("paidAmount", { valueAsNumber: true })} className={cn(fieldCls, "tabular-nums")} />
      </Field>
      <Field label="Monthly EMI (₹)" error={errors.emiAmount?.message}>
        <input type="number" inputMode="decimal" step="any" min={0} {...register("emiAmount", { valueAsNumber: true })} className={cn(fieldCls, "tabular-nums")} />
      </Field>
      <Field label="Start date" error={errors.startDate?.message}>
        <DatePicker value={startDate} onChange={(v) => setValue("startDate", v)} />
      </Field>
      {serverError && <p className="text-sm text-negative">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add loan"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Lint the changed file**

Run: `npx eslint src/components/loan/loan-form.tsx`
Expected: exit 0. (Full tsc still red elsewhere — expected.)

- [ ] **Step 3: Commit**

```
git add src/components/loan/loan-form.tsx
git commit -m "feat(loan): loan form with type select + name (add/edit)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Loan card

**Files:**
- Create: `src/components/loan/loan-card.tsx`

**Interfaces:**
- Consumes: `LoanItemDTO` from `@/services/loan`; `LOAN_TYPE_MAP` from `@/lib/loan-types`; `LOAN_COLOR` from `@/lib/nav`; `formatCurrency` from `@/lib/utils`; `currentMonth, addMonths, monthLabel` from `@/lib/month`.
- Produces: `LoanCard({ loan, onEdit, onPay, onDelete })` where callbacks take no args (the parent already knows which loan).

- [ ] **Step 1: Create `src/components/loan/loan-card.tsx`**

```tsx
"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RingStat } from "@/components/ui/ring-stat";
import { formatCurrency } from "@/lib/utils";
import { currentMonth, addMonths, monthLabel } from "@/lib/month";
import { LOAN_TYPE_MAP } from "@/lib/loan-types";
import { LOAN_COLOR } from "@/lib/nav";
import type { LoanItemDTO } from "@/services/loan";

export function LoanCard({
  loan,
  onEdit,
  onPay,
  onDelete,
}: {
  loan: LoanItemDTO;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}) {
  const Icon = LOAN_TYPE_MAP[loan.type].icon;
  const { stats } = loan;
  const completion =
    stats.paidOff ? "Complete" : stats.monthsLeft != null ? monthLabel(addMonths(currentMonth(), stats.monthsLeft)) : "—";

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${LOAN_COLOR}1f`, color: LOAN_COLOR }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{loan.displayName}</p>
            <p className="text-xs text-muted-foreground">{loan.typeLabel}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} aria-label="Edit loan" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card-elevated hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} aria-label="Delete loan" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-negative/10 hover:text-negative">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <RingStat pct={stats.pct} color={LOAN_COLOR} size={84} />
        <dl className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Paid</dt><dd className="tabular-nums">{formatCurrency(loan.paidAmount)} / {formatCurrency(loan.totalLoan)}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Remaining</dt><dd className="tabular-nums">{formatCurrency(stats.remaining)}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">EMI</dt><dd className="tabular-nums">{formatCurrency(loan.emiAmount)}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Est. done</dt><dd>{completion}</dd></div>
        </dl>
      </div>

      <button
        type="button"
        onClick={onPay}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium transition hover:bg-card-elevated"
      >
        <Plus className="h-4 w-4" /> Record payment
      </button>
    </Card>
  );
}
```

> **Before implementing:** open `src/components/ui/ring-stat.tsx` and confirm it accepts a `size` prop and that `pct`/`color` are as used in `loan-view.tsx`. If `size` is not supported, drop the `size={84}` prop (default) — do not invent props.

- [ ] **Step 2: Lint the changed file**

Run: `npx eslint src/components/loan/loan-card.tsx`
Expected: exit 0.

- [ ] **Step 3: Commit**

```
git add src/components/loan/loan-card.tsx
git commit -m "feat(loan): per-loan card (icon, ring, details, actions)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Loan view (summary + list) + page

**Files:**
- Modify: `src/components/loan/loan-view.tsx` (full rewrite)
- Modify: `src/app/(app)/loan/page.tsx`

**Interfaces:**
- Consumes: `getLoans` (page), `LoanView({ data })` where `data = Awaited<ReturnType<typeof getLoans>>`; `LoanCard`, `LoanForm`, `AmountForm`, `recordLoanPayment`, `deleteLoan`.

- [ ] **Step 1: Replace `src/app/(app)/loan/page.tsx`**

```tsx
import { getLoans } from "@/services/loan";
import { LoanView } from "@/components/loan/loan-view";

export const dynamic = "force-dynamic";

export default async function LoanPage() {
  const data = await getLoans();
  return <LoanView data={data} />;
}
```

- [ ] **Step 2: Replace `src/components/loan/loan-view.tsx` entirely**

```tsx
"use client";

import { useState } from "react";
import { Plus, Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RingStat } from "@/components/ui/ring-stat";
import { AmountForm } from "@/components/trackers/amount-form";
import { LoanForm } from "./loan-form";
import { LoanCard } from "./loan-card";
import { recordLoanPayment, deleteLoan } from "@/lib/actions/loan";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { LOAN_COLOR } from "@/lib/nav";
import type { getLoans, LoanItemDTO } from "@/services/loan";

type LoansData = Awaited<ReturnType<typeof getLoans>>;

export function LoanView({ data }: { data: LoansData }) {
  const { loans, summary } = data;
  const [addOpen, setAddOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<LoanItemDTO | null>(null);
  const [payLoan, setPayLoan] = useState<LoanItemDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LoanItemDTO | null>(null);

  async function confirmDelete() {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    const res = await deleteLoan(target.id);
    if (res.ok) toast.success("Loan deleted");
    else toast.error(res.error);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
        {summary.count > 0 && (
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add loan
          </Button>
        )}
      </div>

      {summary.count === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Landmark className="h-10 w-10" style={{ color: LOAN_COLOR }} />
          <div>
            <p className="font-semibold">Add your loan details</p>
            <p className="text-sm text-muted-foreground">Track repayment progress and completion across all your loans.</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>Add loan details</Button>
        </Card>
      ) : (
        <>
          <Card className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <RingStat
                pct={summary.overallPct}
                color={LOAN_COLOR}
                caption="overall repaid"
                sub={<>{formatCurrency(summary.totalPaid)} of {formatCurrency(summary.totalBorrowed)}</>}
              />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Outstanding</dt><dd className="text-lg font-bold tabular-nums">{formatCurrency(summary.totalRemaining)}</dd></div>
              <div><dt className="text-muted-foreground">Monthly EMI</dt><dd className="text-lg font-bold tabular-nums">{formatCurrency(summary.totalMonthlyEmi)}</dd></div>
              <div><dt className="text-muted-foreground">Loans</dt><dd className="text-lg font-bold tabular-nums">{summary.count}</dd></div>
              <div><dt className="text-muted-foreground">Borrowed</dt><dd className="text-lg font-bold tabular-nums">{formatCurrency(summary.totalBorrowed)}</dd></div>
            </dl>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onEdit={() => setEditLoan(loan)}
                onPay={() => setPayLoan(loan)}
                onDelete={() => setDeleteTarget(loan)}
              />
            ))}
          </div>
        </>
      )}

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add loan">
          <LoanForm onDone={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editLoan !== null} onOpenChange={(o) => { if (!o) setEditLoan(null); }}>
        <DialogContent title="Edit loan">
          {editLoan && <LoanForm initial={editLoan} onDone={() => setEditLoan(null)} />}
        </DialogContent>
      </Dialog>

      {/* Record payment */}
      <Dialog open={payLoan !== null} onOpenChange={(o) => { if (!o) setPayLoan(null); }}>
        <DialogContent title={payLoan ? `Record payment — ${payLoan.displayName}` : "Record payment"}>
          {payLoan && (
            <AmountForm
              submitLabel="Record payment"
              successMessage="Payment recorded"
              onSubmit={(amount) => recordLoanPayment(payLoan.id, amount)}
              onDone={() => setPayLoan(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent title="Delete loan?">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This permanently removes this loan and its progress. This can&rsquo;t be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={() => void confirmDelete()} className="from-negative to-negative">Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Lint the changed files**

Run: `npx eslint src/components/loan/loan-view.tsx "src/app/(app)/loan/page.tsx"`
Expected: exit 0. (Full tsc still red in the AI layer — fixed in Stage 5.)

- [ ] **Step 4: Commit**

```
git add src/components/loan/loan-view.tsx "src/app/(app)/loan/page.tsx"
git commit -m "feat(loan): multi-loan page (summary card + loan list)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Stage 5 — AI layer (full parity)

### Task 11: Action kinds + inverse for loans — TDD

**Files:**
- Modify: `src/lib/ai/action-kinds.ts`
- Modify: `src/lib/ai/action-kinds.test.ts`
- Modify: `src/lib/ai/action-inverse.ts`
- Modify: `src/lib/ai/action-inverse.test.ts`

**Interfaces:**
- Produces: `ACTION_KINDS` now contains `add_loan`, `edit_loan`, `delete_loan` (replacing `set_loan`) and `record_loan_payment` schema `{ loanId, amount }`. New inverse ops `create_loan`/`update_loan`/`delete_loan_doc`; `set_loan_paid` gains `id`. `LoanSnapshot` gains `type`/`name`.

- [ ] **Step 1: Update the kinds test**

In `src/lib/ai/action-kinds.test.ts`, the "lists all eight kinds" test must become ten, and add loan-kind coverage. Replace the `ACTION_KINDS` length assertion and add:

```ts
it("lists all ten kinds", () => {
  expect(ACTION_KINDS).toHaveLength(10);
  expect(ACTION_KINDS).toContain("add_loan");
  expect(ACTION_KINDS).toContain("edit_loan");
  expect(ACTION_KINDS).toContain("delete_loan");
  expect(ACTION_KINDS).not.toContain("set_loan");
});
it("accepts a valid add_loan and rejects a bad type", () => {
  const ok = { type: "vehicle", name: "Car", totalLoan: 100000, paidAmount: 0, emiAmount: 5000, startDate: "2026-01-01" };
  expect(parseActionInput("add_loan", ok).success).toBe(true);
  expect(parseActionInput("add_loan", { ...ok, type: "nope" }).success).toBe(false);
});
it("requires loanId for record_loan_payment", () => {
  expect(parseActionInput("record_loan_payment", { amount: 100 }).success).toBe(false);
  expect(parseActionInput("record_loan_payment", { loanId: "abc", amount: 100 }).success).toBe(true);
});
it("requires id for edit_loan / delete_loan", () => {
  expect(parseActionInput("delete_loan", {}).success).toBe(false);
  expect(parseActionInput("delete_loan", { id: "abc" }).success).toBe(true);
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/lib/ai/action-kinds.test.ts`
Expected: FAIL (still 9 kinds; `set_loan` present; loan kinds missing).

- [ ] **Step 3: Update `src/lib/ai/action-kinds.ts`**

(a) The `ACTION_KINDS` tuple: remove `"set_loan"`, add `"add_loan"`, `"edit_loan"`, `"delete_loan"` (keep `record_loan_payment`):

```ts
export const ACTION_KINDS = [
  "add_transaction",
  "edit_transaction",
  "delete_transaction",
  "contribute_to_savings",
  "set_savings_goal",
  "record_loan_payment",
  "add_loan",
  "edit_loan",
  "delete_loan",
  "set_budget",
] as const;
```

(b) Add a flat edit-loan schema next to `editTransactionSchema` (no intersection — JSON-Schema-safe), and a payment schema. After the existing `editTransactionSchema` block add:

```ts
const editLoanSchema = z.object({
  id: z.string().min(1, "Missing record id"),
  type: z.enum(LOAN_TYPE_KEYS),
  name: z.string().trim().max(60).optional(),
  totalLoan: z.number().min(0),
  paidAmount: z.number().min(0),
  emiAmount: z.number().min(0),
  startDate: z.string().min(1).describe("YYYY-MM-DD"),
});

const loanPaymentSchema = z.object({
  loanId: z.string().min(1, "Missing loan id"),
  amount: z.number().positive(),
});
```

Add the import: `import { LOAN_TYPE_KEYS } from "@/lib/loan-types";`. (`saveLoanSchema` is already imported.)

(c) `ACTION_SCHEMAS`: remove `set_loan`; add the loan kinds (`add_loan` reuses `saveLoanSchema`):

```ts
  record_loan_payment: loanPaymentSchema,
  add_loan: saveLoanSchema,
  edit_loan: editLoanSchema,
  delete_loan: idSchema,
```

(d) `summarizeAction`: replace the `set_loan` case and update `record_loan_payment`:

```ts
    case "record_loan_payment":
      return `Record a loan payment of ${rupees(input.amount)}`;
    case "add_loan":
      return `Add loan — ${input.name || input.type} · total ${rupees(input.totalLoan)}, EMI ${rupees(input.emiAmount)}`;
    case "edit_loan":
      return `Update loan — ${input.name || input.type} · total ${rupees(input.totalLoan)}, EMI ${rupees(input.emiAmount)}`;
    case "delete_loan":
      return `Delete this loan`;
```

(e) `isLargeAmount`: already treats `delete_transaction` as large — also treat `delete_loan` as large, and the amount fallback already covers `totalLoan`/`amount`. Update the delete check:

```ts
  if (kind === "delete_transaction" || kind === "delete_loan") return true;
```

- [ ] **Step 4: Run the kinds test; verify pass**

Run: `npx vitest run src/lib/ai/action-kinds.test.ts`
Expected: PASS (incl. the existing "every tool schema converts to a root object" regression — `editLoanSchema` is a flat object, `add_loan` uses `saveLoanSchema` which now has a string date, so both serialize cleanly).

- [ ] **Step 5: Update the inverse test**

In `src/lib/ai/action-inverse.test.ts` replace the loan cases with:

```ts
const loanSnap = { type: "vehicle" as const, name: "Car", totalLoan: 100000, paidAmount: 20000, emiAmount: 5000, startDate: "2026-01-01" };
it("add_loan → delete created id", () => {
  expect(computeInverse("add_loan", { input: {}, createdId: "L1" })).toEqual({ op: "delete_loan_doc", id: "L1" });
});
it("edit_loan → restore prior snapshot", () => {
  expect(computeInverse("edit_loan", { input: { id: "L1" }, before: { loan: loanSnap } })).toEqual({ op: "update_loan", id: "L1", doc: loanSnap });
});
it("delete_loan → recreate snapshot", () => {
  expect(computeInverse("delete_loan", { input: { id: "L1" }, before: { loan: loanSnap } })).toEqual({ op: "create_loan", doc: loanSnap });
});
it("record_loan_payment → restore that loan's paidAmount", () => {
  expect(computeInverse("record_loan_payment", { input: { loanId: "L1", amount: 1000 }, before: { loanPaid: 4000 } })).toEqual({ op: "set_loan_paid", id: "L1", paidAmount: 4000 });
});
```

(Remove the old `set loan → restore prior loan doc` test that referenced `set_loan_doc`.)

- [ ] **Step 6: Update `src/lib/ai/action-inverse.ts`**

(a) `LoanSnapshot` gains `type` + `name`:

```ts
export type LoanSnapshot = {
  type: string; name?: string | null; totalLoan: number; paidAmount: number; emiAmount: number; startDate: string | null;
};
```

(b) `AiActionInverse` union — replace the two old loan ops (`set_loan_paid` without id, `set_loan_doc`) with:

```ts
  | { op: "set_loan_paid"; id: string; paidAmount: number }
  | { op: "create_loan"; doc: LoanSnapshot }
  | { op: "update_loan"; id: string; doc: LoanSnapshot }
  | { op: "delete_loan_doc"; id: string }
```

(c) `InverseContext.before` — `loan` already exists as `LoanSnapshot | null`; keep `loanPaid?: number`. No structural change beyond the snapshot type.

(d) `computeInverse` switch — replace the `set_loan` case and update `record_loan_payment`:

```ts
    case "record_loan_payment":
      return { op: "set_loan_paid", id: ctx.input.loanId, paidAmount: ctx.before!.loanPaid! };
    case "add_loan":
      return { op: "delete_loan_doc", id: ctx.createdId! };
    case "edit_loan":
      return { op: "update_loan", id: ctx.input.id, doc: ctx.before!.loan! };
    case "delete_loan":
      return { op: "create_loan", doc: ctx.before!.loan! };
```

- [ ] **Step 7: Run both pure tests; verify pass**

Run: `npx vitest run src/lib/ai/action-kinds.test.ts src/lib/ai/action-inverse.test.ts`
Expected: PASS.

- [ ] **Step 8: Lint + commit**

Run: `npx eslint src/lib/ai/action-kinds.ts src/lib/ai/action-inverse.ts src/lib/ai/action-kinds.test.ts src/lib/ai/action-inverse.test.ts`
Expected: exit 0.

```
git add src/lib/ai/action-kinds.ts src/lib/ai/action-inverse.ts src/lib/ai/action-kinds.test.ts src/lib/ai/action-inverse.test.ts
git commit -m "feat(ai-actions): loan kinds add/edit/delete + payment-by-id (TDD)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Gateway, tools, prompt, read tool — wire the loan kinds

**Files:**
- Modify: `src/lib/ai/action-gateway.ts`
- Modify: `src/lib/ai/action-tools.ts`
- Modify: `src/lib/ai/system-prompt.ts`
- Modify: `src/lib/ai/tools.ts`

**Interfaces:**
- Consumes: `createLoan`, `updateLoan`, `deleteLoan`, `recordLoanPayment` from `@/lib/actions/loan`; `getLoans` from `@/services/loan`.

This is the task that **clears the expected `tsc` errors** from Stage 3.

- [ ] **Step 1: `src/lib/ai/action-gateway.ts` — imports**

Replace the loan-action import:
```ts
import { createLoan, updateLoan, deleteLoan, recordLoanPayment } from "@/lib/actions/loan";
```
Add a loan snapshot helper next to `txnSnapshot`:
```ts
function loanSnapshot(d: any): LoanSnapshot {
  return {
    type: d.type ?? "other",
    name: d.name ?? null,
    totalLoan: d.totalLoan,
    paidAmount: d.paidAmount,
    emiAmount: d.emiAmount,
    startDate: d.startDate ? new Date(d.startDate).toISOString().slice(0, 10) : null,
  };
}
```
Add `LoanSnapshot` to the `action-inverse` type import. Mark the `d: any` param with the scoped eslint-disable as done for `txnSnapshot`.

- [ ] **Step 2: `action-gateway.ts` — replace the `set_loan` case + `record_loan_payment` case in `applyAiAction`**

```ts
    case "record_loan_payment": {
      const prev = await Loan.findOne({ _id: input.loanId, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Loan not found" };
      ctx.before!.loanPaid = prev.paidAmount;
      const res = await recordLoanPayment(input.loanId, input.amount);
      if (!res.ok) return res;
      break;
    }
    case "add_loan": {
      const res = await createLoan(input);
      if (!res.ok) return res;
      ctx.createdId = res.id;
      break;
    }
    case "edit_loan": {
      const prev = await Loan.findOne({ _id: input.id, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Loan not found" };
      ctx.before!.loan = loanSnapshot(prev);
      const { id, ...fields } = input;
      const res = await updateLoan(id, fields);
      if (!res.ok) return res;
      break;
    }
    case "delete_loan": {
      const prev = await Loan.findOne({ _id: input.id, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Loan not found" };
      ctx.before!.loan = loanSnapshot(prev);
      const res = await deleteLoan(input.id);
      if (!res.ok) return res;
      break;
    }
```

- [ ] **Step 3: `action-gateway.ts` — replace the loan ops in `applyInverse`**

Replace the old `set_loan_paid` / `set_loan_doc` cases with:

```ts
    case "set_loan_paid":
      await Loan.updateOne({ _id: inverse.id, userId: user.id }, { $set: { paidAmount: inverse.paidAmount } });
      break;
    case "create_loan":
      await Loan.create({
        userId: user.id,
        type: inverse.doc.type,
        name: inverse.doc.name ?? null,
        totalLoan: inverse.doc.totalLoan,
        paidAmount: inverse.doc.paidAmount,
        emiAmount: inverse.doc.emiAmount,
        startDate: inverse.doc.startDate ? new Date(inverse.doc.startDate) : null,
      });
      break;
    case "update_loan":
      await Loan.updateOne(
        { _id: inverse.id, userId: user.id },
        { $set: {
            type: inverse.doc.type, name: inverse.doc.name ?? null,
            totalLoan: inverse.doc.totalLoan, paidAmount: inverse.doc.paidAmount, emiAmount: inverse.doc.emiAmount,
            startDate: inverse.doc.startDate ? new Date(inverse.doc.startDate) : null,
          } },
      );
      break;
    case "delete_loan_doc":
      await Loan.deleteOne({ _id: inverse.id, userId: user.id });
      break;
```

- [ ] **Step 4: `src/lib/ai/action-tools.ts` — replace `set_loan`, update `record_loan_payment`**

Remove the `set_loan` tool; add:

```ts
  record_loan_payment: tool({
    description: "Record a payment to a specific loan. First find the loan with get_loans and pass its exact loanId.",
    inputSchema: ACTION_SCHEMAS.record_loan_payment,
    needsApproval: true,
    execute: async (input) => confirmAiAction("record_loan_payment", input),
  }),
  add_loan: tool({
    description: "Add a new loan (type, optional name, total, paid, EMI, startDate YYYY-MM-DD). Paid cannot exceed total.",
    inputSchema: ACTION_SCHEMAS.add_loan,
    needsApproval: true,
    execute: async (input) => confirmAiAction("add_loan", input),
  }),
  edit_loan: tool({
    description: "Edit an existing loan. First find it with get_loans and pass its exact id plus the full updated fields.",
    inputSchema: ACTION_SCHEMAS.edit_loan,
    needsApproval: true,
    execute: async (input) => confirmAiAction("edit_loan", input),
  }),
  delete_loan: tool({
    description: "Delete a loan by its exact id (look it up with get_loans first).",
    inputSchema: ACTION_SCHEMAS.delete_loan,
    needsApproval: true,
    execute: async (input) => confirmAiAction("delete_loan", input),
  }),
```

- [ ] **Step 5: `src/lib/ai/tools.ts` — read tool returns the list**

Replace the `getLoan` import with `getLoans` and update the `get_loans` tool:
```ts
import { getLoans } from "@/services/loan";
// ...
  get_loans: tool({
    description: "All of the user's loans (each with type, name, totals, EMI, progress) plus an aggregate summary.",
    inputSchema: z.object({}),
    execute: async () => getLoans(),
  }),
```

- [ ] **Step 6: `src/lib/ai/system-prompt.ts` — loan guidance**

In the `actionsEnabled` block, the existing line about looking up ids for edit/delete already covers transactions; append a loan-specific note as a new pushed line:
```ts
      "Users can have MULTIPLE loans. For loan edits, deletes, or payments, first call get_loans and use the exact loan id; if several loans could match, ask which one.",
```

- [ ] **Step 7: Card rendering — confirm the confirm-card prefix filter still matches**

The confirm card in `assistant-view.tsx` filters write tools by name prefix (`add_`, `edit_`, `delete_`, `set_`, `contribute_`, `record_`). `add_loan`/`edit_loan`/`delete_loan`/`record_loan_payment` all match — no change needed. Verify by reading the filter; do not edit unless a prefix is missing.

- [ ] **Step 8: FULL build gate (clears the refactor)**

Run: `npx tsc --noEmit && npx eslint src && npx vitest run && npx next build`
Expected: ALL green, "Compiled successfully". (This is the first full gate since Stage 3 — `loan-form`, `loan-view`, `action-gateway`, `action-tools` now all reference the new APIs.) If `getLoan` (old) is now unused anywhere, leave it — Stage 6 removes it.

- [ ] **Step 9: Commit**

```
git add src/lib/ai/action-gateway.ts src/lib/ai/action-tools.ts src/lib/ai/system-prompt.ts src/lib/ai/tools.ts
git commit -m "feat(ai-actions): wire loan add/edit/delete/pay + get_loans list" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Stage 6 — Analytics + health score

### Task 13: Analytics uses the aggregate; remove old `getLoan`

**Files:**
- Modify: `src/app/(app)/analytics/page.tsx`
- Modify: `src/components/analytics/analytics-view.tsx`
- Modify: `src/services/loan.ts` (remove now-unused `getLoan` + `LoanDTO`)

- [ ] **Step 1: `analytics/page.tsx` — switch to `getLoans`**

Replace `import { getLoan } from "@/services/loan";` with `import { getLoans } from "@/services/loan";`, and:
```ts
  const [data, budget, loanData] = await Promise.all([getAnalytics(month), getBudget(month), getLoans()]);
  // ...
  const health = financialHealthScore({
    savingsRate,
    budgetAdherence,
    loanProgress: loanData.summary.overallPct,
    hasLoan: loanData.summary.count > 0,
  });
  return <AnalyticsView data={data} month={month} health={health} loan={loanData} />;
```

- [ ] **Step 2: `analytics-view.tsx` — aggregate loan tab**

Change the prop type and the loan tab. Replace `import type { LoanDTO } from "@/services/loan";` with `import type { getLoans } from "@/services/loan";` and the prop:
```ts
  loan,
}: {
  // ...
  loan: Awaited<ReturnType<typeof getLoans>>;
}) {
```
Replace the loan-tab body (`{tab === "loan" && (...)}`) so it reads the summary:
```tsx
      {tab === "loan" && (
        <Card className="flex flex-col items-center gap-4 py-8">
          <h2 className="self-start font-semibold">Loan Repayment</h2>
          {loan.summary.count > 0 ? (
            <>
              <RingStat
                pct={loan.summary.overallPct}
                color={LOAN_COLOR}
                caption="of all loans repaid"
                sub={<>{formatCurrency(loan.summary.totalPaid)} of {formatCurrency(loan.summary.totalBorrowed)}</>}
              />
              <Link href="/loan">
                <Button variant="outline">View loan details</Button>
              </Link>
            </>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">No loans set up yet.</p>
          )}
        </Card>
      )}
```

- [ ] **Step 3: `src/services/loan.ts` — remove the dead single-loan API**

Delete the old `getLoan` function and the `LoanDTO` type (now unused — verify with `git grep "getLoan\b"` and `git grep "LoanDTO"` returning only `getLoans`/`LoanItemDTO`). Keep `getLoans`, `LoanItemDTO`, and the imports they need.

- [ ] **Step 4: Build gate**

Run: `npx tsc --noEmit && npx eslint "src/app/(app)/analytics/page.tsx" src/components/analytics/analytics-view.tsx src/services/loan.ts && npx next build`
Expected: all green. If `tsc` flags a lingering `getLoan` reference, fix that consumer (there should be none after Stage 5).

- [ ] **Step 5: Commit**

```
git add "src/app/(app)/analytics/page.tsx" src/components/analytics/analytics-view.tsx src/services/loan.ts
git commit -m "feat(loan): analytics + health score use the loan aggregate; drop single-loan getLoan" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# Stage 7 — Whole-feature verification

### Task 14: Full verification + manual smoke

- [ ] **Step 1: Full suite + build**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src && npx next build`
Expected: all green; "Compiled successfully". New loan/summary/kinds/inverse tests pass; the "every tool schema converts" regression passes (the 10 kinds all serialize).

- [ ] **Step 2: Manual smoke (dev)**

After running the migration (`node scripts/migrate-multi-loan.mjs`) and `npm run dev`, verify on `/loan`:
- Empty state → "Add loan details" opens the form (type select + name).
- Add two loans of different types → both appear as cards; the summary shows outstanding, total EMI, count, overall ring.
- Record a payment on one → its ring/paid updates; over-payment clamps to total.
- Edit a loan (change type/name/amounts), delete a loan (confirm dialog + toast).
- `/analytics` loan tab shows the overall aggregate ring.
- FuFi's AI: "add a ₹2,00,000 home loan, ₹10,000 EMI" → confirm card → Confirm → appears on /loan; "pay ₹5,000 to my car loan" → AI looks it up via get_loans → confirm card → payment recorded; Undo works from chat.
- Settings → AI activity lists the loan changes.

- [ ] **Step 3: Final review + finish the branch**

Use **superpowers:finishing-a-development-branch**.

---

## Self-review

**Spec coverage:**
- Data model many-docs + type/name + drop unique → Tasks 2, 3. ✓
- Loan types catalog → Task 1. ✓
- `getLoans` + `loanSummary` → Tasks 4, 5. ✓
- Validation type/name → Task 6. ✓
- Per-loan actions (create/update/delete/pay-by-id) → Task 7. ✓
- UI (summary + list + card + form) → Tasks 8, 9, 10. ✓
- AI full parity (add/edit/delete loan + payment-by-id; gateway/inverse/tools/prompt/read) → Tasks 11, 12. ✓
- Analytics + health-score aggregate → Task 13. ✓
- Dashboard untouched (salary-allocation stat) → no task needed (explicitly out). ✓
- Tests (loanSummary, validation, AI kinds/inverse, regression) → Tasks 4, 6, 11; full suite Task 14. ✓

**Type consistency:** `LoanItemDTO` (service) flows to `LoanCard`/`LoanView`; `getLoans` return type is the single source for the page/analytics props. AI `record_loan_payment` input `{ loanId, amount }` → gateway reads `input.loanId`, calls `recordLoanPayment(input.loanId, input.amount)` (action signature `(id, amount)`). `edit_loan` input `{ id, ...fields }` → gateway destructures and calls `updateLoan(id, fields)`. `LoanSnapshot` (with type/name) is produced by `loanSnapshot()` and consumed by `create_loan`/`update_loan` inverse ops. `ACTION_KINDS` = 10, matches `ACTION_SCHEMAS` keys.

**Placeholder scan:** none — every step has complete code or an exact command. The two `d: any` snapshot params reuse the existing scoped-eslint-disable pattern.

**Known intermediate-build note:** Stage 3 → Stage 5 leaves `tsc` red by design (documented); first full gate is Task 12 Step 8, final gate Task 14.
