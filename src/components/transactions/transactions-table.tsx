"use client";

import { Pencil, Trash2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { cn, formatCurrency } from "@/lib/utils";
import type { TransactionDTO } from "@/services/transactions";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function TransactionsTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: TransactionDTO[];
  onEdit: (t: TransactionDTO) => void;
  onDelete: (t: TransactionDTO) => void;
}) {
  const columns: Column<TransactionDTO>[] = [
    {
      key: "date",
      header: "Date",
      render: (t) => <span className="whitespace-nowrap text-muted-foreground">{fmtDate(t.date)}</span>,
    },
    { key: "title", header: "Title", render: (t) => <span className="font-medium">{t.title}</span> },
    {
      key: "category",
      header: "Category",
      render: (t) => {
        const cat = TXN_CATEGORY_MAP[t.category as TxnCategoryKey];
        const color = cat?.color ?? "#64748b";
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {cat?.label ?? t.category}
          </span>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      render: (t) => (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            t.type === "income" ? "bg-positive/10 text-positive" : "bg-card-elevated text-muted-foreground",
          )}
        >
          {t.type === "income" ? "Income" : "Expense"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (t) => (
        <span className={cn("font-semibold", t.type === "income" ? "text-positive" : "text-foreground")}>
          {t.type === "income" ? "+" : "−"}
          {formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (t) => <span className="text-muted-foreground">{t.notes || "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => (
        <span className="inline-flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(t)}
            aria-label="Edit"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(t)}
            aria-label="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-negative/10 hover:text-negative"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      ),
    },
  ];
  return <DataTable columns={columns} rows={rows} rowKey={(t) => t.id} />;
}
