import { describe, it, expect } from "vitest";
import { passwordSchema, passwordRules } from "@/lib/auth/password";

describe("passwordSchema", () => {
  it("accepts 8+ chars with a number or symbol", () => {
    expect(passwordSchema.safeParse("abcd1234").success).toBe(true);
    expect(passwordSchema.safeParse("abcdefg!").success).toBe(true);
  });
  it("rejects short or letters-only", () => {
    expect(passwordSchema.safeParse("ab1").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(false);
  });
});

describe("passwordRules", () => {
  it("reports each rule", () => {
    expect(passwordRules("abcdefg")).toEqual({ length: false, numberOrSymbol: false });
    expect(passwordRules("abcdefg1")).toEqual({ length: true, numberOrSymbol: true });
    expect(passwordRules("short!")).toEqual({ length: false, numberOrSymbol: true });
  });
});
