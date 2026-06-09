import { describe, it, expect } from "vitest";
import { cn } from "./utils";
import { formatCurrency } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("formatCurrency", () => {
  it("formats INR with the ₹ symbol and no decimals by default", () => {
    expect(formatCurrency(40000)).toBe("₹40,000");
  });
  it("groups using the Indian numbering system", () => {
    expect(formatCurrency(100000)).toBe("₹1,00,000");
  });
  it("respects an overridden currency", () => {
    expect(formatCurrency(1000, { currency: "USD", locale: "en-US" })).toBe("$1,000");
  });
});
