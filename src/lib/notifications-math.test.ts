import { describe, it, expect } from "vitest";
import { buildNotifications, highestMilestone, type BuildNotificationsInput } from "@/lib/notifications-math";

const id = (n: number) => String(n); // deterministic "formatter" for assertions

function base(overrides: Partial<BuildNotificationsInput> = {}): BuildNotificationsInput {
  return {
    month: "2026-06",
    salaryAmount: 50000, // logged → no salary alert by default
    budgetRows: [],
    savings: { current: 0, target: 0 },
    prefs: { salary: true, budget: true, savings: true },
    state: { readKeys: [], dismissedKeys: [] },
    format: id,
    ...overrides,
  };
}

describe("highestMilestone", () => {
  it("returns null below 25% or with no target", () => {
    expect(highestMilestone(10, 100)).toBeNull();   // 10%
    expect(highestMilestone(50, 0)).toBeNull();      // no target
    expect(highestMilestone(0, 100)).toBeNull();     // nothing saved
  });
  it("returns the highest crossed threshold", () => {
    expect(highestMilestone(25, 100)).toBe(25);
    expect(highestMilestone(49, 100)).toBe(25);
    expect(highestMilestone(50, 100)).toBe(50);
    expect(highestMilestone(99, 100)).toBe(75);
    expect(highestMilestone(100, 100)).toBe(100);
    expect(highestMilestone(120, 100)).toBe(100);
  });
});

describe("buildNotifications — salary", () => {
  it("fires when salary is null or 0", () => {
    expect(buildNotifications(base({ salaryAmount: null })).items.some((n) => n.key === "salary:2026-06")).toBe(true);
    expect(buildNotifications(base({ salaryAmount: 0 })).items.some((n) => n.type === "salary")).toBe(true);
  });
  it("does not fire when salary is logged", () => {
    expect(buildNotifications(base({ salaryAmount: 50000 })).items.some((n) => n.type === "salary")).toBe(false);
  });
  it("is gated by prefs.salary", () => {
    const r = buildNotifications(base({ salaryAmount: null, prefs: { salary: false, budget: true, savings: true } }));
    expect(r.items.some((n) => n.type === "salary")).toBe(false);
  });
});

describe("buildNotifications — budget", () => {
  it("fires once per over-spent budgeted category", () => {
    const r = buildNotifications(base({
      budgetRows: [
        { category: "food", planned: 6000, actual: 7200 },   // over
        { category: "rent", planned: 5000, actual: 5000 },   // exactly on budget → no
        { category: "misc", planned: 0, actual: 500 },       // unbudgeted → no
      ],
    }));
    const budget = r.items.filter((n) => n.type === "budget");
    expect(budget).toHaveLength(1);
    expect(budget[0].key).toBe("budget:food:2026-06");
    expect(budget[0].message).toBe("1200 over your 6000 allocation.");
  });
  it("uses categoryLabel for the title", () => {
    const r = buildNotifications(base({
      budgetRows: [{ category: "food", planned: 6000, actual: 7000 }],
      categoryLabel: (k) => k.toUpperCase(),
    }));
    expect(r.items.find((n) => n.type === "budget")?.title).toBe("FOOD is over budget");
  });
  it("is gated by prefs.budget", () => {
    const r = buildNotifications(base({
      budgetRows: [{ category: "food", planned: 6000, actual: 7000 }],
      prefs: { salary: true, budget: false, savings: true },
    }));
    expect(r.items.some((n) => n.type === "budget")).toBe(false);
  });
});

describe("buildNotifications — savings", () => {
  it("emits only the highest crossed milestone", () => {
    const r = buildNotifications(base({ savings: { current: 30000, target: 50000 } })); // 60% → 50
    const s = r.items.filter((n) => n.type === "savings");
    expect(s).toHaveLength(1);
    expect(s[0].key).toBe("savings:50");
  });
  it("does not fire below 25% or without a target", () => {
    expect(buildNotifications(base({ savings: { current: 10, target: 100 } })).items.some((n) => n.type === "savings")).toBe(false);
    expect(buildNotifications(base({ savings: { current: 100, target: 0 } })).items.some((n) => n.type === "savings")).toBe(false);
  });
});

describe("buildNotifications — read/dismiss state + unreadCount", () => {
  it("omits dismissed keys", () => {
    const r = buildNotifications(base({ salaryAmount: null, state: { readKeys: [], dismissedKeys: ["salary:2026-06"] } }));
    expect(r.items.some((n) => n.key === "salary:2026-06")).toBe(false);
  });
  it("marks read keys as not unread and counts only unread", () => {
    const r = buildNotifications(base({
      salaryAmount: null,
      savings: { current: 50000, target: 100000 }, // savings:50
      state: { readKeys: ["savings:50"], dismissedKeys: [] },
    }));
    const salary = r.items.find((n) => n.key === "salary:2026-06");
    const savings = r.items.find((n) => n.key === "savings:50");
    expect(salary?.unread).toBe(true);
    expect(savings?.unread).toBe(false);
    expect(r.unreadCount).toBe(1);
  });
});
