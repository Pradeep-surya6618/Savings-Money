# Phase 6c — PWA: Installable + Offline Shell (Design)

**Status:** Approved for planning · 2026-06-13
**Scope:** Third sub-project of Phase 6. Make FuFi an installable Progressive Web App with a branded offline experience. Builds on 6a/6b (auth) and the existing in-app notification center (5a).

## Goal

FuFi installs to the home screen and runs full-screen like a native app. When the network drops, navigations show a branded "You're offline" screen instead of the browser's error page. Users are offered installation via a dismissible banner and a Settings entry.

## Decisions (from brainstorming)

- **Scope:** Installable **+ offline app shell**. No web push, no background sync, no offline *data* caching/mutation queue (all YAGNI / out of scope).
- **Service worker:** **Hand-rolled** `public/sw.js`. The Next 16 docs suggest Serwist for offline, but Serwist requires webpack config and this project builds with **Turbopack** — so a small hand-rolled SW is the right fit and avoids a build-tool dependency.
- **Install UX:** A dismissible **install banner** (Android/Chrome → one-tap native prompt; iOS → "Add to Home Screen" hint) **and** a permanent **"Install FuFi" row in Settings**. Both hidden once running standalone.
- **Icons:** Generated from `public/Icons/FuFi-Logo-BlackBG.png` (user-specified).
- **Display:** `standalone`, **portrait** orientation.
- **Theme:** manifest `theme_color` = brand green `#16a34a`; `background_color` near-black to blend with the black-background logo for a seamless splash; the running app's status bar uses a theme-aware `viewport.themeColor` (light/dark).

## Architecture

Four pieces, mostly independent:

1. **Manifest** — `app/manifest.ts` returns a typed `MetadataRoute.Manifest`. Next auto-injects `<link rel="manifest" href="/manifest.webmanifest">` and serves it.
2. **Icons** — PNGs generated once from the source logo into `public/icons/`, referenced by the manifest and Apple meta tags.
3. **Offline shell** — `public/sw.js` precaches the shell + an `/offline` page; a `SwRegister` client component registers it; `next.config.ts` serves `/sw.js` with no-cache headers.
4. **Install** — a `useInstall` hook feeding a dismissible `InstallBanner` and a Settings row.

## 1. Manifest & icons

`app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FuFi — Future Financial",
    short_name: "FuFi",
    description: "Manage your salary, allocations, savings, loans & running balance — calm and beautiful.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["finance"],
    theme_color: "#16a34a",
    background_color: "#0b1210",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

**Icon generation:** a one-off Node script (`scripts/generate-pwa-icons.mjs`) using **sharp** (bundled with Next for image optimization) resizes `public/Icons/FuFi-Logo-BlackBG.png` into `public/icons/`:
- `icon-192.png` (192×192), `icon-512.png` (512×512) — standard "any" icons.
- `icon-maskable-512.png` (512×512) — the black-background logo is full-bleed, so it works as maskable; if the logo art needs breathing room inside the maskable safe zone, the script pads it on a black canvas.
- `apple-touch-icon.png` (180×180) — for iOS home-screen.

Generated PNGs are committed (the script is not part of the build).

**Root layout `metadata` / `viewport`** (`src/app/layout.tsx`):
- `appleWebApp: { capable: true, title: "FuFi", statusBarStyle: "black-translucent" }` → emits the Apple standalone meta tags.
- `icons.apple: "/icons/apple-touch-icon.png"`.
- `export const viewport: Viewport` with `themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0b1210" }]` so the in-app status bar matches the active theme (exact light/dark values confirmed against `--background` in the plan).
- The `manifest` link is auto-injected by Next from `app/manifest.ts` (no manual `metadata.manifest` needed; the plan verifies the emitted link).

## 2. Offline service worker

`public/sw.js` — versioned cache name (e.g. `fufi-shell-v1`):

