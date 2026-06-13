import { describe, it, expect } from "vitest";
import { decideOAuthLink } from "@/lib/auth/oauth-link";

const verified = { email: "a@b.com", emailVerified: true, name: "A" };

describe("decideOAuthLink", () => {
  it("rejects an unverified email", () => {
    expect(decideOAuthLink({ ...verified, emailVerified: false }, null, "google")).toEqual({
      action: "reject",
      reason: "unverified_email",
    });
  });
  it("rejects unverified even if a user exists", () => {
    expect(decideOAuthLink({ ...verified, emailVerified: false }, { providers: ["google"] }, "google").action).toBe("reject");
  });
  it("creates when no user exists", () => {
    expect(decideOAuthLink(verified, null, "google")).toEqual({ action: "create" });
  });
  it("logs in + adds the provider when it's new for an existing user", () => {
    expect(decideOAuthLink(verified, { providers: [] }, "google")).toEqual({ action: "login", addProvider: "google" });
    expect(decideOAuthLink(verified, { providers: ["microsoft"] }, "google")).toEqual({ action: "login", addProvider: "google" });
  });
  it("logs in without re-adding an already-linked provider", () => {
    expect(decideOAuthLink(verified, { providers: ["google"] }, "google")).toEqual({ action: "login", addProvider: null });
  });
});
