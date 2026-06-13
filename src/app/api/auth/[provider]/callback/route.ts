import { NextResponse, type NextRequest } from "next/server";
import { getGoogleClient, getMicrosoftClient } from "@/lib/auth/providers";
import { fetchOAuthProfile } from "@/lib/auth/oauth-profile";
import { linkOrCreateOAuthUser } from "@/services/oauth";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import type { OAuthProvider } from "@/lib/auth/oauth-link";

const PROVIDERS: OAuthProvider[] = ["google", "microsoft"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = req.nextUrl.origin;
  const fail = NextResponse.redirect(new URL("/login?error=oauth_failed", origin));

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
    const client = p === "google" ? getGoogleClient() : getMicrosoftClient();
    const tokens = await client.validateAuthorizationCode(code, verifier);
    const profile = await fetchOAuthProfile(p, tokens.accessToken());
    const userId = await linkOrCreateOAuthUser(profile, p);
    const { token, expiresAt } = await createSessionToken(userId);

    const res = NextResponse.redirect(new URL("/", origin));
    res.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions, expires: expiresAt });
    res.cookies.set("fufi_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("fufi_oauth_verifier", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return fail;
  }
}
