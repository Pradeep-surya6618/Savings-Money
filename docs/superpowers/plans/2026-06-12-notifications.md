# In-app Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the inert 🔔 bell (top bar + mobile header) into a working in-app notification center driven by alerts derived from the user's own data, and make the Settings → Notifications toggles real.

**Architecture:** Alerts are *derived live* on each request — the root layout calls a `getNotifications()` service that runs pure generator logic over current-month Salary, budget figures, and Savings, then applies the user's `notifyPrefs` and a small `NotificationState` (read/dismissed key sets). No materialized feed. A client `NotificationBell` renders a Radix popover with optimistic mark-read / mark-all / dismiss, persisted via server actions.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), React 19 (React Compiler ON — no manual memoization), Mongoose, Tailwind v4, @radix-ui/react-popover, zustand toast store, lucide-react, Vitest (pure logic only).

**Spec:** `docs/superpowers/specs/2026-06-12-notifications-design.md`

**Branch:** Do this on a `notifications` feature branch (not `main`). The user has unrelated uncommitted changes (`next.config.ts`, `public/UI/FuFi-Dark-UI.png`) — leave them untouched and never stage them.

**Verification note (this Windows harness):** `npm run lint` / `npm run test` exit non-zero regardless of result. Always use `npx` forms: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`.

---

## File Structure

**New**
- `src/lib/notifications-math.ts` — pure alert generators + read/dismiss/prefs filtering. No DB. Single source of the `Notification*` types.
- `src/lib/notifications-math.test.ts` — Vitest coverage of the generators.
- `src/models/NotificationState.ts` — per-user `{ readKeys, dismissedKeys }` singleton.
- `src/services/notifications.ts` — `getNotifications()`: reads data + state, calls the pure builder, returns `{ items, unreadCount }`.
- `src/lib/actions/notifications.ts` — `markNotificationRead`, `markAllNotificationsRead`, `dismissNotification`, `updateNotifyPrefs`.
- `src/components/notifications/notification-bell.tsx` — client bell + popover panel.
- `src/validations/settings.test.ts` — Vitest coverage of the new prefs schema.

**Modified**
- `src/validations/settings.ts` — add `updateNotifyPrefsSchema` + `NotifyPrefs` type.
- `src/models/Settings.ts` — add `notifyPrefs` subdocument.
- `src/lib/user.ts` — surface `settings.notifyPrefs` with defaults.
- `src/app/(app)/layout.tsx` — fetch notifications, pass to `AppShell`.
- `src/components/navigation/app-shell.tsx` — thread `notifications` to headers.
- `src/components/navigation/top-bar.tsx` + `src/components/navigation/mobile-header.tsx` — render `NotificationBell`.
- `src/components/settings/settings-view.tsx` — controlled, persisted notification toggles; remove EMI; refactor `ToggleRow` to controlled.
- `src/app/(app)/settings/page.tsx` — pass `notifyPrefs` to `SettingsView`.

---

## Task 1: Notification preferences — schema, model, user plumbing

**Files:**
- Modify: `src/validations/settings.ts`
- Test: `src/validations/settings.test.ts` (create)
- Modify: `src/models/Settings.ts`
- Modify: `src/lib/user.ts`

- [ ] **Step 1: Write the failing test for the prefs schema**

Create `src/validations/settings.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { updateNotifyPrefsSchema } from "@/validations/settings";

