import type { OAuthProfile, OAuthProvider } from "@/lib/auth/oauth-link";

const USERINFO_URL: Record<OAuthProvider, string> = {
  google: "https://openidconnect.googleapis.com/v1/userinfo",
  microsoft: "https://graph.microsoft.com/oidc/userinfo",
};

type UserInfo = { email?: string; email_verified?: boolean; name?: string; given_name?: string };

/** Fetch the provider's OIDC userinfo with the access token → normalized profile. */
export async function fetchOAuthProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
  const res = await fetch(USERINFO_URL[provider], { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error("oauth_userinfo_failed");
  const data = (await res.json()) as UserInfo;
  const email = (data.email ?? "").toLowerCase();
  // Google returns email_verified; Microsoft Entra returns only verified account emails
  // (no field), so treat a present email as verified there.
  const emailVerified = provider === "google" ? data.email_verified === true : email.length > 0;
  const name = data.name ?? data.given_name ?? email.split("@")[0] ?? "";
  return { email, emailVerified, name };
}
