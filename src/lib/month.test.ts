import { describe, it, expect } from "vitest";
import { currentMonth, isValidMonth, monthLabel, addMonths } from "./month";

describe("month helpers", () => {
  it("currentMonth returns a valid YYYY-MM string", () => {
    expect(isValidMonth(currentMonth())).toBe(true);
  });
  it("isValidMonth validates format", () => {
    expect(isValidMonth("2026-06")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-6")).toBe(false);
    expect(isValidMonth("june")).toBe(false);
  });
  it("monthLabel formats a human label", () => {
    expect(monthLabel("2026-06")).toBe("June 2026");
    expect(monthLabel("2026-01")).toBe("January 2026");
  });
  it("addMonths shifts with year rollover", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-06", 3)).toBe("2026-09");
  });
});
