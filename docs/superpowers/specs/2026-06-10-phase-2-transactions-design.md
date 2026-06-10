# Phase 2 — Transactions Design

**Project:** FuFi — Future Financial (single-user)
**Date:** 2026-06-10
**Status:** Approved (pending written-spec review)
**Builds on:** Phase 1 (salary + planned-allocation dashboard), merged to `main`

---

## 1. Context

Phase 2 adds the **Transactions ledger** — recording, listing, editing, and deleting actual income & expenses with search, filter, and sort. It is intentionally a **standalone module**: the Phase 1 dashboard stays planned-allocation-based; reconciling planned-vs-actual (and over-budget warnings) is **Phase 4 (Budget)**.

**Stack (from Phase 1):** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Tailwind v4, Mongoose, Server-first (Server Components read, Server Actions mutate), single-user (`getCurrentUser()`), green theme, `formatCurrency`, `cn`, `Card`/`Button`/`Tooltip` primitives, responsive nav.

### Decisions locked during brainstorming
| Decision | Choice |
|---|---|
| Dashboard relationship | **Standalone ledger**; planned-vs-actual deferred to Phase 4 |
| Income | **Extra on top of salary** — income transactions are additional money; the Phase 1 `Salary` doc is untouched |
| Categories | **Self-contained transaction taxonomy** reusing Phase 1 colors/icons, + **Entertainment** + **income** categories (Phase 1 allocation categories stay separate) |
| Page scope | **All transactions** with client-side search + filters (type/category/month) + sort |
| Forms | **React Hook Form + Zod**; add/edit in a **responsive dialog** (modal on desktop, bottom sheet on mobile) |

---

## 2. Scope

### 2.1 Data model — `src/models/Transaction.ts`
```ts
Transaction {
  userId: ObjectId (ref User, required),
  title: string (required, trimmed),
  amount: number (required, > 0),     // always positive; the sign is implied by `type`
  type: "income" | "expense" (required),
  category: string (required),         // a transaction-category key
  date: Date (required),
  notes?: string,
  createdAt, updatedAt
}
salarySchema-style hot-reload guard.
index: { userId: 1, date: -1 }         // newest-first listing
```

### 2.2 Categories — `src/lib/transaction-categories.ts` (self-contained)
A single array of `{ key, label, type, color, icon }`. Phase 1's allocation categories (`src/lib/categories.ts`) are **left untouched**.
- **Expense:** family, loan, food, recharge, transport, shopping, **entertainment**, savings, investments, misc (colors/icons reused from Phase 1; entertainment = violet `#a855f7`, `Film`).
- **Income:** `salary_income` (Salary), `freelance`, `gift`, `other_income` — distinct keys so income/expense keys never collide.

Exports: `TxnType`, `TxnCategoryKey`, `TRANSACTION_CATEGORIES`, `TXN_CATEGORY_MAP` (key → entry), `categoriesForType(type)` (the list to show in the form for a chosen type).

### 2.3 Pure list logic — `src/lib/transaction-filters.ts` (unit-tested)
Pure functions so the client view stays thin and testable:
- `filterTransactions(list, { search, type, category, month })` — case-insensitive title search; `type`/`category`/`month` are `"all"` or a specific value; `month` is `"YYYY-MM"` matched against the transaction date.
- `sortTransactions(list, sort)` — `sort ∈ "date-desc" | "date-asc" | "amount-desc" | "amount-asc"`.
- `summarize(list)` → `{ income, expense, net }` (net = income − expense).

### 2.4 Validation — `src/validations/transaction.ts`
`saveTransactionSchema` (Zod): `title` (1–80, trimmed), `amount` (positive number), `type` (enum), `category` (string), `date` (coerced date), `notes` (≤300, optional). Refine: **the category must exist and its `type` must match the selected `type`** (no expense category on an income, etc.). Export `SaveTransactionInput`.

### 2.5 Read service — `src/services/transactions.ts`
- `type TransactionDTO = { id: string; title; amount; type; category; date: string /*ISO*/; notes: string | null }`.
- `listTransactions(): TransactionDTO[]` — connect, `getCurrentUser`, `Transaction.find({ userId }).sort({ date: -1, createdAt: -1 }).lean()`, mapped to plain serializable DTOs.

