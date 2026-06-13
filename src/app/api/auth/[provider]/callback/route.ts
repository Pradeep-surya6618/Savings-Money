import { NextResponse, type NextRequest } from "next/server";
import { appUrl, getGoogleClient } from "@/lib/auth/providers";
import { fetchOAuthProfile } from "@/lib/auth/oauth-profile";
import { linkOrCreateOAuthUser } from "@/services/oauth";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import type { OAuthProvider } from "@/lib/auth/oauth-link";

const PROVIDERS: OAuthProvider[] = ["google"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const base = appUrl();
  const fail = NextResponse.redirect(new URL("/login?error=oauth_failed", base));
  // Always clear the short-lived OAuth handshake cookies, including on failure.
  fail.cookies.set("fufi_oauth_state", "", { path: "/", maxAge: 0 });
  fail.cookies.set("fufi_oauth_verifier", "", { path: "/", maxAge: 0 });

  if (!PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const p = provider as OAuthProvider;

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get("fufi_oauth_state")?.value;
  const verifier = req.cookies.get("fufi_oauth_verifier")?.value;
  if (!code || !state || !stateCookie || state !== stateCookie || !verifier) return fail;

  try {
    const client = getGoogleClient();
    const tokens = await client.validateAuthorizationCode(code, verifier);
    let idToken: string | null = null;
    try {
      idToken = tokens.idToken();
    } catch {
      idToken = null;
    }
    const profile = await fetchOAuthProfile(p, { accessToken: tokens.accessToken(), idToken });
    const userId = await linkOrCreateOAuthUser(profile, p);
    const { token, expiresAt } = await createSessionToken(userId);

    const res = NextResponse.redirect(new URL("/", base));
    res.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions, expires: expiresAt });
    res.cookies.set("fufi_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("fufi_oauth_verifier", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return fail;
  }
}
