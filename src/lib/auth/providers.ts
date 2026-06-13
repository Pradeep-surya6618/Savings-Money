import { Google, MicrosoftEntraId } from "arctic";
import type { OAuthProvider } from "@/lib/auth/oauth-link";

export const OAUTH_SCOPES = ["openid", "profile", "email"];

/** The app's canonical origin. Used for OAuth redirect targets so they don't depend
 *  on the request host (which is `0.0.0.0` when the dev server binds to all interfaces). */
export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3050";
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function callbackUrl(provider: OAuthProvider): string {
  return `${appUrl()}/api/auth/${provider}/callback`;
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return provider === "google"
    ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function getGoogleClient(): Google {
  return new Google(env("GOOGLE_CLIENT_ID"), env("GOOGLE_CLIENT_SECRET"), callbackUrl("google"));
}

export function getMicrosoftClient(): MicrosoftEntraId {
  const tenant = process.env.MICROSOFT_TENANT ?? "common";
  return new MicrosoftEntraId(tenant, env("MICROSOFT_CLIENT_ID"), env("MICROSOFT_CLIENT_SECRET"), callbackUrl("microsoft"));
}
