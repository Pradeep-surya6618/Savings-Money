# Premium UI Redesign Design

**Project:** FuFi — Future Financial (single-user)
**Date:** 2026-06-11
**Status:** Approved (pending written-spec review)
**Reference mockups:** `public/UI/FuFi-UI.png` (light), `public/UI/FuFi-Dark-UI.png` (dark)
**Builds on:** Phases 0–4 (all merged) + the FuFi brand gradients

---

## 1. Context

Restyle the **entire app** to match the provided premium mockups — Dashboard, Transactions, Budget, Analytics, Savings, Loan, Settings — in **both light and dark themes**, with **premium select & date controls**. The app already has the green brand, hero card, stat cards, allocation list, donut/sparkline charts, and per-page month navigation, so this is largely a **polish + structural-alignment** pass plus a few new elements, not a rebuild.

**Decisions locked during brainstorming:**
| Decision | Choice |
|---|---|
| Settings | **Build the full Settings UI now** (all sections + controls); defer real notification scheduling and actual data export/delete behavior to Phase 5 |
| New visuals | **Real data + sensible formulas** — drive every chart from real transactions/salary; define a Financial Health Score; mini-sparklines reuse the 6-month analytics series |
| Build approach | **Foundation first** (shared primitives) → pages in batches → **polish live** against the running app |
| Mobile bottom bar | **Unchanged** (keep the current `BottomTabBar`) |
| Dashboard reconciliation | The mockup's 4 stat cards (Total Expenses · Savings · Loan Paid · Remaining) + Budget Allocation + Smart Insights **replace** the current 5-up `QuickStats` and the Phase-3 dashboard Savings/Loan cards; goal-progress rings stay on `/savings` and `/loan` |

**Stack (unchanged):** Next 16 App Router, React 19 (React Compiler ON — no manual memoization), Tailwind v4 (CSS-first tokens), framer-motion, Mongoose, server-first. **New dependencies:** `@radix-ui/react-select`, `@radix-ui/react-popover` (for the premium Select + the date/month calendar popover; the calendar is built by hand — no date library).

**Scale note:** This touches every page. It is delivered as **one design system applied across the app**, executed in batches (foundation → Dashboard+Transactions → Budget+Analytics → Savings+Loan+Settings). Each batch leaves the app working and is reviewed live.

---

## 2. Design system foundation (`src/components/ui/`, built first)

The visual language extracted from the mockups, as reusable primitives. **Everything reads from theme tokens** so light/dark both work.

### 2.1 Tokens & surfaces (`globals.css`)
- Tune card surfaces to the mockup: `rounded-2xl`, hairline `border-border`, soft shadow (`shadow-sm`/a custom `--shadow-card`), comfortable padding. Define `--shadow-card` (light) and a subtler dark variant.
- Re-tune dark theme to `FuFi-Dark-UI.png`: near-black app background, dark **elevated** card surface distinct from the bg, brand hero/gradients stay vivid. Adjust `--card`, `--card-elevated`, `--border`, `--muted-foreground` for the dark mockup's contrast.
- Keep the existing brand gradient tokens/classes (`.bg-brand`, `.bg-hero`, `.btn-brand`).

### 2.2 Card & section primitives
- **`Card`** (exists) — tune radius/shadow/padding.
- **`SectionCard`** — `Card` + a header row: title (`text-sm font-semibold`) + optional right action (`See all` / `View all` link or button). Used by Budget Allocation, Smart Insights, and most page sections.

### 2.3 Data-display primitives
- **`StatCard`** (rebuild) — `{ label, value (₹), pct?, trend?: number[], trendTone?: "positive"|"negative", icon? }`. Renders label, big tabular value, a small %-chip, and either a **mini-sparkline** (when `trend` given) or an icon chip. Matches the dashboard's Total Expenses / Savings / Loan Paid / Remaining cards and the Budget Over/Under/On-Track cards.
- **`MiniSparkline`** — compact area/line (≈64×28) for `StatCard`; reuses `Sparkline` internals or a slim variant.
- **`RingStat`** — a card built around the existing `ProgressRing`: large center % + caption (e.g. "of budget used", "of goal achieved", "of loan repaid") and a sub-line (`₹27,500 of ₹40,000`). Used by Budget Overview, Savings Goal, Loan Overview.
- **`GaugeChart`** — semicircular gauge (SVG arc, framer entrance, `useReducedMotion`) for the **Financial Health Score**: `{ score: 0–100, label }`; arc color bands (red/amber/green).
- **`DataTable`** — a thin, styled table wrapper: rounded container, header row (`text-xs uppercase text-muted-foreground`), hover/zebra body rows, right-aligned numeric columns (`tabular-nums`). Generic `columns` + `rows` render-props or typed per use. Used by Transactions (desktop) and the Budget category table.
- **`Timeline`** — horizontal milestone track (dots + connecting line, reached/next/target states) for the Savings milestones.

