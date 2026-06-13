# User Profile Page (`/profile`) — Design

**Status:** Approved for planning · 2026-06-14
**Scope:** A per-user profile page to view and edit basic profile details, with an avatar stored in MongoDB. Builds on the existing auth/user model.

## Goal

A `/profile` page where the user sees and edits: **avatar** (≤3MB upload), **name**, **date of birth**, **bio** (≤100 chars), and their **email** (read-only). The avatar is stored in MongoDB and shown in the sidebar + app bar; those entry points link to `/profile`.

## Decisions (from brainstorming)

- **Editable:** avatar, name, date of birth, bio. **Read-only:** email. DOB, bio, and avatar are all **optional** (can be left blank).
- **Avatar:** upload capped at **3MB**, then **downscaled to 512×512 WebP** (sharp) before storing — keeps the DB small and loads fast.
- **Storage:** the image binary lives in a dedicated **`Avatar`** collection (one per user), **not** on the User doc (so it isn't loaded on every request). Served by a **session-scoped** route.
- **Avatar usage:** the sidebar and app-bar circles show the photo when set (initial as fallback); the sidebar user block links to `/profile`.

## Data model

**`src/models/Avatar.ts`** (new):
```
Avatar { userId: ObjectId (unique, indexed), data: Buffer, contentType: String }  // + timestamps
```

**`src/models/User.ts`** (add):
- `dateOfBirth?: Date`
- `bio?: string` (≤100 enforced in validation)
- `avatarUpdatedAt?: Date` — set on upload, cleared on remove. Tells the app an avatar exists + cache-busts its URL. (The existing `image` String stays as the OAuth/external fallback.)

## Avatar serving

`GET /api/profile/avatar` — Route Handler:
- `getSession()`; 401 if none. Loads `Avatar` for the **current user only** (never another user's).
- Returns the bytes with `Content-Type: <contentType>` and `Cache-Control: private, max-age=86400` (the `?v=<avatarUpdatedAt>` query the app appends busts the cache on change). 404 if no avatar.
- Node runtime (Mongoose). Avatars are private to the logged-in user.

## DTO / data access

- **`getCurrentUser`** (`src/lib/user.ts`): `user.image` resolves to `/api/profile/avatar?v=<avatarUpdatedAt.ms>` when `avatarUpdatedAt` is set, else the existing `image` (OAuth) ?? null. So the sidebar/app bar get the avatar URL for free.
- **`src/services/profile.ts`** (new): `getProfile()` → `{ name, email, dateOfBirth: string|null (ISO yyyy-mm-dd), bio, imageUrl, hasAvatar }`, session-scoped, for the `/profile` page.

## Server actions (`src/lib/actions/profile.ts`, all session-scoped)

- `updateProfile({ name, dateOfBirth, bio })` → validates (Zod), updates the User doc, `revalidatePath("/profile")` + `revalidatePath("/", "layout")` (so the sidebar name refreshes).
- `updateAvatar(formData)` → reads `formData.get("avatar")` as a `File`; validates it's an image and **≤3MB**; `sharp(buffer).resize(512,512,{fit:"cover"}).webp().toBuffer()`; upsert into `Avatar`; set `User.avatarUpdatedAt = new Date()`; revalidate. Returns the standard `Result`.
- `removeAvatar()` → delete the `Avatar` row, unset `avatarUpdatedAt`, revalidate.

## Validation (`src/validations/profile.ts`)

- `name`: trimmed, 1–60.
- `bio`: trimmed, ≤100, optional (empty → stored as undefined/"").
- `dateOfBirth`: optional; if present, a valid date **not in the future** (and after, say, 1900).
- Avatar size/type validated in the action (3MB; `image/*`).

## UI

**`src/app/(app)/profile/page.tsx`** (server) → `getProfile()` → renders the client view.

**`src/components/profile/profile-view.tsx`** (client):
- **Avatar block:** a large circle (photo or initial), a "Change photo" button (hidden file input, client-side ≤3MB + image-type pre-check, preview), and "Remove" when one exists. Upload calls `updateAvatar`.
- **Fields:** Name (text), Date of birth (`<input type="date">`), Bio (`<textarea>` + live `n/100` counter), Email (read-only, muted). Save button calls `updateProfile`.
- Premium success/error **toasts** (matches the app). React Compiler on — no manual memoization.

**Shared `src/components/ui/user-avatar.tsx`** (new): renders the photo when `imageUrl` is set, else the name initial in the primary-tinted circle. Sized via prop. Used by the sidebar, the app bar, and the profile page. **Use a plain `<img>` (not `next/image`)** — the avatar route is session-protected, and the `next/image` optimizer fetches the source server-side without the user's cookie (→ 401); a same-origin `<img>` sends the cookie and works.

**Entry points / nav to `/profile`:**
- **Sidebar** user footer → wrap in a `Link` to `/profile`, using `<UserAvatar>` (shows photo). 
- **App bar:** desktop `TopBar` gets a small `<UserAvatar>` button (right side) linking to `/profile`; `MobileHeader` shows a small `<UserAvatar>` (right side) linking to `/profile` (so mobile users can reach it).
- `AppShell` threads `image` (avatar URL) from `getCurrentUser` down to the sidebar / app bar.

## Files

**New:** `src/models/Avatar.ts`, `src/app/api/profile/avatar/route.ts`, `src/services/profile.ts`, `src/lib/actions/profile.ts`, `src/validations/profile.ts`, `src/app/(app)/profile/page.tsx`, `src/components/profile/profile-view.tsx`, `src/components/ui/user-avatar.tsx`.
**Modified:** `src/models/User.ts`, `src/lib/user.ts` (image resolution), `src/components/navigation/app-shell.tsx` (+ `sidebar.tsx`, `top-bar.tsx`, `mobile-header.tsx`) to thread + show the avatar and link to `/profile`.

## Testing

- **Vitest:** the pure validation (`profileSchema`: name bounds, bio ≤100, DOB not-future) and any pure avatar-validation helper (size/type predicate).
- **Build/lint/types:** `npx tsc --noEmit`, `npx eslint .`, `npx next build` clean; `/profile` + `/api/profile/avatar` present.
- **Manual:** upload a >3MB image (rejected with a toast), a valid image (resized, shows in profile + sidebar + app bar, survives reload), edit name/DOB/bio (persist + sidebar name updates), remove avatar (falls back to initial), email is not editable.

## Security

- Avatar route + all actions are **session-scoped**; a user can only read/update **their own** avatar and profile (no `userId` accepted from the client).
- Upload validated for size (≤3MB) and image type; sharp re-encode to WebP strips EXIF/metadata.
- Email is read-only (no action path to change it here).

## Out of scope (YAGNI)

Image cropping/rotation UI, multiple photos, public/shareable profiles, changing email, password change (already in Settings), and a `/profile` primary nav item (reached via the avatar instead).
