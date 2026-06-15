# Actionable AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let FuFi's assistant perform writes (add/edit/delete transactions, savings, loan, budget), each gated behind an in-chat confirm card, with a settings toggle, undo, a large-amount warning, and an audit log.

**Architecture:** Write tools are real AI SDK v6 tools with `needsApproval: true` and a server-side `execute` that calls a centralized gateway (`confirmAiAction`). The model proposes → the SDK emits a `tool-approval-request` → an in-chat confirm card renders the proposal and calls `addToolApprovalResponse({ id, approved })` → on approval the tool's `execute` runs the gateway (validate → read "before" → write via the existing domain action → log an `AiAction` with a computed inverse → return a summary). `undoAiAction(logId)` reverses via the stored inverse. A `Settings.aiActionsEnabled` flag gates whether write tools are sent.

**Tech Stack:** Next.js 16 App Router, React 19 (+ React Compiler — NO manual memo), Vercel AI SDK v6 (`ai@6.0.204`, `@ai-sdk/react@3.0.206`), Mongoose, Zod, Tailwind v4, Vitest.

---

## Refinements discovered during planning (vs. the spec)

The spec described "client calls `confirmAiAction`" and "Undo toast". Reading `node_modules/ai@6` revealed a **native tool-approval** mechanism that is cleaner; the design intent is unchanged, only the wiring:

1. **SDK-native approval, not manual `addToolResult`.** Write tools set `needsApproval: true` and keep a server-side `execute` (the gateway). After the user approves, the SDK runs `execute` on the server automatically. The client only sends an approval decision via `addToolApprovalResponse`. The stream auto-resumes with `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses`.
2. **In-chat Undo, not a toast.** The toast store (`src/lib/toast-store.ts`) has no action-button support. Undo lives on the **confirmed result card in chat** and in the **AI activity list** — both persistent and clearer than a 3.5 s toast. (We do NOT extend the toast store.)
3. No `experimental_toolApprovalSecret` (HMAC) in v1: the approval only gates whether `execute` runs; the tool input originates from the model server-side (not re-sent by the client), and the gateway re-validates ownership + payload. Noted as a future hardening option.

These are wiring refinements within the approved design (confirm-before-write, gateway, undo, four guardrails). No scope change.

---

## File structure

**Create**
- `src/models/AiAction.ts` — audit-log model `{ userId, kind, summary, inverse, status, createdAt }`.
- `src/lib/ai/action-kinds.ts` — PURE single source of truth for the write surface: the `AiActionKind` union, per-kind Zod schemas (reusing existing validations), the human summary builder, and the large-amount predicate.
- `src/lib/ai/action-kinds.test.ts` — unit tests for schemas, summaries, large-amount.
- `src/lib/ai/action-inverse.ts` — PURE `computeInverse(kind, ctx)` → `AiActionInverse`, plus the inverse/snapshot types.
- `src/lib/ai/action-inverse.test.ts` — unit tests for `computeInverse` per kind.
- `src/lib/ai/action-gateway.ts` — impure gateway internals: `applyAiAction(kind, input)` (read-before → write → return `{ summary, inverse }`) and `applyInverse(inverse)`. Called by the server action + tool.
- `src/lib/actions/ai-actions.ts` — `"use server"`: `confirmAiAction({ kind, input })` and `undoAiAction(logId)`.
- `src/lib/ai/action-tools.ts` — builds the AI SDK write tools (`needsApproval: true`, `execute` → `confirmAiAction`).
- `src/services/ai-actions.ts` — `listAiActions(limit)` read DTO for the activity list.
- `src/components/assistant/action-confirm-card.tsx` — renders a `ToolUIPart` (approval-requested → confirm/cancel; output-available → done + undo; output-denied → cancelled; output-error → error).
- `src/components/settings/ai-actions-card.tsx` — settings card: the toggle + the activity list.

**Modify**
- `src/lib/actions/transactions.ts` — `createTransaction` returns the new `id`.
- `src/models/Settings.ts` — add `aiActionsEnabled` (Boolean, default `true`).
- `src/lib/actions/settings.ts` — add `setAiActionsEnabled(enabled)`.
- `src/lib/ai/system-prompt.ts` — `buildSystemPrompt(todayISO, actionsEnabled)` adds action instructions.
- `src/app/api/assistant/route.ts` — merge write tools when enabled; pass `actionsEnabled` to the prompt.
- `src/components/assistant/assistant-view.tsx` — render tool parts via `ActionConfirmCard`; add `sendAutomaticallyWhen` + thread `addToolApprovalResponse`/`addToolResult`.
- The Settings page — mount `<AiActionsCard>` (read existing settings view first).

---

# Stage 1 — Audit model, pure core, and the gateway

### Task 1: `AiAction` model

**Files:**
- Create: `src/models/AiAction.ts`

- [ ] **Step 1: Write the model**

```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const aiActionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, required: true },
    summary: { type: String, required: true },
    // Opaque inverse payload (discriminated by `op`) used by undoAiAction.
    inverse: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["applied", "undone"], default: "applied" },
  },
  { timestamps: true },
);

aiActionSchema.index({ userId: 1, createdAt: -1 });

export type AiActionDoc = InferSchemaType<typeof aiActionSchema>;

export const AiAction: Model<AiActionDoc> =
  (models.AiAction as Model<AiActionDoc>) ?? model<AiActionDoc>("AiAction", aiActionSchema);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/models/AiAction.ts
git commit -m "feat(ai-actions): AiAction audit model"
```

---

### Task 2: Pure action-kinds module (schemas + summary + large-amount) — TDD

