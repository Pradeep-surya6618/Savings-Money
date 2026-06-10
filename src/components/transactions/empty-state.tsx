"use client";

import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TransactionsEmptyState({
  filtered,
  onAdd,
}: {
  filtered: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-end text-white shadow-lg shadow-primary/25">
        <Receipt className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">
          {filtered ? "No matching transactions" : "No transactions yet"}
        </h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {filtered
            ? "Try clearing the search or filters."
            : "Record your income and expenses to see them here."}
        </p>
      </div>
      {!filtered && <Button onClick={onAdd}>Add transaction</Button>}
    </div>
  );
}
