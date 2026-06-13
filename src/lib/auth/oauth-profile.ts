import { decodeIdToken } from "arctic";
import type { OAuthProfile, OAuthProvider } from "@/lib/auth/oauth-link";

const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

type GoogleUserInfo = { email?: string; email_verified?: boolean; name?: string; given_name?: string };

/** Build a profile from Google's OIDC userinfo. Google always returns a trustworthy `email_verified`. */
export function profileFromGoogleUserInfo(data: GoogleUserInfo): OAuthProfile {
  const email = (data.email ?? "").toLowerCase();
  const emailVerified = data.email_verified === true && email.length > 0;
  const name = data.name ?? data.given_name ?? email.split("@")[0] ?? "";
  return { email, emailVerified, name };
}

/**
 * Build a profile from Microsoft Entra id_token claims.
 *
 * The Entra `email` claim is mutable and is NOT proof of ownership — a tenant admin
 * can set it to any address (the "nOAuth" account-takeover vector). So we only treat
 * the email as verified when the `xms_edov` ("email domain owner verified") optional
 * claim is true. A missing or false claim → unverified → the link decision rejects it.
 * (Requires the `xms_edov` optional claim to be configured on the Azure app registration.)
 */
export function profileFromMicrosoftClaims(claims: Record<string, unknown>): OAuthProfile {
  const email = (typeof claims.email === "string" ? claims.email : "").toLowerCase();
  const edov = claims.xms_edov;
  const emailVerified = (edov === true || edov === "true") && email.length > 0;
  const name = (typeof claims.name === "string" && claims.name) || email.split("@")[0] || "";
  return { email, emailVerified, name };
}

/** Resolve the provider's identity → normalized profile. */
export async function fetchOAuthProfile(
  provider: OAuthProvider,
  tokens: { accessToken: string; idToken: string | null },
): Promise<OAuthProfile> {
  if (provider === "microsoft") {
    // xms_edov lives in the id_token, not in the Graph userinfo response.
    if (!tokens.idToken) throw new Error("oauth_no_id_token");
    const claims = decodeIdToken(tokens.idToken) as Record<string, unknown>;
    return profileFromMicrosoftClaims(claims);
  }
  const res = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  if (!res.ok) throw new Error("oauth_userinfo_failed");
  return profileFromGoogleUserInfo((await res.json()) as GoogleUserInfo);
}
