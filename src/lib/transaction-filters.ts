export type FilterableTxn = {
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string; // ISO string
};

export type TxnFilters = {
  search: string;
  type: "all" | "income" | "expense";
  category: string; // "all" | category key
  month: string; // "all" | "YYYY-MM"
};

export type TxnSort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export function filterTransactions<T extends FilterableTxn>(list: T[], f: TxnFilters): T[] {
  const q = f.search.trim().toLowerCase();
  return list.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (f.type !== "all" && t.type !== f.type) return false;
    if (f.category !== "all" && t.category !== f.category) return false;
    if (f.month !== "all" && t.date.slice(0, 7) !== f.month) return false;
    return true;
  });
}

export function sortTransactions<T extends FilterableTxn>(list: T[], sort: TxnSort): T[] {
  const copy = [...list];
  copy.sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      case "date-desc":
        return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
      case "amount-asc":
        return a.amount - b.amount;
      case "amount-desc":
        return b.amount - a.amount;
    }
  });
  return copy;
}

export function summarize(
  list: { amount: number; type: "income" | "expense" }[],
): { income: number; expense: number; net: number } {
  let income = 0;
  let expense = 0;
  for (const t of list) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}
