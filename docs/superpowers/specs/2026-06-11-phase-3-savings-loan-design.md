# Phase 3 — Savings & Loan Trackers Design

**Project:** FuFi — Future Financial (single-user)
**Date:** 2026-06-11
**Status:** Approved (pending written-spec review)
**Builds on:** Phase 1 (salary + planned-allocation dashboard) and Phase 2 (transactions ledger), both merged to `main`

---

## 1. Context

Phase 3 adds two **goal trackers**: a **Savings** tracker (progress toward a target, with a monthly contribution estimate) and a **Loan** tracker (repayment progress, with an EMI-based completion estimate). Both are **manual** and **standalone** — the user sets the current/paid figures directly. Reconciling these against the transactions ledger (deriving "saved this month" or "EMI paid" from actual transactions) is deferred to **Phase 4 (Budget & Analytics)**.

This phase also completes a deferred Phase 0 decision: the Home dashboard gains two **summary cards** (Savings, Loan) linking to their pages, so the secondary-nav destinations are reachable from the dashboard.

**Stack (unchanged):** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Tailwind v4, Mongoose, Server-first (Server Components read via services; Server Actions mutate + `revalidatePath`), single-user (`getCurrentUser()`), green theme, `formatCurrency`, `cn`, `Card`/`Button`/`Tooltip`/`Dialog` primitives, RHF + Zod, framer-motion, `month.ts` helpers (`currentMonth`, `addMonths`, `monthLabel`).

### Decisions locked during brainstorming
| Decision | Choice |
|---|---|
| Data source | **Manual entry** — user sets current savings / goal / monthly contribution and loan total / EMI / paid / start date; reconcile-with-transactions deferred to Phase 4 |
| Quick actions | **Yes** — "Add to savings" (bumps `currentAmount`) and "Record EMI payment" (bumps `paidAmount`), in addition to full edit |
| Dashboard cards | **Yes** — add the deferred Savings & Loan summary cards to the Home dashboard now |
| Scope | **Both** Savings + Loan this phase (they share the `ProgressRing`, the setup/edit dialog, and the computed-stats pattern) |
| Singleton lifecycle | **Find-or-create with zeros** on first read (like `Settings` in `getCurrentUser`); pages show a "set up" state until configured |

---

## 2. Scope

### 2.1 Data models (singletons — one doc per user)

**`src/models/Savings.ts`**
```ts
Savings {
  userId: ObjectId (ref User, required, unique),
  currentAmount:       number (required, default 0, min 0),
  targetAmount:        number (required, default 0, min 0),
  monthlyContribution: number (required, default 0, min 0),
  createdAt, updatedAt
}
// hot-reload guard: (models.Savings as Model<SavingsDoc>) ?? model(...)
```

**`src/models/Loan.ts`**
```ts
Loan {
  userId: ObjectId (ref User, required, unique),
  totalLoan:  number (required, default 0, min 0),
  paidAmount: number (required, default 0, min 0),
  emiAmount:  number (required, default 0, min 0),
  startDate:  Date (optional),          // null until the loan is set up
  createdAt, updatedAt
}
// hot-reload guard as above
```

Both mirror `Settings`: `unique` `userId`, `{ timestamps: true }`, `InferSchemaType` + `Model<...>` export.

### 2.2 Pure computations — `src/lib/tracker-math.ts` (unit-tested, TDD)

Pure and deterministic — **no `Date.now()`** inside (completion *dates* are derived in the page from `currentMonth()` + `monthsLeft`, keeping these functions testable).

