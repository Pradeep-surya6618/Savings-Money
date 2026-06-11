"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveLoanSchema, type SaveLoanInput } from "@/validations/tracker";
import { saveLoan } from "@/lib/actions/loan";
import { toast } from "@/lib/toast-store";
import { Field } from "@/components/trackers/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LoanDTO } from "@/services/loan";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function LoanForm({ initial, onDone }: { initial: LoanDTO; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SaveLoanInput>({
    resolver: zodResolver(saveLoanSchema),
    defaultValues: {
      totalLoan: initial.totalLoan,
      paidAmount: initial.paidAmount,
      emiAmount: initial.emiAmount,
      startDate: (initial.startDate ?? new Date().toISOString()).slice(0, 10),
    },
  });

  async function onSubmit(values: SaveLoanInput) {
    setServerError(null);
    const res = await saveLoan(values);
    if (res.ok) {
      toast.success("Loan details saved");
      onDone();
    } else {
      setServerError(res.error);
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Total loan (₹)" error={errors.totalLoan?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("totalLoan", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Already paid (₹)" error={errors.paidAmount?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("paidAmount", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Monthly EMI (₹)" error={errors.emiAmount?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("emiAmount", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Start date" error={errors.startDate?.message}>
        <input type="date" {...register("startDate")} className={fieldCls} />
      </Field>
      {serverError && <p className="text-sm text-negative">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : "Save loan"}
      </Button>
    </form>
  );
}
