import { describe, it, expect } from "vitest";
import { profileFromGoogleUserInfo, profileFromMicrosoftClaims } from "@/lib/auth/oauth-profile";

describe("profileFromGoogleUserInfo", () => {
  it("verified + lowercased when email_verified is true", () => {
    expect(profileFromGoogleUserInfo({ email: "A@B.com", email_verified: true, name: "Al" })).toEqual({
      email: "a@b.com",
      emailVerified: true,
      name: "Al",
    });
  });

  it("unverified when email_verified is false", () => {
    expect(profileFromGoogleUserInfo({ email: "a@b.com", email_verified: false }).emailVerified).toBe(false);
  });

  it("unverified when email_verified is missing", () => {
    expect(profileFromGoogleUserInfo({ email: "a@b.com" }).emailVerified).toBe(false);
  });

  it("falls back to given_name then the email local-part for the name", () => {
    expect(profileFromGoogleUserInfo({ email: "sam@b.com", email_verified: true, given_name: "Sammy" }).name).toBe("Sammy");
    expect(profileFromGoogleUserInfo({ email: "sam@b.com", email_verified: true }).name).toBe("sam");
  });
});

describe("profileFromMicrosoftClaims (nOAuth guard)", () => {
  it("verified + lowercased only when xms_edov is true", () => {
    expect(profileFromMicrosoftClaims({ email: "A@B.com", xms_edov: true, name: "Al" })).toEqual({
      email: "a@b.com",
      emailVerified: true,
      name: "Al",
    });
  });

  it("accepts the string 'true' form of xms_edov", () => {
    expect(profileFromMicrosoftClaims({ email: "a@b.com", xms_edov: "true" }).emailVerified).toBe(true);
  });

  it("UNVERIFIED when xms_edov is missing — the takeover vector must not be trusted", () => {
    expect(profileFromMicrosoftClaims({ email: "victim@gmail.com" }).emailVerified).toBe(false);
  });

  it("unverified when xms_edov is false", () => {
    expect(profileFromMicrosoftClaims({ email: "a@b.com", xms_edov: false }).emailVerified).toBe(false);
  });

  it("unverified when the email claim is absent even if xms_edov is true", () => {
    expect(profileFromMicrosoftClaims({ xms_edov: true }).emailVerified).toBe(false);
  });
});
