# Phase 3 — Savings & Loan Trackers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add manual Savings and Loan goal trackers (progress ring, computed stats, quick actions, edit forms) plus two dashboard summary cards.

**Architecture:** Two singleton Mongoose models (one doc per user, find-or-create with zeros like `Settings`). Pure stats functions (`tracker-math.ts`) are TDD'd. Server Components read via services; Server Actions mutate and `revalidatePath`. UI reuses the existing `Dialog`/`Button`/`Card` primitives + RHF + Zod, with a new framer-motion `ProgressRing`. Completion *dates* are derived in the view from `month.ts` helpers so the math stays pure/deterministic.

**Tech Stack:** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Mongoose, Tailwind v4, framer-motion, react-hook-form, @hookform/resolvers, zod, vitest. **No new dependencies.**

**Conventions to follow (verified against the codebase):**
- Models: `(models.X as Model<XDoc>) ?? model<XDoc>("X", schema)` hot-reload guard; `{ timestamps: true }`; `InferSchemaType`.
- Singleton find-or-create: `findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true })` (see `src/lib/user.ts`).
- Services return serializable DTOs only (numbers, `String(_id)`, `.toISOString()`, `x ?? null`); use `await connectDB()` then `const { user } = await getCurrentUser()`.
- Actions: `"use server"`, `safeParse` → `{ ok:false, error }`, scope by `userId`, `revalidatePath`, return `Result`.
- Forms: `"use client"`, `useForm` + `zodResolver`, `register(..., { valueAsNumber: true })` for numbers, `disabled={isSubmitting}`, inline `text-negative` errors, `serverError` state, `onDone()` on success.
- Field input class (copy verbatim): `"w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"`.
- `force-dynamic` on pages that read the DB.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/models/Savings.ts` | Savings singleton schema/model |
| `src/models/Loan.ts` | Loan singleton schema/model |
| `src/lib/tracker-math.ts` (+`.test.ts`) | Pure `savingsStats` / `loanStats` |
| `src/validations/tracker.ts` (+`.test.ts`) | Zod schemas + inferred input types |
| `src/services/savings.ts` | `getSavings()` → `SavingsDTO` |
| `src/services/loan.ts` | `getLoan()` → `LoanDTO` |
| `src/lib/actions/savings.ts` | `saveSavings`, `addToSavings` |
| `src/lib/actions/loan.ts` | `saveLoan`, `recordLoanPayment` |
| `src/components/ui/progress-ring.tsx` | Reusable animated SVG ring |
| `src/components/trackers/field.tsx` | Labeled-input wrapper (shared by forms) |
| `src/components/trackers/stat-tile.tsx` | Icon + label + value tile (shared by views) |
| `src/components/trackers/amount-form.tsx` | Quick single-amount form (shared by both quick actions) |
| `src/components/savings/savings-form.tsx` | Edit savings goal (RHF) |
| `src/components/savings/savings-view.tsx` | Savings page client UI |
| `src/components/loan/loan-form.tsx` | Edit loan (RHF) |
| `src/components/loan/loan-view.tsx` | Loan page client UI |
| `src/components/dashboard/savings-card.tsx` | Dashboard savings summary card |
| `src/components/dashboard/loan-card.tsx` | Dashboard loan summary card |
| `src/app/(app)/savings/page.tsx` | Savings page (server, replaces placeholder) |
| `src/app/(app)/loan/page.tsx` | Loan page (server, replaces placeholder) |
| `src/app/(app)/page.tsx` | MODIFY: fetch + render the two cards |

---

## Task 1: Data models (Savings + Loan singletons)

**Files:**
- Create: `src/models/Savings.ts`
- Create: `src/models/Loan.ts`

- [ ] **Step 1: Create `src/models/Savings.ts`**

```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const savingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    currentAmount: { type: Number, required: true, default: 0, min: 0 },
    targetAmount: { type: Number, required: true, default: 0, min: 0 },
    monthlyContribution: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type SavingsDoc = InferSchemaType<typeof savingsSchema>;

export const Savings: Model<SavingsDoc> =
  (models.Savings as Model<SavingsDoc>) ?? model<SavingsDoc>("Savings", savingsSchema);
```

- [ ] **Step 2: Create `src/models/Loan.ts`**

```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const loanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    totalLoan: { type: Number, required: true, default: 0, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    emiAmount: { type: Number, required: true, default: 0, min: 0 },
    startDate: { type: Date },
  },
  { timestamps: true },
);

export type LoanDoc = InferSchemaType<typeof loanSchema>;

