"use client";

import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { TRANSACTION_CATEGORIES, categoriesForType } from "@/lib/transaction-categories";
import { monthLabel } from "@/lib/month";
import { cn } from "@/lib/utils";
import type { TxnFilters, TxnSort } from "@/lib/transaction-filters";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest" },
  { value: "date-asc", label: "Oldest" },
  { value: "amount-desc", label: "Amount ↓" },
  { value: "amount-asc", label: "Amount ↑" },
];

export function TransactionToolbar({
  filters,
  setFilters,
  onTypeChange,
  sort,
  setSort,
  months,
}: {
  filters: TxnFilters;
  setFilters: (f: TxnFilters) => void;
  onTypeChange: (t: TxnFilters["type"]) => void;
  sort: TxnSort;
  setSort: (s: TxnSort) => void;
  months: string[];
}) {
  const cats = filters.type === "all" ? TRANSACTION_CATEGORIES : categoriesForType(filters.type);
  const categoryOptions = [
    { value: "all", label: "All categories" },
    ...cats.map((c) => ({ value: c.key, label: c.label })),
  ];
  const monthOptions = [
    { value: "all", label: "All months" },
    ...months.map((m) => ({ value: m, label: monthLabel(m) })),
  ];

  return (
    // Mobile: 2-col grid → Search|Category, then full-width type tabs, then Month|Sort.
    // sm+: reverts to the original wrapping flex row.
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
      <SearchInput
        value={filters.search}
        onChange={(v) => setFilters({ ...filters, search: v })}
        placeholder="Search transactions"
        className="w-full sm:min-w-48 sm:flex-1"
      />
      <Select
        value={filters.category}
        onValueChange={(v) => setFilters({ ...filters, category: v })}
        options={categoryOptions}
        ariaLabel="Filter by category"
        className="w-full sm:w-auto"
      />
      <div className="col-span-2 inline-flex w-fit rounded-xl border border-border bg-card p-1 text-sm sm:col-span-1">
        {(["all", "income", "expense"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTypeChange(t)}
            className={cn(
              "rounded-lg px-3 py-1 capitalize transition",
              filters.type === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <Select
        value={filters.month}
        onValueChange={(v) => setFilters({ ...filters, month: v })}
        options={monthOptions}
        ariaLabel="Filter by month"
        className="w-full sm:w-auto"
      />
      <Select
        value={sort}
        onValueChange={(v) => setSort(v as TxnSort)}
        options={SORT_OPTIONS}
        ariaLabel="Sort"
        className="w-full sm:w-auto"
      />
    </div>
  );
}
