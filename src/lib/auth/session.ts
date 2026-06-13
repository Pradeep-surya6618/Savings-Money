import { cookies } from "next/headers";
import { cache } from "react";
import { connectDB } from "@/lib/mongodb/connect";
import { Session } from "@/models/Session";
import { generateToken, hashSecret, isExpired } from "@/lib/auth/tokens";

const COOKIE = "fufi_session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Create a session row + set the httpOnly cookie. Call from a Server Action. */
export async function createSession(userId: string): Promise<void> {
  await connectDB();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);
  await Session.create({ userId, tokenHash: hashSecret(token), expiresAt });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolve the current session's userId, or null. Cached per request. */
export const getSession = cache(async (): Promise<{ userId: string } | null> => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: hashSecret(token) }).lean();
  if (!session || isExpired(session.expiresAt, new Date())) return null;
  return { userId: String(session.userId) };
});

/** Delete the current session row + clear the cookie. Call from a Server Action. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: hashSecret(token) });
    store.delete(COOKIE);
  }
}
