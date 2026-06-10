export type CategoryGroup = "expense" | "savings" | "investment" | "loan";

export const CATEGORIES = [
  { key: "family", label: "Family", group: "expense", color: "#f43f5e" },
  { key: "loan", label: "Loan", group: "loan", color: "#8b5cf6" },
  { key: "food", label: "Food", group: "expense", color: "#f59e0b" },
  { key: "recharge", label: "Recharge", group: "expense", color: "#0ea5e9" },
  { key: "transport", label: "Transport", group: "expense", color: "#14b8a6" },
  { key: "shopping", label: "Shopping", group: "expense", color: "#ec4899" },
  { key: "savings", label: "Savings", group: "savings", color: "#22c55e" },
  { key: "investments", label: "Investments", group: "investment", color: "#6366f1" },
  { key: "emergency", label: "Emergency", group: "savings", color: "#ef4444" },
  { key: "misc", label: "Miscellaneous", group: "expense", color: "#64748b" },
] as const satisfies readonly {
  key: string;
  label: string;
  group: CategoryGroup;
  color: string;
}[];

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<CategoryKey, (typeof CATEGORIES)[number]>;