### 2.4 Premium form controls
Replace native `<select>` and `<input type="date">` everywhere (transaction form, salary/allocation editor, savings/loan forms, budget/analytics/dashboard month controls, Settings):
- **`Select`** — on `@radix-ui/react-select`: trigger styled like the field inputs (`rounded-xl border bg-card`), chevron, animated content panel, checkmark on the active item, keyboard accessible.
- **`DatePicker`** — on `@radix-ui/react-popover`: a field trigger (calendar icon + formatted date) opening a hand-built month calendar (day grid, prev/next month, today, clears focus trap via Radix). Returns/accepts a `YYYY-MM-DD` string (matches existing form value shapes).
- **`MonthPicker`** — the `June 2026 📅 ⌄` control: a popover with prev/next + a 12-month grid + year stepper; selecting navigates `?month=` (replaces the dashboard `MonthSwitcher` and the Phase-4 `MonthNav`, which are removed/absorbed). Disabled for future months (matches current behavior).
- **`SearchInput`** — styled search field with a leading icon (Transactions toolbar).

### 2.5 Shell & navigation
- **`Sidebar`** (desktop) — polish to the mockup: logo + wordmark top, nav items with line icons, **active = soft-green pill + green text/icon**, user footer (`name` + "Premium Plan"). Keep the existing collapse + per-item colors where they still read well; align spacing/typography to the mockup.
- **`TopBar`** (desktop greeting bar) — left: greeting + **user name** + "Here's your financial overview" subtitle (👋). Right: notifications bell, theme toggle, display/system toggle. (The per-page month control stays in the page body via `MonthPicker`, styled to sit top-right of the page header.)
- **`MobileHeader`** — align greeting/name styling to the mockup.
- **`BottomTabBar`** — **unchanged.**

---

## 3. Per-page restyle

Each page keeps its existing data services; this is presentation. Pages stay server components reading services; interactive bits (charts, pickers, tabs, forms) are client components.

### 3.1 Dashboard (`/`)
Greeting bar → **Total Salary** green hero (amount + "Received on …") → **4 `StatCard`s** (Total Expenses · Savings · Loan Paid · Remaining, each as ₹ + %-of-salary + mini-sparkline of its recent-month trend) → **Budget Allocation** `SectionCard` (the existing allocation list, restyled: category icon, bar, amount, %) → **Smart Insights** `SectionCard` (existing insights + "View all insights"). Data: `getMonthSummary(month)` for hero/stats/allocation/insights + `getAnalytics(month)` for the sparkline series. The month control is the new `MonthPicker`.

### 3.2 Transactions (`/transactions`)
- **Desktop:** `DataTable` — Date · Title · Category (color chip) · Type (income/expense pill) · Amount (signed, colored) · Notes; with `SearchInput` + type segmented control + category/month/sort filters + green **Add Transaction** button; a footer summary (Total income · Total expenses · Net savings).
- **Mobile:** keep the existing transaction-row card list + FAB, restyled to the mockup.
- Reuses the Phase-2 view state, filters, and dialogs; the form's inputs adopt the premium `Select`/`DatePicker`.

### 3.3 Budget (`/budget`)
**Budget Overview** `RingStat` (68% of budget used · ₹spent of ₹salary) + **Category Budget** `DataTable` (Category · Budget · Spent · % Used, with a thin per-row bar) + three `StatCard`s (Over Budget · Under Budget · On Track, counts/amounts derived from the reconciliation). Reuses `getBudget` / `reconcileBudget`; status counts computed from `rows`.

### 3.4 Analytics (`/analytics`)
**Tab bar** (Overview · Spending · Savings · Loan). **Overview** = Monthly Spending bars + Expense Categories donut + Savings Trend area + **Financial Health Score** `GaugeChart`. Spending/Savings/Loan tabs surface the corresponding existing analytics views (spending donut/top categories; savings rate; a loan view). Tabs are client state (no route change) or `?tab=`. New: **Financial Health Score** — a pure function (TDD) combining savings rate, budget adherence, and loan-progress into 0–100 + a band label. Reuses `getAnalytics`; extends it with the health inputs.

### 3.5 Savings (`/savings`)
**Savings Goal** `RingStat` (68% of goal) + **Goal Details** list (Goal Amount · Current · Monthly Contribution · Target Date · Months to Go) + **Milestones** `Timeline` (25/50/75/100% with reached/next/target). Reuses `getSavings` / `savingsStats`; restyles the Phase-3 view; keeps Add/Edit dialogs (premium controls). *(Target Date / Months to Go: surface from existing data; if not modeled, show from `monthsToGoal` + computed target month.)*

