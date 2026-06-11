"use client";

import { useState } from "react";
import { setOpeningBalance } from "@/lib/actions/balance";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function OpeningBalanceForm({ initial, onDone }: { initial: number; onDone: () => void }) {
  const [amount, setAmount] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await setOpeningBalance(amount);
    if (res.ok) {
      toast.success("Opening balance saved");
      onDone();
    } else {
      setError(res.error);
      toast.error(res.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Opening balance (₹)</span>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          autoFocus
          value={amount === 0 ? "" : amount}
          placeholder="0"
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className={cn(fieldCls, "tabular-nums")}
        />
      </label>
      <p className="text-xs text-muted-foreground">The cash you had before tracking in FuFi. Everything builds from here.</p>
      {error && <p className="text-sm text-negative">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Saving…" : "Save opening balance"}
      </Button>
    </form>
  );
}
