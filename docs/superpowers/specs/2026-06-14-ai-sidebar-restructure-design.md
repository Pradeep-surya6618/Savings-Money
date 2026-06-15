# FuFi's AI — Sidebar Restructure + Full-Width Chat (Design)

**Status:** Approved for planning · 2026-06-14
**Scope:** Restructure the FuFi's AI experience: a dedicated "AI Assistant" section in the app sidebar that, when the AI page is active, shows **New Chat** + **Recent Chats**; the chat view becomes **full-width** (the in-page desktop conversation panel is removed). Reference mockup: `public/UI/FuFi-Chat-UI.png`. Keep the name "FuFi's AI" + the Sparkles avatar.

## Goal

Move the conversation list out of the chat page and into the app sidebar (context-aware: only on `/assistant`), and let the chat occupy the full content width — matching the reference layout.

## Decisions (from brainstorming)

- **Restructure only** — NOT building the right "Financial Snapshot" panel, the "Tip → Create Budget" card, or renaming to "AiFi".
- Keep "FuFi's AI" label + Sparkles icon/avatar.

## Sidebar

- The AI item is rendered in its **own "AI Assistant" section** (label + the `/assistant` link), after the main nav — NOT inline with Home/Transactions/etc.
- It **stays in `PRIMARY_NAV`** so the mobile bottom bar is unchanged; the sidebar simply **filters it out** of the main nav loop (by `href === "/assistant"`) and renders it in the AI section. No `nav.ts` / bottom-bar change.
- When the AI route is active (`pathname.startsWith("/assistant")`) and the sidebar is **expanded**, render `<SidebarChats>` below the AI link: a **+ New Chat** button + a **Recent Chats** list. (Collapsed sidebar shows just the AI icon — no chat list.)
- New `src/components/navigation/sidebar-chats.tsx` (client):
  - **+ New Chat** → `Link href="/assistant"` (clears `?c=`).
  - Each conversation → `Link href="/assistant?c=<id>"`, active-highlighted when `?c=` matches (reuses the chat view's existing URL-driven selection).
  - Hover **delete** per chat → opens a **confirm dialog** (same pattern as the chat view); on confirm `deleteConversation(id)` + (if it was open) `router.push("/assistant")` + `router.refresh()`.
  - Reads `?c=` via `useSearchParams`; gets `conversations` as a prop.

## Data flow

- The `(app)` layout fetches `listConversations()` and threads it `AppShell → Sidebar` (a small, capped, indexed query — same layout already fetches user/notifications/savings).
- The chat view already calls `router.refresh()` on new-chat / delete, which re-runs the layout → the sidebar's Recent Chats stay in sync automatically. No client polling.

## Chat view (`assistant-view.tsx`)

- **Remove the desktop in-page `<aside>`** conversation panel; the grid collapses to a **single full-width** column (keep the existing full-bleed `lg:-mx-8/-mt-8/-mb-10` + `lg:h-[calc(100dvh-5.25rem)]`). The thread + composer fill the width.
- **Mobile unchanged:** the sidebar isn't visible on mobile, so keep the existing **mobile header "Conversations" button + drawer** (New Chat + Recent Chats) as the mobile entry point. The `conversations` prop is still passed to the view for that drawer.
- The `<ConversationList>` helper + the delete-confirm dialog stay in the view for the mobile drawer.
- The desktop brand header that previously lived in the in-page aside is dropped (the sidebar's AI section + the app TopBar carry identity).

## Files

**New:** `src/components/navigation/sidebar-chats.tsx`.
**Modified:** `src/components/navigation/sidebar.tsx` (AI section + conversations prop + render SidebarChats when active), `src/components/navigation/app-shell.tsx` (+ `src/app/(app)/layout.tsx`) to fetch + thread `conversations`, `src/components/assistant/assistant-view.tsx` (drop desktop aside → full-width; keep mobile drawer).

## Testing

- `npx tsc --noEmit`, `npx eslint .`, `npx next build` clean; `/assistant` present.
- Manual: on `/assistant` (desktop) the sidebar shows the AI section + New Chat + Recent Chats; selecting a chat opens it; New Chat clears; delete asks to confirm and updates the list; the chat is full-width with no in-page conversation panel. On other pages the sidebar has no chat list. On mobile, the chat is full-screen and the drawer still gives New Chat + Recent Chats. Bottom bar unchanged.

## Out of scope

Right Financial Snapshot panel, "Tip from AiFi"/Create Budget card, rename to "AiFi", new bot avatar, any backend changes.
