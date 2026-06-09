# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the infrastructure for a single-user, Apple-inspired personal finance app — DB connection, base models, theme system, and responsive app shell — so feature phases can plug in.

**Architecture:** Next.js 16 App Router, Server-first (Server Components read Mongoose directly; Server Actions mutate). A `(app)` route group provides the responsive chrome (desktop sidebar + top bar, mobile sticky header + floating tab bar). Theme via `next-themes` (class strategy) with Tailwind v4 CSS tokens (Midnight Aurora) and DB-synced preference. Single user resolved via find-or-create.

**Tech Stack:** Next 16.2.7, React 19.2.4 (React Compiler ON — no manual memoization), TypeScript, Tailwind v4, Mongoose, next-themes, zustand, framer-motion, lucide-react, zod, clsx + tailwind-merge. Tests: Vitest (pure logic only).

**Testing philosophy for this phase:** TDD is applied to pure logic (`cn`, `formatCurrency`, env parsing). The DB connection, theme behavior, and UI shell are verified by running the app and the `/api/health` endpoint per the spec's Definition of Done — RSC/visual component unit tests add little value here and high setup friction with React 19 + next-themes + framer-motion.

**Spec:** `docs/superpowers/specs/2026-06-09-phase-0-foundation-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/utils.ts` | `cn()` class merger + `formatCurrency()` |
| `src/lib/env.ts` | Zod-validated env access (`parseEnv`, `getEnv`) |
| `src/lib/mongodb/connect.ts` | Cached Mongoose connection singleton |
| `src/lib/user.ts` | `getCurrentUser()` find-or-create (single user) |
| `src/lib/nav.ts` | Navigation config (single source of truth) |
| `src/lib/actions/settings.ts` | `updateTheme()` Server Action |
| `src/models/User.ts` | User schema/model |
| `src/models/Settings.ts` | Settings schema/model |
| `src/app/api/health/route.ts` | Atlas connectivity check |
| `src/app/globals.css` | Tailwind v4 import + Midnight Aurora tokens |
| `src/app/layout.tsx` | Root: html, fonts, ThemeProvider |
| `src/components/theme/theme-provider.tsx` | next-themes wrapper (client) |
| `src/components/ui/card.tsx` | Card + glass surface |
| `src/components/ui/button.tsx` | Button (gradient/ghost/outline) |
| `src/components/theme/theme-toggle.tsx` | Light/dark/system toggle (client) |
| `src/components/navigation/*` | Sidebar, TopBar, MobileHeader, BottomTabBar, AppShell |
| `src/app/(app)/layout.tsx` | App chrome layout |
| `src/app/(app)/{,*}/page.tsx` | 7 placeholder pages |

---

## Task 1: Install dependencies

**Files:** `package.json` (modified by npm)

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npm install mongoose zustand framer-motion next-themes lucide-react clsx tailwind-merge zod
```
Expected: installs succeed, `package.json` dependencies updated, no peer-dependency ERRORS (React 19 warnings are acceptable).

- [ ] **Step 2: Install dev dependency for tests**

Run:
```bash
npm install -D vitest
```
Expected: vitest added to devDependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Phase 0 dependencies"
```

---

## Task 2: Vitest test runner setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/sanity.test.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 2: Add test script**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write a sanity test**

Create `src/lib/__tests__/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs the test runner", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run tests to verify runner works**

Run: `npm test`
Expected: PASS, 1 passed test.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json src/lib/__tests__/sanity.test.ts
git commit -m "chore: set up vitest"
```

---

## Task 3: `cn()` utility (TDD)

**Files:**
- Create: `src/lib/utils.ts`
- Test: `src/lib/utils.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: FAIL — cannot resolve `./utils` / `cn` not exported.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat: add cn class-merge utility"
```

---

## Task 4: `formatCurrency()` (TDD)

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `src/lib/utils.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/utils.test.ts`:
```ts
import { formatCurrency } from "./utils";

describe("formatCurrency", () => {
  it("formats INR with the ₹ symbol and no decimals by default", () => {
    expect(formatCurrency(40000)).toBe("₹40,000");
  });
  it("groups using the Indian numbering system", () => {
    expect(formatCurrency(100000)).toBe("₹1,00,000");
  });
  it("respects an overridden currency", () => {
    expect(formatCurrency(1000, { currency: "USD", locale: "en-US" })).toBe("$1,000");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: FAIL — `formatCurrency` not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/utils.ts`:
