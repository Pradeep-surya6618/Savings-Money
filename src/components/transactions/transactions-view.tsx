"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TransactionToolbar } from "./transaction-toolbar";
import { SummaryStrip } from "./summary-strip";
import { TransactionRow } from "./transaction-row";
import { TransactionsEmptyState } from "./empty-state";
import { TransactionForm } from "./transaction-form";
import { ConfirmDelete } from "./confirm-delete";
import {
  filterTransactions,
  sortTransactions,
  summarize,
  type TxnFilters,
  type TxnSort,
} from "@/lib/transaction-filters";
import type { TransactionDTO } from "@/services/transactions";

const DEFAULT_FILTERS: TxnFilters = { search: "", type: "all", category: "all", month: "all" };

export function TransactionsView({ transactions }: { transactions: TransactionDTO[] }) {
  const [filters, setFilters] = useState<TxnFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<TxnSort>("date-desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [deleting, setDeleting] = useState<TransactionDTO | null>(null);

  const months = useMemo(
    () =>
      Array.from(new Set(transactions.map((t) => t.date.slice(0, 7)))).sort((a, b) =>
        a < b ? 1 : -1,
      ),
    [transactions],
  );
  // If the selected month no longer exists (e.g. its last transaction was deleted),
  // fall back to "all" so the controlled <select> and the list stay in sync.
  const monthFilter =
    filters.month === "all" || months.includes(filters.month) ? filters.month : "all";
  const activeFilters: TxnFilters = { ...filters, month: monthFilter };
  const visible = useMemo(
    () => sortTransactions(filterTransactions(transactions, activeFilters), sort),
    // activeFilters is a derived object — listing its primitive sources is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, filters.search, filters.type, filters.category, monthFilter, sort],
  );
  const totals = useMemo(() => summarize(visible), [visible]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(t: TransactionDTO) {
    setEditing(t);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <SummaryStrip income={totals.income} expense={totals.expense} net={totals.net} />
      <TransactionToolbar
        filters={activeFilters}
        setFilters={setFilters}
        sort={sort}
        setSort={setSort}
        months={months}
      />

      {visible.length === 0 ? (
        <TransactionsEmptyState filtered={transactions.length > 0} onAdd={openAdd} />
      ) : (
        <div className="space-y-2">
          {visible.map((t) => (
            <TransactionRow key={t.id} txn={t} onEdit={() => openEdit(t)} onDelete={() => setDeleting(t)} />
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent title={editing ? "Edit transaction" : "Add transaction"}>
          <TransactionForm
            key={editing?.id ?? "new"}
            initial={editing ?? undefined}
            onDone={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent title="Delete transaction">
          {deleting && <ConfirmDelete txn={deleting} onDone={() => setDeleting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
