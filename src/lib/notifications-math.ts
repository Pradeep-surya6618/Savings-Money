import type { NotifyPrefs } from "@/validations/settings";

export type NotificationType = "salary" | "budget" | "savings";

export type Notification = {
  key: string; // stable identity, e.g. "budget:food:2026-06"
  type: NotificationType;
  title: string;
  message: string;
  context: string;
  href: string;
};

export type NotificationDTO = Notification & { unread: boolean };

export type NotificationStateKeys = { readKeys: string[]; dismissedKeys: string[] };

export const MILESTONES = [25, 50, 75, 100] as const;
export type MilestoneValue = (typeof MILESTONES)[number];

export type BuildNotificationsInput = {
  month: string; // "YYYY-MM"
  salaryAmount: number | null; // null = no salary doc this month
  budgetRows: { category: string; planned: number; actual: number }[]; // planned categories only
  savings: { current: number; target: number };
  prefs: NotifyPrefs;
  state: NotificationStateKeys;
  format: (n: number) => string; // currency formatter
  categoryLabel?: (key: string) => string;
};

/** Largest milestone (25/50/75/100) the savings have crossed, or null. */
export function highestMilestone(current: number, target: number): MilestoneValue | null {
  if (target <= 0 || current <= 0) return null;
  const pct = (current / target) * 100;
  for (const v of [100, 75, 50, 25] as const) {
    if (pct >= v) return v;
  }
  return null;
}

export function buildNotifications(input: BuildNotificationsInput): {
  items: NotificationDTO[];
  unreadCount: number;
} {
  const { month, salaryAmount, budgetRows, savings, prefs, state, format } = input;
  const categoryLabel = input.categoryLabel ?? ((k) => k);
  const out: Notification[] = [];

  // Salary — fires when this month's salary isn't logged (or is 0).
  if (prefs.salary && !(salaryAmount && salaryAmount > 0)) {
    out.push({
      key: `salary:${month}`,
      type: "salary",
      title: "Add this month's salary",
      message: "You haven't logged your salary for this month yet.",
      context: "This month",
      href: "/salary",
    });
  }

  // Budget — one alert per budgeted category whose spend exceeds its allocation.
  if (prefs.budget) {
    for (const r of budgetRows) {
      if (r.planned > 0 && r.actual > r.planned) {
        out.push({
          key: `budget:${r.category}:${month}`,
          type: "budget",
          title: `${categoryLabel(r.category)} is over budget`,
          message: `${format(r.actual - r.planned)} over your ${format(r.planned)} allocation.`,
          context: "This month",
          href: "/budget",
        });
      }
    }
  }

  // Savings — only the highest crossed milestone.
  if (prefs.savings) {
    const m = highestMilestone(savings.current, savings.target);
    if (m !== null) {
      out.push({
        key: `savings:${m}`,
        type: "savings",
        title: `Savings milestone: ${m}%`,
        message: `${format(savings.current)} of your ${format(savings.target)} goal.`,
        context: "Savings goal",
        href: "/savings",
      });
    }
  }

  const dismissed = new Set(state.dismissedKeys);
  const read = new Set(state.readKeys);
  const items: NotificationDTO[] = out
    .filter((n) => !dismissed.has(n.key))
    .map((n) => ({ ...n, unread: !read.has(n.key) }));

  return { items, unreadCount: items.filter((n) => n.unread).length };
}