- **install:** `caches.open` → precache `["/offline", "/icons/icon-192.png", "/icons/icon-512.png"]` (the shell HTML for arbitrary routes can't be reliably precached, so the offline fallback is the safety net); `self.skipWaiting()`.
- **activate:** delete caches whose name ≠ current version; `clients.claim()`.
- **fetch:**
  - **Navigation requests** (`request.mode === "navigate"`): **network-first** → on network failure, `caches.match("/offline")`.
  - **Static build assets** (`/_next/static/...`, fonts, `/icons/...`): **cache-first** with background fill (these are content-hashed → safe to cache forever).
  - **Everything else** — API routes, Server Actions (`POST`), auth, dynamic data: **bypass the cache, go to network**. Finance data must stay fresh and per-user private; nothing user-specific is ever cached.

`app/offline/page.tsx` — a branded static page (hero theme, FuFi mark): "You're offline", a short "Check your connection and try again" line, and a Retry button (`location.reload()`). No auth/data dependency so it renders from cache. It must be reachable without a session — placed outside the `(app)`/`(auth)` groups (e.g. `app/offline/page.tsx`) and excluded from `proxy.ts` route protection.

`src/components/pwa/sw-register.tsx` — a `"use client"` component that, on mount, registers `/sw.js` (`navigator.serviceWorker.register("/sw.js", { scope: "/" })`) when supported. Mounted once in the root layout. Update handling stays simple: a new SW activates on the next load (no forced reload prompt this phase).

`next.config.ts` — add `headers()` for `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate` (so SW updates are always picked up) and `Content-Type: application/javascript`. **This edits `next.config.ts`** — called out explicitly since that file has historically held the user's own changes; the plan will add only the `headers()` entry alongside the existing config.

## 3. Install experience

`src/lib/pwa/use-install.ts` — a small client hook/store:
- Listens for `beforeinstallprompt`, stashes the event, exposes `canInstall: boolean` and `promptInstall(): Promise<void>` (calls the stashed event's `prompt()`).
- Exposes `isStandalone` (`matchMedia("(display-mode: standalone)")` or iOS `navigator.standalone`) and `isIOS`.
- `react-compiler` is on, so no manual memoization.

`src/components/pwa/install-banner.tsx` — a `"use client"` dismissible bottom banner (premium card, FuFi mark + one-line pitch):
- Shows only when **not** standalone, **not** previously dismissed (localStorage key `pwa-install-dismissed`), and the platform can install (Android: `canInstall`; iOS: show the Share→Add hint instead of a button).
- Android/Chrome: **Install** button → `promptInstall()`.
- iOS: short instruction line with the Share glyph; a "Got it" dismiss.
- Mounted in the app shell (authenticated area) so it doesn't appear over the auth screens.

**Settings** — an "Install FuFi" row (in the About panel or a small dedicated row): triggers `promptInstall()` on Android, shows the iOS hint, and renders **"Installed ✓"** (disabled) when `isStandalone`.

## Files

**New**
- `src/app/manifest.ts` — web app manifest.
- `src/app/offline/page.tsx` — branded offline fallback.
- `public/sw.js` — hand-rolled service worker.
- `public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png` — generated.
- `scripts/generate-pwa-icons.mjs` — one-off icon generator (sharp).
- `src/lib/pwa/use-install.ts` — install hook/store.
- `src/components/pwa/sw-register.tsx` — registers the SW.
- `src/components/pwa/install-banner.tsx` — dismissible install banner.

**Modified**
- `src/app/layout.tsx` — `metadata.appleWebApp` + apple-touch icon, `viewport.themeColor`, mount `<SwRegister />`.
- `src/components/navigation/app-shell.tsx` — mount `<InstallBanner />`.
- `src/components/settings/settings-view.tsx` (or About) — "Install FuFi" row.
- `next.config.ts` — `headers()` for `/sw.js`.

## Testing

- **Build:** `npx next build` → `/manifest.webmanifest` and `/offline` appear in the route list; build clean. `npx tsc --noEmit`, `npx eslint .` clean.
- **Vitest:** any pure logic worth extracting — e.g. an `shouldShowInstallBanner({ isStandalone, dismissed, canInstall, isIOS })` predicate — unit-tested.
- **Manual:**
  - Chrome DevTools → Application → **Manifest** valid (name, icons, installable, no errors); **Service Workers** registered/activated.
  - Lighthouse → "Installable" passes.
  - DevTools → Network **Offline** → navigating shows `/offline`; static assets still load from cache.
  - **Install** (Chrome desktop/Android) → opens standalone with the FuFi icon; banner/Settings row flip to installed state.
  - **iOS Safari** → Share → Add to Home Screen shows the FuFi icon; launches full-screen.

## Security

- The SW caches **only** static, non-sensitive assets + the offline page; it **never** caches API responses, Server Actions, auth, or any per-user data (fresh + private).
- SW served with no-cache headers so a poisoned/stale worker can't persist; versioned cache name with old-cache cleanup on activate.
- `/offline` is public (no session) by design; it contains no user data.
- Manifest `scope`/`start_url` constrained to `/`.

## Out of scope (YAGNI)

Web push notifications, background sync / periodic sync, offline data caching or an offline mutation queue, app-store packaging (TWA/Capacitor), and a SW update "reload now" prompt (a new worker simply activates on next load this phase).
