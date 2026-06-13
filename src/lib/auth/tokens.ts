import { createHash, randomBytes, randomInt } from "crypto";

/** Random 6-digit OTP (zero-padded). */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Random 32-byte token as hex (session token, reset token, signup ticket). */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 hex of a secret — what we store at rest (never the raw secret). */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifySecret(secret: string, hash: string): boolean {
  return hashSecret(secret) === hash;
}

/** True when `expiresAt` is at or before `now`. */
export function isExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}
