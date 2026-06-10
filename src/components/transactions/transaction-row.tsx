"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { TXN_CATEGORY_ICONS } from "@/lib/transaction-category-icons";
import { cn, formatCurrency } from "@/lib/utils";
import type { TransactionDTO } from "@/services/transactions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function TransactionRow({
  txn,
  onEdit,
  onDelete,
}: {
  txn: TransactionDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = TXN_CATEGORY_MAP[txn.category as TxnCategoryKey];
  const Icon = TXN_CATEGORY_ICONS[txn.category as TxnCategoryKey];
  const color = cat?.color ?? "#64748b";
  const income = txn.type === "income";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-foreground/15">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        {Icon ? <Icon className="h-5 w-5" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{txn.title}</p>
        <p className="text-xs text-muted-foreground">
          {cat?.label ?? txn.category} · {formatDate(txn.date)}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          income ? "text-positive" : "text-foreground",
        )}
      >
        {income ? "+" : "−"}
        {formatCurrency(txn.amount)}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-negative/10 hover:text-negative"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