export const Loan: Model<LoanDoc> =
  (models.Loan as Model<LoanDoc>) ?? model<LoanDoc>("Loan", loanSchema);
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/models/Savings.ts src/models/Loan.ts
git commit -m "feat: add Savings and Loan singleton models"
```

---

## Task 2: Pure stats — `tracker-math.ts` (TDD)

**Files:**
- Create: `src/lib/tracker-math.ts`
- Test: `src/lib/tracker-math.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/tracker-math.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { savingsStats, loanStats } from "./tracker-math";

describe("savingsStats", () => {
  it("computes pct, remaining, monthsToGoal and milestones", () => {
    const s = savingsStats(65000, 100000, 10000);
    expect(s.pct).toBe(65);
    expect(s.remaining).toBe(35000);
    expect(s.monthsToGoal).toBe(4); // ceil(35000 / 10000)
    expect(s.reached).toBe(false);
    expect(s.milestones).toEqual([
      { value: 25, reached: true },
      { value: 50, reached: true },
      { value: 75, reached: false },
      { value: 100, reached: false },
    ]);
  });

  it("treats target 0 as not-set-up (zeros, no months, no milestones reached)", () => {
    const s = savingsStats(0, 0, 0);
    expect(s.pct).toBe(0);
    expect(s.remaining).toBe(0);
    expect(s.monthsToGoal).toBeNull();
    expect(s.reached).toBe(false);
    expect(s.milestones.every((m) => !m.reached)).toBe(true);
  });

  it("caps pct at 100 and marks reached when current >= target", () => {
    const s = savingsStats(120000, 100000, 5000);
    expect(s.pct).toBe(100);
    expect(s.remaining).toBe(0);
    expect(s.monthsToGoal).toBeNull();
    expect(s.reached).toBe(true);
    expect(s.milestones.every((m) => m.reached)).toBe(true);
  });

  it("returns null monthsToGoal when there is no monthly contribution", () => {
    expect(savingsStats(50000, 100000, 0).monthsToGoal).toBeNull();
  });
});

