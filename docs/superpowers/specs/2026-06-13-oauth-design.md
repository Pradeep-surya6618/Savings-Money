# Phase 6b — OAuth Sign-in (Google + Microsoft) (Design)

**Status:** Approved for planning · 2026-06-13
**Scope:** Second sub-project of Phase 6 (multi-user). OAuth login + account linking + set/change password. Builds on 6a (email/password auth, DB sessions).

## Goal

Make the Google and Microsoft buttons real: users can sign in with either provider, and an OAuth login is **linked to the existing account when the provider's verified email matches** an email/password user (same account, not a duplicate). OAuth-only users can add a password later.

## Decisions (from brainstorming)

- **Providers:** Google **and** Microsoft, both in this phase. Implemented with the **`arctic`** library (provider-specific OAuth2 helpers: authorization URL, PKCE, token exchange). arctic does NOT manage sessions — we keep the 6a DB-session cookie.
- **Account linking:** link by the provider's **verified email**. Verified email that matches an existing user → log into that account (link the provider). No match → create a new OAuth user. Unverified provider email → refuse.
- **Microsoft tenant:** `common` (allows both personal and work/school Microsoft accounts).
- **Passwords for OAuth users:** OAuth-only accounts (no password) can **set a password** via Settings → Security; accounts with a password can **change** it.
- **Graceful fallback:** if a provider's env vars aren't configured, its button keeps the "Social sign-in coming soon" message and the start route 404s/redirects — the app still runs without OAuth configured.

## Architecture & data flow

Per provider, two **Route Handlers** (Next 16 route handlers may set/delete cookies):

- `GET /api/auth/<provider>` — **start**: generate `state` + PKCE `codeVerifier`; store both in short-lived (10 min) httpOnly cookies (`fufi_oauth_state`, `fufi_oauth_verifier`); redirect to the provider authorization URL built by arctic. If the provider isn't configured, redirect to `/login?error=oauth_unavailable`.
- `GET /api/auth/<provider>/callback` — **callback**: read `state`/`code` from query; compare `state` to the cookie (CSRF); exchange `code` → tokens via arctic (using the verifier cookie); fetch userinfo; require `email_verified`; run the **link-or-create** decision; `createSession(userId)`; clear the state/verifier cookies; `redirect("/")`. On any failure → `redirect("/login?error=oauth_failed")`.

```
button → GET /api/auth/google → (state+PKCE cookies) → Google consent
        → GET /api/auth/google/callback?code&state
            → verify state → arctic.validateAuthorizationCode → userinfo
            → require email_verified → linkOrCreateOAuthUser(email, name, provider)
            → createSession → redirect("/")
```

`<provider>` is constrained to `"google" | "microsoft"`.

### Next 16 / arctic notes
- `arctic` is not yet installed (Task 1 adds it). Its exact API (class names, `createAuthorizationURL`/`validateAuthorizationCode` signatures, scopes) must be confirmed against the installed version at implementation time. Expected: `new Google(clientId, clientSecret, redirectURI)` and `new MicrosoftEntraId(tenant, clientId, clientSecret, redirectURI)`; Google uses PKCE.
- Userinfo: Google `https://openidconnect.googleapis.com/v1/userinfo`; Microsoft `https://graph.microsoft.com/oidc/userinfo` — fetched with the access token. Email + `email_verified` + name read from the response (Google returns `email_verified`; for Microsoft, treat a successfully returned account email as verified per Entra, but check the field if present).

## Data model changes (`src/models/User.ts`)

- `passwordHash`: **required → optional** (OAuth-only users have none).
- add `providers: { type: [String], default: [] }` — linked sign-in methods, e.g. `["google"]`.
- `emailVerified` set `true` on OAuth login.
- `email` stays unique + lowercased (the linking key).

`getCurrentUser` / `CurrentUser` shape is unchanged (it already exposes `email`, `name`).

## Pure logic (Vitest) — `src/lib/auth/oauth-link.ts`

A pure decision helper, DB-free, so the linking rule is unit-tested:

```ts
type Provider = "google" | "microsoft";
type OAuthProfile = { email: string; emailVerified: boolean; name: string };
type LinkDecision =
  | { action: "reject"; reason: string }
  | { action: "login"; addProvider: Provider | null }   // existing user
  | { action: "create" };                                // new user

function decideOAuthLink(profile: OAuthProfile, existing: { providers: string[] } | null, provider: Provider): LinkDecision
```
- `!profile.emailVerified` → `reject`.
- `existing` present → `login`, `addProvider = provider` if not already in `existing.providers`, else `null`.
- no `existing` → `create`.