**Files:**
- Create: `src/lib/ai/action-kinds.ts`
- Test: `src/lib/ai/action-kinds.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { ACTION_KINDS, parseActionInput, summarizeAction, isLargeAmount, AI_LARGE_AMOUNT } from "./action-kinds";

describe("parseActionInput", () => {
  it("accepts a valid add_transaction", () => {
    const r = parseActionInput("add_transaction", {
      title: "Lunch", amount: 200, type: "expense", category: "food", date: "2026-06-10",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a category that doesn't match the type", () => {
    const r = parseActionInput("add_transaction", {
      title: "X", amount: 10, type: "income", category: "food", date: "2026-06-10",
    });
    expect(r.success).toBe(false);
  });
  it("rejects edit_transaction without an id", () => {
    const r = parseActionInput("edit_transaction", {
      title: "X", amount: 10, type: "expense", category: "food", date: "2026-06-10",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a non-positive contribution", () => {
    expect(parseActionInput("contribute_to_savings", { amount: 0 }).success).toBe(false);
  });
});

describe("summarizeAction", () => {
  it("describes an expense add", () => {
    const s = summarizeAction("add_transaction", {
      title: "Lunch", amount: 200, type: "expense", category: "food", date: "2026-06-10",
    });
    expect(s).toContain("Add expense");
    expect(s).toContain("₹200");
    expect(s).toContain("Food");
  });
  it("describes a delete", () => {
    expect(summarizeAction("delete_transaction", { id: "abc" })).toContain("Delete");
  });
});

describe("isLargeAmount", () => {
  it("flags amounts at/above the threshold", () => {
    expect(isLargeAmount("add_transaction", { title: "x", amount: AI_LARGE_AMOUNT, type: "expense", category: "food", date: "2026-06-10" })).toBe(true);
    expect(isLargeAmount("add_transaction", { title: "x", amount: 100, type: "expense", category: "food", date: "2026-06-10" })).toBe(false);
  });
  it("always flags deletes", () => {
    expect(isLargeAmount("delete_transaction", { id: "abc" })).toBe(true);
  });
  it("lists all eight kinds", () => {
    expect(ACTION_KINDS).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/lib/ai/action-kinds.test.ts`
Expected: FAIL ("Cannot find module './action-kinds'").

- [ ] **Step 3: Implement `action-kinds.ts`**

```ts
import { z } from "zod";
import { saveTransactionSchema } from "@/validations/transaction";
import { saveSavingsSchema, saveLoanSchema, quickAmountSchema } from "@/validations/tracker";
import { saveSalarySchema } from "@/validations/salary";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";

/** ₹ threshold (and any delete) that triggers the large-amount warning. */
export const AI_LARGE_AMOUNT = 50_000;

export const ACTION_KINDS = [
  "add_transaction",
  "edit_transaction",
  "delete_transaction",
  "contribute_to_savings",
  "set_savings_goal",
  "record_loan_payment",
  "set_loan",
  "set_budget",
] as const;

export type AiActionKind = (typeof ACTION_KINDS)[number];

const idSchema = z.object({ id: z.string().min(1, "Missing record id") });
const editTransactionSchema = idSchema.and(saveTransactionSchema);

/** Per-kind Zod schemas — reuse the existing app validations so AI writes obey the
 *  same rules as the manual UI (category↔type, paid≤total, allocations≤salary, …). */
export const ACTION_SCHEMAS = {
  add_transaction: saveTransactionSchema,
  edit_transaction: editTransactionSchema,
  delete_transaction: idSchema,
  contribute_to_savings: quickAmountSchema,
  set_savings_goal: saveSavingsSchema,
  record_loan_payment: quickAmountSchema,
  set_loan: saveLoanSchema,
  set_budget: saveSalarySchema,
} as const satisfies Record<AiActionKind, z.ZodTypeAny>;

export function parseActionInput(kind: AiActionKind, input: unknown) {
  return ACTION_SCHEMAS[kind].safeParse(input);
}

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
function catLabel(key: string): string {
  return TXN_CATEGORY_MAP[key as TxnCategoryKey]?.label ?? key;
}

/** Short human sentence shown on the confirm card. `input` is the (already valid) payload. */
export function summarizeAction(kind: AiActionKind, input: any): string {
  switch (kind) {
    case "add_transaction":
      return `Add ${input.type} — ${input.title} · ${rupees(input.amount)} · ${catLabel(input.category)} · ${input.date}`;
    case "edit_transaction":
      return `Update transaction — ${input.title} · ${rupees(input.amount)} · ${catLabel(input.category)} · ${input.date}`;
    case "delete_transaction":
      return `Delete this transaction`;
    case "contribute_to_savings":
      return `Add ${rupees(input.amount)} to your savings`;
    case "set_savings_goal":
      return `Set savings goal — target ${rupees(input.targetAmount)}, ${rupees(input.monthlyContribution)}/mo`;
    case "record_loan_payment":
      return `Record a loan payment of ${rupees(input.amount)}`;
    case "set_loan":
      return `Set loan — total ${rupees(input.totalLoan)}, paid ${rupees(input.paidAmount)}, EMI ${rupees(input.emiAmount)}`;
    case "set_budget":
      return `Set ${input.month} budget — salary ${rupees(input.amount)}, ${input.allocations?.length ?? 0} allocations`;
  }
}

/** High-risk: any delete, or any write whose primary amount ≥ AI_LARGE_AMOUNT. */
export function isLargeAmount(kind: AiActionKind, input: any): boolean {
  if (kind === "delete_transaction") return true;
  const amount =
    input?.amount ?? input?.totalLoan ?? input?.targetAmount ?? 0;
  return typeof amount === "number" && amount >= AI_LARGE_AMOUNT;
}
```

- [ ] **Step 4: Run tests; verify pass**

Run: `npx vitest run src/lib/ai/action-kinds.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Lint + typecheck**

Run: `npx eslint src/lib/ai/action-kinds.ts src/lib/ai/action-kinds.test.ts && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/action-kinds.ts src/lib/ai/action-kinds.test.ts
git commit -m "feat(ai-actions): pure action-kinds (schemas, summary, large-amount guard)"
```

---

### Task 3: Pure inverse computation — TDD

**Files:**
- Create: `src/lib/ai/action-inverse.ts`
- Test: `src/lib/ai/action-inverse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { computeInverse } from "./action-inverse";

const txnSnap = {
  title: "Coffee", amount: 120, type: "expense" as const, category: "food", date: "2026-06-14", notes: null,
};

