import { z } from "zod";
import { LOAN_TYPE_KEYS } from "@/lib/loan-types";

export const saveSavingsSchema = z.object({
  targetAmount: z.number().min(0, "Can't be negative"),
  currentAmount: z.number().min(0, "Can't be negative"),
  monthlyContribution: z.number().min(0, "Can't be negative"),
});

export const saveLoanSchema = z
  .object({
    type: z.enum(LOAN_TYPE_KEYS),
    name: z.string().trim().max(60, "Name is too long").optional(),
    totalLoan: z.number().min(0, "Can't be negative"),
    paidAmount: z.number().min(0, "Can't be negative"),
    emiAmount: z.number().min(0, "Can't be negative"),
    startDate: z
      .string()
      .min(1, "Pick a start date")
      .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  })
  .refine((d) => d.paidAmount <= d.totalLoan, {
    message: "Paid can't exceed the loan total",
    path: ["paidAmount"],
  });

export const quickAmountSchema = z.object({
  amount: z.number().positive("Enter an amount greater than 0"),
});

export type SaveSavingsInput = z.infer<typeof saveSavingsSchema>;
export type SaveLoanInput = z.infer<typeof saveLoanSchema>;
export type QuickAmountInput = z.infer<typeof quickAmountSchema>;
