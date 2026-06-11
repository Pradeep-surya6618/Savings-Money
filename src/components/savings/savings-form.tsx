"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveSavingsSchema, type SaveSavingsInput } from "@/validations/tracker";
import { saveSavings } from "@/lib/actions/savings";
import { Field } from "@/components/trackers/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SavingsDTO } from "@/services/savings";

const fieldCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

export function SavingsForm({ initial, onDone }: { initial: SavingsDTO; onDone: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SaveSavingsInput>({
    resolver: zodResolver(saveSavingsSchema),
    defaultValues: {
      targetAmount: initial.targetAmount,
      currentAmount: initial.currentAmount,
      monthlyContribution: initial.monthlyContribution,
    },
  });

  async function onSubmit(values: SaveSavingsInput) {
    setServerError(null);
    const res = await saveSavings(values);
    if (res.ok) onDone();
    else setServerError(res.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Goal target (₹)" error={errors.targetAmount?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("targetAmount", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Current savings (₹)" error={errors.currentAmount?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("currentAmount", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      <Field label="Monthly contribution (₹)" error={errors.monthlyContribution?.message}>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          {...register("monthlyContribution", { valueAsNumber: true })}
          className={cn(fieldCls, "tabular-nums")}
        />
      </Field>
      {serverError && <p className="text-sm text-negative">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : "Save goal"}
      </Button>
    </form>
  );
}
