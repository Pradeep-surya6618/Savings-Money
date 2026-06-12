# Phase 5a — In-app Notification Center (Design)

**Status:** Approved for planning · 2026-06-12
**Scope:** First sub-project of Phase 5. Notifications only. Data export/import and account/data management are separate sub-projects (own spec → plan → build cycles).

## Goal

Make the 🔔 bell (already present in both the top bar and the mobile header, currently inert) into a working **in-app notification center**, and turn the fake Settings → Notifications toggles into real, persisted preferences.

## Decisions (from brainstorming)

- **Delivery:** in-app notification center only. No web push, no email. The app has no always-on server, so alerts are computed from the user's own data when the app loads. A clean seam is left to add push later, but it is out of scope now.
- **Alert types (3):** Salary reminder, Budget over-spend, Savings milestone. **EMI is dropped** — the Loan model has no per-month payment record, so an EMI alert could only fire on date alone. The EMI toggle is removed from Settings.
- **Storage:** derive live + remember read/dismissed keys. No materialized notification feed. Always reflects current truth; fix the condition and the alert disappears on the next load.
- **Panel style:** list rows — colored icon tile, title, message, context line, green unread dot, hover-reveal × dismiss. Header with unread count + "Mark all read". Footer "Notification settings →". Empty state "You're all caught up ✨".
- **Interactions:** both **dismiss (×)** and **mark-read**. Clicking a row marks it read and navigates to the related page; × removes it (remembered via a dismissed key); "Mark all read" marks all visible read. Opening the panel does **not** auto-clear the badge.

## Architecture & data flow

Notifications are **derived**, never stored as a feed.

1. `(app)/layout.tsx` (server) calls `getNotifications()` once per request.
2. `getNotifications()` (service) reads: current-month Salary, current-month Transactions / budget figures, Savings, plus the user's `notifyPrefs` (Settings) and `NotificationState` (read/dismissed keys).
3. It calls the **pure generators** in `src/lib/notifications-math.ts` to produce the current alert list (each alert has a stable `key`).
4. It filters out alerts whose type is toggled off in `notifyPrefs`, drops alerts whose key is in `dismissedKeys`, and marks each remaining alert `unread = !readKeys.includes(key)`.
5. Returns `{ items: NotificationDTO[]; unreadCount: number }`.
6. The layout threads this through `AppShell` → `TopBar` / `MobileHeader` → a new client `NotificationBell`.

```
layout (server)
  └─ getNotifications() ──> service: read data + prefs + state
        └─ notifications-math (pure): generate alerts by key
  └─ AppShell(notifications) ──> TopBar / MobileHeader ──> <NotificationBell items unreadCount />
```

## Data model

- **New model `src/models/NotificationState.ts`** — one per user (find-or-create singleton, like Settings):
  ```
  { userId: ObjectId (unique), readKeys: string[], dismissedKeys: string[] }
  ```
- **`src/models/Settings.ts` gains `notifyPrefs`**: `{ salary: Boolean (default true), budget: Boolean (default true), savings: Boolean (default true) }`.
- **`src/lib/user.ts`**: surface `settings.notifyPrefs` with defaults so callers always get all three booleans.
- **`src/lib/notifications-math.ts`** (pure, Vitest-tested): the three generator functions + key builders. Input = plain data (no Mongoose, no DB); output = `Notification[]`.

### Types

```ts
type NotificationType = "salary" | "budget" | "savings";
type Notification = {
  key: string;          // stable identity, e.g. "budget:food:2026-06"
  type: NotificationType;
  title: string;
  message: string;
  context: string;      // small line, e.g. "This month"
  href: string;         // where clicking navigates
};
type NotificationDTO = Notification & { unread: boolean };
```

## The three alert generators

| Alert | `key` | Fires when | Title / message | href |
|---|---|---|---|---|
| **Salary** | `salary:<YYYY-MM>` | current month has no salary doc, or its amount is 0 | "Add {Month} salary" / "You haven't logged this month's salary yet." | `/salary` |
| **Budget** | `budget:<category>:<YYYY-MM>` | a category's spend this month exceeds its allocation (one alert per over-spent category) | "{Category} is over budget" / "₹X over your ₹Y allocation." | `/budget` |
| **Savings** | `savings:<pct>` | savings crosses 25 / 50 / 75 / 100% of target — emit **only the highest crossed** threshold | "Savings milestone: {pct}%" / "₹X of your ₹Y goal." | `/savings` |