describe("updateNotifyPrefsSchema", () => {
  it("accepts three booleans", () => {
    const r = updateNotifyPrefsSchema.safeParse({ salary: true, budget: false, savings: true });
    expect(r.success).toBe(true);
  });

  it("rejects a missing key", () => {
    const r = updateNotifyPrefsSchema.safeParse({ salary: true, budget: false });
    expect(r.success).toBe(false);
  });

  it("rejects non-boolean values", () => {
    const r = updateNotifyPrefsSchema.safeParse({ salary: "yes", budget: false, savings: true });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/validations/settings.test.ts`
Expected: FAIL — `updateNotifyPrefsSchema` is not exported.

- [ ] **Step 3: Add the schema + type**

In `src/validations/settings.ts`, append:

```ts
export const updateNotifyPrefsSchema = z.object({
  salary: z.boolean(),
  budget: z.boolean(),
  savings: z.boolean(),
});

export type NotifyPrefs = z.infer<typeof updateNotifyPrefsSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/validations/settings.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add `notifyPrefs` to the Settings model**

In `src/models/Settings.ts`, add this field inside the schema object (after `openingBalance`):

```ts
    notifyPrefs: {
      salary: { type: Boolean, default: true },
      budget: { type: Boolean, default: true },
      savings: { type: Boolean, default: true },
    },
```

- [ ] **Step 6: Surface `notifyPrefs` from `getCurrentUser`**

In `src/lib/user.ts`:

Add the import at the top (with the other imports):

```ts
import type { NotifyPrefs } from "@/validations/settings";
```

Add to the `CurrentUser["settings"]` type (after `openingBalance: number;`):

```ts
    notifyPrefs: NotifyPrefs;
```

Add to the returned `settings` object (after `openingBalance: settingsDoc.openingBalance ?? 0,`):

```ts
      notifyPrefs: {
        salary: settingsDoc.notifyPrefs?.salary ?? true,
        budget: settingsDoc.notifyPrefs?.budget ?? true,
        savings: settingsDoc.notifyPrefs?.savings ?? true,
      },
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/validations/settings.ts src/validations/settings.test.ts src/models/Settings.ts src/lib/user.ts
git commit -m "feat: notifyPrefs schema, Settings field, and user plumbing"
```

---

## Task 2: Pure alert generators (`notifications-math.ts`)

**Files:**
- Create: `src/lib/notifications-math.ts`
- Test: `src/lib/notifications-math.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/notifications-math.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildNotifications, highestMilestone, type BuildNotificationsInput } from "@/lib/notifications-math";

const id = (n: number) => String(n); // deterministic "formatter" for assertions

function base(overrides: Partial<BuildNotificationsInput> = {}): BuildNotificationsInput {
  return {
    month: "2026-06",
    salaryAmount: 50000, // logged → no salary alert by default
    budgetRows: [],
    savings: { current: 0, target: 0 },
    prefs: { salary: true, budget: true, savings: true },
    state: { readKeys: [], dismissedKeys: [] },
    format: id,
    ...overrides,
  };
}

describe("highestMilestone", () => {
  it("returns null below 25% or with no target", () => {
    expect(highestMilestone(10, 100)).toBeNull();   // 10%
    expect(highestMilestone(50, 0)).toBeNull();      // no target
    expect(highestMilestone(0, 100)).toBeNull();     // nothing saved
  });
  it("returns the highest crossed threshold", () => {
    expect(highestMilestone(25, 100)).toBe(25);
    expect(highestMilestone(49, 100)).toBe(25);
    expect(highestMilestone(50, 100)).toBe(50);
    expect(highestMilestone(99, 100)).toBe(75);
    expect(highestMilestone(100, 100)).toBe(100);
    expect(highestMilestone(120, 100)).toBe(100);
  });
});

describe("buildNotifications — salary", () => {
  it("fires when salary is null or 0", () => {
    expect(buildNotifications(base({ salaryAmount: null })).items.some((n) => n.key === "salary:2026-06")).toBe(true);
    expect(buildNotifications(base({ salaryAmount: 0 })).items.some((n) => n.type === "salary")).toBe(true);
  });
  it("does not fire when salary is logged", () => {
    expect(buildNotifications(base({ salaryAmount: 50000 })).items.some((n) => n.type === "salary")).toBe(false);
  });
  it("is gated by prefs.salary", () => {
    const r = buildNotifications(base({ salaryAmount: null, prefs: { salary: false, budget: true, savings: true } }));
    expect(r.items.some((n) => n.type === "salary")).toBe(false);
  });
});

describe("buildNotifications — budget", () => {
  it("fires once per over-spent budgeted category", () => {
    const r = buildNotifications(base({
      budgetRows: [
        { category: "food", planned: 6000, actual: 7200 },   // over
        { category: "rent", planned: 5000, actual: 5000 },   // exactly on budget → no
        { category: "misc", planned: 0, actual: 500 },       // unbudgeted → no
      ],
    }));
    const budget = r.items.filter((n) => n.type === "budget");
    expect(budget).toHaveLength(1);
    expect(budget[0].key).toBe("budget:food:2026-06");
    expect(budget[0].message).toBe("1200 over your 6000 allocation.");
  });
  it("uses categoryLabel for the title", () => {
    const r = buildNotifications(base({
      budgetRows: [{ category: "food", planned: 6000, actual: 7000 }],
      categoryLabel: (k) => k.toUpperCase(),
    }));
    expect(r.items.find((n) => n.type === "budget")?.title).toBe("FOOD is over budget");
  });
  it("is gated by prefs.budget", () => {
    const r = buildNotifications(base({
      budgetRows: [{ category: "food", planned: 6000, actual: 7000 }],
      prefs: { salary: true, budget: false, savings: true },
    }));
    expect(r.items.some((n) => n.type === "budget")).toBe(false);
  });
});

describe("buildNotifications — savings", () => {
  it("emits only the highest crossed milestone", () => {
    const r = buildNotifications(base({ savings: { current: 30000, target: 50000 } })); // 60% → 50
    const s = r.items.filter((n) => n.type === "savings");
    expect(s).toHaveLength(1);
    expect(s[0].key).toBe("savings:50");
  });
  it("does not fire below 25% or without a target", () => {
    expect(buildNotifications(base({ savings: { current: 10, target: 100 } })).items.some((n) => n.type === "savings")).toBe(false);
    expect(buildNotifications(base({ savings: { current: 100, target: 0 } })).items.some((n) => n.type === "savings")).toBe(false);
  });
});

describe("buildNotifications — read/dismiss state + unreadCount", () => {
  it("omits dismissed keys", () => {
    const r = buildNotifications(base({ salaryAmount: null, state: { readKeys: [], dismissedKeys: ["salary:2026-06"] } }));
    expect(r.items.some((n) => n.key === "salary:2026-06")).toBe(false);
  });
  it("marks read keys as not unread and counts only unread", () => {
    const r = buildNotifications(base({
      salaryAmount: null,
      savings: { current: 50000, target: 100000 }, // savings:50
      state: { readKeys: ["savings:50"], dismissedKeys: [] },
    }));
    const salary = r.items.find((n) => n.key === "salary:2026-06");
    const savings = r.items.find((n) => n.key === "savings:50");
    expect(salary?.unread).toBe(true);
    expect(savings?.unread).toBe(false);
    expect(r.unreadCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/notifications-math.test.ts`
Expected: FAIL — module/exports don't exist.

- [ ] **Step 3: Implement the pure module**

Create `src/lib/notifications-math.ts`:

```ts
import type { NotifyPrefs } from "@/validations/settings";

export type NotificationType = "salary" | "budget" | "savings";

export type Notification = {
  key: string; // stable identity, e.g. "budget:food:2026-06"
  type: NotificationType;
  title: string;
  message: string;
  context: string;
  href: string;
};

export type NotificationDTO = Notification & { unread: boolean };

export type NotificationStateKeys = { readKeys: string[]; dismissedKeys: string[] };

export const MILESTONES = [25, 50, 75, 100] as const;
export type MilestoneValue = (typeof MILESTONES)[number];

export type BuildNotificationsInput = {
  month: string; // "YYYY-MM"
  salaryAmount: number | null; // null = no salary doc this month
  budgetRows: { category: string; planned: number; actual: number }[]; // planned categories only
  savings: { current: number; target: number };
  prefs: NotifyPrefs;
  state: NotificationStateKeys;
  format: (n: number) => string; // currency formatter
  categoryLabel?: (key: string) => string;
};

/** Largest milestone (25/50/75/100) the savings have crossed, or null. */
export function highestMilestone(current: number, target: number): MilestoneValue | null {
  if (target <= 0 || current <= 0) return null;
  const pct = (current / target) * 100;
  for (const v of [100, 75, 50, 25] as const) {
    if (pct >= v) return v;
  }
  return null;
}

export function buildNotifications(input: BuildNotificationsInput): {
  items: NotificationDTO[];
  unreadCount: number;
} {
  const { month, salaryAmount, budgetRows, savings, prefs, state, format } = input;
  const categoryLabel = input.categoryLabel ?? ((k) => k);
  const out: Notification[] = [];

  // Salary — fires when this month's salary isn't logged (or is 0).
  if (prefs.salary && !(salaryAmount && salaryAmount > 0)) {
    out.push({
      key: `salary:${month}`,
      type: "salary",
      title: "Add this month's salary",
      message: "You haven't logged your salary for this month yet.",
      context: "This month",
      href: "/salary",
    });
  }

  // Budget — one alert per budgeted category whose spend exceeds its allocation.
  if (prefs.budget) {
    for (const r of budgetRows) {
      if (r.planned > 0 && r.actual > r.planned) {
        out.push({
          key: `budget:${r.category}:${month}`,
          type: "budget",
          title: `${categoryLabel(r.category)} is over budget`,
          message: `${format(r.actual - r.planned)} over your ${format(r.planned)} allocation.`,
          context: "This month",
          href: "/budget",
        });
      }
    }
  }

  // Savings — only the highest crossed milestone.
  if (prefs.savings) {
    const m = highestMilestone(savings.current, savings.target);
    if (m !== null) {
      out.push({
        key: `savings:${m}`,
        type: "savings",
        title: `Savings milestone: ${m}%`,
        message: `${format(savings.current)} of your ${format(savings.target)} goal.`,
        context: "Savings goal",
        href: "/savings",
      });
    }
  }

  const dismissed = new Set(state.dismissedKeys);
  const read = new Set(state.readKeys);
  const items: NotificationDTO[] = out
    .filter((n) => !dismissed.has(n.key))
    .map((n) => ({ ...n, unread: !read.has(n.key) }));

  return { items, unreadCount: items.filter((n) => n.unread).length };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/notifications-math.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications-math.ts src/lib/notifications-math.test.ts
git commit -m "feat: pure notification alert generators with tests"
```

---

## Task 3: `NotificationState` model

**Files:**
- Create: `src/models/NotificationState.ts`

- [ ] **Step 1: Create the model**

Create `src/models/NotificationState.ts`:

```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const notificationStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    readKeys: { type: [String], default: [] },
    dismissedKeys: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type NotificationStateDoc = InferSchemaType<typeof notificationStateSchema>;

export const NotificationState: Model<NotificationStateDoc> =
  (models.NotificationState as Model<NotificationStateDoc>) ??
  model<NotificationStateDoc>("NotificationState", notificationStateSchema);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/models/NotificationState.ts
git commit -m "feat: NotificationState model (read/dismissed keys)"
```

---

## Task 4: `getNotifications()` service

**Files:**
- Create: `src/services/notifications.ts`

- [ ] **Step 1: Implement the service**

Create `src/services/notifications.ts`:

```ts
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary } from "@/models/Salary";
import { Savings } from "@/models/Savings";
import { NotificationState } from "@/models/NotificationState";
import { getBudget } from "@/services/budget";
import { currentMonth } from "@/lib/month";
import { formatCurrency } from "@/lib/utils";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { buildNotifications, type NotificationDTO } from "@/lib/notifications-math";

export type NotificationsResult = { items: NotificationDTO[]; unreadCount: number };

/** Derive the live notification list for the current user. Defensive: any read
 *  failure or missing data yields an empty result so the bell never crashes the app. */
export async function getNotifications(): Promise<NotificationsResult> {
  try {
    await connectDB();
    const { user, settings } = await getCurrentUser();
    const month = currentMonth();

    const [salaryDoc, savingsDoc, stateDoc, budget] = await Promise.all([
      Salary.findOne({ userId: user.id, month }).lean(),
      Savings.findOne({ userId: user.id }).lean(),
      NotificationState.findOne({ userId: user.id }).lean(),
      getBudget(month),
    ]);

    const budgetRows = (budget?.reconciliation.rows ?? []).map((r) => ({
      category: r.category,
      planned: r.planned,
      actual: r.actual,
    }));

    return buildNotifications({
      month,
      salaryAmount: salaryDoc ? salaryDoc.amount : null,
      budgetRows,
      savings: {
        current: savingsDoc?.currentAmount ?? 0,
        target: savingsDoc?.targetAmount ?? 0,
      },
      prefs: settings.notifyPrefs,
      state: {
        readKeys: stateDoc?.readKeys ?? [],
        dismissedKeys: stateDoc?.dismissedKeys ?? [],
      },
      format: (n) => formatCurrency(n, { currency: settings.currency, locale: settings.locale }),
      categoryLabel: (k) => TXN_CATEGORY_MAP[k as TxnCategoryKey]?.label ?? k,
    });
  } catch {
    return { items: [], unreadCount: 0 };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/notifications.ts
git commit -m "feat: getNotifications service (derive live alerts)"
```

---

## Task 5: Notification server actions

**Files:**
- Create: `src/lib/actions/notifications.ts`

- [ ] **Step 1: Implement the actions**

Create `src/lib/actions/notifications.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { NotificationState } from "@/models/NotificationState";
import { Settings } from "@/models/Settings";
import { updateNotifyPrefsSchema, type NotifyPrefs } from "@/validations/settings";

type Result = { ok: true } | { ok: false; error: string };

async function addKeys(field: "readKeys" | "dismissedKeys", keys: string[]): Promise<Result> {
  try {
    await connectDB();
    const { user } = await getCurrentUser();
    await NotificationState.updateOne(
      { userId: user.id },
      { $addToSet: { [field]: { $each: keys } } },
      { upsert: true },
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't update notifications" };
  }
}

export async function markNotificationRead(key: string): Promise<Result> {
  return addKeys("readKeys", [key]);
}

export async function markAllNotificationsRead(keys: string[]): Promise<Result> {
  if (keys.length === 0) return { ok: true };
  return addKeys("readKeys", keys);
}

export async function dismissNotification(key: string): Promise<Result> {
  return addKeys("dismissedKeys", [key]);
}

export async function updateNotifyPrefs(input: NotifyPrefs): Promise<Result> {
  const parsed = updateNotifyPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await connectDB();
    const { user } = await getCurrentUser();
    await Settings.updateOne({ userId: user.id }, { $set: { notifyPrefs: parsed.data } }, { upsert: true });
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save notification preferences" };
  }
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit`
Then: `npx eslint src/lib/actions/notifications.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/notifications.ts
git commit -m "feat: notification server actions (read/dismiss/prefs)"
```

---

## Task 6: `NotificationBell` client component

**Files:**
- Create: `src/components/notifications/notification-bell.tsx`

- [ ] **Step 1: Implement the bell**

Create `src/components/notifications/notification-bell.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bell, Banknote, Wallet, PiggyBank, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import {
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "@/lib/actions/notifications";
import type { NotificationDTO, NotificationType } from "@/lib/notifications-math";

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tint: string; color: string }> = {
  salary: { icon: Banknote, tint: "bg-[#16a34a]/15", color: "#22c55e" },
  budget: { icon: Wallet, tint: "bg-negative/15", color: "var(--negative)" },
  savings: { icon: PiggyBank, tint: "bg-[#14b8a6]/15", color: "#14b8a6" },
};

export function NotificationBell({ items: initialItems }: { items: NotificationDTO[] }) {
  const [items, setItems] = useState(initialItems);
  // Derive the badge from items so optimistic mark-read updates it instantly.
  const unread = items.filter((n) => n.unread).length;

  async function readOne(key: string) {
    setItems((prev) => prev.map((n) => (n.key === key ? { ...n, unread: false } : n)));
    const res = await markNotificationRead(key);
    if (!res.ok) toast.error(res.error);
  }

  async function readAll() {
    const keys = items.filter((n) => n.unread).map((n) => n.key);
    if (keys.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    const res = await markAllNotificationsRead(keys);
    if (!res.ok) toast.error(res.error);
  }

  async function dismiss(key: string) {
    const prev = items;
    setItems((cur) => cur.filter((n) => n.key !== key));
    const res = await dismissNotification(key);
    if (!res.ok) {
      setItems(prev);
      toast.error(res.error);
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs font-semibold text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
              <p className="text-sm font-medium">You&rsquo;re all caught up ✨</p>
              <p className="text-xs text-muted-foreground">No new notifications.</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {items.map((n) => {
                const meta = TYPE_META[n.type];
                const Icon = meta.icon;
                return (
                  <li key={n.key} className="group relative">
                    <Link
                      href={n.href}
                      onClick={() => readOne(n.key)}
                      className="flex gap-3 px-4 py-3 pr-9 transition hover:bg-card-elevated"
                    >
                      <span
                        className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tint)}
                        style={{ color: meta.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", n.unread ? "font-semibold" : "font-medium text-muted-foreground")}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">{n.context}</p>
                      </div>
                      {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </Link>
                    <button
                      onClick={() => dismiss(n.key)}
                      aria-label="Dismiss notification"
                      className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground group-hover:flex"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/settings?section=notifications"
            className="block border-t border-border px-4 py-3 text-center text-xs text-muted-foreground transition hover:text-foreground"
          >
            Notification settings →
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

The bell takes only `items` and derives the unread count itself, so optimistic mark-read updates the badge instantly. (`getNotifications` still returns `unreadCount` for completeness, but the headers pass only `items`.)

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit`
Then: `npx eslint src/components/notifications/notification-bell.tsx`
Expected: no errors. (React Compiler is on — do NOT add `useCallback`/`useMemo`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/notification-bell.tsx
git commit -m "feat: NotificationBell client component (popover panel)"
```

---

## Task 7: Wire the bell into the layout and headers

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/navigation/app-shell.tsx`
- Modify: `src/components/navigation/top-bar.tsx`
- Modify: `src/components/navigation/mobile-header.tsx`

- [ ] **Step 1: Fetch notifications in the layout**

Replace the body of `src/app/(app)/layout.tsx`'s `AppLayout` so it fetches notifications. The full file becomes:

```tsx
import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";
import { getCurrentUser } from "@/lib/user";
import { getNotifications } from "@/services/notifications";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await getCurrentUser();
  const notifications = await getNotifications();
  return (
    <AppShell greeting={greetingFor(new Date())} name={user.name} notifications={notifications}>
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 2: Thread `notifications` through `AppShell`**

In `src/components/navigation/app-shell.tsx`:

Add the import:

```ts
import type { NotificationsResult } from "@/services/notifications";
```

Change the props signature and the two header usages. The full component becomes:

```tsx
export function AppShell({
  children,
  greeting,
  name,
  notifications,
}: {
  children: ReactNode;
  greeting: string;
  name: string;
  notifications: NotificationsResult;
}) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar name={name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader greeting={greeting} name={name} notifications={notifications} />
        <TopBar greeting={greeting} name={name} notifications={notifications} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomTabBar />
      <Toaster />
    </div>
  );
}
```

- [ ] **Step 3: Use the bell in the top bar**

Replace `src/components/navigation/top-bar.tsx` entirely:

```tsx
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationsResult } from "@/services/notifications";

export function TopBar({
  greeting,
  name,
  notifications,
}: {
  greeting: string;
  name: string;
  notifications: NotificationsResult;
}) {
  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-xl lg:flex">
      <div>
        <p className="text-lg font-bold tracking-tight">
          {greeting}, {name} <span aria-hidden>👋</span>
        </p>
        <p className="text-sm text-muted-foreground">Here&apos;s your financial overview</p>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell items={notifications.items} />
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Use the bell in the mobile header**

Replace `src/components/navigation/mobile-header.tsx` entirely:

```tsx
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationsResult } from "@/services/notifications";

export function MobileHeader({
  greeting,
  name,
  notifications,
}: {
  greeting: string;
  name: string;
  notifications: NotificationsResult;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <p className="text-sm font-bold">
            {name} <span aria-hidden>👋</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell items={notifications.items} />
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit`
Then: `npx eslint src/app/(app)/layout.tsx src/components/navigation/app-shell.tsx src/components/navigation/top-bar.tsx src/components/navigation/mobile-header.tsx`
Expected: no errors. (The `Bell` and `Tooltip` imports are gone from both headers — confirm no unused-import warnings.)

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/layout.tsx" src/components/navigation/app-shell.tsx src/components/navigation/top-bar.tsx src/components/navigation/mobile-header.tsx
git commit -m "feat: wire NotificationBell into layout, top bar, and mobile header"
```

---

## Task 8: Real, persisted Settings notification toggles

**Files:**
- Modify: `src/components/settings/settings-view.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Refactor `ToggleRow` to be controlled**

In `src/components/settings/settings-view.tsx`, replace the entire `ToggleRow` function with a controlled version:

```tsx
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-card-elevated")}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add imports + props + the prefs state/handler**

In `src/components/settings/settings-view.tsx`:

Add to the imports near the other `@/lib` imports:

```tsx
import { updateNotifyPrefs } from "@/lib/actions/notifications";
import type { NotifyPrefs } from "@/validations/settings";
```

Change the component signature and add the prefs state. The `SettingsView` declaration becomes:

```tsx
export function SettingsView({
  name,
  settings,
  notifyPrefs,
}: {
  name: string;
  settings: Prefs;
  notifyPrefs: NotifyPrefs;
}) {
  // Active section lives in the URL (?section=) so it's deep-linkable and survives refresh.
  const [active, setActive] = useTabParam("section", SECTION_KEYS, "general");
  const [notify, setNotify] = useState<NotifyPrefs>(notifyPrefs);
```

Add this handler next to the existing `set` helper (after `const set = ...`):

```tsx
  async function saveNotify(patch: Partial<NotifyPrefs>) {
    const next = { ...notify, ...patch };
    setNotify(next);
    const res = await updateNotifyPrefs(next);
    if (res.ok) toast.success("Notification preferences saved");
    else {
      setNotify(notify);
      toast.error(res.error);
    }
  }
```

- [ ] **Step 3: Replace the Notifications panel body**

In `src/components/settings/settings-view.tsx`, replace the entire `{active === "notifications" && ( ... )}` block with:

```tsx
          {active === "notifications" && (
            <Panel title="Notifications" description="Choose which nudges FuFi sends your way.">
              <ToggleRow
                label="Salary reminders"
                description="Nudge when this month's salary isn't logged yet."
                checked={notify.salary}
                onChange={(v) => saveNotify({ salary: v })}
              />
              <ToggleRow
                label="Budget over-spend alerts"
                description="Warn when a category goes over its allocation."
                checked={notify.budget}
                onChange={(v) => saveNotify({ budget: v })}
              />
              <ToggleRow
                label="Savings goal milestones"
                description="Celebrate when a goal crosses 25 / 50 / 75 / 100%."
                checked={notify.savings}
                onChange={(v) => saveNotify({ savings: v })}
              />
            </Panel>
          )}
```

(This removes the old "EMI due reminders" toggle and the "Notification delivery arrives in a later update." note.)

- [ ] **Step 4: Pass `notifyPrefs` from the settings page**

Replace `src/app/(app)/settings/page.tsx` entirely:

```tsx
import { SettingsView } from "@/components/settings/settings-view";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, settings } = await getCurrentUser();
  return (
    <SettingsView
      name={user.name}
      settings={{
        language: settings.language,
        dateFormat: settings.dateFormat,
        firstDayOfWeek: settings.firstDayOfWeek,
        defaultView: settings.defaultView,
        currency: settings.currency,
        locale: settings.locale,
      }}
      notifyPrefs={settings.notifyPrefs}
    />
  );
}
```

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit`
Then: `npx eslint "src/components/settings/settings-view.tsx" "src/app/(app)/settings/page.tsx"`
Expected: no errors. (Confirm `useState` is still imported in settings-view — it is, used by `notify` and the reset dialog state.)

- [ ] **Step 6: Commit**

```bash
git add "src/components/settings/settings-view.tsx" "src/app/(app)/settings/page.tsx"
git commit -m "feat: real persisted notification toggles in Settings (remove EMI)"
```

---

## Task 9: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the new `notifications-math` and `settings` suites.

- [ ] **Step 2: Type-check + lint the whole project**

Run: `npx tsc --noEmit`
Then: `npx eslint .`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npx next build`
Expected: build succeeds; `/`, `/settings`, and all routes compile. No "Missing Suspense boundary with useSearchParams" errors (the bell uses no search params; settings is already dynamic).

- [ ] **Step 4: Manual walkthrough (dev server)**

Run `npx next dev` and verify:
- With **no salary** logged for the current month, the bell shows a badge and a "Add this month's salary" alert; clicking it navigates to `/salary` and the row becomes read (badge decrements).
- Log a salary → reload → the salary alert disappears.
- Create an **over-budget** category (allocation < spend) → a "{Category} is over budget" alert appears with the correct over/allocation amounts.
- Set **savings** to ≥50% of target → a "Savings milestone: 50%" alert appears; dismiss it (×) → it disappears and stays gone on reload.
- "Mark all read" clears the badge; reload keeps them read.
- Settings → Notifications: toggling **Savings goal milestones** off → reload → the savings alert no longer appears; toast confirms save. Confirm the **EMI** toggle is gone.
- Empty state: with salary logged, no over-budget categories, and savings below 25% (or all dismissed/off), the panel shows "You're all caught up ✨".
- Check both **desktop** (top-bar bell) and **mobile** (mobile-header bell) widths.

- [ ] **Step 5: Finish the branch**

Use the **superpowers:finishing-a-development-branch** skill to merge `notifications` into `main` (option 1, local merge) after verification passes.

---

## Self-Review

**Spec coverage:**
- Delivery = in-app center → Tasks 4/6/7. ✓
- Three alerts (salary/budget/savings), EMI dropped → Task 2 generators + Task 8 toggles. ✓
- Derive-live + read/dismissed keys → Task 2 (filtering) + Task 3 (model) + Task 5 (actions). ✓
- Panel style A, dismiss + mark-read, empty state, footer link → Task 6. ✓
- `notifyPrefs` persisted, EMI removed → Tasks 1 + 8. ✓
- Bell in both headers, fed from layout → Task 7. ✓
- Keys `salary:<month>`, `budget:<cat>:<month>`, `savings:<pct>` → Task 2 (asserted in tests). ✓
- Server actions return `{ ok } | { ok:false, error }`, try/catch, revalidate → Task 5. ✓
- Tests for generators (fire/not, thresholds, gating, read/dismiss, unreadCount) → Task 2. ✓

**Type consistency:** `NotifyPrefs` defined once in `validations/settings.ts`, imported by `user.ts`, `notifications-math.ts`, `notifications.ts` action, and `settings-view.tsx`. `NotificationDTO`/`NotificationType` defined once in `notifications-math.ts`, imported by the service and the bell. `NotificationsResult` defined in `services/notifications.ts`, imported by `app-shell`, `top-bar`, `mobile-header`. Consistent.

**Placeholder scan:** none — every step has full code and exact commands. (The one inline redundancy in Task 6 Step 1 is explicitly called out and corrected in the same step.)