describe("computeInverse", () => {
  it("add → delete the created id", () => {
    expect(computeInverse("add_transaction", { input: {}, createdId: "new1" }))
      .toEqual({ op: "delete_txn", id: "new1" });
  });
  it("edit → restore the previous snapshot", () => {
    expect(computeInverse("edit_transaction", { input: { id: "t1" }, before: { txn: txnSnap } }))
      .toEqual({ op: "update_txn", id: "t1", doc: txnSnap });
  });
  it("delete → recreate the snapshot", () => {
    expect(computeInverse("delete_transaction", { input: { id: "t1" }, before: { txn: txnSnap } }))
      .toEqual({ op: "create_txn", doc: txnSnap });
  });
  it("contribute → negative inc", () => {
    expect(computeInverse("contribute_to_savings", { input: { amount: 500 } }))
      .toEqual({ op: "inc_savings", amount: -500 });
  });
  it("set savings goal → restore prior doc (or null)", () => {
    expect(computeInverse("set_savings_goal", { input: {}, before: { savings: null } }))
      .toEqual({ op: "set_savings", doc: null });
  });
  it("loan payment → restore prior paidAmount", () => {
    expect(computeInverse("record_loan_payment", { input: { amount: 1000 }, before: { loanPaid: 4000 } }))
      .toEqual({ op: "set_loan_paid", paidAmount: 4000 });
  });
  it("set loan → restore prior loan doc", () => {
    expect(computeInverse("set_loan", { input: {}, before: { loan: null } }))
      .toEqual({ op: "set_loan_doc", doc: null });
  });
  it("set budget → restore prior salary doc for the month", () => {
    expect(computeInverse("set_budget", { input: { month: "2026-06" }, before: { salary: null } }))
      .toEqual({ op: "set_salary", month: "2026-06", doc: null });
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/lib/ai/action-inverse.test.ts`
Expected: FAIL ("Cannot find module './action-inverse'").

- [ ] **Step 3: Implement `action-inverse.ts`**

```ts
import type { AiActionKind } from "./action-kinds";

export type TxnSnapshot = {
  title: string; amount: number; type: "income" | "expense"; category: string; date: string; notes?: string | null;
};
export type SavingsSnapshot = { currentAmount: number; targetAmount: number; monthlyContribution: number };
export type LoanSnapshot = { totalLoan: number; paidAmount: number; emiAmount: number; startDate: string | null };
export type SalarySnapshot = {
  month: string; amount: number; receivedDate: string | null;
  allocations: { category: string; amount: number }[];
};

/** Reversal payload, discriminated by `op`. Stored on AiAction.inverse and applied by undo. */
export type AiActionInverse =
  | { op: "delete_txn"; id: string }
  | { op: "update_txn"; id: string; doc: TxnSnapshot }
  | { op: "create_txn"; doc: TxnSnapshot }
  | { op: "inc_savings"; amount: number }
  | { op: "set_savings"; doc: SavingsSnapshot | null }
  | { op: "set_loan_paid"; paidAmount: number }
  | { op: "set_loan_doc"; doc: LoanSnapshot | null }
  | { op: "set_salary"; month: string; doc: SalarySnapshot | null };

/** "before"/"after" context the gateway gathers around the write. */
export type InverseContext = {
  input: any;
  createdId?: string;
  before?: {
    txn?: TxnSnapshot;
    savings?: SavingsSnapshot | null;
    loan?: LoanSnapshot | null;
    loanPaid?: number;
    salary?: SalarySnapshot | null;
  };
};

export function computeInverse(kind: AiActionKind, ctx: InverseContext): AiActionInverse {
  switch (kind) {
    case "add_transaction":
      return { op: "delete_txn", id: ctx.createdId! };
    case "edit_transaction":
      return { op: "update_txn", id: ctx.input.id, doc: ctx.before!.txn! };
    case "delete_transaction":
      return { op: "create_txn", doc: ctx.before!.txn! };
    case "contribute_to_savings":
      return { op: "inc_savings", amount: -ctx.input.amount };
    case "set_savings_goal":
      return { op: "set_savings", doc: ctx.before!.savings ?? null };
    case "record_loan_payment":
      return { op: "set_loan_paid", paidAmount: ctx.before!.loanPaid! };
    case "set_loan":
      return { op: "set_loan_doc", doc: ctx.before!.loan ?? null };
    case "set_budget":
      return { op: "set_salary", month: ctx.input.month, doc: ctx.before!.salary ?? null };
  }
}
```

- [ ] **Step 4: Run tests; verify pass**

Run: `npx vitest run src/lib/ai/action-inverse.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint + typecheck**

Run: `npx eslint src/lib/ai/action-inverse.ts src/lib/ai/action-inverse.test.ts && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/action-inverse.ts src/lib/ai/action-inverse.test.ts
git commit -m "feat(ai-actions): pure inverse computation for undo"
```

---

### Task 4: `createTransaction` returns the new id

**Files:**
- Modify: `src/lib/actions/transactions.ts:12-23`

- [ ] **Step 1: Update `createTransaction`**

Replace the `createTransaction` function with:

```ts
export async function createTransaction(
  input: SaveTransactionInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = saveTransactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { date, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Transaction.create({ userId: user.id, ...rest, date: new Date(date) });

  revalidatePath("/transactions");
  return { ok: true, id: String(doc._id) };
}
```

- [ ] **Step 2: Typecheck (existing callers only read `.ok`, so this is safe)**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/transactions.ts
git commit -m "feat(transactions): createTransaction returns the new id (for AI undo)"
```

---

### Task 5: The gateway internals (`applyAiAction` + `applyInverse`)

**Files:**
- Create: `src/lib/ai/action-gateway.ts`

- [ ] **Step 1: Implement the gateway internals**

```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";
import { Savings } from "@/models/Savings";
import { Loan } from "@/models/Loan";
import { Salary } from "@/models/Salary";
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/actions/transactions";
import { saveSavings, addToSavings } from "@/lib/actions/savings";
import { saveLoan, recordLoanPayment } from "@/lib/actions/loan";
import { saveSalaryAllocations } from "@/lib/actions/salary";
import { type AiActionKind, parseActionInput, summarizeAction } from "./action-kinds";
import {
  computeInverse,
  type AiActionInverse,
  type InverseContext,
  type TxnSnapshot,
} from "./action-inverse";

type ApplyResult =
  | { ok: true; summary: string; inverse: AiActionInverse }
  | { ok: false; error: string };

function txnSnapshot(d: any): TxnSnapshot {
  return {
    title: d.title,
    amount: d.amount,
    type: d.type,
    category: d.category,
    date: new Date(d.date).toISOString().slice(0, 10),
    notes: d.notes ?? null,
  };
}

/** Validate → read "before" → perform write via the existing domain action → compute inverse.
 *  Throws nothing; returns a Result. Ownership/validation enforced here AND in each action. */
export async function applyAiAction(kind: AiActionKind, rawInput: unknown): Promise<ApplyResult> {
  const parsed = parseActionInput(kind, rawInput);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const input = parsed.data as any;

  await connectDB();
  const { user } = await getCurrentUser();
  const ctx: InverseContext = { input, before: {} };

  switch (kind) {
    case "add_transaction": {
      const res = await createTransaction(input);
      if (!res.ok) return res;
      ctx.createdId = res.id;
      break;
    }
    case "edit_transaction": {
      const prev = await Transaction.findOne({ _id: input.id, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Transaction not found" };
      ctx.before!.txn = txnSnapshot(prev);
      const { id, ...fields } = input;
      const res = await updateTransaction(id, fields);
      if (!res.ok) return res;
      break;
    }
    case "delete_transaction": {
      const prev = await Transaction.findOne({ _id: input.id, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Transaction not found" };
      ctx.before!.txn = txnSnapshot(prev);
      const res = await deleteTransaction(input.id);
      if (!res.ok) return res;
      break;
    }
    case "contribute_to_savings": {
      const res = await addToSavings(input);
      if (!res.ok) return res;
      break;
    }
    case "set_savings_goal": {
      const prev = await Savings.findOne({ userId: user.id }).lean();
      ctx.before!.savings = prev
        ? { currentAmount: prev.currentAmount, targetAmount: prev.targetAmount, monthlyContribution: prev.monthlyContribution }
        : null;
      const res = await saveSavings(input);
      if (!res.ok) return res;
      break;
    }
    case "record_loan_payment": {
      const prev = await Loan.findOne({ userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Set up your loan first" };
      ctx.before!.loanPaid = prev.paidAmount;
      const res = await recordLoanPayment(input);
      if (!res.ok) return res;
      break;
    }
    case "set_loan": {
      const prev = await Loan.findOne({ userId: user.id }).lean();
      ctx.before!.loan = prev
        ? {
            totalLoan: prev.totalLoan, paidAmount: prev.paidAmount, emiAmount: prev.emiAmount,
            startDate: prev.startDate ? new Date(prev.startDate).toISOString().slice(0, 10) : null,
          }
        : null;
      const res = await saveLoan(input);
      if (!res.ok) return res;
      break;
    }
    case "set_budget": {
      const prev = await Salary.findOne({ userId: user.id, month: input.month }).lean();
      ctx.before!.salary = prev
        ? {
            month: prev.month, amount: prev.amount,
            receivedDate: prev.receivedDate ? new Date(prev.receivedDate).toISOString().slice(0, 10) : null,
            allocations: (prev.allocations ?? []).map((a: any) => ({ category: a.category, amount: a.amount })),
          }
        : null;
      const res = await saveSalaryAllocations(input);
      if (!res.ok) return res;
      break;
    }
  }

  return { ok: true, summary: summarizeAction(kind, input), inverse: computeInverse(kind, ctx) };
}

/** Reverse a previously-applied action. Idempotent enough for a single undo press. */
export async function applyInverse(inverse: AiActionInverse): Promise<void> {
  await connectDB();
  const { user } = await getCurrentUser();
  switch (inverse.op) {
    case "delete_txn":
      await Transaction.deleteOne({ _id: inverse.id, userId: user.id });
      break;
    case "update_txn":
      await Transaction.updateOne(
        { _id: inverse.id, userId: user.id },
        { $set: { ...inverse.doc, date: new Date(inverse.doc.date) } },
      );
      break;
    case "create_txn":
      await Transaction.create({ userId: user.id, ...inverse.doc, date: new Date(inverse.doc.date) });
      break;
    case "inc_savings": {
      // Reverse a contribution; never drive currentAmount below 0.
      const s = await Savings.findOne({ userId: user.id });
      if (s) {
        s.currentAmount = Math.max(0, s.currentAmount + inverse.amount);
        await s.save();
      }
      break;
    }
    case "set_savings":
      if (inverse.doc) await Savings.updateOne({ userId: user.id }, { $set: inverse.doc }, { upsert: true });
      else await Savings.deleteOne({ userId: user.id });
      break;
    case "set_loan_paid":
      await Loan.updateOne({ userId: user.id }, { $set: { paidAmount: inverse.paidAmount } });
      break;
    case "set_loan_doc":
      if (inverse.doc)
        await Loan.updateOne(
          { userId: user.id },
          { $set: { ...inverse.doc, startDate: inverse.doc.startDate ? new Date(inverse.doc.startDate) : null } },
          { upsert: true },
        );
      else await Loan.deleteOne({ userId: user.id });
      break;
    case "set_salary":
      if (inverse.doc)
        await Salary.updateOne(
          { userId: user.id, month: inverse.month },
          { $set: { amount: inverse.doc.amount, receivedDate: inverse.doc.receivedDate ? new Date(inverse.doc.receivedDate) : null, allocations: inverse.doc.allocations } },
          { upsert: true },
        );
      else await Salary.deleteOne({ userId: user.id, month: inverse.month });
      break;
  }
}
```

- [ ] **Step 2: Lint + typecheck**

Run: `npx eslint src/lib/ai/action-gateway.ts && npx tsc --noEmit`
Expected: exit 0. (If `.lean()` field access trips `no-explicit-any`, the `any` casts above are already scoped to the mapper lines.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/action-gateway.ts
git commit -m "feat(ai-actions): gateway internals (applyAiAction + applyInverse)"
```

---

### Task 6: Server actions `confirmAiAction` + `undoAiAction`

**Files:**
- Create: `src/lib/actions/ai-actions.ts`

- [ ] **Step 1: Implement the server actions**

```ts
"use server";

import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { AiAction } from "@/models/AiAction";
import { type AiActionKind } from "@/lib/ai/action-kinds";
import { applyAiAction, applyInverse } from "@/lib/ai/action-gateway";

export type ConfirmResult =
  | { ok: true; logId: string; summary: string }
  | { ok: false; error: string };

/** Perform an AI-proposed write and record it for undo/audit. Called by the write
 *  tool's `execute` (server-side, only after the user approved the proposal). */
export async function confirmAiAction(kind: AiActionKind, input: unknown): Promise<ConfirmResult> {
  const res = await applyAiAction(kind, input);
  if (!res.ok) return res;

  await connectDB();
  const { user } = await getCurrentUser();
  const log = await AiAction.create({
    userId: user.id,
    kind,
    summary: res.summary,
    inverse: res.inverse,
    status: "applied",
  });
  return { ok: true, logId: String(log._id), summary: res.summary };
}

export async function undoAiAction(logId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectDB();
  const { user } = await getCurrentUser();
  const log = await AiAction.findOne({ _id: logId, userId: user.id });
  if (!log) return { ok: false, error: "Action not found" };
  if (log.status === "undone") return { ok: false, error: "Already undone" };

  await applyInverse(log.inverse as Parameters<typeof applyInverse>[0]);
  log.status = "undone";
  await log.save();
  return { ok: true };
}
```

- [ ] **Step 2: Lint + typecheck**

Run: `npx eslint src/lib/actions/ai-actions.ts && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/ai-actions.ts
git commit -m "feat(ai-actions): confirmAiAction + undoAiAction server actions"
```

---

# Stage 2 — Write tools, route wiring, system prompt

### Task 7: Write tools (`needsApproval: true`)

**Files:**
- Create: `src/lib/ai/action-tools.ts`

- [ ] **Step 1: Implement the tools**

```ts
import { tool } from "ai";
import { ACTION_SCHEMAS } from "./action-kinds";
import { confirmAiAction } from "@/lib/actions/ai-actions";

/** AI write tools. Each requires explicit user approval (the in-chat confirm card);
 *  `execute` runs only after approval and delegates to the centralized gateway. */
export const actionTools = {
  add_transaction: tool({
    description:
      "Add a new income or expense transaction. The category must match the type (e.g. 'food' is an expense). Date is YYYY-MM-DD.",
    inputSchema: ACTION_SCHEMAS.add_transaction,
    needsApproval: true,
    execute: async (input) => confirmAiAction("add_transaction", input),
  }),
  edit_transaction: tool({
    description:
      "Edit an existing transaction. First find it with get_transactions and pass its exact id, plus the full updated fields.",
    inputSchema: ACTION_SCHEMAS.edit_transaction,
    needsApproval: true,
    execute: async (input) => confirmAiAction("edit_transaction", input),
  }),
  delete_transaction: tool({
    description: "Delete a transaction by its exact id (look it up with get_transactions first).",
    inputSchema: ACTION_SCHEMAS.delete_transaction,
    needsApproval: true,
    execute: async (input) => confirmAiAction("delete_transaction", input),
  }),
  contribute_to_savings: tool({
    description: "Add an amount to the user's savings. A savings goal must already exist.",
    inputSchema: ACTION_SCHEMAS.contribute_to_savings,
    needsApproval: true,
    execute: async (input) => confirmAiAction("contribute_to_savings", input),
  }),
  set_savings_goal: tool({
    description: "Create or update the savings goal (targetAmount, currentAmount, monthlyContribution).",
    inputSchema: ACTION_SCHEMAS.set_savings_goal,
    needsApproval: true,
    execute: async (input) => confirmAiAction("set_savings_goal", input),
  }),
  record_loan_payment: tool({
    description: "Record a loan payment by amount. A loan must already be set up.",
    inputSchema: ACTION_SCHEMAS.record_loan_payment,
    needsApproval: true,
    execute: async (input) => confirmAiAction("record_loan_payment", input),
  }),
  set_loan: tool({
    description: "Create or update the loan (totalLoan, paidAmount, emiAmount, startDate YYYY-MM-DD). Paid cannot exceed total.",
    inputSchema: ACTION_SCHEMAS.set_loan,
    needsApproval: true,
    execute: async (input) => confirmAiAction("set_loan", input),
  }),
  set_budget: tool({
    description:
      "Set the monthly budget: month (YYYY-MM), salary amount, and category allocations. Allocations cannot exceed the salary.",
    inputSchema: ACTION_SCHEMAS.set_budget,
    needsApproval: true,
    execute: async (input) => confirmAiAction("set_budget", input),
  }),
} as const;
```

- [ ] **Step 2: Lint + typecheck**

Run: `npx eslint src/lib/ai/action-tools.ts && npx tsc --noEmit`
Expected: exit 0. If `execute`'s `input` is typed `unknown`, it still passes through `confirmAiAction` which re-validates — acceptable; add `as never`-free explicit kind string only.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/action-tools.ts
git commit -m "feat(ai-actions): write tools with needsApproval"
```

---

### Task 8: System prompt — action awareness

**Files:**
- Modify: `src/lib/ai/system-prompt.ts`

- [ ] **Step 1: Replace the file**

```ts
export function buildSystemPrompt(todayISO: string, actionsEnabled: boolean): string {
  const lines = [
    "You are FuFi's money assistant — a friendly, concise personal-finance helper.",
    `Today is ${todayISO}. All amounts are in Indian Rupees (₹).`,
    "Answer ONLY from the user's own data, which you read via the provided tools. Call tools to get real numbers — never invent or estimate figures.",
    "If the data needed isn't available from a tool, say so plainly.",
    "Keep answers short and clear. Use simple dashes for lists. Do not use markdown tables or headings.",
    "You can explain and summarise, but you do not give professional financial, tax, or investment advice — gently note that when asked for it.",
  ];

  if (actionsEnabled) {
    lines.push(
      "You can also MAKE CHANGES on the user's behalf using the write tools (add/edit/delete transactions, savings, loan, budget).",
      "Every write requires the user's on-screen confirmation — call the tool to PROPOSE the change; it is never applied until they approve.",
      "Before editing or deleting a record you MUST first look it up with a read tool (e.g. get_transactions) and use its exact id — never guess an id.",
      "If more than one record could match, ask the user which one instead of guessing. Propose ONE change at a time.",
      "Briefly state what you're about to do. For unusually large amounts, call it out so the user double-checks.",
    );
  } else {
    lines.push("You cannot change any data; you are read-only.");
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Typecheck (route updated next task — expect a 1-arg call error until Task 9)**

Run: `npx tsc --noEmit`
Expected: ONE error in `route.ts` (buildSystemPrompt now needs 2 args). Fixed in Task 9. Do not commit yet.

- [ ] **Step 3: Stage (commit together with Task 9)**

```bash
git add src/lib/ai/system-prompt.ts
```

---

### Task 9: Route wiring (gate tools on the toggle)

**Files:**
- Modify: `src/app/api/assistant/route.ts`

This task depends on `getSettings`/toggle reads. Use the settings getter the app already uses for the assistant page; if none exists for `aiActionsEnabled`, read it inline. The Settings field is added in Task 11 — until then default to `true`.

- [ ] **Step 1: Update the route**

The route already imports `assistantTools` (the read tools) and `buildSystemPrompt`. ADD two imports only:

```ts
import { actionTools as writeTools } from "@/lib/ai/action-tools";
import { getAiActionsEnabled } from "@/services/settings"; // created in Task 11
```

> Do NOT import `lastAssistantMessageIsCompleteWithApprovalResponses` here — it is client-only (used in Task 10). Importing it unused in the route would fail lint.

Within `POST`, after the session check:

```ts
const actionsEnabled = await getAiActionsEnabled();
```

Update the `streamText` call:

```ts
const result = streamText({
  model: getModel(),
  system: buildSystemPrompt(new Date().toISOString().slice(0, 10), actionsEnabled),
  messages: modelMessages,
  tools: actionsEnabled ? { ...assistantTools, ...writeTools } : assistantTools,
  stopWhen: stepCountIs(8),
  experimental_repairToolCall: async ({ toolCall, error }) => {
    if (NoSuchToolError.isInstance(error)) return null;
    const input = toolCall.input?.trim();
    if (!input || input === "null") return { ...toolCall, input: "{}" };
    return null;
  },
  onFinish: async ({ text }) => {
    if (text.trim() && convId) await appendTurn(convId, "assistant", text);
  },
});
```

> Note: `assistantTools` is the existing read-tools export from `src/lib/ai/tools.ts` (already imported). The write-tools file exports `actionTools`; import it `as writeTools` to avoid a name clash with that read-tools import.

- [ ] **Step 2: Build (route + prompt together)**

Run: `npx tsc --noEmit && npx eslint src/app/api/assistant/route.ts`
Expected: exit 0 once `getAiActionsEnabled` exists. If Task 11 isn't done yet, temporarily inline `const actionsEnabled = true;` and remove the import, then restore in Task 11. Prefer doing Task 11 first if executing out of order.

- [ ] **Step 3: Commit (prompt + route)**

```bash
git add src/lib/ai/system-prompt.ts src/app/api/assistant/route.ts
git commit -m "feat(ai-actions): gate write tools on the settings toggle; action-aware prompt"
```

---

# Stage 3 — In-chat confirm card + Undo

### Task 10: Confirm card + assistant-view wiring

**Files:**
- Create: `src/components/assistant/action-confirm-card.tsx`
- Modify: `src/components/assistant/assistant-view.tsx`

- [ ] **Step 1: Implement the confirm card**

```tsx
"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Undo2, X } from "lucide-react";
import { isLargeAmount, summarizeAction, type AiActionKind } from "@/lib/ai/action-kinds";
import { undoAiAction } from "@/lib/actions/ai-actions";
import { toast } from "@/lib/toast-store";

type ApprovalRespond = (opts: { id: string; approved: boolean }) => void;

/** Renders one AI write tool part across its lifecycle:
 *  approval-requested → confirm card; output-available → done + undo; denied/error → status. */
export function ActionConfirmCard({
  kind,
  state,
  input,
  output,
  errorText,
  approvalId,
  respond,
}: {
  kind: AiActionKind;
  state: "approval-requested" | "approval-responded" | "output-available" | "output-error" | "output-denied" | "input-available" | "input-streaming";
  input: unknown;
  output?: { ok: boolean; logId?: string; summary?: string; error?: string };
  errorText?: string;
  approvalId?: string;
  respond: ApprovalRespond;
}) {
  const [undone, setUndone] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const large = input ? isLargeAmount(kind, input) : false;
  const summary = input ? summarizeAction(kind, input) : "";

  // Awaiting decision → the confirm card.
  if (state === "approval-requested" && approvalId) {
    return (
      <div className="max-w-[82%] space-y-3 rounded-2xl border border-border bg-card-elevated/70 p-3.5 text-sm shadow-sm">
        <p className="font-medium text-foreground">{summary}</p>
        {large && (
          <p className="flex items-center gap-2 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> This is a large or irreversible change — please double-check.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => respond({ id: approvalId, approved: true })}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-primary-end px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Check className="h-3.5 w-3.5" /> Confirm
          </button>
          <button
            type="button"
            onClick={() => respond({ id: approvalId, approved: false })}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state === "approval-responded") {
    return (
      <div className="max-w-[82%] rounded-2xl border border-border bg-card-elevated/70 px-3.5 py-2.5 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" /> Applying…
      </div>
    );
  }

  if (state === "output-denied") {
    return (
      <div className="max-w-[82%] rounded-2xl border border-border bg-card-elevated/40 px-3.5 py-2.5 text-sm text-muted-foreground">
        Cancelled — nothing was changed.
      </div>
    );
  }

  if (state === "output-error" || (output && !output.ok)) {
    return (
      <div className="max-w-[82%] rounded-2xl border border-negative/30 bg-negative/10 px-3.5 py-2.5 text-sm text-negative">
        Couldn’t apply: {output?.error ?? errorText ?? "Something went wrong."}
      </div>
    );
  }

  if (state === "output-available" && output?.ok) {
    return (
      <div className="flex max-w-[82%] items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-foreground">
          <Check className="h-4 w-4 text-primary" /> {undone ? "Undone." : (output.summary ?? "Done.")}
        </span>
        {!undone && output.logId && (
          <button
            type="button"
            disabled={undoing}
            onClick={async () => {
              setUndoing(true);
              const res = await undoAiAction(output.logId!);
              setUndoing(false);
              if (res.ok) {
                setUndone(true);
                toast.success("Change undone");
              } else {
                toast.error(res.error);
              }
            }}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
        )}
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Wire the card into `assistant-view.tsx`**

(a) Update the `useChat` destructure + options to enable approval auto-resume:

```tsx
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";
import { isToolUIPart, getToolName } from "ai";
import { ActionConfirmCard } from "./action-confirm-card";
import type { AiActionKind } from "@/lib/ai/action-kinds";
```

```tsx
const { messages, sendMessage, setMessages, status, stop, addToolApprovalResponse } = useChat({
  transport: new DefaultChatTransport({ api: "/api/assistant" }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  onFinish: () => router.refresh(),
});
```

(b) In the message map, render tool parts. The existing code renders one bubble from `textOf(m)`. Change the assistant branch so it ALSO renders any tool parts beneath the text. Replace the message-map body with a version that, for each message, renders the text bubble (when non-empty) and then maps tool parts:

```tsx
{messages.map((m) => {
  const text = textOf(m);
  const toolParts = m.parts.filter(isToolUIPart);
  if (m.role === "assistant" && !text.trim() && toolParts.length === 0) return null;
  return (
    <div key={m.id} className="space-y-2">
      {(text.trim() || m.role === "user") && (
        <div className={cn("group flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
          {m.role === "assistant" && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-end text-white shadow-sm shadow-primary/30">
              <Sparkles className="h-4 w-4" />
            </span>
          )}
          {m.role === "user" && <CopyButton text={text} />}
          <div
            className={cn(
              "max-w-[82%] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
              m.role === "user"
                ? "rounded-3xl rounded-br-md bg-gradient-to-br from-primary to-primary-end text-white shadow-primary/25"
                : "rounded-3xl rounded-bl-md border border-border bg-card-elevated/60 text-foreground",
            )}
          >
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
          {m.role === "assistant" && text.trim() && <CopyButton text={text} />}
        </div>
      )}
      {toolParts.map((part) => {
        const name = getToolName(part) as string;
        // Only our write tools render a card; read tools are silent.
        if (!name.startsWith("add_") && !name.startsWith("edit_") && !name.startsWith("delete_") && !name.startsWith("set_") && !name.startsWith("contribute_") && !name.startsWith("record_")) {
          return null;
        }
        return (
          <div key={part.toolCallId} className="flex justify-start pl-10">
            <ActionConfirmCard
              kind={name as AiActionKind}
              state={part.state}
              input={part.input}
              output={part.state === "output-available" ? (part.output as any) : undefined}
              errorText={part.state === "output-error" ? part.errorText : undefined}
              approvalId={part.approval?.id}
              respond={addToolApprovalResponse}
            />
          </div>
        );
      })}
    </div>
  );
})}
```

> The set of write-tool name prefixes (`add_`, `edit_`, `delete_`, `set_`, `contribute_`, `record_`) matches the eight kinds. Read tools all start with `get_`, so they are filtered out and stay invisible.

- [ ] **Step 3: Build + lint**

Run: `npx tsc --noEmit && npx eslint src/components/assistant/action-confirm-card.tsx src/components/assistant/assistant-view.tsx`
Expected: exit 0. Verify the exact `ToolUIPart` field names against `node_modules/ai/dist/index.d.ts` (lines ~1711-1800): `state`, `input`, `output`, `errorText`, `approval.id`. Adjust if the installed types differ.

- [ ] **Step 4: Full build**

Run: `npx next build`
Expected: "Compiled successfully".

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant/action-confirm-card.tsx src/components/assistant/assistant-view.tsx
git commit -m "feat(ai-actions): in-chat confirm card with confirm/cancel + undo"
```

---

# Stage 4 — Settings toggle

### Task 11: `aiActionsEnabled` field, getter, and action

**Files:**
- Modify: `src/models/Settings.ts:13`
- Create/Modify: `src/services/settings.ts` (add `getAiActionsEnabled`)
- Modify: `src/lib/actions/settings.ts`

- [ ] **Step 1: Add the field to the Settings schema**

In `settingsSchema`, after `openingBalance`:

```ts
    openingBalance: { type: Number, default: 0, min: 0 },
    aiActionsEnabled: { type: Boolean, default: true },
```

- [ ] **Step 2: Add a getter**

If `src/services/settings.ts` exists, add to it; otherwise create it:

```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Settings } from "@/models/Settings";

/** Whether the AI assistant may perform writes. Defaults to true when unset. */
export async function getAiActionsEnabled(): Promise<boolean> {
  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Settings.findOne({ userId: user.id }).lean();
  return doc?.aiActionsEnabled ?? true;
}
```

> If a settings service already exists with a different read pattern, follow it; ensure the exported name is `getAiActionsEnabled` (referenced by the route in Task 9).

- [ ] **Step 3: Add the toggle action**

In `src/lib/actions/settings.ts`:

```ts
export async function setAiActionsEnabled(enabled: boolean): Promise<void> {
  await connectDB();
  const { user } = await getCurrentUser();
  await Settings.updateOne({ userId: user.id }, { $set: { aiActionsEnabled: enabled } }, { upsert: true });
  revalidatePath("/settings");
  revalidatePath("/assistant");
}
```

- [ ] **Step 4: Build + lint**

Run: `npx tsc --noEmit && npx eslint src/models/Settings.ts src/services/settings.ts src/lib/actions/settings.ts src/app/api/assistant/route.ts`
Expected: exit 0 (the route's `getAiActionsEnabled` import now resolves).

- [ ] **Step 5: Commit**

```bash
git add src/models/Settings.ts src/services/settings.ts src/lib/actions/settings.ts
git commit -m "feat(ai-actions): aiActionsEnabled setting (field, getter, action)"
```

---

### Task 12: Settings UI card (toggle + activity list shell)

**Files:**
- Create: `src/services/ai-actions.ts`
- Create: `src/components/settings/ai-actions-card.tsx`
- Modify: the Settings page/view (read it first: likely `src/app/(app)/settings/page.tsx` and its view component).

- [ ] **Step 1: Activity read service**

```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { AiAction } from "@/models/AiAction";

export type AiActionEntry = { id: string; summary: string; status: "applied" | "undone"; at: string };

export async function listAiActions(limit = 30): Promise<AiActionEntry[]> {
  await connectDB();
  const { user } = await getCurrentUser();
  const docs = await AiAction.find({ userId: user.id }).sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: String(d._id),
    summary: d.summary,
    status: d.status as "applied" | "undone",
    at: new Date(d.createdAt as Date).toISOString(),
  }));
}
```

- [ ] **Step 2: The settings card (client)**

```tsx
"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { setAiActionsEnabled } from "@/lib/actions/settings";
import { undoAiAction } from "@/lib/actions/ai-actions";
import { toast } from "@/lib/toast-store";
import type { AiActionEntry } from "@/services/ai-actions";

export function AiActionsCard({ enabled, activity }: { enabled: boolean; activity: AiActionEntry[] }) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(activity);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    await setAiActionsEnabled(next);
    setBusy(false);
    toast.success(next ? "AI actions enabled" : "AI actions turned off");
  }

  async function undo(id: string) {
    const res = await undoAiAction(id);
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "undone" } : x)));
      toast.success("Change undone");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">AI actions</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Let FuFi’s assistant add or change your data (always asks before each change). Off = read-only.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={toggle}
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${on ? "bg-primary" : "bg-card-elevated"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-[1.375rem]" : "left-0.5"}`} />
        </button>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent AI changes</p>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No changes yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className={a.status === "undone" ? "text-muted-foreground line-through" : "text-foreground"}>
                  {a.summary}
                </span>
                {a.status === "applied" && (
                  <button
                    type="button"
                    onClick={() => undo(a.id)}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Mount it on the settings page**

Read the existing settings page + view. In the server component that renders settings, fetch both values and render the card:

```tsx
import { getAiActionsEnabled } from "@/services/settings";
import { listAiActions } from "@/services/ai-actions";
import { AiActionsCard } from "@/components/settings/ai-actions-card";

// inside the async page/section:
const [aiEnabled, aiActivity] = await Promise.all([getAiActionsEnabled(), listAiActions()]);
// …then in JSX, alongside the other settings cards:
<AiActionsCard enabled={aiEnabled} activity={aiActivity} />
```

Follow the existing settings page's card layout/spacing. If `Card` import path differs, match the page's existing imports.

- [ ] **Step 4: Build + lint**

Run: `npx tsc --noEmit && npx eslint src/services/ai-actions.ts src/components/settings/ai-actions-card.tsx && npx next build`
Expected: exit 0 + "Compiled successfully".

- [ ] **Step 5: Commit**

```bash
git add src/services/ai-actions.ts src/components/settings/ai-actions-card.tsx src/app/\(app\)/settings
git commit -m "feat(ai-actions): settings toggle + AI activity list"
```

---

# Stage 5 — Large-amount guard (verification)

The large-amount logic ships in Task 2 (`isLargeAmount`) and renders in Task 10 (the amber banner). This stage verifies it end-to-end and adds the prompt nudge (already in Task 8).

### Task 13: Verify the guard

**Files:**
- Test: `src/lib/ai/action-kinds.test.ts` (extend)

- [ ] **Step 1: Add boundary tests**

Append to `action-kinds.test.ts`:

```ts
describe("large-amount boundaries", () => {
  it("flags set_loan at threshold via totalLoan", () => {
    expect(isLargeAmount("set_loan", { totalLoan: AI_LARGE_AMOUNT, paidAmount: 0, emiAmount: 0, startDate: "2026-01-01" })).toBe(true);
  });
  it("flags set_savings_goal by targetAmount", () => {
    expect(isLargeAmount("set_savings_goal", { targetAmount: AI_LARGE_AMOUNT, currentAmount: 0, monthlyContribution: 0 })).toBe(true);
  });
  it("does not flag a small contribution", () => {
    expect(isLargeAmount("contribute_to_savings", { amount: 500 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/lib/ai/action-kinds.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/action-kinds.test.ts
git commit -m "test(ai-actions): large-amount guard boundaries"
```

---

# Stage 6 — Final verification

### Task 14: Whole-feature verification

- [ ] **Step 1: Full suite + build**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src && npx next build`
Expected: all green; "Compiled successfully"; the pre-existing 136 tests plus the new ones pass.

- [ ] **Step 2: Manual smoke (dev)**

Start dev, open `/assistant`, and verify:
- "Add a ₹200 food expense today" → a confirm card appears; **Confirm** writes it (check `/transactions`); **Undo** removes it.
- "Delete that transaction" → the model looks it up, the card shows a delete with the amber warning; Cancel leaves it untouched.
- A ₹60,000 expense proposal shows the large-amount banner.
- Settings → turn AI actions **off** → the assistant says it can't make changes and proposes nothing.
- Settings → "Recent AI changes" lists entries; Undo there reverses and strikes through.

- [ ] **Step 3: Final review + finish the branch**

Use **superpowers:finishing-a-development-branch**.

---

## Self-review

**Spec coverage:**
- Full read+write surface (8 kinds) → Tasks 2, 7. ✓
- Inline confirm card → Tasks 10. ✓
- A1 centralized gateway → Tasks 5, 6. ✓
- Settings toggle → Tasks 11, 12; route gating Task 9. ✓
- Undo (all kinds) → Tasks 3 (inverse), 5 (applyInverse), 6 (undoAiAction), 10 + 12 (UI). ✓
- Large-amount guard → Tasks 2, 10, 13. ✓
- Action log → Tasks 1, 6, 12. ✓
- Server re-validation + ownership → Task 5 (`applyAiAction` re-parses + scopes to user). ✓
- Edit/delete resolve-by-id + ask-when-ambiguous → Task 8 (prompt). ✓
- v6 API verified pre-code → done in planning; re-checked in Task 10 Step 3. ✓

**Type consistency:** `AiActionKind` (action-kinds) is the single union used by inverse, gateway, tools, and the card. `confirmAiAction(kind, input)` signature matches the tool `execute` calls and the route. `AiActionInverse` is produced by `computeInverse` and consumed by `applyInverse`. `createTransaction` now returns `{ ok, id }`; the gateway reads `res.id`.

**Placeholder scan:** No TBD/TODO; every code step has complete code. Two integration points (route's settings getter; settings page mount) reference reading an existing file first — both name the exact symbol/path to use.

**Known v1 limitations (acceptable, noted):** undo of a deleted transaction re-creates it with a new id; reversing a contribution clamps at 0; no HMAC approval secret. None affect correctness of the happy path.