Notes:
- Generators consume the same data/services the dashboard already uses (month summary / budget figures / savings). The plan will wire `getNotifications()` to the existing `services/budget.ts`, `services/salary.ts`, and `services/savings.ts` rather than re-querying raw collections where possible.
- "Highest crossed" savings: if currentAmount is at 60% of target, emit `savings:50` only. At 100%, emit `savings:100`.
- Budget over-spend depends on a salary/allocation existing for the month; if none, no budget alerts (matches the budget page's own empty behavior).

## UI

- **`src/components/notifications/notification-bell.tsx`** (client) — props `{ items: NotificationDTO[]; unreadCount: number }`.
  - Bell button + unread badge (green pill; caps at "9+"). No badge when zero.
  - **Desktop:** Radix popover anchored to the bell. **Mobile:** a bottom sheet (reuse the pattern from the bottom-bar "More" sheet).
  - Panel (style A): header (`Notifications` + count + "Mark all read"), scrollable list of rows, footer link to `/settings?section=notifications`.
  - Row: colored icon tile (per type — salary green, budget negative/rose, savings teal), title, message, context line, green unread dot when unread, hover-reveal × (dismiss). Clicking the row marks read + navigates via `next/link`.
  - **Empty state:** centered "You're all caught up ✨".
  - **Optimistic UX:** the bell seeds local state from props; mark-read / mark-all / dismiss update local state immediately, then fire the server action. React Compiler is on — no manual memoization.
- **`TopBar` + `MobileHeader`:** replace the static bell with `<NotificationBell …/>`, fed from layout-fetched data via `AppShell`.
- **Settings → Notifications:** the three `ToggleRow`s become controlled + persisted via `updateNotifyPrefs`, seeded from `notifyPrefs`. The "EMI due reminders" toggle is removed. Saving shows the standard success/error toast, consistent with other preferences.

## Server actions (`src/lib/actions/notifications.ts`)

All `"use server"`, wrapped in try/catch, returning `{ ok: true } | { ok: false; error: string }`, and calling `revalidatePath("/", "layout")` so the badge refreshes:

- `markNotificationRead(key: string)` — add key to `readKeys`.
- `markAllRead(keys: string[])` — union into `readKeys`.
- `dismissNotification(key: string)` — add key to `dismissedKeys`.
- `updateNotifyPrefs(prefs: { salary; budget; savings })` — `$set` on Settings; `revalidatePath("/settings")` + `revalidatePath("/", "layout")`. Validated with a Zod schema in `src/validations/settings.ts`.

## Error handling

- Actions catch DB errors → `{ ok: false, error }`; the bell rolls back its optimistic state and shows an error toast.
- `getNotifications()` is defensive: if any sub-read fails or returns empty (no salary/savings/budget yet), the corresponding generator simply yields nothing; the bell renders the empty state.
- `NotificationState` and the new Settings field are created on demand (find-or-create / defaults), so existing users with neither are handled.

## Testing

- **`src/lib/notifications-math.test.ts`** (Vitest) — per generator: fires / doesn't fire, threshold boundaries (savings 24%→none, 25%→`savings:25`, 60%→`savings:50`, 100%→`savings:100`), key format, one-alert-per-over-spent-category, prefs gating (toggled-off type omitted), read/dismissed filtering (read ⇒ `unread:false`, dismissed ⇒ omitted), and `unreadCount`.
- UI (bell, badge, popover/sheet, settings toggles) verified by `npx next build` + live walkthrough, per project norm. Verification commands use `npx` forms (`npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`).

## Files

**New**
- `src/models/NotificationState.ts`
- `src/lib/notifications-math.ts` + `src/lib/notifications-math.test.ts`
- `src/services/notifications.ts` (`getNotifications`)
- `src/lib/actions/notifications.ts`
- `src/components/notifications/notification-bell.tsx`

**Modified**
- `src/models/Settings.ts` (add `notifyPrefs`)
- `src/lib/user.ts` (surface `notifyPrefs` defaults)
- `src/validations/settings.ts` (notifyPrefs schema)
- `src/app/(app)/layout.tsx` (fetch notifications)
- `src/components/navigation/app-shell.tsx` (thread notifications down)
- `src/components/navigation/top-bar.tsx`, `src/components/navigation/mobile-header.tsx` (use `NotificationBell`)
- `src/components/settings/settings-view.tsx` (real toggles, remove EMI)
- `src/app/(app)/settings/page.tsx` (pass `notifyPrefs`)

## Out of scope (YAGNI)

Web push / email, notification history/feed, snooze, per-category budget configuration beyond existing allocations, EMI alerts, real-time updates while the app is open (refresh on navigation/load is enough).
