# Phase 6a — Authentication & Multi-user (Design)

**Status:** Approved for planning · 2026-06-13
**Scope:** First sub-project of Phase 6 (multi-user). Auth core only. Real Google/Apple OAuth is a later increment; PWA is sub-project 6c.

## Goal

Turn FuFi from a single implicit user into a real multi-user app: email + password accounts, email-OTP signup verification, password reset by emailed link (via nodemailer), DB-backed sessions, and route protection — with all existing data scoped to the logged-in user. UI matches `public/UI/FuFi-UI.png`, using `public/UI/FuFi-PNG.png` illustrations.

## Decisions (from brainstorming)

- **Identity & delivery:** email + password. nodemailer sends a 6-digit **signup OTP** and a **password-reset link**. (The mockup's "Mobile Number" fields become "Email". No SMS — nodemailer is email-only and SMS would need a paid gateway + DLT.)
- **Social login:** Google + Apple buttons are rendered per the mockup but **stubbed** — clicking shows a "Social sign-in coming soon" toast. Real OAuth is deferred.
- **Auth engine:** hand-rolled credentials auth (no Auth.js/Lucia). bcrypt password hashing; DB-backed session referenced by an httpOnly cookie; crypto tokens (hashed, expiring) for OTP & reset.
- **Existing data:** start fresh — wipe current data; every new account begins empty with its own default Settings/Savings singletons.

## Architecture & data flow

- New **`(auth)` route group** (public): `/login`, `/signup`, `/forgot-password`, `/reset-password`. A shared auth layout renders the split-screen brand panel + form card (single column on mobile).
- The existing **`(app)` route group becomes protected**. `getCurrentUser()` keeps its **name and `{ user, settings }` return shape** (so the ~10 callers don't change), but its body changes: instead of find-or-creating the implicit "You", it reads the session, returns the logged-in user (+ their Settings), or `redirect("/login")` when there's no valid session. Every existing service/action already filters by `user.id`; only the *source* of that id changes.
- **Middleware** (`src/middleware.ts`) does an optimistic cookie-presence check: redirect unauthenticated requests for `(app)` routes to `/login`, and redirect authenticated requests away from `(auth)` pages to `/`. `requireUser()` remains the authoritative check (middleware can't validate the session against the DB cheaply).

```
request ─▶ middleware (cookie present? optimistic redirect)
              │
        (app) page/layout ─▶ getCurrentUser() ─▶ getSession() ─▶ Session lookup by tokenHash
              │                                      └─ invalid/expired ⇒ redirect("/login")
              ▼
        services/actions (already userId-scoped) keep working unchanged
```

### Next 16 facts this relies on
- `cookies()` from `next/headers` is **async** (`await cookies()`).
- Cookies can only be **set/deleted in Server Actions or Route Handlers** (read anywhere). So session create/clear happens in the login/logout/signup/reset Server Actions; reading happens in `getSession()`.
- Using cookies opts a route into dynamic rendering — the `(app)` routes are already dynamic.

## Data model

- **User** (`src/models/User.ts`) gains:
  - `email`: String, required, unique, lowercased, trimmed.
  - `passwordHash`: String, required.
  - `emailVerified`: Boolean, default false.
  - keeps `name`, `image`. The old `{ name: "You" }` default is removed.
- **Session** (`src/models/Session.ts`, new): `{ userId (ref User, indexed), tokenHash (String, unique), expiresAt (Date) }`, timestamps. The cookie holds a random 32-byte token; only its SHA-256 hash is stored.
- **VerificationToken** (`src/models/VerificationToken.ts`, new): `{ email (lowercased, indexed), purpose ("signup" | "reset"), secretHash (String), expiresAt (Date), attempts (Number, default 0) }`, timestamps.
  - signup: `secretHash` = hash of a 6-digit OTP; expires 10 min; ≤5 verify attempts; supersedes prior signup tokens for the same email on resend.
  - reset: `secretHash` = hash of a 32-byte URL token; expires 1h; single-use (deleted on success); only created when an account exists.

## Pure logic (Vitest-tested) — `src/lib/auth/`

- `password.ts` — `passwordSchema` (Zod: ≥8 chars, contains a digit or symbol) + `passwordRules(value)` → the live checklist booleans the UI shows.
- `tokens.ts` — `generateOtp()` (6 digits), `generateResetToken()` (32-byte hex), `hashSecret(secret)` (SHA-256 → hex), `verifySecret(secret, hash)`, `isExpired(date, now)`. Pure; crypto is deterministic to test (hash compare, expiry math). `now` injected for testability.
- `email-schema.ts` — `emailSchema` (Zod, trims + lowercases).

Hashing of *passwords* uses bcrypt in the action layer (not pure-tested). Hashing of *tokens/OTP* uses Node `crypto` (sha256) in `tokens.ts`.

## Flows

### Signup (3 steps, one `/signup` route with step state)
1. **Email step:** submit email. If a *verified* user already exists → error "This email is already registered. Log in instead." Otherwise create/replace a `VerificationToken(purpose="signup")` with a fresh OTP, email it, advance to OTP step. (`sendOtp` action.)
2. **OTP step:** 6-box input + 25s resend timer. Submit code → `verifyOtp` action checks hash/expiry/attempts. On success, set a short-lived signed httpOnly **signup-ticket cookie** (`{ email, verified:true }`, ~15 min) and advance to password step. On failure, increment attempts / show error.
3. **Password step:** new + confirm (live rules checklist). `completeSignup` action reads the signup-ticket, validates the password, creates the `User` (emailVerified=true, bcrypt hash) + their default Settings/Savings docs, clears the ticket + signup token, creates a Session, sets `fufi_session`, redirects to `/`.

### Login — `/login`
Email + password → `login` action: find user by email, bcrypt compare; on success create Session + cookie, redirect to `/`. Generic "Invalid email or password" on any failure (no field-level leak).

### Forgot — `/forgot-password`
Submit email → `requestReset` action: if a user exists, create `VerificationToken(purpose="reset")` + email a link `/<base>/reset-password?token=…`. Always respond "If an account exists, we've sent a reset link." (no enumeration).

### Reset — `/reset-password?token=…`
Create New Password form. `resetPassword` action: look up reset token by hash, check expiry/single-use, validate new password, update `passwordHash`, delete the token, delete the user's existing Sessions (force re-login), redirect to `/login` with a success toast.

### Logout
`logout` Server Action: delete the Session row, clear the cookie, redirect to `/login`.

## Session layer — `src/lib/auth/session.ts`
- `createSession(userId)` — random token, store hash + expiry (30 days), set cookie. (Server Action context.)
- `getSession()` — `await cookies()`, read token, hash, find non-expired Session → `userId | null`. Wrapped in React `cache()`.
- `destroySession()` — delete row + clear cookie.
- `getCurrentUser()` (kept in `src/lib/user.ts`, same name/shape) — `getSession()` → load User + find-or-create that user's Settings/Savings singletons → `{ user, settings }`; `redirect("/login")` if no valid session. Still wrapped in React `cache()`.
- Caveat: services that swallow errors in a `try/catch` (e.g. `getNotifications`) must re-throw Next's redirect signal rather than return empty. In practice these run only after the layout already authenticated, so it's defensive.

## Email — `src/lib/email/`
- `mailer.ts` — lazy nodemailer transport from env (`SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM`). **Dev fallback:** if SMTP is unset, log the message (code/link) to the server console instead of sending, so the flows are testable without a mailbox.
- `templates.ts` — `otpEmail(code)` and `resetEmail(link)` returning `{ subject, html, text }`, FuFi-green branded.
- Env additions documented for `.env.local`: the `SMTP_*` vars + `AUTH_SECRET` (signs the signup-ticket cookie) + `APP_URL` (for building the reset link). User supplies real SMTP creds when ready.

## UI (matches `FuFi-UI.png`)
- `src/app/(auth)/layout.tsx` — desktop split: left brand panel (logo + wordmark, "Smart way to manage your salary, savings & future.", four feature ticks, illustration, "Your data is 100% safe" footer); right = form card. Mobile = single column, illustration above the form.
- Pages: `(auth)/login`, `(auth)/signup`, `(auth)/forgot-password`, `(auth)/reset-password`.
- Components in `src/components/auth/`: `AuthCard`, `BrandPanel`, `AuthIllustration` (crops the relevant third of `FuFi-PNG.png` via `object-position`), `OtpInput` (6 boxes, paste-aware), `PasswordField` (show/hide + live rules checklist), `SocialButtons` (Google/Apple, stubbed → toast).
- Forms: react-hook-form + Zod resolver + Server Actions, matching the existing form pattern (`{ ok } | { ok:false, error }`, toasts).

## Security
- bcrypt cost 12 for passwords. OTP/reset secrets hashed (sha256) at rest, expiring, attempt-limited. Session cookie httpOnly + `secure` (prod) + sameSite=lax + 30-day expiry. Forgot/reset responses are generic (no enumeration); login error is generic. Password policy enforced server-side (Zod) as well as in the UI. Reset invalidates existing sessions.
- Known pragmatic trade-off: **signup** reveals whether an email is already registered (needed for good UX). Acceptable for this app; documented.

## Testing
- **Vitest (pure):** `password.test.ts` (policy + rules checklist), `tokens.test.ts` (OTP shape, hash/verify round-trip, expiry boundaries, single-use), `email-schema.test.ts`.
- Flows verified by `npx next build` + manual walkthrough using the dev email fallback (read code/link from the server console). Verification uses `npx` forms only.

## Files

**New**
- `src/models/Session.ts`, `src/models/VerificationToken.ts`
- `src/lib/auth/password.ts` (+test), `src/lib/auth/tokens.ts` (+test), `src/lib/auth/email-schema.ts` (+test), `src/lib/auth/session.ts`
- `src/lib/email/mailer.ts`, `src/lib/email/templates.ts`
- `src/lib/actions/auth.ts` (sendOtp, verifyOtp, completeSignup, login, logout, requestReset, resetPassword)
- `src/middleware.ts`
- `src/app/(auth)/layout.tsx` + `login/`, `signup/`, `forgot-password/`, `reset-password/` pages
- `src/components/auth/*` (AuthCard, BrandPanel, AuthIllustration, OtpInput, PasswordField, SocialButtons + the page client forms)

**Modified**
- `src/models/User.ts` (email/passwordHash/emailVerified)
- `src/lib/user.ts` (`getCurrentUser` body now resolves the user from the session and redirects when unauthenticated; same name + `{ user, settings }` return shape, so service/action callers are unchanged)
- `src/lib/actions/balance.ts` `resetAllData` stays per-user (already scoped)
- `.env.local` (documented additions — user-managed; never committed)
- A top-bar/sidebar **logout** entry (user menu / Settings → Security "Log out").

## Out of scope (YAGNI)
Real Google/Apple OAuth, email change, account deletion, 2FA, "remember me"/device list, rate-limiting infrastructure beyond per-token attempt limits, and PWA (sub-project 6c).
