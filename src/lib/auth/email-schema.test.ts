import { describe, it, expect } from "vitest";
import { emailSchema } from "@/lib/auth/email-schema";

describe("emailSchema", () => {
  it("trims + lowercases a valid email", () => {
    expect(emailSchema.parse("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
  it("rejects invalid emails", () => {
    expect(emailSchema.safeParse("nope").success).toBe(false);
    expect(emailSchema.safeParse("a@b").success).toBe(false);
  });
});
