import { z } from "zod";
import { CATEGORY_KEYS } from "@/lib/categories";
import { isValidMonth } from "@/lib/month";

export const saveSalarySchema = z
  .object({
    month: z.string().refine(isValidMonth, "Invalid month (expected YYYY-MM)"),
    amount: z.number().min(0, "Salary must be 0 or more"),
    receivedDate: z.coerce.date().optional(),
    allocations: z
      .array(
        z.object({
          category: z.enum(CATEGORY_KEYS as readonly [string, ...string[]]),
          amount: z.number().min(0),
        }),
      )
      .default([]),
  })
  .refine((d) => d.allocations.reduce((s, a) => s + a.amount, 0) <= d.amount, {
    message: "Allocations exceed salary",
    path: ["allocations"],
  })
  .refine((d) => new Set(d.allocations.map((a) => a.category)).size === d.allocations.length, {
    message: "Duplicate categories are not allowed",
    path: ["allocations"],
  });

export type SaveSalaryInput = z.infer<typeof saveSalarySchema>;