```ts
export function formatCurrency(
  amount: number,
  opts: { currency?: string; locale?: string } = {},
): string {
  const { currency = "INR", locale = "en-IN" } = opts;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: PASS, 6 tests total.

Note: if the runtime's ICU formats `₹40,000` as `₹40,000.00`, adjust nothing — `maximumFractionDigits: 0` removes decimals. If grouping differs on a minimal ICU build, the engineer should confirm Node has full ICU (Node 20+ ships full ICU by default).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat: add formatCurrency utility"
```

---

## Task 5: Env validation (TDD) + `.env.example`

**Files:**
- Create: `src/lib/env.ts`
- Test: `src/lib/env.test.ts`
- Create: `.env.example`

- [ ] **Step 1: Write the failing test**

Create `src/lib/env.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("accepts a valid mongodb uri", () => {
    const env = parseEnv({ MONGODB_URI: "mongodb+srv://u:p@cluster/db" });
    expect(env.MONGODB_URI).toContain("mongodb");
  });
  it("throws a clear error when MONGODB_URI is missing", () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI/);
  });
  it("throws when MONGODB_URI is not a mongo connection string", () => {
    expect(() => parseEnv({ MONGODB_URI: "http://nope" })).toThrow(/MONGODB_URI/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/env.test.ts`
Expected: FAIL — `parseEnv` not exported.

- [ ] **Step 3: Implement**

Create `src/lib/env.ts`:
```ts
import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine((v) => v.startsWith("mongodb"), "MONGODB_URI must be a MongoDB connection string"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${msg}`);
  }
  return parsed.data;
}

let cached: Env | null = null;

