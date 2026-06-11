"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quickAmountSchema, type QuickAmountInput } from "@/validations/tracker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Result = { ok: true } | { ok: false; error: string };

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

/** A one-field (₹ amount) form used by both quick actions. The caller wires `onSubmit`. */
export function AmountForm({
  submitLabel,
  onSubmit,
  onDone,
}: {
  submitLabel: string;
  onSubmit: (amount: number) => Promise<Result>;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuickAmountInput>({
    resolver: zodResolver(quickAmountSchema),
    defaultValues: { amount: 0 },
  });

  async function submit(values: QuickAmountInput) {
    setServerError(null);
    const res = await onSubmit(values.amount);
    if (res.ok) onDone();
    else setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <div>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0.01}
          autoFocus
          aria-label="Amount in rupees"
          {...register("amount", { valueAsNumber: true })}
          placeholder="Amount (₹)"
          className={cn(fieldCls, "tabular-nums")}
        />
        {errors.amount && <p className="mt-1 text-xs text-negative">{errors.amount.message}</p>}
      </div>
      {serverError && <p className="text-sm text-negative">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
