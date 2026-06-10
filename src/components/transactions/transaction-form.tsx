"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveTransactionSchema, type SaveTransactionInput } from "@/validations/transaction";
import { categoriesForType, type TxnType } from "@/lib/transaction-categories";
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/services/transactions";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function TransactionForm({ initial, onDone }: { initial?: TransactionDTO; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaveTransactionInput>({
    resolver: zodResolver(saveTransactionSchema),
    defaultValues: {
      title: initial?.title ?? "",
      amount: initial?.amount ?? 0,
      type: initial?.type ?? "expense",
      category: initial?.category ?? "",
      date: (initial?.date ?? new Date().toISOString()).slice(0, 10),
      notes: initial?.notes ?? "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch() opts this form out of React Compiler memoization; fine for a low-frequency form.
  const type = watch("type");

  function chooseType(next: TxnType) {
    setValue("type", next);
    setValue("category", "");
  }

  async function onSubmit(values: SaveTransactionInput) {
    setServerError(null);
    const res = initial ? await updateTransaction(initial.id, values) : await createTransaction(values);
    if (res.ok) onDone();
    else setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="inline-flex w-full rounded-xl border border-border bg-card p-1 text-sm">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={isSubmitting}
            onClick={() => chooseType(t)}
            className={cn(
              "flex-1 rounded-lg py-1.5 capitalize transition disabled:opacity-60",
              type === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <input {...register("title")} placeholder="Title" className={fieldCls} />
        {errors.title && <p className="mt-1 text-xs text-negative">{errors.title.message}</p>}
      </div>

      <div>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0.01}
          {...register("amount", { valueAsNumber: true })}
          placeholder="Amount (₹)"
          className={cn(fieldCls, "tabular-nums")}
        />
        {errors.amount && <p className="mt-1 text-xs text-negative">{errors.amount.message}</p>}
      </div>

      <div>
        <select {...register("category")} className={fieldCls}>
          <option value="">Select category</option>
          {categoriesForType(type).map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-xs text-negative">{errors.category.message}</p>}
      </div>

      <div>
        <input type="date" {...register("date")} className={fieldCls} />
        {errors.date && <p className="mt-1 text-xs text-negative">{errors.date.message}</p>}
      </div>

      <div>
        <textarea {...register("notes")} placeholder="Notes (optional)" rows={2} className={fieldCls} />
        {errors.notes && <p className="mt-1 text-xs text-negative">{errors.notes.message}</p>}
      </div>

      {serverError && <p className="text-sm text-negative">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add transaction"}
      </Button>
    </form>
  );
}