/** Lazily validate process.env so importing this module never throws. */
export function getEnv(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/env.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Create `.env.example`**

Create `.env.example`:
```
# MongoDB Atlas connection string (Database > Connect > Drivers)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/savings-money?retryWrites=true&w=majority
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts .env.example
git commit -m "feat: add validated env access"
```

---

## Task 6: Mongoose connection singleton

**Files:** Create `src/lib/mongodb/connect.ts`

(No unit test — verified end-to-end via `/api/health` in Task 9.)

- [ ] **Step 1: Implement the cached connection**

Create `src/lib/mongodb/connect.ts`:
```ts
import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: Cache | undefined;
}

const cache: Cache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const { MONGODB_URI } = getEnv();
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mongodb/connect.ts
git commit -m "feat: add cached mongoose connection"
```

---

## Task 7: User & Settings models

**Files:**
- Create: `src/models/User.ts`
- Create: `src/models/Settings.ts`

- [ ] **Step 1: Create the User model**

Create `src/models/User.ts`:
```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    image: { type: String },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>("User", userSchema);
```

- [ ] **Step 2: Create the Settings model**

Create `src/models/Settings.ts`:
```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const settingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    currency: { type: String, default: "INR" },
    locale: { type: String, default: "en-IN" },
  },
  { timestamps: true },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ?? model<SettingsDoc>("Settings", settingsSchema);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/models/User.ts src/models/Settings.ts
git commit -m "feat: add User and Settings models"
```

---

## Task 8: Single-user resolution

**Files:** Create `src/lib/user.ts`

- [ ] **Step 1: Implement `getCurrentUser` (find-or-create, serializable output)**

Create `src/lib/user.ts`:
```ts
import { cache } from "react";
import { connectDB } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { Settings } from "@/models/Settings";

export type CurrentUser = {
  user: { id: string; name: string; email: string | null; image: string | null };
  settings: { theme: "light" | "dark" | "system"; currency: string; locale: string };
};

/** Resolves the single app user, creating it (and its settings) on first run. */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  await connectDB();

  let userDoc = await User.findOne();
  if (!userDoc) userDoc = await User.create({ name: "You" });

  let settingsDoc = await Settings.findOne({ userId: userDoc._id });
  if (!settingsDoc) settingsDoc = await Settings.create({ userId: userDoc._id });

  return {
    user: {
      id: String(userDoc._id),
      name: userDoc.name,
      email: userDoc.email ?? null,
      image: userDoc.image ?? null,
    },
    settings: {
      theme: settingsDoc.theme as "light" | "dark" | "system",
      currency: settingsDoc.currency,
      locale: settingsDoc.locale,
    },
  };
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/user.ts
git commit -m "feat: add single-user resolution"
```

---

## Task 9: Health route — prove Atlas connectivity

**Files:** Create `src/app/api/health/route.ts`

**Prerequisite:** `MONGODB_URI` must be set in `.env.local` (copied from `.env.example` with the user's real Atlas string).

- [ ] **Step 1: Implement the route**

Create `src/app/api/health/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, settings } = await getCurrentUser();
    return NextResponse.json({ ok: true, user, settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify against Atlas**

Run (in one terminal): `npm run dev`
Then: open `http://localhost:3000/api/health` in a browser (or `curl http://localhost:3000/api/health`).
Expected: `{"ok":true,"user":{"id":"...","name":"You",...},"settings":{"theme":"system","currency":"INR","locale":"en-IN"}}`.
If `ok:false`, read the `error` — fix `MONGODB_URI` / Atlas network-access allowlist before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "feat: add /api/health Atlas connectivity check"
```

---

## Task 10: Midnight Aurora theme tokens

**Files:** Modify `src/app/globals.css` (replace entire file)

- [ ] **Step 1: Replace globals.css**

Replace the full contents of `src/app/globals.css` with:
```css
@import "tailwindcss";

/* Class-based dark mode for Tailwind v4 */
@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: #f7f7fa;
  --card: #ffffff;
  --card-elevated: #f0f0f4;
  --border: rgba(0, 0, 0, 0.08);
  --foreground: #0b0b0f;
  --muted-foreground: #6b7280;
  --primary: #4f7df0;
  --primary-end: #7c5bf0;
  --positive: #059669;
  --negative: #e11d48;
  --warning: #d97706;
}

.dark {
  --background: #0b0b0f;
  --card: #16161c;
  --card-elevated: #1e1e26;
  --border: rgba(255, 255, 255, 0.08);
  --foreground: #f5f5f7;
  --muted-foreground: #a1a1aa;
  --primary: #5b8cff;
  --primary-end: #8a5bff;
  --positive: #34d399;
  --negative: #fb7185;
  --warning: #fbbf24;
}

@theme inline {
  --color-background: var(--background);
  --color-card: var(--card);
  --color-card-elevated: var(--card-elevated);
  --color-border: var(--border);
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-primary: var(--primary);
  --color-primary-end: var(--primary-end);
  --color-positive: var(--positive);
  --color-negative: var(--negative);
  --color-warning: var(--warning);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add Midnight Aurora theme tokens"
```

---

## Task 11: ThemeProvider + root layout

**Files:**
- Create: `src/components/theme/theme-provider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create the ThemeProvider (client)**

Create `src/components/theme/theme-provider.tsx`:
```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 2: Update the root layout**

Replace `src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance",
  description: "Personal finance manager",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```
Note: `suppressHydrationWarning` on `<html>` is required by next-themes (it sets the `class`/`style` before hydration).

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/theme/theme-provider.tsx src/app/layout.tsx
git commit -m "feat: wire next-themes provider into root layout"
```

---

## Task 12: UI primitives — Card & Button

**Files:**
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/button.tsx`

- [ ] **Step 1: Create Card**

Create `src/components/ui/card.tsx`:
```tsx
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function GlassCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create Button**

Create `src/components/ui/button.tsx`:
```tsx
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-primary to-primary-end text-white shadow-sm hover:opacity-90",
  ghost: "text-foreground hover:bg-card-elevated",
  outline: "border border-border text-foreground hover:bg-card-elevated",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui/button.tsx
git commit -m "feat: add Card and Button primitives"
```

---

## Task 13: Settings Server Action + ThemeToggle

**Files:**
- Create: `src/lib/actions/settings.ts`
- Create: `src/components/theme/theme-toggle.tsx`

- [ ] **Step 1: Create the updateTheme Server Action**

Create `src/lib/actions/settings.ts`:
```ts
"use server";

import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Settings } from "@/models/Settings";

export async function updateTheme(theme: "light" | "dark" | "system"): Promise<void> {
  await connectDB();
  const { user } = await getCurrentUser();
  await Settings.updateOne({ userId: user.id }, { $set: { theme } }, { upsert: true });
}
```

- [ ] **Step 2: Create the ThemeToggle (client)**

Create `src/components/theme/theme-toggle.tsx`:
```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTheme } from "@/lib/actions/settings";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  const active = mounted ? theme : undefined;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          aria-label={label}
          aria-pressed={active === value}
          onClick={() => {
            setTheme(value);
            void updateTheme(value);
          }}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition",
            active === value
              ? "bg-gradient-to-br from-primary to-primary-end text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/settings.ts src/components/theme/theme-toggle.tsx
git commit -m "feat: add theme toggle with DB-synced preference"
```

---

## Task 14: Navigation config

**Files:** Create `src/lib/nav.ts`

- [ ] **Step 1: Create the nav config**

Create `src/lib/nav.ts`:
```ts
import {
  ArrowLeftRight,
  BarChart3,
  GraduationCap,
  Home,
  PiggyBank,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Primary nav — these 5 appear in the mobile bottom tab bar. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Secondary nav — sidebar only; reached on mobile via dashboard cards. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/loan", label: "Loan", icon: GraduationCap },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/nav.ts
git commit -m "feat: add navigation config"
```

---

## Task 15: Navigation components

**Files:**
- Create: `src/components/navigation/sidebar.tsx`
- Create: `src/components/navigation/top-bar.tsx`
- Create: `src/components/navigation/mobile-header.tsx`
- Create: `src/components/navigation/bottom-tab-bar.tsx`
- Create: `src/components/navigation/app-shell.tsx`

- [ ] **Step 1: Create a shared active-link helper + Sidebar**

Create `src/components/navigation/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-card/40 p-4 lg:flex">
      <div className="mb-6 bg-gradient-to-br from-primary to-primary-end bg-clip-text px-2 text-xl font-bold text-transparent">
        Finance
      </div>
      {[...PRIMARY_NAV, ...SECONDARY_NAV].map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
            isActive(pathname, href)
              ? "bg-card-elevated text-foreground"
              : "text-muted-foreground hover:bg-card-elevated hover:text-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: Create TopBar (desktop)**

Create `src/components/navigation/top-bar.tsx`:
```tsx
import { Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function TopBar({ greeting }: { greeting: string }) {
  return (
    <header className="hidden items-center justify-between border-b border-border px-6 py-4 lg:flex">
      <p className="text-sm text-muted-foreground">{greeting}</p>
      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create MobileHeader (sticky)**

Create `src/components/navigation/mobile-header.tsx`:
```tsx
import { Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function MobileHeader({ name, greeting }: { name: string; greeting: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-end text-sm font-semibold text-white">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">{greeting}</p>
          <p className="text-sm font-semibold">{name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <Bell className="h-4 w-4" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create BottomTabBar (floating glass)**

Create `src/components/navigation/bottom-tab-bar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="flex w-full max-w-md items-center justify-around rounded-full border border-border bg-card/70 p-2 shadow-lg backdrop-blur-xl">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5 transition", active && "scale-110")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Create AppShell (composes the chrome)**

Create `src/components/navigation/app-shell.tsx`:
```tsx
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { MobileHeader } from "./mobile-header";
import { BottomTabBar } from "./bottom-tab-bar";

export function AppShell({
  children,
  name,
  greeting,
}: {
  children: ReactNode;
  name: string;
  greeting: string;
}) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader name={name} greeting={greeting} />
        <TopBar greeting={greeting} />
        <main className="flex-1 px-4 pb-28 pt-4 lg:px-6 lg:pb-6">{children}</main>
      </div>
      <BottomTabBar />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/navigation
git commit -m "feat: add responsive navigation shell"
```

---

## Task 16: `(app)` route group + placeholder pages

**Files:**
- Create: `src/components/ui/placeholder.tsx`
- Create: `src/app/(app)/layout.tsx`
- Delete: `src/app/page.tsx` (old root page; replaced by `(app)/page.tsx`)
- Create: `src/app/(app)/page.tsx`
- Create: `src/app/(app)/transactions/page.tsx`
- Create: `src/app/(app)/budget/page.tsx`
- Create: `src/app/(app)/analytics/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/app/(app)/savings/page.tsx`
- Create: `src/app/(app)/loan/page.tsx`

- [ ] **Step 1: Create a reusable Placeholder empty-state**

Create `src/components/ui/placeholder.tsx`:
```tsx
import type { LucideIcon } from "lucide-react";

export function Placeholder({
  icon: Icon,
  title,
  phase,
}: {
  icon: LucideIcon;
  title: string;
  phase: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-end text-white">
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-xs text-sm text-muted-foreground">Coming in {phase}.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the `(app)` layout (reads user for greeting)**

Create `src/app/(app)/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";
import { getCurrentUser } from "@/lib/user";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  let name = "You";
  try {
    const { user } = await getCurrentUser();
    name = user.name;
  } catch {
    // DB unavailable — render shell with defaults so the UI still loads.
  }
  return (
    <AppShell name={name} greeting={greetingFor(new Date())}>
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 3: Delete the old root page**

Run: `git rm src/app/page.tsx`
(The `(app)` route group provides `/` via `src/app/(app)/page.tsx`. Two files resolving to `/` is a build error, so the old one must go.)

- [ ] **Step 4: Create the Home placeholder**

Create `src/app/(app)/page.tsx`:
```tsx
import { Home } from "lucide-react";
import { Placeholder } from "@/components/ui/placeholder";

export default function HomePage() {
  return <Placeholder icon={Home} title="Dashboard" phase="Phase 1" />;
}
```

- [ ] **Step 5: Create the remaining placeholders**

Create `src/app/(app)/transactions/page.tsx`:
```tsx
import { ArrowLeftRight } from "lucide-react";
import { Placeholder } from "@/components/ui/placeholder";

export default function TransactionsPage() {
  return <Placeholder icon={ArrowLeftRight} title="Transactions" phase="Phase 2" />;
}
```

Create `src/app/(app)/budget/page.tsx`:
```tsx
import { Wallet } from "lucide-react";
import { Placeholder } from "@/components/ui/placeholder";

export default function BudgetPage() {
  return <Placeholder icon={Wallet} title="Budget" phase="Phase 4" />;
}
```

Create `src/app/(app)/analytics/page.tsx`:
```tsx
import { BarChart3 } from "lucide-react";
import { Placeholder } from "@/components/ui/placeholder";

export default function AnalyticsPage() {
  return <Placeholder icon={BarChart3} title="Analytics" phase="Phase 4" />;
}
```

Create `src/app/(app)/settings/page.tsx`:
```tsx
import { Settings } from "lucide-react";
import { Placeholder } from "@/components/ui/placeholder";

export default function SettingsPage() {
  return <Placeholder icon={Settings} title="Settings" phase="Phase 5" />;
}
```

Create `src/app/(app)/savings/page.tsx`:
```tsx
import { PiggyBank } from "lucide-react";
import { Placeholder } from "@/components/ui/placeholder";

export default function SavingsPage() {
  return <Placeholder icon={PiggyBank} title="Savings" phase="Phase 3" />;
}
```

Create `src/app/(app)/loan/page.tsx`:
```tsx
import { GraduationCap } from "lucide-react";
import { Placeholder } from "@/components/ui/placeholder";

export default function LoanPage() {
  return <Placeholder icon={GraduationCap} title="Education Loan" phase="Phase 3" />;
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app src/components/ui/placeholder.tsx
git commit -m "feat: add app shell layout and placeholder pages"
```

---

## Task 17: Final verification (Definition of Done)

**Files:** none (verification only)

- [ ] **Step 1: Lint & typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds; all 7 `(app)` routes + `/api/health` listed in the output.

- [ ] **Step 3: Run all unit tests**

Run: `npm test`
Expected: all tests pass (sanity, cn ×3, formatCurrency ×3, env ×3).

- [ ] **Step 4: Manual DoD walkthrough**

Run: `npm run dev`, then in the browser verify each:
- `http://localhost:3000/` opens to the **Dashboard** placeholder.
- Resize the window: at ≥1024px the **sidebar + top bar** show and the bottom bar hides; below 1024px the **sticky header + floating tab bar** show and the sidebar hides.
- Click each tab (Home, Transactions, Budget, Analytics, Settings) and the sidebar's Savings/Loan — each placeholder renders, active state updates.
- Toggle theme light → dark → system: colors switch instantly with **no flash**, and the choice survives a full page reload.
- `http://localhost:3000/api/health` returns `{"ok":true,...}` and `settings.theme` reflects your last toggle (confirms the DB write).

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: Phase 0 foundation verified"
```

---

## Self-Review Notes (author)

- **Spec coverage:** §3.1 deps → T1; §3.2 connection → T6; §3.3 single user → T8; §3.4 models → T7; §3.5 shell/routing → T14–16; §3.6 theme → T10,11,13; §3.7 primitives/utils → T3,4,12; DoD §4 → T9,17; out-of-scope §5 respected (no feature logic, charts, or forms beyond the theme toggle).
- **Type consistency:** `getCurrentUser()` returns `{ user.id: string, ... }`; `updateTheme` filters by `{ userId: user.id }` (Mongoose casts string→ObjectId). `NavItem` shape consumed identically by Sidebar/TopBar/BottomTabBar. `cn`/`formatCurrency` signatures match their call sites.
- **No placeholders:** every code step shows complete code; no TBD/TODO.
- **Known runtime caveats flagged inline:** full-ICU note (T4), Atlas allowlist (T9), next-themes `suppressHydrationWarning` (T11), duplicate `/` route deletion (T16).
