# Multi-Loan Restructure · Design

**Status:** Approved (design) — ready for implementation plan.
**Date:** 2026-06-16

## Goal

Turn the Loan feature from a single loan per user into **multiple typed loans/EMIs per
user** (education, vehicle, home, mobile, agriculture, appliances, personal, other),
with a per-loan list + an aggregate summary, full CRUD, and full AI parity.

## Decisions (from brainstorming)

- **Per-loan fields:** minimal — `type`, `name`, `totalLoan`, `paidAmount`, `emiAmount`,
  `startDate`. No interest/tenure/amortization math.
- **Type:** a fixed list (with icons) + a free-text `name`/lender.
- **Migration:** fresh start — drop existing loan rows + the unique index.
- **AI:** full parity — list, add, edit, delete, and record a payment to a specific loan.
- **Model shape:** Approach A — separate `Loan` documents, one per loan (not an embedded array).

Out of scope: interest/amortization, per-type colors (single pink accent for now),
loan reminders/notifications (a later phase).

## 1. Data model & migration

`src/models/Loan.ts` — **many docs per user**:

```ts
{
  userId: ObjectId(ref User), indexed, NOT unique
  type: String (enum LOAN_TYPE_KEYS), required, default "other"
  name: String, optional, trimmed
  totalLoan: Number, min 0, default 0
  paidAmount: Number, min 0, default 0
  emiAmount: Number, min 0, default 0
  startDate: Date, optional
  timestamps: true
}
```
Index: `{ userId: 1, createdAt: -1 }`. Mongoose hot-reload guard as in sibling models.

**Removed:** the `getLoan` upsert-placeholder behavior (no auto-creating an empty loan).

**Migration (fresh start), one-time:**
1. Drop the existing `userId_1` **unique** index on the `loans` collection (removing
   `unique: true` from the schema does NOT drop the DB index). Done via a guarded one-off
   step: `Loan.collection.dropIndex("userId_1")` (ignore "index not found").
2. Delete all existing loan documents (`Loan.deleteMany({})`).
The implementation plan includes a small idempotent migration script for this.

## 2. Loan types (`src/lib/loan-types.ts`)

Mirrors `src/lib/transaction-categories.ts`:

```ts
export const LOAN_TYPES = [
  { key: "education",   label: "Education",   icon: GraduationCap },
  { key: "vehicle",     label: "Vehicle",     icon: Car },
  { key: "home",        label: "Home",        icon: Home },
  { key: "mobile",      label: "Mobile / Gadget", icon: Smartphone },
  { key: "agriculture", label: "Agriculture", icon: Sprout },
  { key: "appliances",  label: "Appliances",  icon: WashingMachine },
  { key: "personal",    label: "Personal",    icon: Wallet },
  { key: "other",       label: "Other",       icon: Landmark },
] as const;
```
Exports: `LoanTypeKey`, `LOAN_TYPE_KEYS` (`[string, ...string[]]` tuple for the enum),
`LOAN_TYPE_MAP` (key → entry), and a `loanTypeLabel(key)` helper. Display name on cards
= `name || LOAN_TYPE_MAP[type].label`. Section keeps the existing pink `LOAN_COLOR`
accent for progress rings; the type supplies the icon.

## 3. Service + math

`src/services/loan.ts`:

```ts
export type LoanItemDTO = {
  id: string; type: LoanTypeKey; typeLabel: string;
  name: string | null; displayName: string;
  totalLoan: number; paidAmount: number; emiAmount: number;
  startDate: string | null; stats: LoanStats;
};
export type LoanSummary = {
  count: number; totalBorrowed: number; totalPaid: number; totalRemaining: number;
  totalMonthlyEmi: number; overallPct: number; allPaidOff: boolean;
};
export async function getLoans(): Promise<{ loans: LoanItemDTO[]; summary: LoanSummary }>;
```
`getLoans` finds all loans for the user, sorted `{ createdAt: -1 }`, maps each through the
existing `loanStats(total, paid, emi)`, and computes the summary via a new pure function.

`src/lib/tracker-math.ts` — add a pure `loanSummary(loans)`:
```ts
export type LoanSummaryInput = { totalLoan: number; paidAmount: number; emiAmount: number }[];
export function loanSummary(loans: LoanSummaryInput): {
  count, totalBorrowed, totalPaid, totalRemaining, totalMonthlyEmi, overallPct, allPaidOff
};
// overallPct = totalBorrowed > 0 ? clampPct(totalPaid / totalBorrowed * 100) : 0
// allPaidOff = count > 0 && every loan paidOff
```
`loanStats` (existing) is unchanged.

## 4. Validation (`src/validations/tracker.ts`)

`saveLoanSchema` gains:
```ts
type: z.enum(LOAN_TYPE_KEYS),
name: z.string().trim().max(60).optional(),
```
Keeps `totalLoan`/`paidAmount`/`emiAmount` (≥0), `startDate` (date string), and the
`paid ≤ total` refine. `SaveLoanInput` type updates accordingly.

## 5. Actions (`src/lib/actions/loan.ts`)

Replaces `saveLoan`/single `recordLoanPayment` with per-loan CRUD (all `"use server"`,
user-scoped, `Types.ObjectId.isValid(id)` guard on id-taking actions, revalidate `/loan`,
`/`, `/analytics`):

```ts
createLoan(input: SaveLoanInput): { ok: true; id: string } | { ok: false; error }
updateLoan(id: string, input: SaveLoanInput): { ok: true } | { ok: false; error }
deleteLoan(id: string): { ok: true } | { ok: false; error }
recordLoanPayment(id: string, amount: number): { ok: true } | { ok: false; error }
  // loads the loan (scoped to user); newPaid = min(loan.totalLoan, loan.paidAmount + amount)
```
`createLoan` returns the new `id` (needed for AI undo). `recordLoanPayment` validates
`amount` with `quickAmountSchema`.

