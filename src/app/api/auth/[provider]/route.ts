import { NextResponse, type NextRequest } from "next/server";
import { generateState, generateCodeVerifier } from "arctic";
import { appUrl, getGoogleClient, isProviderConfigured, OAUTH_SCOPES } from "@/lib/auth/providers";
import type { OAuthProvider } from "@/lib/auth/oauth-link";

const PROVIDERS: OAuthProvider[] = ["google"];
const tempCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const p = provider as OAuthProvider;
  if (!isProviderConfigured(p)) {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", appUrl()));
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const client = getGoogleClient();
  const url = client.createAuthorizationURL(state, codeVerifier, OAUTH_SCOPES);

  const res = NextResponse.redirect(url);
  res.cookies.set("fufi_oauth_state", state, tempCookie);
  res.cookies.set("fufi_oauth_verifier", codeVerifier, tempCookie);
  return res;
}
