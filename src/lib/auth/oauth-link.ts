export type OAuthProvider = "google" | "microsoft";

export type OAuthProfile = { email: string; emailVerified: boolean; name: string };

export type LinkDecision =
  | { action: "reject"; reason: string }
  | { action: "login"; addProvider: OAuthProvider | null }
  | { action: "create" };

/**
 * Decide what to do for an OAuth sign-in, given the provider profile and the
 * existing user (matched by email) if any. Links only on a verified email.
 */
export function decideOAuthLink(
  profile: OAuthProfile,
  existing: { providers: string[] } | null,
  provider: OAuthProvider,
): LinkDecision {
  if (!profile.emailVerified) return { action: "reject", reason: "unverified_email" };
  if (existing) {
    return { action: "login", addProvider: existing.providers.includes(provider) ? null : provider };
  }
  return { action: "create" };
}
