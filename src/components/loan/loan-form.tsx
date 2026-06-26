"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveLoanSchema, type SaveLoanInput } from "@/validations/tracker";
import { createLoan, updateLoan } from "@/lib/actions/loan";
import { LOAN_TYPES } from "@/lib/loan-types";
import { toast } from "@/lib/toast-store";
import { Field } from "@/components/trackers/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import type { LoanItemDTO } from "@/services/loan";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

const TYPE_OPTIONS = LOAN_TYPES.map((t) => ({ value: t.key, label: t.label }));

export function LoanForm({ initial, onDone }: { initial?: LoanItemDTO; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaveLoanInput>({
    resolver: zodResolver(saveLoanSchema),
    defaultValues: {
      type: initial?.type ?? "personal",
      name: initial?.name ?? "",
      totalLoan: initial?.totalLoan ?? 0,
      paidAmount: initial?.paidAmount ?? 0,
      emiAmount: initial?.emiAmount ?? 0,
      startDate: (initial?.startDate ?? new Date().toISOString()).slice(0, 10),
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch() opts this low-frequency form out of React Compiler memoization.
  const type = watch("type");
  const startDate = watch("startDate");

  async function onSubmit(values: SaveLoanInput) {
    setServerError(null);
    const res = initial ? await updateLoan(initial.id, values) : await createLoan(values);
    if (res.ok) {
      toast.success(initial ? "Loan updated" : "Loan added");
      onDone();
    } else {
      setServerError(res.error);
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Loan type" error={errors.type?.message}>
        <Select
          value={type}
          onValueChange={(v) => setValue("type", v as SaveLoanInput["type"])}
          options={TYPE_OPTIONS}
          ariaLabel="Loan type"
          className="w-full"
        />
      </Field>
      <Field label="Name / lender (optional)" error={errors.name?.message}>
        <input type="text" maxLength={60} placeholder="e.g. HDFC Car Loan" {...register("name")} className={fieldCls} />
      </Field>
      <Field label="Total loan (₹)" error={errors.totalLoan?.message}>
        <input type="number" inputMode="decimal" step="any" min={0} {...register("totalLoan", { valueAsNumber: true })} className={cn(fieldCls, "tabular-nums")} />
      </Field>
      <Field label="Already paid (₹)" error={errors.paidAmount?.message}>
        <input type="number" inputMode="decimal" step="any" min={0} {...register("paidAmount", { valueAsNumber: true })} className={cn(fieldCls, "tabular-nums")} />
      </Field>
      <Field label="Monthly EMI (₹)" error={errors.emiAmount?.message}>
        <input type="number" inputMode="decimal" step="any" min={0} {...register("emiAmount", { valueAsNumber: true })} className={cn(fieldCls, "tabular-nums")} />
      </Field>
      <Field label="Start date" error={errors.startDate?.message}>
        <DatePicker value={startDate} onChange={(v) => setValue("startDate", v)} />
      </Field>
      {serverError && <p className="text-sm text-negative">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add loan"}
      </Button>
    </form>
  );
}
