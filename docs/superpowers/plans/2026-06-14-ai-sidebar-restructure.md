# FuFi's AI — Sidebar Restructure + Full-Width Chat (Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Dedicated "AI Assistant" sidebar section that shows New Chat + Recent Chats when the AI page is active; full-width chat (no in-page desktop conversation panel). Keep "FuFi's AI" + Sparkles. Mobile drawer + bottom bar unchanged.

**Spec:** `docs/superpowers/specs/2026-06-14-ai-sidebar-restructure-design.md`
**Branch:** `ai-sidebar`. **Verify:** ONLY `npx tsc --noEmit`, `npx eslint <paths>`, `npx next build`. React Compiler ON (no memoization); no `any`; commit trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; stage only each task's files.

---

## Task 1: Sidebar AI section + Recent Chats + data threading

**Files:** create `src/components/navigation/sidebar-chats.tsx`; modify `src/components/navigation/sidebar.tsx`, `src/components/navigation/app-shell.tsx`, `src/app/(app)/layout.tsx`.

- [ ] **Step 1: `sidebar-chats.tsx`** (client):
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteConversation, type ConversationSummary } from "@/services/assistant";
import { cn } from "@/lib/utils";

export function SidebarChats({ conversations }: { conversations: ConversationSummary[] }) {
  const router = useRouter();
  const activeId = useSearchParams().get("c");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function confirmDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;
    await deleteConversation(id);
    if (id === activeId) router.push("/assistant");
    router.refresh();
  }

  return (
    <div className="mt-3 flex min-h-0 flex-col">
      <Link
        href="/assistant"
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-end px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> New chat
      </Link>
      {conversations.length > 0 && (
        <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Chats
        </p>
      )}
      <div className="space-y-0.5">
        {conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <div
              key={c.id}
              className={cn(
                "group relative flex items-center gap-1 rounded-xl pr-1 transition",
                active ? "bg-primary/10" : "hover:bg-card-elevated",
              )}
            >
              <Link
                href={`/assistant?c=${c.id}`}
                className={cn(
                  "min-w-0 flex-1 truncate px-3 py-2 text-sm",
                  active ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {c.title}
              </Link>
              <button
                type="button"
                onClick={() => setPendingDelete(c.id)}
                aria-label="Delete chat"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-negative/10 hover:text-negative group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <DialogContent title="Delete chat?">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently deletes this conversation and all its messages. This can&rsquo;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
              <Button onClick={() => void confirmDelete()} className="from-negative to-negative">Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: `sidebar.tsx`** — accept `conversations`, render the AI section + SidebarChats.
  - Props: `{ name, image, conversations }: { name: string; image: string | null; conversations: ConversationSummary[] }` (import `type { ConversationSummary } from "@/services/assistant"`).
  - Imports: `import { SidebarChats } from "./sidebar-chats";` and (already) `Sparkles`? The AI item's icon comes from `PRIMARY_NAV`. 
  - Compute: `const aiItem = items.find((i) => i.href === "/assistant"); const mainItems = items.filter((i) => i.href !== "/assistant"); const onAssistant = pathname.startsWith("/assistant");`
  - Render the existing `<nav>` mapping over **`mainItems`** instead of `items`.
  - After the `mainItems` map (still inside the scrollable `<nav>`), append an AI section:
    - When `!isCollapsed`: a label `<p className="mb-1 mt-4 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Assistant</p>`.
    - Render the AI link `aiItem` exactly like the other nav links (reuse the same link markup/active-pill; for collapsed, wrap in the `<Tooltip>` like other items). Keep the active highlight via `isActive(pathname, "/assistant")`.
    - When `onAssistant && !isCollapsed`: `<SidebarChats conversations={conversations} />`.
  - Keep the user footer + logout unchanged.

- [ ] **Step 3: `app-shell.tsx`** — add `conversations: ConversationSummary[]` to props; pass `conversations={conversations}` to `<Sidebar>`. (Import the type.)

- [ ] **Step 4: `(app)/layout.tsx`** — fetch conversations and pass to `AppShell`:
  - `import { listConversations } from "@/services/assistant";`
  - `const conversations = await listConversations();` (alongside the existing `getCurrentUser()` etc.)
  - `<AppShell ... conversations={conversations}>`.

- [ ] **Step 5: Verify + commit**
`npx tsc --noEmit` + `npx eslint` on the 4 files + `npx next build`.
```bash
git add src/components/navigation/sidebar-chats.tsx src/components/navigation/sidebar.tsx src/components/navigation/app-shell.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(ai): dedicated sidebar AI section with New Chat + Recent Chats"
```

---

## Task 2: Full-width chat (drop the desktop in-page panel)

**Files:** modify `src/components/assistant/assistant-view.tsx`.

- [ ] **Step 1:** Remove the desktop conversation `<aside>` and collapse the two-column grid to a single full-width column.
  - Replace the wrapper `<div className="grid gap-5 lg:h-full lg:grid-cols-[300px_1fr] lg:items-stretch lg:gap-0">` with a single full-height container, e.g. `<div className="lg:h-full">`, containing ONLY the chat column.
  - Delete the entire `<aside className="hidden lg:flex ...">…</aside>` block (the desktop conversation panel incl. its brand header + `<ConversationList>`).
  - The chat column keeps its classes but fills the width: ensure it is `h-[calc(100dvh-14rem)] … lg:h-full lg:rounded-none lg:border-0 …` (full-bleed full-width).
- [ ] **Step 2:** KEEP: the mobile header (`lg:hidden`) with the "Conversations" button, the mobile drawer `<Dialog>` + `<ConversationList>`, the delete-confirm `<Dialog>`, the `conversations` prop, and all chat logic (useChat, submit, URL `?c=` effect, suggestions, etc.). Only the desktop aside + grid change.
- [ ] **Step 3:** If `<ConversationList>` / any import becomes unused after removing the aside, remove it; if still used by the mobile drawer, keep it. Ensure no unused imports/vars (eslint).
- [ ] **Step 4: Verify + commit**
`npx tsc --noEmit` + `npx eslint src/components/assistant/assistant-view.tsx` + `npx next build`.
```bash
git add src/components/assistant/assistant-view.tsx
git commit -m "feat(ai): full-width chat (conversation list now in the app sidebar)"
```

---

## Task 3: End-to-end verification + finish

- [ ] `npx vitest run` → all pass · `npx tsc --noEmit` + `npx eslint .` clean · `npx next build` succeeds (`/assistant` present).
- [ ] **Manual:** desktop `/assistant` → sidebar shows the AI Assistant section + New Chat + Recent Chats; click a chat opens it (`?c=`), New Chat clears, delete confirms + updates; chat is full-width with no in-page panel. Other pages: no chat list in the sidebar. Mobile: chat full-screen, drawer gives New Chat + Recent Chats; bottom bar unchanged. Create/delete a chat → sidebar list updates (via router.refresh).
- [ ] **Finish** — superpowers:finishing-a-development-branch → merge `ai-sidebar` into `main`.

---

## Self-Review

**Spec coverage:** AI in its own sidebar section, filtered from main list, kept in PRIMARY_NAV for the bottom bar (T1) ✓ · New Chat + Recent Chats in the sidebar only when active + expanded (T1) ✓ · conversations threaded via layout→app-shell→sidebar, synced by existing router.refresh (T1) ✓ · delete-confirm in the sidebar (T1) ✓ · full-width chat, desktop aside removed, mobile drawer kept (T2) ✓ · name/avatar/bottom-bar/backend unchanged ✓.

**Type/name consistency:** `ConversationSummary` (from `@/services/assistant`) used in SidebarChats + Sidebar + AppShell + layout. `deleteConversation`/`listConversations` reused. `?c=` selection consistent with `assistant-view.tsx`. `SidebarChats` exported/imported consistently.

**Placeholder scan:** none — SidebarChats fully coded; sidebar/app-shell/layout edits specified as exact prop/structure changes against the current files.