```ts
export type Milestone = { value: 25 | 50 | 75 | 100; reached: boolean };

export type SavingsStats = {
  pct: number;                 // clamped 0–100 (float; round for display)
  remaining: number;           // max(0, target − current)
  monthsToGoal: number | null; // ceil(remaining / monthly) when monthly > 0 && remaining > 0, else null
  reached: boolean;            // target > 0 && current >= target
  milestones: Milestone[];     // [25,50,75,100], each reached = pct >= value
};
export function savingsStats(current: number, target: number, monthly: number): SavingsStats;

export type LoanStats = {
  pct: number;                 // clamped 0–100 (paid / total)
  remaining: number;           // max(0, total − paid)
  monthsLeft: number | null;   // ceil(remaining / emi) when emi > 0 && remaining > 0, else null
  paidOff: boolean;            // total > 0 && paid >= total
};
export function loanStats(total: number, paid: number, emi: number): LoanStats;
```

**Edge cases (explicit, tested):**
- `target === 0` (savings) or `total === 0` (loan) → `pct = 0`, `remaining = 0`, `reached/paidOff = false`, months `null` (the "not set up" state).
- `current >= target > 0` → `pct = 100` (capped), `remaining = 0`, `reached = true`, `monthsToGoal = null`. Same shape for loan `paidOff`.
- `monthly === 0` / `emi === 0` with positive remaining → months `null` (can't estimate).
- `pct` is **clamped** to `[0, 100]` so an over-saved balance never overflows the ring.

### 2.3 Validation — `src/validations/tracker.ts` (unit-tested)

```ts
saveSavingsSchema (Zod): {
  targetAmount:        number ≥ 0,
  currentAmount:       number ≥ 0,
  monthlyContribution: number ≥ 0,
}                                         // current may exceed target (over-saved) — allowed

saveLoanSchema (Zod): {
  totalLoan:  number ≥ 0,
  paidAmount: number ≥ 0,
  emiAmount:  number ≥ 0,
  startDate:  string (non-empty, refine: !Number.isNaN(Date.parse(s)) — "Invalid date"),
}.refine(paidAmount <= totalLoan, { message: "Paid can't exceed the loan total", path: ["paidAmount"] })

quickAmountSchema (Zod): { amount: number positive ("Enter an amount greater than 0") }
```
Exports: `SaveSavingsInput`, `SaveLoanInput`, `QuickAmountInput`. (Mirrors the `date`-as-string + `Date.parse` refine already used in `validations/transaction.ts`.)

### 2.4 Read services — `src/services/savings.ts`, `src/services/loan.ts`

Each find-or-creates its singleton with `findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert, returnDocument: "after", setDefaultsOnInsert: true })` — the same pattern `getCurrentUser` uses for `Settings`, so the page always has a doc and schema defaults (zeros) apply on insert.

```ts
// services/savings.ts
export type SavingsDTO = {
  currentAmount: number; targetAmount: number; monthlyContribution: number;
  stats: SavingsStats;
};
export async function getSavings(): Promise<SavingsDTO>;   // connect → getCurrentUser → upsert → map + savingsStats(...)

// services/loan.ts
export type LoanDTO = {
  totalLoan: number; paidAmount: number; emiAmount: number;
  startDate: string | null;        // ISO, or null when unset
  stats: LoanStats;
};
export async function getLoan(): Promise<LoanDTO>;         // connect → getCurrentUser → upsert → map + loanStats(...)
```
Serializable DTOs only (numbers + `String`/`toISOString`/`?? null`), matching `TransactionDTO`.

### 2.5 Mutations — `src/lib/actions/savings.ts`, `src/lib/actions/loan.ts` (`"use server"`)

All: validate with the schema, `connectDB`, resolve `getCurrentUser`, scope by `userId`, upsert (so a never-read singleton is still created), `revalidatePath` **both** the tracker page **and `/`** (the dashboard cards). Return `{ ok: true } | { ok: false; error: string }`.

```ts
// actions/savings.ts
saveSavings(input: SaveSavingsInput): Result
  → updateOne({ userId }, { $set: { ...data } }, { upsert: true })
addToSavings(input: QuickAmountInput): Result
  → updateOne({ userId }, { $inc: { currentAmount: amount } }, { upsert: true })

// actions/loan.ts
saveLoan(input: SaveLoanInput): Result
  → $set all fields incl. startDate: new Date(startDate)
recordLoanPayment(input: QuickAmountInput): Result
  → read current loan; newPaid = min(totalLoan, paidAmount + amount)   // clamp so paid never exceeds total
  → updateOne({ userId }, { $set: { paidAmount: newPaid } })
```
`revalidatePath("/savings")` + `revalidatePath("/")` (savings); `revalidatePath("/loan")` + `revalidatePath("/")` (loan).

### 2.6 Shared UI primitive — `src/components/ui/progress-ring.tsx` (client)

Reusable SVG circular progress used by both pages and both dashboard cards.
```ts
type ProgressRingProps = {
  value: number;          // 0–100 (caller passes stats.pct)
  size?: number;          // px, default 168
  strokeWidth?: number;   // default 12
  color?: string;         // CSS color for the progress arc; default "currentColor"
  children?: ReactNode;   // centered content (e.g. the % and amount)
  className?: string;
};
```
- Two stacked `<circle>`s: a muted track + a progress arc (`stroke-dasharray = circumference`, rotated −90° so it starts at 12 o'clock, `strokeLinecap="round"`).
- **framer-motion** animates the arc on mount: `motion.circle` with `initial={{ strokeDashoffset: C }}` → `animate={{ strokeDashoffset: C * (1 − clamped/100) }}`, ~0.8s ease-out. Declarative initial/animate ⇒ **no `useEffect`/`setState`** (avoids the `react-hooks/set-state-in-effect` rule we hit in the sidebar/CountUp work). Respect `useReducedMotion()` → snap to final offset.
- Center content via `children`, absolutely centered over the SVG.

### 2.7 Tracker pages & components

**Pages** (server, live data):
- `src/app/(app)/savings/page.tsx` — `export const dynamic = "force-dynamic"`; `const data = await getSavings()` → `<SavingsView data={data} />`. (Replaces the placeholder.)
- `src/app/(app)/loan/page.tsx` — `export const dynamic = "force-dynamic"`; `const data = await getLoan()` → `<LoanView data={data} />`. (Replaces the placeholder.)

**`src/components/trackers/amount-dialog.tsx`** (client, shared) — a small RHF + `zodResolver(quickAmountSchema)` dialog with a single ₹ amount field. Props: `{ open, onOpenChange, title, submitLabel, onSubmit: (amount: number) => Promise<Result> }`. Used by both quick actions; disabled-while-submitting + inline error + `try/finally` result gating (mirrors `confirm-delete`/`transaction-form`).

**`src/components/savings/`** (client unless noted):
- `savings-view.tsx` — owns dialog state (edit goal + add-to-savings); renders the ring (center: `pct%` + `current / target`), a stats row (Remaining · Monthly contribution · "≈ N months to goal" when `monthsToGoal != null`, else "Set a monthly amount to estimate"), a **milestones** row (25/50/75/100 chips, reached = filled), and **Add to savings** + **Edit goal** buttons. When `targetAmount === 0`, shows a **setup state** (friendly prompt + "Set up savings goal" CTA) instead of the ring.
- `savings-form.tsx` — RHF + `zodResolver(saveSavingsSchema)`; fields target / current / monthly contribution (₹, `min={0}`); submits to `saveSavings`; closes on success.

**`src/components/loan/`** (client unless noted):
- `loan-view.tsx` — owns dialog state (edit loan + record payment); renders the ring (center: `pct%` + `paid / total`), a stats row (Remaining · EMI · "N months left" when `monthsLeft != null` · est. completion `monthLabel(addMonths(currentMonth(), monthsLeft))` ), a simple **start → finish timeline** (start = `startDate` label, finish = the completion estimate), and **Record payment** + **Edit loan** buttons. When `totalLoan === 0`, shows a **setup state** ("Add your loan details" CTA).
- `loan-form.tsx` — RHF + `zodResolver(saveLoanSchema)`; fields total / paid / EMI (₹, `min={0}`) + start date (date input); submits to `saveLoan`; surfaces the `paid ≤ total` refine error inline.

Loan-page color accent = nav pink `#ec4899`; savings-page accent = nav teal `#14b8a6` (matches `src/lib/nav.ts`), passed to `ProgressRing` via `color`.

### 2.8 Dashboard summary cards

**`src/components/dashboard/savings-card.tsx`** and **`src/components/dashboard/loan-card.tsx`** (client) — compact cards: a small `ProgressRing` (e.g. `size={72}`, center `pct%`), a label, the key figures (`current / target`, `paid / total`), a one-line subnote (`₹X to go` / `₹X left`), wrapped in a `next/link` to `/savings` and `/loan`. Setup-state variant ("Set a goal →") when the tracker is unconfigured.

**`src/app/(app)/page.tsx`** (modify): after the existing salary-summary fetch + empty-state early-return, fetch the trackers in parallel and render a 2-up row beneath the distribution/insights grid:
```tsx
const summary = await getMonthSummary(month);
if (!summary) return <DashboardEmptyState month={month} />;
const [savings, loan] = await Promise.all([getSavings(), getLoan()]);
// …existing Hero/QuickStats/grid…
<div className="grid gap-4 lg:grid-cols-2">
  <SavingsCard data={savings} />
  <LoanCard data={loan} />
</div>
```
The no-salary empty state is unchanged (cards appear on the populated dashboard); revisiting the empty state is out of scope.

### 2.9 Folder structure (Phase 3 additions)
```
src/
├── app/(app)/
│   ├── savings/page.tsx                  # was placeholder
│   ├── loan/page.tsx                     # was placeholder
│   └── page.tsx                          # MODIFY: fetch + render the two cards
├── components/
│   ├── ui/progress-ring.tsx
│   ├── trackers/amount-dialog.tsx
│   ├── savings/                          # savings-view, savings-form
│   ├── loan/                             # loan-view, loan-form
│   └── dashboard/                        # + savings-card, loan-card
├── lib/
│   ├── tracker-math.ts                   # + .test.ts
│   └── actions/
│       ├── savings.ts
│       └── loan.ts
├── services/
│   ├── savings.ts
│   └── loan.ts
├── validations/tracker.ts                # + .test.ts
└── models/
    ├── Savings.ts
    └── Loan.ts
```

### 2.10 New dependencies
**None.** framer-motion, `@radix-ui/react-dialog`, react-hook-form, `@hookform/resolvers`, zod are all already installed.

---

## 3. Definition of Done
1. `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npx next build` all pass.
2. Unit tests (TDD) pass for `savingsStats`, `loanStats` (incl. the zero/over-goal/no-rate edge cases) and for `saveSavingsSchema` / `saveLoanSchema` (incl. the `paid ≤ total` refine and invalid-date refine).
3. Setting a savings goal / loan details **persists to Atlas**; the ring, stats, and milestones reflect the saved values after revalidation.
4. **Add to savings** increments `currentAmount`; **Record payment** increments `paidAmount` and is **clamped to `totalLoan`** (never over-pays).
5. The progress ring animates to its value on mount (and snaps for reduced-motion).
6. Each page shows a **setup state** until configured (target / total still 0).
7. The dashboard shows the two summary cards on a populated month, each linking to its page and reflecting current progress.
8. Responsive: dialogs are centered modals on desktop / bottom sheets on mobile (reusing `Dialog`); pages read comfortably on both.

---

## 4. Out of Scope (Phase 3)
- Deriving `currentAmount` / `paidAmount` from the transactions ledger (Phase 4 reconcile).
- Notifications / EMI due reminders (Phase 5).
- Multiple simultaneous savings goals; multiple loans (single singleton each for now).
- Full amortization schedules, interest-rate math, principal/interest split (only an EMI-count completion estimate).
- Changing the dashboard no-salary empty state.

---

## 5. Open Questions
None blocking. Exact ring sizing, milestone chip styling, and the loan timeline visual will be tuned against the live UI.
