"use client";

import { Search } from "lucide-react";
import { TRANSACTION_CATEGORIES, categoriesForType } from "@/lib/transaction-categories";
import { monthLabel } from "@/lib/month";
import { cn } from "@/lib/utils";
import type { TxnFilters, TxnSort } from "@/lib/transaction-filters";

const selectCls =
  "rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function TransactionToolbar({
  filters,
  setFilters,
  sort,
  setSort,
  months,
}: {
  filters: TxnFilters;
  setFilters: (f: TxnFilters) => void;
  sort: TxnSort;
  setSort: (s: TxnSort) => void;
  months: string[];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-48">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search transactions"
          className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="inline-flex rounded-xl border border-border bg-card p-1 text-sm">
        {(["all", "income", "expense"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilters({ ...filters, type: t, category: "all" })}
            className={cn(
              "rounded-lg px-3 py-1 capitalize transition",
              filters.type === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <select
        value={filters.category}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        className={selectCls}
      >
        <option value="all">All categories</option>
        {(filters.type === "all" ? TRANSACTION_CATEGORIES : categoriesForType(filters.type)).map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={filters.month}
        onChange={(e) => setFilters({ ...filters, month: e.target.value })}
        className={selectCls}
      >
        <option value="all">All months</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
      <select value={sort} onChange={(e) => setSort(e.target.value as TxnSort)} className={selectCls}>
        <option value="date-desc">Newest</option>
        <option value="date-asc">Oldest</option>
        <option value="amount-desc">Amount ↓</option>
        <option value="amount-asc">Amount ↑</option>
      </select>
    </div>
  );
}
