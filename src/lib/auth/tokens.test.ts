import { describe, it, expect } from "vitest";
import { generateOtp, generateToken, hashSecret, verifySecret, isExpired } from "@/lib/auth/tokens";

describe("tokens", () => {
  it("generateOtp is 6 digits", () => {
    for (let i = 0; i < 20; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
  it("generateToken is 64 hex chars", () => {
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/);
  });
  it("hashSecret is deterministic and verifySecret round-trips", () => {
    const h = hashSecret("123456");
    expect(hashSecret("123456")).toBe(h);
    expect(verifySecret("123456", h)).toBe(true);
    expect(verifySecret("000000", h)).toBe(false);
  });
  it("isExpired compares against now (inclusive)", () => {
    const now = new Date("2026-06-13T12:00:00Z");
    expect(isExpired(new Date("2026-06-13T11:59:59Z"), now)).toBe(true);
    expect(isExpired(new Date("2026-06-13T12:00:00Z"), now)).toBe(true);
    expect(isExpired(new Date("2026-06-13T12:00:01Z"), now)).toBe(false);
  });
});
