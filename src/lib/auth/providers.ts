import { Google, MicrosoftEntraId } from "arctic";
import type { OAuthProvider } from "@/lib/auth/oauth-link";

export const OAUTH_SCOPES = ["openid", "profile", "email"];

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
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
