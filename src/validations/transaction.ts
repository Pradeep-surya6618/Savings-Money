import { z } from "zod";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";

export const saveTransactionSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(80),
    amount: z.number().positive("Amount must be greater than 0"),
    type: z.enum(["income", "expense"]),
    category: z.string().min(1, "Pick a category"),
    date: z
      .string()
      .min(1, "Pick a date")
      .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
    notes: z.string().trim().max(300).optional(),
  })
  .refine(
    (d) => {
      const cat = TXN_CATEGORY_MAP[d.category as TxnCategoryKey];
      return cat !== undefined && cat.type === d.type;
    },
    { message: "Category doesn't match the transaction type", path: ["category"] },
  );

export type SaveTransactionInput = z.infer<typeof saveTransactionSchema>;