### 3.6 Loan (`/loan`)
**Loan Overview** `RingStat` (42% repaid) + **Loan Details** list (Total · Paid · Remaining · EMI · Start · End) + **Repayment Progress** area chart (cumulative paid over time, best-effort from EMI + start date). Reuses `getLoan` / `loanStats`; restyles the Phase-3 view; keeps Record-payment/Edit dialogs.

### 3.7 Settings (`/settings`) — full UI now, heavy logic → Phase 5
Two-pane layout: left **sub-nav** (General · Appearance · Notifications · Currency · Data & Privacy · Security · About FuFi); right **panels**:
- **General:** Language, Date Format, First Day of Week, Default View (`Select`s).
- **Appearance:** theme (light/dark/system) — wired to the existing theme system; accent preview.
- **Currency:** currency + locale (`Select`s) — wired to the `Settings` model.
- **Notifications:** toggles laid out per the mockup — **UI only**, persisted as preferences if trivial; actual scheduling/delivery is **Phase 5**.
- **Data & Privacy / Security / About:** Export / Import / **Delete account** buttons + info — **UI only**; real export/delete behavior is **Phase 5** (buttons present, no destructive action wired).
Wire the easy prefs to the `Settings` doc via a small server action (theme already via next-themes; currency/locale/dateFormat/firstDayOfWeek/defaultView persisted). New `Settings` fields (`dateFormat`, `firstDayOfWeek`, `defaultView`, `language`) added with sensible defaults.

---

## 4. Dark theme
Every primitive and page uses theme tokens, so dark mode follows automatically. Re-tune the dark token values to match `FuFi-Dark-UI.png` (background, elevated cards, borders, muted text), verify each page in dark mode during live polish. Charts pass theme-aware colors (already the pattern); gauge/ring/table inherit tokens.

---

## 5. Folder structure (additions / changes)
```
src/
├── components/ui/
│   ├── select.tsx            # NEW (radix-select)
│   ├── date-picker.tsx       # NEW (radix-popover + hand-built calendar)
│   ├── month-picker.tsx      # NEW (replaces MonthSwitcher + MonthNav usage)
│   ├── search-input.tsx      # NEW
│   ├── section-card.tsx      # NEW
│   ├── stat-card.tsx         # REWORK (sparkline/%/icon)
│   ├── mini-sparkline.tsx    # NEW
│   ├── ring-stat.tsx         # NEW
│   ├── gauge-chart.tsx       # NEW
│   ├── data-table.tsx        # NEW
│   └── timeline.tsx          # NEW
├── components/{dashboard,transactions,budget,analytics,savings,loan,settings}/  # restyled + new pieces
├── components/navigation/{sidebar,top-bar,mobile-header}.tsx                     # polish (bottom-tab-bar unchanged)
├── components/settings/                                                          # NEW settings panels + sub-nav
├── lib/health-score.ts (+ .test.ts)                                              # NEW Financial Health Score (TDD)
├── lib/actions/settings.ts                                                       # NEW (persist prefs)
├── models/Settings.ts                                                            # extend fields
├── app/(app)/settings/page.tsx                                                   # build out
└── app/globals.css                                                               # token/surface tuning
```

---

## 6. Definition of Done
1. `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build` all pass. (`npm run` scripts are unreliable in this Windows harness — use `npx`.)
2. All 7 pages visually match the mockups in **both** light and dark themes (verified live), with the mobile bottom bar unchanged.
3. Premium `Select` / `DatePicker` / `MonthPicker` replace all native `<select>` / `<input type="date">` / month controls and are keyboard-accessible.
4. New `StatCard`/`RingStat`/`GaugeChart`/`DataTable`/`Timeline`/`MiniSparkline` primitives are reused across pages (no per-page duplication).
5. Financial Health Score is unit-tested and derived from real data; mini-sparklines use the real 6-month series.
6. Settings page is fully laid out; easy prefs persist; notification scheduling + real export/delete are clearly deferred (no destructive action wired).
7. No regressions to existing data/services; React Compiler discipline (no manual memoization); charts respect reduced motion.

---

## 7. Out of scope (→ Phase 5)
Real notification scheduling/delivery; actual data export file generation + account deletion; any new financial features or data model beyond the small Settings-prefs fields and the health-score computation. Pixel-exact spacing is finalized during live polish, not pre-specified here.

---

## 8. Open questions
None blocking. Exact tab mechanism on Analytics (`?tab=` vs local state), the loan repayment-progress data derivation, and final dark-token values are settled during live polish.
