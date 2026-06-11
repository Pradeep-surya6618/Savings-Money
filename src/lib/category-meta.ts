import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";

/** Resolve a transaction-category key to its display label + color, with a
 *  neutral fallback for unknown keys. Shared by the analytics cards.
 *  (budget-row keeps its own variant that also consults the allocation
 *  CATEGORY_MAP first.) */
export function txnCategoryMeta(category: string): { label: string; color: string } {
  return TXN_CATEGORY_MAP[category as TxnCategoryKey] ?? { label: category, color: "#64748b" };
}