describe("loanStats", () => {
  it("computes pct, remaining and monthsLeft", () => {
    const l = loanStats(500000, 100000, 25000);
    expect(l.pct).toBe(20);
    expect(l.remaining).toBe(400000);
    expect(l.monthsLeft).toBe(16); // ceil(400000 / 25000)
    expect(l.paidOff).toBe(false);
  });

  it("treats total 0 as not-set-up", () => {
    const l = loanStats(0, 0, 0);
    expect(l.pct).toBe(0);
    expect(l.remaining).toBe(0);
    expect(l.monthsLeft).toBeNull();
    expect(l.paidOff).toBe(false);
  });

  it("caps pct at 100 and marks paidOff when paid >= total", () => {
    const l = loanStats(500000, 500000, 25000);
    expect(l.pct).toBe(100);
    expect(l.remaining).toBe(0);
    expect(l.monthsLeft).toBeNull();
    expect(l.paidOff).toBe(true);
  });

  it("returns null monthsLeft when there is no EMI", () => {
    expect(loanStats(500000, 0, 0).monthsLeft).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/tracker-math.test.ts`
Expected: FAIL — `savingsStats`/`loanStats` are not exported (module not found / not a function).

- [ ] **Step 3: Implement `src/lib/tracker-math.ts`**

```ts
export type Milestone = { value: 25 | 50 | 75 | 100; reached: boolean };

const MILESTONE_VALUES = [25, 50, 75, 100] as const;

/** Clamp a percentage into [0, 100], treating non-finite/negative as 0. */
function clampPct(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

export type SavingsStats = {
  pct: number; // clamped 0–100
  remaining: number; // max(0, target − current)
  monthsToGoal: number | null; // ceil(remaining / monthly) when both positive, else null
  reached: boolean; // target > 0 && current >= target
  milestones: Milestone[];
};

export function savingsStats(current: number, target: number, monthly: number): SavingsStats {
  const pct = target > 0 ? clampPct((current / target) * 100) : 0;
  const remaining = Math.max(0, target - current);
  const monthsToGoal = monthly > 0 && remaining > 0 ? Math.ceil(remaining / monthly) : null;
  const reached = target > 0 && current >= target;
  const milestones: Milestone[] = MILESTONE_VALUES.map((value) => ({ value, reached: pct >= value }));
  return { pct, remaining, monthsToGoal, reached, milestones };
}

export type LoanStats = {
  pct: number; // clamped 0–100
  remaining: number; // max(0, total − paid)
  monthsLeft: number | null; // ceil(remaining / emi) when both positive, else null
  paidOff: boolean; // total > 0 && paid >= total
};

export function loanStats(total: number, paid: number, emi: number): LoanStats {
  const pct = total > 0 ? clampPct((paid / total) * 100) : 0;
  const remaining = Math.max(0, total - paid);
  const monthsLeft = emi > 0 && remaining > 0 ? Math.ceil(remaining / emi) : null;
  const paidOff = total > 0 && paid >= total;
  return { pct, remaining, monthsLeft, paidOff };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/tracker-math.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tracker-math.ts src/lib/tracker-math.test.ts
git commit -m "feat: add tracker-math (savings/loan stats) with tests"
```

---

## Task 3: Validation schemas — `validations/tracker.ts` (TDD)

**Files:**
- Create: `src/validations/tracker.ts`
- Test: `src/validations/tracker.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/validations/tracker.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { saveSavingsSchema, saveLoanSchema, quickAmountSchema } from "./tracker";

describe("saveSavingsSchema", () => {
  it("accepts non-negative amounts", () => {
    expect(
      saveSavingsSchema.safeParse({ targetAmount: 100000, currentAmount: 5000, monthlyContribution: 2000 }).success,
    ).toBe(true);
  });
  it("rejects negative amounts", () => {
    expect(
      saveSavingsSchema.safeParse({ targetAmount: -1, currentAmount: 0, monthlyContribution: 0 }).success,
    ).toBe(false);
  });
});

describe("saveLoanSchema", () => {
  const base = { totalLoan: 500000, paidAmount: 100000, emiAmount: 25000, startDate: "2026-01-15" };
  it("accepts a valid loan", () => {
    expect(saveLoanSchema.safeParse(base).success).toBe(true);
  });
  it("rejects paid greater than total", () => {
    const res = saveLoanSchema.safeParse({ ...base, paidAmount: 600000 });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path).toContain("paidAmount");
  });
  it("rejects an invalid start date", () => {
    expect(saveLoanSchema.safeParse({ ...base, startDate: "not-a-date" }).success).toBe(false);
  });
});

describe("quickAmountSchema", () => {
  it("requires a positive amount", () => {
    expect(quickAmountSchema.safeParse({ amount: 0 }).success).toBe(false);
    expect(quickAmountSchema.safeParse({ amount: 500 }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/validations/tracker.test.ts`
Expected: FAIL — module `./tracker` not found.

- [ ] **Step 3: Implement `src/validations/tracker.ts`**

```ts
import { z } from "zod";

export const saveSavingsSchema = z.object({
  targetAmount: z.number().min(0, "Can't be negative"),
  currentAmount: z.number().min(0, "Can't be negative"),
  monthlyContribution: z.number().min(0, "Can't be negative"),
});

export const saveLoanSchema = z
  .object({
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

export const quickAmountSchema = z.object({
  amount: z.number().positive("Enter an amount greater than 0"),
});

export type SaveSavingsInput = z.infer<typeof saveSavingsSchema>;
export type SaveLoanInput = z.infer<typeof saveLoanSchema>;
export type QuickAmountInput = z.infer<typeof quickAmountSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/validations/tracker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/validations/tracker.ts src/validations/tracker.test.ts
git commit -m "feat: add tracker validation schemas with tests"
```

---

## Task 4: Read services (`getSavings`, `getLoan`)

**Files:**
- Create: `src/services/savings.ts`
- Create: `src/services/loan.ts`

- [ ] **Step 1: Create `src/services/savings.ts`**

```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Savings } from "@/models/Savings";
import { savingsStats, type SavingsStats } from "@/lib/tracker-math";

export type SavingsDTO = {
  currentAmount: number;
  targetAmount: number;
  monthlyContribution: number;
  stats: SavingsStats;
};

export async function getSavings(): Promise<SavingsDTO> {
  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Savings.findOneAndUpdate(
    { userId: user.id },
    { $setOnInsert: { userId: user.id } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  if (!doc) throw new Error("Failed to resolve savings");
  return {
    currentAmount: doc.currentAmount,
    targetAmount: doc.targetAmount,
    monthlyContribution: doc.monthlyContribution,
    stats: savingsStats(doc.currentAmount, doc.targetAmount, doc.monthlyContribution),
  };
}
```

- [ ] **Step 2: Create `src/services/loan.ts`**

```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Loan } from "@/models/Loan";
import { loanStats, type LoanStats } from "@/lib/tracker-math";

export type LoanDTO = {
  totalLoan: number;
  paidAmount: number;
  emiAmount: number;
  startDate: string | null; // ISO, or null when unset
  stats: LoanStats;
};

export async function getLoan(): Promise<LoanDTO> {
  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Loan.findOneAndUpdate(
    { userId: user.id },
    { $setOnInsert: { userId: user.id } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  if (!doc) throw new Error("Failed to resolve loan");
  return {
    totalLoan: doc.totalLoan,
    paidAmount: doc.paidAmount,
    emiAmount: doc.emiAmount,
    startDate: doc.startDate ? new Date(doc.startDate).toISOString() : null,
    stats: loanStats(doc.totalLoan, doc.paidAmount, doc.emiAmount),
  };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/savings.ts src/services/loan.ts
git commit -m "feat: add savings and loan read services"
```

---

## Task 5: Server actions (save + quick-update)

**Files:**
- Create: `src/lib/actions/savings.ts`
- Create: `src/lib/actions/loan.ts`

- [ ] **Step 1: Create `src/lib/actions/savings.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Savings } from "@/models/Savings";
import {
  saveSavingsSchema,
  quickAmountSchema,
  type SaveSavingsInput,
  type QuickAmountInput,
} from "@/validations/tracker";

type Result = { ok: true } | { ok: false; error: string };

export async function saveSavings(input: SaveSavingsInput): Promise<Result> {
  const parsed = saveSavingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const { user } = await getCurrentUser();
  await Savings.updateOne({ userId: user.id }, { $set: parsed.data }, { upsert: true });

  revalidatePath("/savings");
  revalidatePath("/");
  return { ok: true };
}

export async function addToSavings(input: QuickAmountInput): Promise<Result> {
  const parsed = quickAmountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const { user } = await getCurrentUser();
  await Savings.updateOne(
    { userId: user.id },
    { $inc: { currentAmount: parsed.data.amount } },
    { upsert: true },
  );

  revalidatePath("/savings");
  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 2: Create `src/lib/actions/loan.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Loan } from "@/models/Loan";
import {
  saveLoanSchema,
  quickAmountSchema,
  type SaveLoanInput,
  type QuickAmountInput,
} from "@/validations/tracker";

type Result = { ok: true } | { ok: false; error: string };

export async function saveLoan(input: SaveLoanInput): Promise<Result> {
  const parsed = saveLoanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { startDate, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  await Loan.updateOne(
    { userId: user.id },
    { $set: { ...rest, startDate: new Date(startDate) } },
    { upsert: true },
  );

  revalidatePath("/loan");
  revalidatePath("/");
  return { ok: true };
}

export async function recordLoanPayment(input: QuickAmountInput): Promise<Result> {
  const parsed = quickAmountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const { user } = await getCurrentUser();
  const loan = await Loan.findOne({ userId: user.id }).lean();
  const total = loan?.totalLoan ?? 0;
  const paid = loan?.paidAmount ?? 0;
  // Clamp so a payment never pushes paid past the loan total.
  const newPaid = Math.min(total, paid + parsed.data.amount);
  await Loan.updateOne({ userId: user.id }, { $set: { paidAmount: newPaid } }, { upsert: true });

  revalidatePath("/loan");
  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/savings.ts src/lib/actions/loan.ts
git commit -m "feat: add savings and loan server actions"
```

---

## Task 6: `ProgressRing` + shared tracker UI helpers

**Files:**
- Create: `src/components/ui/progress-ring.tsx`
- Create: `src/components/trackers/field.tsx`
- Create: `src/components/trackers/stat-tile.tsx`
- Create: `src/components/trackers/amount-form.tsx`

- [ ] **Step 1: Create `src/components/ui/progress-ring.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProgressRingProps = {
  value: number; // 0–100 (pass stats.pct)
  size?: number;
  strokeWidth?: number;
  color?: string; // CSS color for the progress arc
  children?: ReactNode; // centered content
  className?: string;
};

export function ProgressRing({
  value,
  size = 168,
  strokeWidth = 12,
  color = "currentColor",
  children,
  className,
}: ProgressRingProps) {
  const reduce = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, value));
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/trackers/field.tsx`**

```tsx
import type { ReactNode } from "react";

/** Labeled wrapper for a form input with an inline error line. */
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <p className="mt-1 text-xs text-negative">{error}</p>}
    </label>
  );
}
```

- [ ] **Step 3: Create `src/components/trackers/stat-tile.tsx`**

```tsx
import type { ComponentType } from "react";

/** Compact icon + label + value tile used in the tracker stat rows. */
export function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card-elevated px-3 py-2.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/trackers/amount-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quickAmountSchema, type QuickAmountInput } from "@/validations/tracker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Result = { ok: true } | { ok: false; error: string };

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

/** A one-field (₹ amount) form used by both quick actions. The caller wires `onSubmit`. */
export function AmountForm({
  submitLabel,
  onSubmit,
  onDone,
}: {
  submitLabel: string;
  onSubmit: (amount: number) => Promise<Result>;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuickAmountInput>({
    resolver: zodResolver(quickAmountSchema),
    defaultValues: { amount: 0 },
  });

  async function submit(values: QuickAmountInput) {
    setServerError(null);
    const res = await onSubmit(values.amount);
    if (res.ok) onDone();
    else setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <div>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0.01}
          autoFocus
          {...register("amount", { valueAsNumber: true })}
          placeholder="Amount (₹)"
          className={cn(fieldCls, "tabular-nums")}
        />
        {errors.amount && <p className="mt-1 text-xs text-negative">{errors.amount.message}</p>}
      </div>
      {serverError && <p className="text-sm text-negative">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/progress-ring.tsx src/components/trackers
git commit -m "feat: add ProgressRing and shared tracker UI helpers"
```

---

## Task 7: Savings page (form + view + route)

**Files:**
- Create: `src/components/savings/savings-form.tsx`
- Create: `src/components/savings/savings-view.tsx`
- Modify: `src/app/(app)/savings/page.tsx` (replace placeholder)

- [ ] **Step 1: Create `src/components/savings/savings-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveSavingsSchema, type SaveSavingsInput } from "@/validations/tracker";
import { saveSavings } from "@/lib/actions/savings";
import { Field } from "@/components/trackers/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SavingsDTO } from "@/services/savings";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function SavingsForm({ initial, onDone }: { initial: SavingsDTO; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SaveSavingsInput>({
    resolver: zodResolver(saveSavingsSchema),
    defaultValues: {
      targetAmount: initial.targetAmount,
      currentAmount: initial.currentAmount,
      monthlyContribution: initial.monthlyContribution,
    },
  });

  async function onSubmit(values: SaveSavingsInput) {
    setServerError(null);
    const res = await saveSavings(values);
    if (res.ok) onDone();
    else setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Goal target (₹)" error={errors.targetAmount?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("targetAmount", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Current savings (₹)" error={errors.currentAmount?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("currentAmount", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Monthly contribution (₹)" error={errors.monthlyContribution?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("monthlyContribution", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      {serverError && <p className="text-sm text-negative">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : "Save goal"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/components/savings/savings-view.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Plus, Pencil, Target, CalendarClock, PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatTile } from "@/components/trackers/stat-tile";
import { AmountForm } from "@/components/trackers/amount-form";
import { SavingsForm } from "./savings-form";
import { addToSavings } from "@/lib/actions/savings";
import { formatCurrency } from "@/lib/utils";
import type { SavingsDTO } from "@/services/savings";

const ACCENT = "#14b8a6"; // nav teal (src/lib/nav.ts)

export function SavingsView({ data }: { data: SavingsDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { stats } = data;
  const isSetUp = data.targetAmount > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Savings</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> {isSetUp ? "Edit goal" : "Set up"}
        </Button>
      </div>

      {!isSetUp ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <PiggyBank className="h-10 w-10" style={{ color: ACCENT }} />
          <div>
            <p className="font-semibold">Set a savings goal</p>
            <p className="text-sm text-muted-foreground">Track your progress toward a target.</p>
          </div>
          <Button onClick={() => setEditOpen(true)}>Set up savings goal</Button>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-6 py-8">
          <ProgressRing value={stats.pct} color={ACCENT}>
            <span className="text-3xl font-bold tabular-nums">{Math.round(stats.pct)}%</span>
            <span className="mt-1 text-xs text-muted-foreground tabular-nums">
              {formatCurrency(data.currentAmount)} / {formatCurrency(data.targetAmount)}
            </span>
          </ProgressRing>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            <StatTile icon={Target} label="Remaining" value={formatCurrency(stats.remaining)} />
            <StatTile icon={PiggyBank} label="Monthly" value={formatCurrency(data.monthlyContribution)} />
            <StatTile
              icon={CalendarClock}
              label="To goal"
              value={
                stats.reached
                  ? "Reached 🎉"
                  : stats.monthsToGoal != null
                    ? `≈ ${stats.monthsToGoal} mo`
                    : "Set a monthly amount"
              }
            />
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {stats.milestones.map((m) => (
              <span
                key={m.value}
                className="rounded-full px-3 py-1 text-xs font-medium tabular-nums"
                style={
                  m.reached
                    ? { backgroundColor: ACCENT, color: "#fff" }
                    : { backgroundColor: "var(--card-elevated)", color: "var(--muted-foreground)" }
                }
              >
                {m.value}%
              </span>
            ))}
          </div>

          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add to savings
          </Button>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title={isSetUp ? "Edit savings goal" : "Set up savings goal"}>
          <SavingsForm initial={data} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add to savings">
          <AmountForm
            submitLabel="Add to savings"
            onSubmit={(amount) => addToSavings({ amount })}
            onDone={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/app/(app)/savings/page.tsx`**

```tsx
import { SavingsView } from "@/components/savings/savings-view";
import { getSavings } from "@/services/savings";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const data = await getSavings();
  return <SavingsView data={data} />;
}
```

- [ ] **Step 4: Verify it compiles and lints**

Run: `npx tsc --noEmit`
Then: `npm run lint`
Expected: no errors (no `react-hooks/set-state-in-effect` — the ring animates declaratively, no effects).

- [ ] **Step 5: Commit**

```bash
git add src/components/savings "src/app/(app)/savings/page.tsx"
git commit -m "feat: build savings page (ring, stats, milestones, quick add)"
```

---

## Task 8: Loan page (form + view + route)

**Files:**
- Create: `src/components/loan/loan-form.tsx`
- Create: `src/components/loan/loan-view.tsx`
- Modify: `src/app/(app)/loan/page.tsx` (replace placeholder)

- [ ] **Step 1: Create `src/components/loan/loan-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveLoanSchema, type SaveLoanInput } from "@/validations/tracker";
import { saveLoan } from "@/lib/actions/loan";
import { Field } from "@/components/trackers/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LoanDTO } from "@/services/loan";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function LoanForm({ initial, onDone }: { initial: LoanDTO; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SaveLoanInput>({
    resolver: zodResolver(saveLoanSchema),
    defaultValues: {
      totalLoan: initial.totalLoan,
      paidAmount: initial.paidAmount,
      emiAmount: initial.emiAmount,
      startDate: (initial.startDate ?? new Date().toISOString()).slice(0, 10),
    },
  });

  async function onSubmit(values: SaveLoanInput) {
    setServerError(null);
    const res = await saveLoan(values);
    if (res.ok) onDone();
    else setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Total loan (₹)" error={errors.totalLoan?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("totalLoan", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Already paid (₹)" error={errors.paidAmount?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("paidAmount", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Monthly EMI (₹)" error={errors.emiAmount?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("emiAmount", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Start date" error={errors.startDate?.message}>
        <input type="date" {...register("startDate")} className={fieldCls} />
      </Field>
      {serverError && <p className="text-sm text-negative">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : "Save loan"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/components/loan/loan-view.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Plus, Pencil, Wallet, CalendarClock, Landmark, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatTile } from "@/components/trackers/stat-tile";
import { AmountForm } from "@/components/trackers/amount-form";
import { LoanForm } from "./loan-form";
import { recordLoanPayment } from "@/lib/actions/loan";
import { formatCurrency } from "@/lib/utils";
import { currentMonth, addMonths, monthLabel } from "@/lib/month";
import type { LoanDTO } from "@/services/loan";

const ACCENT = "#ec4899"; // nav pink (src/lib/nav.ts)

export function LoanView({ data }: { data: LoanDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const { stats } = data;
  const isSetUp = data.totalLoan > 0;
  const completion =
    stats.monthsLeft != null ? monthLabel(addMonths(currentMonth(), stats.monthsLeft)) : null;
  const startLabel = data.startDate ? monthLabel(data.startDate.slice(0, 7)) : "—";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Loan</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> {isSetUp ? "Edit loan" : "Set up"}
        </Button>
      </div>

      {!isSetUp ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Landmark className="h-10 w-10" style={{ color: ACCENT }} />
          <div>
            <p className="font-semibold">Add your loan details</p>
            <p className="text-sm text-muted-foreground">Track repayment progress and completion.</p>
          </div>
          <Button onClick={() => setEditOpen(true)}>Add loan details</Button>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-6 py-8">
          <ProgressRing value={stats.pct} color={ACCENT}>
            <span className="text-3xl font-bold tabular-nums">{Math.round(stats.pct)}%</span>
            <span className="mt-1 text-xs text-muted-foreground tabular-nums">
              {formatCurrency(data.paidAmount)} / {formatCurrency(data.totalLoan)}
            </span>
          </ProgressRing>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            <StatTile icon={Wallet} label="Remaining" value={formatCurrency(stats.remaining)} />
            <StatTile icon={Landmark} label="EMI" value={formatCurrency(data.emiAmount)} />
            <StatTile
              icon={CalendarClock}
              label="Months left"
              value={
                stats.paidOff
                  ? "Paid off 🎉"
                  : stats.monthsLeft != null
                    ? `${stats.monthsLeft} mo`
                    : "Set an EMI"
              }
            />
          </div>

          <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card-elevated px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Started</span>
              <span className="font-medium">{startLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Done</span>
              <span className="font-medium">{stats.paidOff ? "Complete" : (completion ?? "—")}</span>
            </div>
          </div>

          <Button onClick={() => setPayOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Record payment
          </Button>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title={isSetUp ? "Edit loan" : "Add loan details"}>
          <LoanForm initial={data} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent title="Record EMI payment">
          <AmountForm
            submitLabel="Record payment"
            onSubmit={(amount) => recordLoanPayment({ amount })}
            onDone={() => setPayOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Replace `src/app/(app)/loan/page.tsx`**

```tsx
import { LoanView } from "@/components/loan/loan-view";
import { getLoan } from "@/services/loan";

export const dynamic = "force-dynamic";

export default async function LoanPage() {
  const data = await getLoan();
  return <LoanView data={data} />;
}
```

- [ ] **Step 4: Verify it compiles and lints**

Run: `npx tsc --noEmit`
Then: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/loan "src/app/(app)/loan/page.tsx"
git commit -m "feat: build loan page (ring, stats, timeline, record payment)"
```

---

## Task 9: Dashboard summary cards

**Files:**
- Create: `src/components/dashboard/savings-card.tsx`
- Create: `src/components/dashboard/loan-card.tsx`
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Create `src/components/dashboard/savings-card.tsx`**

```tsx
import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatCurrency } from "@/lib/utils";
import type { SavingsDTO } from "@/services/savings";

const ACCENT = "#14b8a6";

export function SavingsCard({ data }: { data: SavingsDTO }) {
  const isSetUp = data.targetAmount > 0;
  return (
    <Link
      href="/savings"
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
    >
      <ProgressRing value={data.stats.pct} size={72} strokeWidth={7} color={ACCENT}>
        <span className="text-sm font-bold tabular-nums">
          {isSetUp ? `${Math.round(data.stats.pct)}%` : "—"}
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4" style={{ color: ACCENT }} />
          <p className="font-semibold">Savings</p>
        </div>
        {isSetUp ? (
          <>
            <p className="mt-1 truncate text-sm text-muted-foreground tabular-nums">
              {formatCurrency(data.currentAmount)} / {formatCurrency(data.targetAmount)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {data.stats.reached ? "Goal reached 🎉" : `${formatCurrency(data.stats.remaining)} to go`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Set a goal →</p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create `src/components/dashboard/loan-card.tsx`**

```tsx
import Link from "next/link";
import { Landmark } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatCurrency } from "@/lib/utils";
import type { LoanDTO } from "@/services/loan";

const ACCENT = "#ec4899";

export function LoanCard({ data }: { data: LoanDTO }) {
  const isSetUp = data.totalLoan > 0;
  return (
    <Link
      href="/loan"
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
    >
      <ProgressRing value={data.stats.pct} size={72} strokeWidth={7} color={ACCENT}>
        <span className="text-sm font-bold tabular-nums">
          {isSetUp ? `${Math.round(data.stats.pct)}%` : "—"}
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4" style={{ color: ACCENT }} />
          <p className="font-semibold">Loan</p>
        </div>
        {isSetUp ? (
          <>
            <p className="mt-1 truncate text-sm text-muted-foreground tabular-nums">
              {formatCurrency(data.paidAmount)} / {formatCurrency(data.totalLoan)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {data.stats.paidOff ? "Paid off 🎉" : `${formatCurrency(data.stats.remaining)} left`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Add loan →</p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Modify `src/app/(app)/page.tsx`**

Add the imports (top of file, after the existing dashboard imports):

```tsx
import { SavingsCard } from "@/components/dashboard/savings-card";
import { LoanCard } from "@/components/dashboard/loan-card";
import { getSavings } from "@/services/savings";
import { getLoan } from "@/services/loan";
```

After the empty-state early-return, fetch both trackers in parallel:

```tsx
  const summary = await getMonthSummary(month);
  if (!summary) return <DashboardEmptyState month={month} />;

  const [savings, loan] = await Promise.all([getSavings(), getLoan()]);
```

Add the cards row at the end of the returned JSX, just before the closing `</div>` of the `space-y-6` wrapper:

```tsx
      <div className="grid gap-4 lg:grid-cols-2">
        <SavingsCard data={savings} />
        <LoanCard data={loan} />
      </div>
```

The full modified `src/app/(app)/page.tsx` for reference:

```tsx
import { HeroCard } from "@/components/dashboard/hero-card";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { SalaryDistribution } from "@/components/dashboard/salary-distribution";
import { SmartInsights } from "@/components/dashboard/smart-insights";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { SavingsCard } from "@/components/dashboard/savings-card";
import { LoanCard } from "@/components/dashboard/loan-card";
import { getMonthSummary } from "@/services/salary";
import { getSavings } from "@/services/savings";
import { getLoan } from "@/services/loan";
import { currentMonth, isValidMonth } from "@/lib/month";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();

  const summary = await getMonthSummary(month);
  if (!summary) return <DashboardEmptyState month={month} />;

  const [savings, loan] = await Promise.all([getSavings(), getLoan()]);

  return (
    <div className="space-y-6">
      <HeroCard month={month} amount={summary.amount} remaining={summary.stats.remaining} />
      <QuickStats stats={summary.stats} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SalaryDistribution amount={summary.amount} allocations={summary.allocations} />
        <SmartInsights insights={summary.insights} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SavingsCard data={savings} />
        <LoanCard data={loan} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles and lints**

Run: `npx tsc --noEmit`
Then: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/savings-card.tsx src/components/dashboard/loan-card.tsx "src/app/(app)/page.tsx"
git commit -m "feat: add savings and loan summary cards to dashboard"
```

---

## Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all suites pass (existing 42 + the new tracker-math and tracker validation tests).

- [ ] **Step 2: Lint the whole project**

Run: `npm run lint`
Expected: no errors/warnings.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Production build**

Run: `npx next build`
Expected: build succeeds; `/savings` and `/loan` compile (they are `force-dynamic`), `/` builds.

- [ ] **Step 5: Live walkthrough (manual, against Atlas)**

Run: `npm run dev` and verify:
- `/savings` shows the setup state initially → set a goal → ring animates to the % → "Add to savings" bumps the current amount → milestones light up as thresholds pass.
- `/loan` shows setup → add loan details → ring + "months left" + estimated completion month → "Record payment" bumps paid and is clamped at the total (a payment larger than the remaining balance lands exactly at 100%, never over).
- Dashboard (`/`) shows the two cards reflecting the saved values; clicking each navigates to its page.

---

## Self-Review

**1. Spec coverage:**
- §2.1 models → Task 1. §2.2 tracker-math → Task 2. §2.3 validation → Task 3. §2.4 services → Task 4. §2.5 actions → Task 5. §2.6 ProgressRing → Task 6. §2.7 pages/views/forms + shared amount form → Tasks 6–8 (spec's `amount-dialog.tsx` is implemented as `trackers/amount-form.tsx` — the view owns the `Dialog`, matching the Phase 2 `transactions-view` + `transaction-form` split; behaviorally identical). §2.8 dashboard cards → Task 9. §2.10 no new deps → confirmed. DoD items 1–8 → Task 10 + per-task verifies.
- Shared `Field`/`StatTile` helpers (Task 6) were added to keep the two forms/views DRY — not in the spec's file list but consistent with its intent; noted here intentionally.

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step contains complete code.

**3. Type consistency:** `SavingsDTO`/`LoanDTO` (services) ↔ form `initial` props ↔ view `data` props ↔ card `data` props all match. `SavingsStats`/`LoanStats` shapes (`pct`, `remaining`, `monthsToGoal`/`monthsLeft`, `reached`/`paidOff`, `milestones`) are produced in Task 2 and consumed identically in Tasks 7–9. `Result` type is identical across `amount-form.tsx` and both action files. `quickAmountSchema`'s `{ amount }` matches `AmountForm`'s `QuickAmountInput` and the `addToSavings`/`recordLoanPayment` call sites (`{ amount }`). `saveLoanSchema` strips `startDate` (string) → `new Date(startDate)` in the action; `LoanForm` seeds `startDate` from `initial.startDate?.slice(0,10)`.
