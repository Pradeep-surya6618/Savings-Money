# Phase 1 — Salary & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user set a monthly salary, distribute it across 10 preset categories in a full-screen editor, and see it visualized on the dashboard (hero, quick stats, distribution, insights) with a month switcher.

**Architecture:** Server-first. Pure logic (month helpers, stat buckets, insights, validation) lives in dependency-light modules and is unit-tested with Vitest. A Mongoose `Salary` model stores one doc per (user, month) with allocations embedded. Server Components read via `src/services/salary.ts`; a Server Action upserts. UI built from focused dashboard + editor components reusing Phase 0 primitives.

**Tech Stack:** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Tailwind v4, Mongoose, framer-motion (count-up), zod. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-10-phase-1-salary-dashboard-design.md`

**Testing philosophy:** TDD the pure logic (Tasks 1, 4, 5, 6). DB services, the action, and UI are verified with `npx tsc --noEmit` + `npx next build` and the final live walkthrough — RSC/visual tests add little here.

**Conventions for every task:** Work on branch `phase-1-salary-dashboard` (do NOT switch branches). Run tests with `npx vitest run` and typecheck with `npx tsc --noEmit` (avoid `npm` script wrappers — they garble ANSI output on this Windows shell). End every commit message with a blank line then `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/month.ts` (+ `.test.ts`) | Pure `"YYYY-MM"` helpers |
| `src/lib/categories.ts` | Pure category taxonomy (keys, labels, groups) — no icons |
| `src/lib/category-icons.ts` | Maps category key → lucide icon (UI only) |
| `src/models/Salary.ts` | Mongoose model, allocations embedded |
| `src/services/salary-stats.ts` (+ `.test.ts`) | Pure `computeStats`, `generateInsights`, shared types |
| `src/services/salary.ts` | DB reads: `getMonthSummary`, `getSalaryForEditor` |
| `src/validations/salary.ts` (+ `.test.ts`) | Zod save schema |
| `src/lib/actions/salary.ts` | `saveSalaryAllocations` Server Action |
| `src/components/dashboard/*` | hero-card, month-switcher, count-up, stat-card, quick-stats, salary-distribution, smart-insights, empty-state |
| `src/components/salary/*` | remaining-meter, allocation-row, allocation-editor |
| `src/app/(app)/page.tsx` | Dashboard (replaces placeholder) |
| `src/app/(app)/salary/page.tsx` | Full-screen allocation editor |

---

## Task 1: Month helpers (TDD)

**Files:** Create `src/lib/month.ts`, `src/lib/month.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/month.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { currentMonth, isValidMonth, monthLabel, addMonths } from "./month";

describe("month helpers", () => {
  it("currentMonth returns a valid YYYY-MM string", () => {
    expect(isValidMonth(currentMonth())).toBe(true);
  });
  it("isValidMonth validates format", () => {
    expect(isValidMonth("2026-06")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-6")).toBe(false);
    expect(isValidMonth("june")).toBe(false);
  });
  it("monthLabel formats a human label", () => {
    expect(monthLabel("2026-06")).toBe("June 2026");
    expect(monthLabel("2026-01")).toBe("January 2026");
  });
  it("addMonths shifts with year rollover", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-06", 3)).toBe("2026-09");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/month.test.ts`
Expected: FAIL — cannot resolve `./month`.

- [ ] **Step 3: Implement**

Create `src/lib/month.ts`:
```ts
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Current calendar month as "YYYY-MM". */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** True if `month` matches "YYYY-MM" with a 01–12 month. */
export function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/** "2026-06" -> "June 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Shift a "YYYY-MM" by n months (handles year rollover). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/month.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/month.ts src/lib/month.test.ts
git commit -m "feat: add YYYY-MM month helpers"
```

---

## Task 2: Category taxonomy

**Files:** Create `src/lib/categories.ts`, `src/lib/category-icons.ts`

(No unit test — static data. Kept icon-free in `categories.ts` so pure logic/tests don't pull in lucide-react.)

- [ ] **Step 1: Create the pure taxonomy**

Create `src/lib/categories.ts`:
```ts
export type CategoryGroup = "expense" | "savings" | "investment" | "loan";

export const CATEGORIES = [
  { key: "family", label: "Family", group: "expense" },
  { key: "loan", label: "Loan", group: "loan" },
  { key: "food", label: "Food", group: "expense" },
  { key: "recharge", label: "Recharge", group: "expense" },
  { key: "transport", label: "Transport", group: "expense" },
  { key: "shopping", label: "Shopping", group: "expense" },
  { key: "savings", label: "Savings", group: "savings" },
  { key: "investments", label: "Investments", group: "investment" },
  { key: "emergency", label: "Emergency", group: "savings" },
  { key: "misc", label: "Miscellaneous", group: "expense" },
] as const satisfies readonly { key: string; label: string; group: CategoryGroup }[];

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<CategoryKey, (typeof CATEGORIES)[number]>;
```

- [ ] **Step 2: Create the icon map**

Create `src/lib/category-icons.ts`:
```ts
import {
  Bus,
  GraduationCap,
  HeartHandshake,
  MoreHorizontal,
  PiggyBank,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { CategoryKey } from "./categories";

export const CATEGORY_ICONS: Record<CategoryKey, LucideIcon> = {
  family: HeartHandshake,
  loan: GraduationCap,
  food: UtensilsCrossed,
  recharge: Smartphone,
  transport: Bus,
  shopping: ShoppingBag,
  savings: PiggyBank,
  investments: TrendingUp,
  emergency: ShieldCheck,
  misc: MoreHorizontal,
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/lib/categories.ts src/lib/category-icons.ts
git commit -m "feat: add allocation category taxonomy + icons"
```

---

## Task 3: Salary model

**Files:** Create `src/models/Salary.ts`

- [ ] **Step 1: Implement the model**

Create `src/models/Salary.ts`:
```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const allocationSchema = new Schema(
  {
    category: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const salarySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    receivedDate: { type: Date },
    allocations: { type: [allocationSchema], default: [] },
  },
  { timestamps: true },
);

salarySchema.index({ userId: 1, month: 1 }, { unique: true });

export type SalaryDoc = InferSchemaType<typeof salarySchema>;

export const Salary: Model<SalaryDoc> =
  (models.Salary as Model<SalaryDoc>) ?? model<SalaryDoc>("Salary", salarySchema);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/models/Salary.ts
git commit -m "feat: add Salary model with embedded allocations"
```

---

## Task 4: Stat computation (TDD)

**Files:** Create `src/services/salary-stats.ts`, `src/services/salary-stats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/salary-stats.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeStats } from "./salary-stats";

const allocations = [
  { category: "family", amount: 10000 },      // expense
  { category: "loan", amount: 8000 },          // loan
  { category: "food", amount: 5000 },          // expense
  { category: "savings", amount: 8000 },       // savings
  { category: "investments", amount: 2000 },   // investment
  { category: "emergency", amount: 3000 },     // savings
];

describe("computeStats", () => {
  it("buckets allocations by category group", () => {
    const s = computeStats(40000, allocations);
    expect(s.expenses).toBe(15000); // family + food
    expect(s.savings).toBe(11000); // savings + emergency
    expect(s.investments).toBe(2000);
    expect(s.loan).toBe(8000);
    expect(s.allocated).toBe(36000);
    expect(s.remaining).toBe(4000);
  });
  it("ignores unknown categories but still subtracts nothing extra", () => {
    const s = computeStats(1000, [{ category: "bogus", amount: 500 }]);
    expect(s.allocated).toBe(0);
    expect(s.remaining).toBe(1000);
  });
  it("handles empty allocations", () => {
    const s = computeStats(5000, []);
    expect(s.allocated).toBe(0);
    expect(s.remaining).toBe(5000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/salary-stats.test.ts`
Expected: FAIL — cannot resolve `./salary-stats`.

- [ ] **Step 3: Implement**

Create `src/services/salary-stats.ts`:
```ts
import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";

export type AllocationInput = { category: string; amount: number };

export type MonthStats = {
  expenses: number;
  savings: number;
  investments: number;
  loan: number;
  allocated: number;
  remaining: number;
};

export function computeStats(amount: number, allocations: AllocationInput[]): MonthStats {
  const stats: MonthStats = {
    expenses: 0,
    savings: 0,
    investments: 0,
    loan: 0,
    allocated: 0,
    remaining: 0,
  };
  for (const a of allocations) {
    const cat = CATEGORY_MAP[a.category as CategoryKey];
    if (!cat) continue;
    stats.allocated += a.amount;
    if (cat.group === "expense") stats.expenses += a.amount;
    else if (cat.group === "savings") stats.savings += a.amount;
    else if (cat.group === "investment") stats.investments += a.amount;
    else if (cat.group === "loan") stats.loan += a.amount;
  }
  stats.remaining = amount - stats.allocated;
  return stats;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/salary-stats.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/salary-stats.ts src/services/salary-stats.test.ts
git commit -m "feat: add salary stat computation"
```

---

## Task 5: Insights generator (TDD)

**Files:** Modify `src/services/salary-stats.ts`, `src/services/salary-stats.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/services/salary-stats.test.ts`:
```ts
import { generateInsights } from "./salary-stats";

const stats = (over: Partial<import("./salary-stats").MonthStats> = {}) => ({
  expenses: 0, savings: 0, investments: 0, loan: 0, allocated: 0, remaining: 0, ...over,
});

describe("generateInsights", () => {
  it("reports unallocated funds", () => {
    const out = generateInsights({ amount: 40000, stats: stats({ allocated: 30000, remaining: 10000 }) });
    expect(out.some((i) => i.id === "unallocated")).toBe(true);
  });
  it("celebrates full allocation", () => {
    const out = generateInsights({ amount: 40000, stats: stats({ allocated: 40000, remaining: 0 }) });
    expect(out.some((i) => i.id === "fully-allocated" && i.tone === "positive")).toBe(true);
  });
  it("reports savings rate", () => {
    const out = generateInsights({ amount: 40000, stats: stats({ savings: 8000, investments: 2000, allocated: 40000, remaining: 0 }) });
    const rate = out.find((i) => i.id === "savings-rate");
    expect(rate?.text).toContain("25%");
  });
  it("compares to the previous month when present", () => {
    const out = generateInsights(
      { amount: 40000, stats: stats({ savings: 12000, allocated: 40000 }) },
      { amount: 40000, stats: stats({ savings: 8000, allocated: 40000 }) },
    );
    expect(out.some((i) => i.id === "vs-last-month")).toBe(true);
  });
  it("caps at 4 insights", () => {
    const out = generateInsights(
      { amount: 40000, stats: stats({ savings: 12000, allocated: 30000, remaining: 10000 }) },
      { amount: 40000, stats: stats({ savings: 8000, allocated: 40000 }) },
    );
    expect(out.length).toBeLessThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/salary-stats.test.ts`
Expected: FAIL — `generateInsights` not exported.

- [ ] **Step 3: Implement**

Append to `src/services/salary-stats.ts`:
```ts
import { formatCurrency } from "@/lib/utils";

export type InsightTone = "positive" | "neutral" | "warning";
export type Insight = { id: string; tone: InsightTone; text: string };

type MonthData = { amount: number; stats: MonthStats };

function savingsRate(d: MonthData): number {
  if (d.amount <= 0) return 0;
  return (d.stats.savings + d.stats.investments) / d.amount;
}

export function generateInsights(current: MonthData, previous?: MonthData | null): Insight[] {
  const insights: Insight[] = [];
  const { amount, stats } = current;

  if (stats.remaining > 0) {
    insights.push({
      id: "unallocated",
      tone: "neutral",
      text: `${formatCurrency(stats.remaining)} still unallocated.`,
    });
  } else if (stats.remaining === 0 && amount > 0) {
    insights.push({
      id: "fully-allocated",
      tone: "positive",
      text: "You've allocated 100% of your salary.",
    });
  }

  if (amount > 0) {
    const rate = Math.round(savingsRate(current) * 100);
    insights.push({
      id: "savings-rate",
      tone: rate >= 20 ? "positive" : "neutral",
      text: `You're putting ${rate}% toward savings & investments.`,
    });
  }

  if (previous && previous.amount > 0 && amount > 0) {
    const diff = Math.round((savingsRate(current) - savingsRate(previous)) * 100);
    if (diff !== 0) {
      insights.push({
        id: "vs-last-month",
        tone: diff > 0 ? "positive" : "warning",
        text: `You saved ${Math.abs(diff)}% ${diff > 0 ? "more" : "less"} than last month.`,
      });
    }
  }

  return insights.slice(0, 4);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/salary-stats.test.ts`
Expected: PASS (3 computeStats + 5 generateInsights).

- [ ] **Step 5: Commit**

```bash
git add src/services/salary-stats.ts src/services/salary-stats.test.ts
git commit -m "feat: add rule-based salary insights"
```

---

## Task 6: Save validation schema (TDD)

**Files:** Create `src/validations/salary.ts`, `src/validations/salary.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/validations/salary.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { saveSalarySchema } from "./salary";

const base = {
  month: "2026-06",
  amount: 40000,
  allocations: [
    { category: "family", amount: 10000 },
    { category: "savings", amount: 8000 },
  ],
};

describe("saveSalarySchema", () => {
  it("accepts a valid payload", () => {
    expect(saveSalarySchema.safeParse(base).success).toBe(true);
  });
  it("rejects an invalid month", () => {
    expect(saveSalarySchema.safeParse({ ...base, month: "2026-13" }).success).toBe(false);
  });
  it("rejects allocations exceeding salary", () => {
    const r = saveSalarySchema.safeParse({ ...base, amount: 15000 });
    expect(r.success).toBe(false);
  });
  it("rejects unknown categories", () => {
    const r = saveSalarySchema.safeParse({ ...base, allocations: [{ category: "bogus", amount: 10 }] });
    expect(r.success).toBe(false);
  });
  it("rejects duplicate categories", () => {
    const r = saveSalarySchema.safeParse({
      ...base,
      allocations: [
        { category: "food", amount: 1000 },
        { category: "food", amount: 1000 },
      ],
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/validations/salary.test.ts`
Expected: FAIL — cannot resolve `./salary`.

- [ ] **Step 3: Implement**

Create `src/validations/salary.ts`:
```ts
import { z } from "zod";
import { CATEGORY_KEYS } from "@/lib/categories";
import { isValidMonth } from "@/lib/month";

export const saveSalarySchema = z
  .object({
    month: z.string().refine(isValidMonth, "Invalid month (expected YYYY-MM)"),
    amount: z.number().min(0, "Salary must be 0 or more"),
    receivedDate: z.coerce.date().optional(),
    allocations: z
      .array(
        z.object({
          category: z.enum(CATEGORY_KEYS),
          amount: z.number().min(0),
        }),
      )
      .default([]),
  })
  .refine((d) => d.allocations.reduce((s, a) => s + a.amount, 0) <= d.amount, {
    message: "Allocations exceed salary",
    path: ["allocations"],
  })
  .refine((d) => new Set(d.allocations.map((a) => a.category)).size === d.allocations.length, {
    message: "Duplicate categories are not allowed",
    path: ["allocations"],
  });

export type SaveSalaryInput = z.infer<typeof saveSalarySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/validations/salary.test.ts`
Expected: PASS, 5 tests.
Note: if zod v4 rejects `z.enum(CATEGORY_KEYS)` typing, change to `z.enum(CATEGORY_KEYS as readonly [string, ...string[]])` — keep behavior identical.

- [ ] **Step 5: Commit**

```bash
git add src/validations/salary.ts src/validations/salary.test.ts
git commit -m "feat: add salary save validation schema"
```

---

## Task 7: DB read service

**Files:** Create `src/services/salary.ts`

(No unit test — DB-backed; verified via the live walkthrough in Task 14.)

- [ ] **Step 1: Implement**

Create `src/services/salary.ts`:
```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary } from "@/models/Salary";
import { addMonths } from "@/lib/month";
import {
  computeStats,
  generateInsights,
  type AllocationInput,
  type Insight,
  type MonthStats,
} from "@/services/salary-stats";

export type MonthSummary = {
  month: string;
  amount: number;
  receivedDate: string | null;
  allocations: AllocationInput[];
  stats: MonthStats;
  insights: Insight[];
};

function toAllocations(raw: { category: string; amount: number }[] | undefined): AllocationInput[] {
  return (raw ?? []).map((a) => ({ category: a.category, amount: a.amount }));
}

export async function getMonthSummary(month: string): Promise<MonthSummary | null> {
  await connectDB();
  const { user } = await getCurrentUser();

  const doc = await Salary.findOne({ userId: user.id, month }).lean();
  if (!doc) return null;

  const allocations = toAllocations(doc.allocations);
  const stats = computeStats(doc.amount, allocations);

  const prevDoc = await Salary.findOne({ userId: user.id, month: addMonths(month, -1) }).lean();
  const previous = prevDoc
    ? { amount: prevDoc.amount, stats: computeStats(prevDoc.amount, toAllocations(prevDoc.allocations)) }
    : null;

  return {
    month,
    amount: doc.amount,
    receivedDate: doc.receivedDate ? new Date(doc.receivedDate).toISOString() : null,
    allocations,
    stats,
    insights: generateInsights({ amount: doc.amount, stats }, previous),
  };
}

export async function getSalaryForEditor(
  month: string,
): Promise<{ amount: number; allocations: AllocationInput[] } | null> {
  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Salary.findOne({ userId: user.id, month }).lean();
  if (!doc) return null;
  return { amount: doc.amount, allocations: toAllocations(doc.allocations) };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (If `.lean()` types make `doc.allocations` `unknown`, the `toAllocations` helper already narrows via its parameter type; no `any` needed.)

- [ ] **Step 3: Commit**

```bash
git add src/services/salary.ts
git commit -m "feat: add salary read service (month summary + editor data)"
```

---

## Task 8: Save Server Action

**Files:** Create `src/lib/actions/salary.ts`

- [ ] **Step 1: Implement**

Create `src/lib/actions/salary.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary } from "@/models/Salary";
import { saveSalarySchema, type SaveSalaryInput } from "@/validations/salary";

export async function saveSalaryAllocations(
  input: SaveSalaryInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = saveSalarySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { month, amount, receivedDate, allocations } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  await Salary.updateOne(
    { userId: user.id, month },
    { $set: { amount, receivedDate: receivedDate ?? null, allocations } },
    { upsert: true },
  );

  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/salary.ts
git commit -m "feat: add saveSalaryAllocations server action"
```

---

## Task 9: CountUp component

**Files:** Create `src/components/dashboard/count-up.tsx`

- [ ] **Step 1: Implement**

Create `src/components/dashboard/count-up.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce) return; // reduced motion: render the final value directly (see `shown`)
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduce]);

  const shown = reduce ? value : display;
  return <span className={className}>{formatCurrency(Math.round(shown))}</span>;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/count-up.tsx
git commit -m "feat: add CountUp animated number"
```

---

## Task 10: Dashboard presentational components

**Files:** Create `src/components/dashboard/{month-switcher,stat-card,quick-stats,salary-distribution,smart-insights,hero-card,empty-state}.tsx`

- [ ] **Step 1: MonthSwitcher (client)**

Create `src/components/dashboard/month-switcher.tsx`:
```tsx
"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, currentMonth, monthLabel } from "@/lib/month";

export function MonthSwitcher({ month }: { month: string }) {
  const atOrAfterCurrent = month >= currentMonth();
  const linkCls =
    "flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25";
  return (
    <div className="flex items-center gap-2 text-white">
      <Link href={`/?month=${addMonths(month, -1)}`} aria-label="Previous month" className={linkCls}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-28 text-center text-xs font-semibold uppercase tracking-wide">
        {monthLabel(month)}
      </span>
      {atOrAfterCurrent ? (
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/30">
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link href={`/?month=${addMonths(month, 1)}`} aria-label="Next month" className={linkCls}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: StatCard + QuickStats (server)**

Create `src/components/dashboard/stat-card.tsx`:
```tsx
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/dashboard/count-up";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "positive" | "investment" | "loan" | "primary";
}) {
  const accentCls = {
    positive: "text-positive",
    investment: "text-primary-end",
    loan: "text-primary",
    primary: "text-foreground",
  }[accent ?? "primary"];
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <CountUp value={value} className={cn("mt-1 block text-lg font-semibold", accentCls)} />
    </Card>
  );
}
```

Create `src/components/dashboard/quick-stats.tsx`:
```tsx
import { StatCard } from "@/components/dashboard/stat-card";
import type { MonthStats } from "@/services/salary-stats";

export function QuickStats({ stats }: { stats: MonthStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Expenses" value={stats.expenses} />
      <StatCard label="Savings" value={stats.savings} accent="positive" />
      <StatCard label="Investments" value={stats.investments} accent="investment" />
      <StatCard label="Loan paid" value={stats.loan} accent="loan" />
      <StatCard label="Remaining" value={stats.remaining} />
    </div>
  );
}
```

- [ ] **Step 3: SalaryDistribution (server)**

Create `src/components/dashboard/salary-distribution.tsx`:
```tsx
import { Card } from "@/components/ui/card";
import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { formatCurrency } from "@/lib/utils";
import type { AllocationInput } from "@/services/salary-stats";

export function SalaryDistribution({
  amount,
  allocations,
}: {
  amount: number;
  allocations: AllocationInput[];
}) {
  const rows = allocations
    .filter((a) => a.amount > 0 && CATEGORY_MAP[a.category as CategoryKey])
    .sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold">Salary distribution</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No allocations yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const cat = CATEGORY_MAP[a.category as CategoryKey];
            const Icon = CATEGORY_ICONS[a.category as CategoryKey];
            const pct = amount > 0 ? Math.round((a.amount / amount) * 100) : 0;
            return (
              <li key={a.category} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-elevated text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{cat.label}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(a.amount)} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-card-elevated">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-end"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: SmartInsights (server)**

Create `src/components/dashboard/smart-insights.tsx`:
```tsx
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Insight } from "@/services/salary-stats";

const TONE: Record<Insight["tone"], string> = {
  positive: "border-positive/30 bg-positive/10 text-positive",
  neutral: "border-border bg-card-elevated text-muted-foreground",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export function SmartInsights({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold">Smart insights</h3>
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add a salary to see insights.</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((i) => (
            <li key={i.id} className={cn("rounded-xl border px-3 py-2 text-xs", TONE[i.tone])}>
              {i.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 5: HeroCard (server)**

Create `src/components/dashboard/hero-card.tsx`:
```tsx
import Link from "next/link";
import { Pencil } from "lucide-react";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { CountUp } from "@/components/dashboard/count-up";
import { formatCurrency } from "@/lib/utils";

export function HeroCard({
  month,
  amount,
  remaining,
}: {
  month: string;
  amount: number;
  remaining: number;
}) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-primary to-primary-end p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <MonthSwitcher month={month} />
        <Link
          href={`/salary?month=${month}`}
          className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/25"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
      </div>
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-white/80">Remaining balance</p>
        <CountUp value={remaining} className="mt-1 block text-4xl font-bold tracking-tight" />
        <p className="mt-1 text-sm text-white/80">of {formatCurrency(amount)} monthly salary</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: DashboardEmptyState**

Create `src/components/dashboard/empty-state.tsx`:
```tsx
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { monthLabel } from "@/lib/month";

export function DashboardEmptyState({ month }: { month: string }) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-primary to-primary-end p-6 text-white shadow-lg">
        <MonthSwitcher month={month} />
      </section>
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card-elevated text-muted-foreground">
          <Wallet className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">No salary set for {monthLabel(month)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your salary and allocate it across categories.
          </p>
        </div>
        <Link href={`/salary?month=${month}`}>
          <Button>Set up {monthLabel(month)} →</Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard
git commit -m "feat: add dashboard presentational components"
```

---

## Task 11: Dashboard page

**Files:** Modify `src/app/(app)/page.tsx` (replace placeholder)

- [ ] **Step 1: Implement**

Replace the entire contents of `src/app/(app)/page.tsx` with:
```tsx
import { HeroCard } from "@/components/dashboard/hero-card";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { SalaryDistribution } from "@/components/dashboard/salary-distribution";
import { SmartInsights } from "@/components/dashboard/smart-insights";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { getMonthSummary } from "@/services/salary";
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

  return (
    <div className="space-y-6">
      <HeroCard month={month} amount={summary.amount} remaining={summary.stats.remaining} />
      <QuickStats stats={summary.stats} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SalaryDistribution amount={summary.amount} allocations={summary.allocations} />
        <SmartInsights insights={summary.insights} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/page.tsx"
git commit -m "feat: wire up dashboard page"
```

---

## Task 12: Allocation editor components

**Files:** Create `src/components/salary/{remaining-meter,allocation-row,allocation-editor}.tsx`

- [ ] **Step 1: RemainingMeter (client)**

Create `src/components/salary/remaining-meter.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

export function RemainingMeter({ amount, allocated }: { amount: number; allocated: number }) {
  const remaining = amount - allocated;
  const over = remaining < 0;
  const pct = amount > 0 ? Math.min(100, Math.round((allocated / amount) * 100)) : 0;
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full",
            over ? "bg-gradient-to-r from-negative to-negative" : "bg-gradient-to-r from-primary to-primary-end",
          )}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>
      <p className={cn("mt-2 text-xs", over ? "font-medium text-negative" : "text-white/80")}>
        {over
          ? `⚠ ${formatCurrency(allocated)} allocated · ${formatCurrency(-remaining)} over budget`
          : `${formatCurrency(allocated)} allocated · ${formatCurrency(remaining)} left`}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: AllocationRow (client)**

Create `src/components/salary/allocation-row.tsx`:
```tsx
"use client";

import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { CATEGORY_ICONS } from "@/lib/category-icons";

export function AllocationRow({
  category,
  amount,
  percent,
  onChange,
}: {
  category: CategoryKey;
  amount: number;
  percent: number;
  onChange: (value: number) => void;
}) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card-elevated text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm">{CATEGORY_MAP[category].label}</span>
      <span className="w-10 text-right text-xs text-muted-foreground">{percent}%</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={amount === 0 ? "" : amount}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-24 rounded-lg border border-border bg-card px-2 py-1.5 text-right text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
```

- [ ] **Step 3: AllocationEditor (client)**

Create `src/components/salary/allocation-editor.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { monthLabel } from "@/lib/month";
import { Button } from "@/components/ui/button";
import { RemainingMeter } from "@/components/salary/remaining-meter";
import { AllocationRow } from "@/components/salary/allocation-row";
import { saveSalaryAllocations } from "@/lib/actions/salary";
import { formatCurrency } from "@/lib/utils";

type Amounts = Record<CategoryKey, number>;

function buildAmounts(initial: { category: string; amount: number }[]): Amounts {
  const map = Object.fromEntries(CATEGORIES.map((c) => [c.key, 0])) as Amounts;
  for (const a of initial) {
    if (a.category in map) map[a.category as CategoryKey] = a.amount;
  }
  return map;
}

export function AllocationEditor({
  month,
  initialAmount,
  initialAllocations,
}: {
  month: string;
  initialAmount: number;
  initialAllocations: { category: string; amount: number }[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(initialAmount);
  const [amounts, setAmounts] = useState<Amounts>(() => buildAmounts(initialAllocations));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allocated = Object.values(amounts).reduce((s, v) => s + v, 0);
  const over = allocated > amount;

  async function handleSave() {
    setSaving(true);
    setError(null);
    const allocations = CATEGORIES.map((c) => ({ category: c.key, amount: amounts[c.key] })).filter(
      (a) => a.amount > 0,
    );
    const res = await saveSalaryAllocations({ month, amount, allocations });
    if (res.ok) {
      router.push(`/?month=${month}`);
    } else {
      setError(res.error);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-primary to-primary-end p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-wide text-white/80">Monthly salary · {monthLabel(month)}</p>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={amount === 0 ? "" : amount}
          placeholder="0"
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1 w-full bg-transparent text-3xl font-bold tracking-tight text-white placeholder-white/40 outline-none"
        />
        <div className="mt-4">
          <RemainingMeter amount={amount} allocated={allocated} />
        </div>
      </section>

      <div className="rounded-2xl border border-border bg-card p-4">
        {CATEGORIES.map((c) => (
          <AllocationRow
            key={c.key}
            category={c.key}
            amount={amounts[c.key]}
            percent={amount > 0 ? Math.round((amounts[c.key] / amount) * 100) : 0}
            onChange={(v) => setAmounts((prev) => ({ ...prev, [c.key]: v }))}
          />
        ))}
      </div>

      {error && <p className="text-center text-sm text-negative">{error}</p>}

      <div className="sticky bottom-24 lg:bottom-4">
        <Button onClick={handleSave} disabled={saving || over || amount <= 0} className="w-full">
          {over ? `Over by ${formatCurrency(allocated - amount)}` : saving ? "Saving…" : "Save allocations"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/salary
git commit -m "feat: add allocation editor components"
```

---

## Task 13: Allocation editor page

**Files:** Create `src/app/(app)/salary/page.tsx`

- [ ] **Step 1: Implement**

Create `src/app/(app)/salary/page.tsx`:
```tsx
import { AllocationEditor } from "@/components/salary/allocation-editor";
import { getSalaryForEditor } from "@/services/salary";
import { currentMonth, isValidMonth } from "@/lib/month";

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();

  const existing = await getSalaryForEditor(month);

  return (
    <AllocationEditor
      month={month}
      initialAmount={existing?.amount ?? 0}
      initialAllocations={existing?.allocations ?? []}
    />
  );
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: clean.
Run: `npx next build`
Expected: succeeds; route list now includes `/salary` alongside `/`, `/transactions`, etc. The DB try/catch in the `(app)` layout keeps prerender working without credentials. (`/` and `/salary` may now be dynamic `ƒ` because they read `searchParams` / DB — that's expected and fine.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/salary/page.tsx"
git commit -m "feat: add full-screen allocation editor page"
```

---

## Task 14: Final verification (Definition of Done)

**Files:** none (verification only)

- [ ] **Step 1: Lint, typecheck, unit tests**

Run: `npx eslint .` → 0 problems.
Run: `npx tsc --noEmit` → clean.
Run: `npx vitest run` → all pass (Phase 0 tests + month ×4, computeStats ×3, generateInsights ×5, saveSalarySchema ×5).

- [ ] **Step 2: Production build**

Run: `npx next build`
Expected: succeeds; `/`, `/salary`, and all Phase 0 routes present.

- [ ] **Step 3: Live walkthrough** (requires `.env.local` with `MONGODB_URI`)

Run: `npm run dev`, then in the browser:
- Visit `/` for the current month with no salary yet → empty state "Set up {Month} →".
- Click it → `/salary` editor. Enter a salary (e.g. 40000) and allocate across categories. Confirm: each row shows a live %, the remaining meter updates, and entering more than the salary turns the meter red and disables Save.
- Bring it back within budget, Save → redirected to `/` showing hero (remaining counts up), the 5 quick stats (Expenses/Savings/Investments/Loan/Remaining computed from groups), the distribution bars (sorted, with %), and 2–4 insight cards.
- Use the hero month switcher: ◀ to a previous empty month → empty state; ▶ is disabled at the current month.
- Reload → data persists. `GET /api/health` still returns `{ ok: true }`.

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "chore: Phase 1 salary & dashboard verified"
```

---

## Self-Review Notes (author)

- **Spec coverage:** §2.1 model → T3; §2.2 categories → T2; §2.3 month helpers → T1; §2.4 stats/insights → T4,T5 (pure, split into `salary-stats.ts` for isolation) + reads → T7; §2.5 action → T8; §2.6 routes → T11,T13; §2.7 components → T9,T10,T12; §2.8 structure → all; DoD §3 → T14.
- **Intentional deviation:** spec §2.4 `listMonths` is **omitted** — the chosen prev/next `MonthSwitcher` (§2.7) doesn't need a month list; revisit only if a month dropdown is added later.
- **Type consistency:** `MonthStats`, `Insight`, `AllocationInput` defined in `salary-stats.ts` (T4/T5) and consumed unchanged by the service (T7), dashboard components (T10), and page (T11). `CategoryKey`/`CATEGORY_KEYS`/`CATEGORY_MAP` from `categories.ts` (T2) used by stats (T4), validation (T6), distribution + editor (T10/T12). `saveSalaryAllocations` signature matches the editor call site (T8 ↔ T12). `searchParams` typed as a Promise per Next 16 (T11, T13).
- **No placeholders:** every code step is complete; commands have expected output.
- **Caveats flagged inline:** zod v4 enum typing (T6), `.lean()` typing (T7), dynamic route rendering after adding searchParams/DB reads (T13).