## 6. UI (`src/components/loan/`)

- **Empty state** (no loans): unchanged copy/style — "Add your loan details" → opens the
  add form (`LoanForm` with no `initial`).
- **With loans:**
  - **Summary card** (top): total outstanding (`totalRemaining`), total monthly EMI,
    overall progress ring (`overallPct`), and loan count. Header gains an **"Add loan"** button.
  - **Loan list:** a responsive grid of **`loan-card.tsx`** (new). Each card: type icon +
    `displayName`, a progress ring/bar (`stats.pct`), `paid / total`, EMI, remaining,
    est. completion (existing month math), and actions **Edit / Record payment / Delete**.
- **`loan-form.tsx`:** add a **Type** `Select` (`@/components/ui/select`) + a **Name**
  text input, alongside the existing total/paid/EMI/start-date fields. Works for both add
  (no `initial`) and edit (`initial` loan). On success calls `createLoan`/`updateLoan`.
- **Record payment:** per-loan, reuses `AmountForm`, calls `recordLoanPayment(loanId, amount)`.
- **Delete:** a confirm `Dialog` per loan → `deleteLoan(id)`.
- `loan-view.tsx` is restructured to own the summary + list + dialogs (tracking which loan
  is being edited/paid/deleted via state holding the loan id).

## 7. AI layer (full parity)

Updates the Actionable-AI feature (Phase 7):

- **Read tool** `get_loans` (`src/lib/ai/tools.ts`) → returns the new `getLoans()` shape.
- **Kinds** (`src/lib/ai/action-kinds.ts`): remove `set_loan`; add `add_loan`, `edit_loan`,
  `delete_loan`; extend `record_loan_payment` to take a `loanId`.
  - `add_loan` schema: `saveLoanSchema` (type, name?, total, paid, emi, startDate).
  - `edit_loan`: `{ id } + saveLoanSchema` fields (flat object — JSON-Schema-safe, no
    intersection, per the Groq fix already in place).
  - `delete_loan`: `{ id }`.
  - `record_loan_payment`: `{ loanId: string, amount: number(>0) }`.
  - Update `summarizeAction` + `isLargeAmount` (large via `totalLoan`/`amount`).
- **Gateway** (`src/lib/ai/action-gateway.ts`): handle the four loan kinds — read "before"
  for edit/delete/payment (loan fetched by id, scoped to user), call the new actions,
  capture `createdId` for add.
- **Inverse** (`src/lib/ai/action-inverse.ts`): `add_loan`→delete created id;
  `edit_loan`→restore prior loan snapshot (now includes `type`/`name`); `delete_loan`→
  recreate the snapshot; `record_loan_payment`→restore that loan's prior `paidAmount`.
  The `LoanSnapshot` type gains `type` + `name`.
- **Tools** (`src/lib/ai/action-tools.ts`): `add_loan`/`edit_loan`/`delete_loan`/
  `record_loan_payment`, each `needsApproval: true`, delegating to `confirmAiAction`.
- **System prompt** (`src/lib/ai/system-prompt.ts`): note loans are multiple; for
  edit/delete/payment the model MUST look up the loan id via `get_loans` first and ask
  when ambiguous (same rule already used for transactions).

## 8. Analytics & health score

- `src/app/(app)/analytics/page.tsx`: `getLoan()` → `getLoans()`. Health-score input:
  `loanProgress = summary.overallPct`, `hasLoan = summary.count > 0`.
- `src/components/analytics/analytics-view.tsx`: the loan ring shows **overall** progress
  with `totalPaid / totalBorrowed`; gate on `summary.count > 0`.
- `src/lib/health-score.ts`: logic unchanged (consumes the aggregate).

## 9. Dashboard — no change

`dashboard-stats.tsx` "Loan Paid" comes from **salary allocations** (`salary-stats.ts`
`loan` bucket), not the Loan tracker. Untouched.

## 10. Error handling

- Actions return `{ ok: false, error }` for invalid/not-found/ownership failures
  (mirrors transactions). `recordLoanPayment` against a missing/zero-total loan →
  "Loan not found".
- AI edit/delete/payment on a non-existent or other-user loan → gateway returns the
  not-found error (the read-before fails), surfaced to the model.
- Form validation via `saveLoanSchema` (client + server).

## 11. Testing

- **Pure:** `loanSummary` (empty, single, multiple, allPaidOff, zero-total) in
  `tracker-math` tests.
- **Validation:** `saveLoanSchema` accepts a valid typed loan; rejects bad type,
  over-long name, `paid > total`.
- **AI:** `computeInverse` for `add_loan`/`edit_loan`/`delete_loan`/`record_loan_payment`;
  `parseActionInput` + JSON-Schema serialization for the new kinds (the
  "every tool schema converts" regression test must still pass).
- Existing suite (157 tests) stays green.

## Build order (stages)

1. `Loan` model + `loan-types.ts` + migration (drop unique index, clear rows).
2. Service `getLoans` + pure `loanSummary` (+ tests).
3. Validation (`saveLoanSchema` + type/name) + actions (create/update/delete/pay) (+ tests).
4. UI — `loan-view` (summary + list), `loan-card`, `loan-form` (type + name).
5. AI layer — kinds/gateway/inverse/tools/prompt + read tool (+ tests).
6. Analytics + health-score wiring.
7. Whole-feature verification.

## Verification protocol

`npx` forms only: `npx tsc --noEmit`, `npx eslint <paths>`, `npx vitest run`,
`npx next build`.
