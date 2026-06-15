# Phase 7 — Actionable AI · Design

**Status:** Approved (design) — ready for implementation plan.
**Date:** 2026-06-15

## Goal

Turn FuFi's read-only assistant into one that can **act** — add/edit/delete
transactions, set/contribute to savings, record/set up loans, and set the
monthly budget — every write gated behind an in-chat **confirm card**, with a
settings toggle, undo, a large-amount warning, and an audit log.

## Scope (decided)

- **Write surface:** full read + write (transactions add/edit/delete, savings,
  loan, budget).
- **Confirm mechanic:** inline confirm card in the chat. The model *proposes*;
  nothing is written until the user taps **Confirm**.
- **Guardrails (all four):** settings toggle, undo after confirm, large-amount
  guard, action log.
- **Architecture:** A1 — a single centralized server gateway owns validate →
  write → log-inverse → undo for every AI write.

Out of scope for this phase: bank/UPI sync, scheduled/proactive writes,
multi-record bulk operations in one proposal.

## Architecture & flow

The assistant gains a write surface via the Vercel AI SDK v6 **human-in-the-loop**
pattern: write tools are defined **without a server `execute`**, so when the
model decides to act it does not write anything — the tool call surfaces to the
chat UI as a *proposal*. A confirm card renders it; only on **Confirm** does the
write run, through the gateway, with the result fed back so the model can reply.

```
User: "delete my coffee expense from yesterday"
  → model calls a READ tool (get_transactions) to find the record
  → model calls a PROPOSE tool (delete_transaction, id=…)   [no server execute → proposal only]
  → stream pauses; chat renders a CONFIRM CARD ("Delete: Coffee ₹120 · Jun 14 — Food")
  → user taps Confirm
  → client calls confirmAiAction({ kind, input })            [the gateway: validate → write → log inverse → summary]
  → result fed back via addToolResult → model replies "Done ✓. Deleted."  + Undo toast appears
```

**Disabled state:** if the settings toggle is off, the route sends **only read
tools** and the system prompt tells the model it can answer questions but cannot
make changes.

## Write surface (kinds → existing actions)

Each kind has a zod schema (reusing the existing validations) and maps to a real,
already-tested server action. Categories for transactions must match the
transaction type (existing `saveTransactionSchema` refine).

| Kind | Existing action | Input | Notes |
|---|---|---|---|
| `add_transaction` | `createTransaction` | title, amount, type, category, date, notes? | category must match type |
| `edit_transaction` | `updateTransaction` | id + same fields | model must resolve `id` via read tools first |
| `delete_transaction` | `deleteTransaction` | id | model must resolve `id` first |
| `contribute_to_savings` | `addToSavings` | amount | guarded: a savings goal must already exist |
| `set_savings_goal` | `saveSavings` | targetAmount, currentAmount, monthlyContribution | upsert (single doc per user) |
| `record_loan_payment` | `recordLoanPayment` | amount | guarded; clamped to loan total |
| `set_loan` | `saveLoan` | totalLoan, paidAmount, emiAmount, startDate | upsert; paid ≤ total |
| `set_budget` | `saveSalaryAllocations` | month (YYYY-MM), amount, receivedDate?, allocations[] | upsert per month |

## Components / units

- **`src/models/AiAction.ts`** — audit log document:
  `{ userId, kind, summary, inverse, status: "applied" | "undone", createdAt }`.
  Mongoose hot-reload guard `(models.X as Model<DocType>) ?? model(...)`.
  `inverse` is an internal discriminated payload the gateway knows how to apply.
- **`src/lib/ai/action-tools.ts`** — the propose-only tools (one per kind), each
  with a clear description + zod `inputSchema`. No `execute` (client-resolved).
- **`src/lib/actions/ai-actions.ts`** — the **gateway** (`"use server"`):
  - `confirmAiAction({ kind, input })`: validate payload with the kind's schema →
    read "before" state where undo needs it → perform the write (delegating to the
    existing domain action, or doing the mutation directly where the inverse needs
    the new id) → persist an `AiAction` with the computed inverse → return
    `{ ok: true, logId, summary }` or `{ ok: false, error }`.
  - `undoAiAction(logId)`: load the entry (must belong to the user, status
    `applied`), apply its inverse, mark `undone`, return `{ ok }`.
