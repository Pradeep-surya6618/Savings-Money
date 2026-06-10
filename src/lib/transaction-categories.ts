export type TxnType = "income" | "expense";

export const TRANSACTION_CATEGORIES = [
  { key: "family", label: "Family", type: "expense", color: "#f43f5e" },
  { key: "loan", label: "Loan", type: "expense", color: "#8b5cf6" },
  { key: "food", label: "Food", type: "expense", color: "#f59e0b" },
  { key: "recharge", label: "Recharge", type: "expense", color: "#0ea5e9" },
  { key: "transport", label: "Transport", type: "expense", color: "#14b8a6" },
  { key: "shopping", label: "Shopping", type: "expense", color: "#ec4899" },
  { key: "entertainment", label: "Entertainment", type: "expense", color: "#a855f7" },
  { key: "savings", label: "Savings", type: "expense", color: "#22c55e" },
  { key: "investments", label: "Investments", type: "expense", color: "#6366f1" },
  { key: "misc", label: "Miscellaneous", type: "expense", color: "#64748b" },
  { key: "salary_income", label: "Salary", type: "income", color: "#16a34a" },
  { key: "freelance", label: "Freelance", type: "income", color: "#0ea5e9" },
  { key: "gift", label: "Gift", type: "income", color: "#ec4899" },
  { key: "other_income", label: "Other", type: "income", color: "#64748b" },
] as const satisfies readonly { key: string; label: string; type: TxnType; color: string }[];

export type TxnCategoryKey = (typeof TRANSACTION_CATEGORIES)[number]["key"];

export const TXN_CATEGORY_KEYS = TRANSACTION_CATEGORIES.map((c) => c.key) as [
  TxnCategoryKey,
  ...TxnCategoryKey[],
];

export const TXN_CATEGORY_MAP = Object.fromEntries(
  TRANSACTION_CATEGORIES.map((c) => [c.key, c]),
) as Record<TxnCategoryKey, (typeof TRANSACTION_CATEGORIES)[number]>;

export function categoriesForType(type: TxnType) {
  return TRANSACTION_CATEGORIES.filter((c) => c.type === type);
}
