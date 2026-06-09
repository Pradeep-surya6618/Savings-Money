# Phase 0 — Foundation Design

**Project:** Personal Finance Manager (single-user)
**Date:** 2026-06-09
**Status:** Approved (pending written-spec review)

---

## 1. Context

A premium, Apple-inspired personal finance app. This document covers **Phase 0 (Foundation)** only — the infrastructure every later feature depends on. The full product (salary allocation, dashboard, transactions, savings/loan trackers, budget, analytics, notifications, settings) is delivered across later phases, each with its own spec → plan → build cycle.

### Stack (as installed — verified, not assumed)
- **Next.js 16.2.7** (App Router) — note key deltas from older Next: middleware is now **Proxy** (`proxy.ts`), request APIs (`cookies()`, `headers()`) are async, Turbopack is the default bundler.
- **React 19.2.4** with **React Compiler enabled** (`reactCompiler: true`) — no manual `useMemo`/`memo`/`useCallback`; let the compiler handle memoization.
- **Tailwind CSS v4** — CSS-first config (`@theme` in `globals.css`), no `tailwind.config.js`, uses `@tailwindcss/postcss`.
- **TypeScript**, ESLint 9.

### Phasing roadmap
- **Phase 0 — Foundation** (this doc): DB connection, base models, single-user resolution, app shell + navigation, theme system, base UI primitives.
- **Phase 1** — Salary & allocations + dashboard.
- **Phase 2** — Transactions.
- **Phase 3** — Savings & loan trackers.
- **Phase 4** — Budget + analytics.
- **Phase 5** — Notifications + settings polish.

---

## 2. Decisions (locked during brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Build approach | **Phased, foundation first** | Reviewable, lower compounding-error risk. |
| Users | **Single user** | Personal tool. Models still carry `userId` for future-proofing. |
| App lock | **None — opens straight to dashboard** | Simplest. Can add a gate later without schema changes. |
| Database | **MongoDB Atlas**, connection string supplied by user | Via `MONGODB_URI` in `.env.local`. |
| UI layer | **Radix primitives + custom styling** | Accessibility/keyboard handling for free, full control over the premium look, no CLI lock-in. |
| Data access | **Server-first** (Server Components read, Server Actions mutate) | Far less boilerplate than REST for a single-user app. A few Route Handlers only where useful (`/api/health`, later export/import). |
| Desktop nav | **Persistent sidebar + slim top bar** | Scales to many sections and wide analytics. |
| Mobile nav | **Sticky header + floating glass tab bar** (per spec) | — |
| Savings & Loan placement | **Prominent dashboard cards → own detail routes** | Visible without crowding the 5-tab bar. |
| Theme/palette | **Midnight Aurora** (near-black, blue→violet gradient, mint-positive) | Apple Wallet energy; dark mode is the hero. |

---

## 3. Scope of Phase 0

### 3.1 Dependencies to add
`mongoose`, `zustand`, `framer-motion`, `next-themes`, `lucide-react`, `clsx`, `tailwind-merge`, `zod`.
**Deferred to later phases:** `react-hook-form` (forms, Phase 1+), `recharts` (analytics, Phase 4).
**Dropped from original spec:** `next-auth` (no auth).

### 3.2 MongoDB connection — `src/lib/mongodb/connect.ts`
- Cached Mongoose singleton stored on `globalThis` so it survives Next dev hot-reload and serverless re-invocation (standard Next + Mongoose pattern: cache both `conn` and a `promise`).
- `MONGODB_URI` read from env and validated with Zod (`src/lib/env.ts`); throws a clear, actionable error if missing/malformed.
- Ship `.env.example` with `MONGODB_URI=` documented. Real value goes in `.env.local` (gitignored).

### 3.3 Single-user resolution — `src/lib/user.ts`
- `getCurrentUser()` performs find-or-create of the single `User` document and returns it (and its `_id`).
- Every model references `userId: ObjectId`. With one user this always resolves to the same id; adding real auth later requires no schema change.
- Cached per-request via React `cache()` to avoid duplicate lookups within a render.

### 3.4 Models built in Phase 0 — `src/models/`
Only what the foundation uses. Each model file guards against Mongoose model re-compilation on hot-reload (`models.X || model('X', schema)`).

**`User`**
```ts
{ _id, name: string, email?: string, image?: string, createdAt, updatedAt }
```

**`Settings`** (one per user)
```ts
{ _id, userId: ObjectId,
  theme: 'light' | 'dark' | 'system',   // default 'system'
  currency: string,                       // default 'INR'
  locale: string,                         // default 'en-IN'
  createdAt, updatedAt }
```

**Reference only — built in their own phases (not in Phase 0):** `Salary`, `Allocation`, `Transaction`, `Savings`, `Loan`, `Budget`, `Notification`. Field shapes follow the original product spec; captured here so the data model is coherent, but no schema files are created until the owning phase.

