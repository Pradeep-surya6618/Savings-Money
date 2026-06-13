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
  // Prefer the provider's explicit email_verified claim; Microsoft Entra often omits it
  // and only returns an email for verified accounts, so fall back to a present email.
  const emailVerified =
    data.email_verified === true || (data.email_verified === undefined && email.length > 0);
  const name = data.name ?? data.given_name ?? email.split("@")[0] ?? "";
  return { email, emailVerified, name };
}
