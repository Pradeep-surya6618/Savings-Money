"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "@/lib/actions/transactions";
import { formatCurrency } from "@/lib/utils";
import type { TransactionDTO } from "@/services/transactions";

export function ConfirmDelete({ txn, onDone }: { txn: TransactionDTO; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await deleteTransaction(txn.id);
      if (res.ok) onDone();
      else setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Delete &ldquo;<span className="font-medium text-foreground">{txn.title}</span>&rdquo; (
        {formatCurrency(txn.amount)})? This can&rsquo;t be undone.
      </p>
      {error && <p className="text-sm text-negative">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleDelete} disabled={busy} className="from-negative to-negative">
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
