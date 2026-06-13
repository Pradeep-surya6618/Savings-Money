import { describe, it, expect } from "vitest";
import { deriveTitle } from "@/services/derive-title";

describe("deriveTitle", () => {
  it("uses the trimmed first message", () => {
    expect(deriveTitle("How much did I spend on food?")).toBe("How much did I spend on food?");
  });
  it("truncates long messages with an ellipsis", () => {
    const long = "a".repeat(80);
    const t = deriveTitle(long);
    expect(t.length).toBeLessThanOrEqual(48);
    expect(t.endsWith("…")).toBe(true);
  });
  it("falls back to 'New chat' for empty input", () => {
    expect(deriveTitle("   ")).toBe("New chat");
  });
});