The service layer does the DB work (`User.findOne({ email })`, create/update, `createSession`) around this decision.

## Service / actions

- `src/services/oauth.ts` — `linkOrCreateOAuthUser(profile, provider): Promise<string /* userId */>`: `connectDB`; `User.findOne({ email })`; call `decideOAuthLink`; on `create` → `User.create({ email, name, emailVerified: true, providers: [provider] })` + default `Settings`/`Savings`; on `login` with `addProvider` → `$addToSet providers`; return the userId. Throws on `reject` (callback maps to the error redirect).
- `src/lib/auth/providers.ts` — builds the arctic provider instances from env, and exposes `isConfigured(provider)` + `getProvider(provider)`; central place for client IDs/secrets/redirect URIs.

## 6a flow adjustments (`src/lib/actions/auth.ts`)

- **`login`**: after finding the user, if `!user.passwordHash` (OAuth-only) → return `{ ok: false, error: "This account uses social sign-in — continue with Google or Microsoft." }`. Wrong password / no user stay generic `"Invalid email or password"`. (Deliberate, accepted mild-enumeration tradeoff.)
- **`completeSignup`**: the existing "already registered" guard already covers an email owned by an OAuth user.
- **`requestReset` / `resetPassword`**: unchanged — an OAuth-only user who resets simply **sets** their first password (valid). Reset still invalidates sessions.

## Set / Change password (Settings → Security)

- New actions in `src/lib/actions/auth.ts`:
  - `setPassword({ password })` — only when the current user has **no** `passwordHash`; sets it (they're already authenticated via session). Adds `"password"` is not needed in `providers` (password is the base method); just sets `passwordHash`.
  - `changePassword({ current, password })` — when a `passwordHash` exists; verify `current` with bcrypt, then set the new hash.
  Both validated with Zod (`passwordSchema`), return the standard `Result`.
- Settings → Security UI: a row that renders "Set a password" (no password yet) or "Change password" (has one) opening a small dialog/inline form. Shows a success toast.

## UI

- `src/components/auth/social-buttons.tsx`: the Google/Microsoft buttons always become links to `/api/auth/google` and `/api/auth/microsoft`. If a provider isn't configured, its **start route** redirects to `/login?error=oauth_unavailable` (so no provider config needs to reach the client component).
- `/login` reads an optional `?error=` (oauth_failed / oauth_unavailable) and shows a toast/inline message.
- Settings → Security gets the Set/Change-password row (above "Log out" / "Reset all data").

## Security

state (CSRF) compared to a cookie; PKCE via arctic; httpOnly + secure-in-prod state/verifier cookies (10-min TTL, cleared after callback); **link only on verified email**; generic callback failure redirect; bcrypt (cost 12) for set/change password; provider client secrets only in env (never shipped to the client).

## Testing

- **Vitest:** `oauth-link.test.ts` (reject on unverified; login + addProvider when new provider; login + null when provider already linked; create when no user) and set/change-password validation.
- OAuth handshakes verified by `npx next build` + a manual walkthrough once real client IDs are in `.env.local`. Verification uses `npx` forms only.

## Files

**New**
- `src/lib/auth/oauth-link.ts` (+ `oauth-link.test.ts`)
- `src/lib/auth/providers.ts`
- `src/services/oauth.ts`
- `src/app/api/auth/[provider]/route.ts` (start) and `src/app/api/auth/[provider]/callback/route.ts` (callback) — or per-provider folders if the dynamic segment is awkward with the two providers; decide in the plan.
- `src/components/settings/password-row.tsx` (Set/Change password form) — or inline in settings-view.

**Modified**
- `src/models/User.ts` (passwordHash optional, providers)
- `src/lib/actions/auth.ts` (login message for passwordless; setPassword/changePassword)
- `src/validations/auth.ts` (setPassword/changePassword schemas)
- `src/components/auth/social-buttons.tsx` (link to start routes / configured state)
- `src/components/auth/login-form.tsx` (surface `?error=` toast) — or read in the page
- `src/components/settings/settings-view.tsx` (Security: password row)
- `package.json` (arctic)
- `.env.local` (documented — user-managed): `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`, `MICROSOFT_TENANT=common`, redirect URIs derived from `APP_URL`.

## Out of scope (YAGNI)

Disconnecting/unlinking a provider, multiple emails per account, provider-account-id matching (we link by verified email), Apple sign-in, and refresh-token storage (we only need identity at sign-in, then our own session).
