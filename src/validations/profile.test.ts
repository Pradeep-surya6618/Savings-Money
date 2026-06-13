import { describe, it, expect } from "vitest";
import { profileSchema, isValidAvatar, MAX_AVATAR_BYTES } from "@/validations/profile";

describe("profileSchema", () => {
  it("accepts a valid profile", () => {
    const r = profileSchema.safeParse({ name: "Surya", bio: "Hi", dateOfBirth: "1998-04-12" });
    expect(r.success).toBe(true);
  });
  it("rejects an empty name", () => {
    expect(profileSchema.safeParse({ name: "  ", bio: "", dateOfBirth: "" }).success).toBe(false);
  });
  it("rejects a bio over 100 chars", () => {
    expect(profileSchema.safeParse({ name: "A", bio: "x".repeat(101), dateOfBirth: "" }).success).toBe(false);
  });
  it("rejects a future date of birth", () => {
    expect(profileSchema.safeParse({ name: "A", bio: "", dateOfBirth: "3000-01-01" }).success).toBe(false);
  });
  it("allows empty dateOfBirth and bio", () => {
    expect(profileSchema.safeParse({ name: "A", bio: "", dateOfBirth: "" }).success).toBe(true);
  });
});

describe("isValidAvatar", () => {
  it("accepts an image under the cap", () => {
    expect(isValidAvatar("image/png", 1000)).toBe(true);
  });
  it("rejects a non-image", () => {
    expect(isValidAvatar("application/pdf", 1000)).toBe(false);
  });
  it("rejects an oversized image", () => {
    expect(isValidAvatar("image/png", MAX_AVATAR_BYTES + 1)).toBe(false);
  });
});