### 3.5 App shell & routing
- A `(app)` route group with one shared `layout.tsx` rendering the chrome:
  - **`AppShell`** — responsive container orchestrating the pieces.
  - **`Sidebar`** (desktop ≥ `lg`) — icon + label nav, active state.
  - **`TopBar`** (desktop) — page title slot, notification icon, theme toggle.
  - **`MobileHeader`** (sticky, < `lg`) — avatar, greeting, notification icon, theme toggle.
  - **`BottomTabBar`** (floating glass, < `lg`) — Home · Transactions · Budget · Analytics · Settings; backdrop blur, rounded, active-tab animation, iOS safe-area padding (`env(safe-area-inset-bottom)`).
- **Placeholder pages** with polished empty states (icon + heading + one-line "coming in Phase N"): `/` (Home), `/transactions`, `/budget`, `/analytics`, `/settings`, `/savings`, `/loan`.
- Nav config lives in one `src/lib/nav.ts` array consumed by Sidebar + BottomTabBar (single source of truth).

### 3.6 Theme system
- **Tokens** defined as CSS variables in `globals.css` under `:root` (light) and `.dark` (dark), exposed to Tailwind v4 via `@theme inline` so utilities like `bg-background`, `text-foreground`, `text-positive` work.
- **`next-themes`** (`class` attribute, `defaultTheme="system"`, `disableTransitionOnChange` to avoid flash) handles SSR no-flash + system mode.
- Preference also **synced to the `Settings` doc** via a Server Action when the user changes it (so it survives across devices/installs); `next-themes` localStorage remains the fast client source of truth.
- `ThemeToggle` component (light / dark / system) in the header/top bar.

#### Midnight Aurora tokens (initial — refined during implementation)
| Token | Dark | Light |
|---|---|---|
| `--background` | `#0B0B0F` | `#F7F7FA` |
| `--card` | `#16161C` | `#FFFFFF` |
| `--card-elevated` | `#1E1E26` | `#F0F0F4` |
| `--border` | `rgba(255,255,255,.08)` | `rgba(0,0,0,.08)` |
| `--foreground` | `#F5F5F7` | `#0B0B0F` |
| `--muted-foreground` | `#A1A1AA` | `#6B7280` |
| `--primary` | `#5B8CFF` | `#4F7DF0` |
| `--primary-end` (gradient) | `#8A5BFF` | `#7C5BF0` |
| `--positive` | `#34D399` | `#059669` |
| `--negative` | `#FB7185` | `#E11D48` |
| `--warning` | `#FBBF24` | `#D97706` |

Signature accent gradient: `linear-gradient(135deg, var(--primary), var(--primary-end))`. Light-mode accents are darkened for AA contrast on white.

### 3.7 Base UI primitives & utilities
- `src/components/ui/`: `Card` (glass surface variant), `Button` (primary gradient / ghost / outline), `ThemeToggle`. More Radix-backed primitives (Dialog, Select, Input, Switch, Tabs, Tooltip) added as features need them.
- `src/lib/utils.ts`: `cn()` (clsx + tailwind-merge); `formatCurrency(amount, { currency, locale })` defaulting to INR / en-IN via `Intl.NumberFormat`.
- Framer Motion: a shared `PageTransition` wrapper and small reusable variants — used sparingly so it stays smooth.

### 3.8 Folder structure (Phase 0 slice)
```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx          # AppShell chrome
│   │   ├── page.tsx            # Home placeholder
│   │   ├── transactions/page.tsx
│   │   ├── budget/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── savings/page.tsx
│   │   └── loan/page.tsx
│   ├── api/health/route.ts     # Atlas connectivity check
│   ├── layout.tsx              # root: <html>, ThemeProvider, fonts
│   └── globals.css             # Tailwind v4 + theme tokens
├── components/
│   ├── navigation/             # Sidebar, TopBar, MobileHeader, BottomTabBar, AppShell
│   └── ui/                     # Card, Button, ThemeToggle
├── lib/
│   ├── mongodb/connect.ts
│   ├── env.ts
│   ├── user.ts
│   ├── nav.ts
│   └── utils.ts
└── models/
    ├── User.ts
    └── Settings.ts
```

---

## 4. Definition of Done (verification)
1. `npm run build` succeeds and `npm run dev` runs without errors.
2. App opens at `/` to the dashboard **placeholder**; all 7 placeholder routes render.
3. Navigation is correct & responsive: sidebar + top bar on desktop (≥ lg), sticky header + floating tab bar on mobile (< lg); active states work; safe-area respected.
4. Theme toggle works for light / dark / system with **no flash on load**, and the choice **persists** (localStorage + `Settings` doc).
5. `GET /api/health` connects to Atlas and confirms read/write by resolving (find-or-create) the `User` + `Settings` docs — returns `{ ok: true }`.

---

## 5. Explicitly Out of Scope for Phase 0
- Any salary / allocation / transaction / savings / loan / budget business logic or UI beyond placeholders.
- Charts (Recharts) and analytics.
- Multi-field forms (React Hook Form) — only the settings theme toggle exists.
- Notifications system.
- Authentication of any kind.
- Real / seed financial data.

---

## 6. Open Questions
None blocking. Exact token values and motion timings will be tuned during implementation against the live UI.