- **`src/services/ai-actions.ts`** — `listAiActions(limit = 50)` for the activity view.
- **`src/components/assistant/action-confirm-card.tsx`** — renders a pending
  proposal: human-readable summary, an amber large-amount warning when relevant,
  and **Confirm** / **Cancel**. On confirm it calls `confirmAiAction`, then
  `addToolResult` with the outcome, then shows an Undo toast. On cancel it
  `addToolResult`s a cancelled outcome (no write).
- **`src/components/settings/ai-activity.tsx`** — recent AI changes list (summary,
  relative time, "undone" badge, optional per-row Undo for still-reversible entries).

## Edits to existing files

- **`src/app/api/assistant/route.ts`** — read `aiActionsEnabled`; merge the
  propose-only tools into `tools` only when enabled; keep `experimental_repairToolCall`;
  ensure `stopWhen` allows read → propose (pause) → (after confirm) continue → reply.
- **`src/lib/ai/system-prompt.ts`** — instruct the model: it may act via the write
  tools when asked; for edit/delete it MUST look up the record first and propose a
  concrete `id` (never invent one); if multiple records match, ask which; one
  action per proposal; summarize the change; call out large amounts. When actions
  are disabled, say it can only answer.
- **`src/lib/actions/transactions.ts`** — `createTransaction` also returns the new
  `id` (`{ ok: true, id }`). Additive; existing callers that check only `res.ok`
  are unaffected.
- **`src/models/Settings.ts`** + **`src/validations/settings.ts`** +
  **`src/lib/actions/settings.ts`** (`updatePreferences`) — add `aiActionsEnabled`
  (boolean, default `true`).
- **Settings UI** — a switch to toggle AI actions, plus the AI activity list.

## Undo — inverse per kind

The gateway captures enough at write time to reverse the change:

| Kind | Inverse |
|---|---|
| `add_transaction` | delete the newly created transaction (by returned id) |
| `edit_transaction` | restore the transaction's previous field values (snapshot read before update) |
| `delete_transaction` | recreate the deleted document (full snapshot read before delete; new id acceptable in v1) |
| `contribute_to_savings` | `$inc` currentAmount by `-amount` |
| `set_savings_goal` | restore the previous Savings doc, or remove it if none existed |
| `record_loan_payment` | restore the previous `paidAmount` |
| `set_loan` | restore the previous Loan doc, or remove it if none existed |
| `set_budget` | restore the previous Salary doc for that month, or remove it if none existed |

## Large-amount guard

A threshold constant (`AI_LARGE_AMOUNT = 50_000` ₹) plus "any delete" is treated
as high-risk. When a proposal qualifies, the confirm card renders an amber warning
banner and the system prompt tells the model to call it out in its message. No
hard block — the user can still confirm.

## Error handling

- Validation / ownership failure → gateway returns `{ ok: false, error }` → fed
  back to the model, which tells the user it couldn't and why.
- Guarded actions (no goal / no loan yet) surface their existing messages
  ("Set up your savings goal first", etc.).
- Cancel → cancelled outcome via `addToolResult`; nothing written.
- Toggle off mid-conversation → next request simply omits write tools.
- The exact AI SDK v6 pause/resume API (`addToolResult`, tool-part states,
  `sendAutomaticallyWhen`) is **verified against `node_modules/ai` docs during
  planning** — this repo is confirmed v6, not the v4 in older training data.

## Testing

- **Gateway:** for each kind, apply then undo restores the prior DB state.
- **Validation:** each kind rejects bad payloads (negative / oversized / category
  mismatch / paid > total).
- **Toggle:** route exposes write tools only when `aiActionsEnabled`.
- **Large-amount:** detection flips on at/above threshold and for deletes.
- Existing suite (136 tests) stays green; verify with `npx vitest run`.

## Build order (single plan, staged)

1. `AiAction` model + gateway (`confirmAiAction` / `undoAiAction`) + inverse logic + tests.
2. Propose-only tools + route wiring + system-prompt update.
3. Confirm card in chat + Undo toast.
4. Settings toggle (model + validation + action + UI + route gating).
5. Large-amount guard.
6. AI activity list in Settings.

## Verification protocol

`npx` forms only: `npx tsc --noEmit`, `npx eslint <paths>`, `npx vitest run`,
`npx next build`. (`npm run lint` / `npm run test` exit non-zero in this harness.)
