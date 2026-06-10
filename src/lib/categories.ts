export type CategoryGroup = "expense" | "savings" | "investment" | "loan";

export const CATEGORIES = [
  { key: "family", label: "Family", group: "expense" },
  { key: "loan", label: "Loan", group: "loan" },
  { key: "food", label: "Food", group: "expense" },
  { key: "recharge", label: "Recharge", group: "expense" },
  { key: "transport", label: "Transport", group: "expense" },
  { key: "shopping", label: "Shopping", group: "expense" },
  { key: "savings", label: "Savings", group: "savings" },
  { key: "investments", label: "Investments", group: "investment" },
  { key: "emergency", label: "Emergency", group: "savings" },
  { key: "misc", label: "Miscellaneous", group: "expense" },
] as const satisfies readonly { key: string; label: string; group: CategoryGroup }[];

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<CategoryKey, (typeof CATEGORIES)[number]>;
