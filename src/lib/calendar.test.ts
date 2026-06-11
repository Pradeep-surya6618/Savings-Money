import { describe, it, expect } from "vitest";
import { monthGrid } from "./calendar";

describe("monthGrid", () => {
  it("returns 42 cells, Monday-first, with the 1st in the right slot", () => {
    const cells = monthGrid(2026, 6); // June 2026; 1 Jun 2026 is a Monday
    expect(cells).toHaveLength(42);
    // first cell is Mon 1 Jun (June 1 2026 is Monday)
    expect(cells[0]).toEqual({ date: "2026-06-01", inMonth: true });
    expect(cells.filter((c) => c.inMonth)).toHaveLength(30);
  });
  it("pads leading days from the previous month", () => {
    const cells = monthGrid(2026, 7); // July 2026; 1 Jul 2026 is a Wednesday
    expect(cells[0].inMonth).toBe(false); // Monday 29 Jun
    expect(cells.find((c) => c.date === "2026-07-01")?.inMonth).toBe(true);
  });
});