### 2.6 Mutations — `src/lib/actions/transactions.ts` (`"use server"`)
All validate with the schema, resolve `getCurrentUser`, enforce ownership (`userId`), and `revalidatePath("/transactions")`; each returns `{ ok: true } | { ok: false; error: string }`.
- `createTransaction(input)` → `Transaction.create({ userId, ...data })`.
- `updateTransaction(id, input)` → reject if `id` isn't a valid ObjectId; `updateOne({ _id: id, userId }, { $set })`; error if nothing matched.
- `deleteTransaction(id)` → `deleteOne({ _id: id, userId })`.

### 2.7 UI
**Page — `src/app/(app)/transactions/page.tsx`** (server): `const transactions = await listTransactions()` → `<TransactionsView transactions={transactions} />`.

**`src/components/transactions/`** (client unless noted):
- `transactions-view.tsx` — owns filter/sort/dialog state; derives the visible list via the pure helpers; renders toolbar + summary + list + empty state; opens the form dialog (add/edit) and the delete confirm.
- `transaction-toolbar.tsx` — search input, **type** segmented control (All/Income/Expense), **category** dropdown, **month** dropdown (built from the data + "All"), **sort** dropdown.
- `summary-strip.tsx` — Income / Expense / Net for the current filtered set (`formatCurrency`, tabular-nums; income green, expense neutral, net colored by sign).
- `transaction-row.tsx` — category color icon tile, title, `category · date`, signed amount (income `+` green / expense `−`), and edit + delete affordances (icon buttons; delete → confirm).
- `transaction-form.tsx` — RHF + `zodResolver(saveTransactionSchema)`; type toggle, title, ₹ amount, category select (`categoriesForType`), date, notes; submits to create/update; inline field errors; on success closes the dialog and the page revalidates.
- `empty-state.tsx` — friendly "No transactions yet" + an Add CTA (and a distinct "no matches" message when filters exclude everything).

**`src/components/ui/dialog.tsx`** — a reusable accessible dialog built on **@radix-ui/react-dialog**: dim/blur overlay, **centered modal on desktop / bottom sheet on mobile**, focus trap + Escape handled by Radix. Used by the transaction form (and reusable later).

### 2.8 Folder structure (Phase 2 additions)
```
src/
├── app/(app)/transactions/page.tsx          # was placeholder
├── components/
│   ├── transactions/                         # transactions-view, transaction-toolbar,
│   │                                         #   summary-strip, transaction-row,
│   │                                         #   transaction-form, empty-state
│   └── ui/dialog.tsx
├── lib/
│   ├── transaction-categories.ts
│   ├── transaction-filters.ts                # + .test.ts
│   └── actions/transactions.ts
├── services/transactions.ts
├── validations/transaction.ts                # + .test.ts
└── models/Transaction.ts
```

### 2.9 New dependencies
`react-hook-form`, `@hookform/resolvers`, `@radix-ui/react-dialog`. (`zod` already present.)

---

## 3. Definition of Done
1. `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npx next build` all pass.
2. Unit tests (TDD) pass for the pure logic: `filterTransactions`, `sortTransactions`, `summarize` (`transaction-filters`), and `saveTransactionSchema` (incl. the category↔type refine).
3. Add / edit / delete a transaction **persists to Atlas** and the list updates (newest-first).
4. Search, the type/category/month filters, and sort all work; the summary strip reflects the filtered set.
5. Income shows green `+`, expense neutral `−`; categories show their color icon.
6. The form validates client-side (empty title, non-positive amount, category/type mismatch) and the action rejects the same server-side.
7. Responsive: comfortable list on mobile (form as bottom sheet), roomier layout on desktop (form as centered modal).

---

## 4. Out of Scope (Phase 2)
- Dashboard planned-vs-actual integration and over-budget warnings (Phase 4 — Budget).
- Analytics charts (Phase 4).
- Recurring transactions, attachments/receipts, multi-currency, CSV import/export, pagination/virtualization (revisit if the dataset grows large).

---

## 5. Open Questions
None blocking. Exact toolbar layout, row affordances, and dialog motion will be tuned against the live UI.
