import { describe, it, expect } from "vitest";
import { updateNotifyPrefsSchema } from "@/validations/settings";

describe("updateNotifyPrefsSchema", () => {
  it("accepts three booleans", () => {
    const r = updateNotifyPrefsSchema.safeParse({ salary: true, budget: false, savings: true });
    expect(r.success).toBe(true);
  });

  it("rejects a missing key", () => {
    const r = updateNotifyPrefsSchema.safeParse({ salary: true, budget: false });
    expect(r.success).toBe(false);
  });

  it("rejects non-boolean values", () => {
    const r = updateNotifyPrefsSchema.safeParse({ salary: "yes", budget: false, savings: true });
    expect(r.success).toBe(false);
  });
});
