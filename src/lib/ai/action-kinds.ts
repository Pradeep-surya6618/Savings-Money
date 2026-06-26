import { z } from "zod";
import { saveTransactionSchema } from "@/validations/transaction";
import { saveSavingsSchema, saveLoanSchema, quickAmountSchema } from "@/validations/tracker";
import { CATEGORY_KEYS } from "@/lib/categories";
import { LOAN_TYPE_KEYS } from "@/lib/loan-types";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";

/** ₹ threshold (and any delete) that triggers the large-amount warning. */
export const AI_LARGE_AMOUNT = 50_000;

export const ACTION_KINDS = [
  "add_transaction",
  "edit_transaction",
  "delete_transaction",
  "contribute_to_savings",
  "set_savings_goal",
  "record_loan_payment",
  "add_loan",
  "edit_loan",
  "delete_loan",
  "set_budget",
] as const;

export type AiActionKind = (typeof ACTION_KINDS)[number];

const idSchema = z.object({ id: z.string().min(1, "Missing record id") });

// Flat (JSON-Schema-safe) edit schema — the gateway's updateTransaction re-validates
// the fields strictly (incl. the category↔type rule) via saveTransactionSchema.
const editTransactionSchema = z.object({
  id: z.string().min(1, "Missing record id"),
  title: z.string().trim().min(1).max(80),
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  date: z.string().min(1).describe("YYYY-MM-DD"),
  notes: z.string().trim().max(300).optional(),
});

// Flat (JSON-Schema-safe) edit-loan schema — the gateway re-validates strictly
// (incl. paid≤total) via saveLoanSchema. startDate stays a plain string (no z.coerce.date()).
const editLoanSchema = z.object({
  id: z.string().min(1, "Missing record id"),
  type: z.enum(LOAN_TYPE_KEYS),
  name: z.string().trim().max(60).optional(),
  totalLoan: z.number().min(0),
  paidAmount: z.number().min(0),
  emiAmount: z.number().min(0),
  startDate: z.string().min(1).describe("YYYY-MM-DD"),
});

const loanPaymentSchema = z.object({
  loanId: z.string().min(1, "Missing loan id"),
  amount: z.number().positive(),
});

// Flat (JSON-Schema-safe) budget schema — no z.coerce.date() (which can't serialize to
// JSON Schema). receivedDate is a plain string; saveSalaryAllocations coerces + re-validates
// (allocations ≤ salary, no duplicate categories) when the gateway applies it.
const setBudgetSchema = z.object({
  month: z.string().describe("Month as YYYY-MM"),
  amount: z.number().min(0),
  receivedDate: z.string().optional().describe("YYYY-MM-DD"),
  allocations: z
    .array(
      z.object({
        category: z.enum(CATEGORY_KEYS as readonly [string, ...string[]]),
        amount: z.number().min(0),
      }),
    )
    .optional(),
});

/** Per-kind Zod schemas — reuse the existing app validations so AI writes obey the
 *  same rules as the manual UI (category↔type, paid≤total, allocations≤salary, …). */
export const ACTION_SCHEMAS = {
  add_transaction: saveTransactionSchema,
  edit_transaction: editTransactionSchema,
  delete_transaction: idSchema,
  contribute_to_savings: quickAmountSchema,
  set_savings_goal: saveSavingsSchema,
  record_loan_payment: loanPaymentSchema,
  add_loan: saveLoanSchema,
  edit_loan: editLoanSchema,
  delete_loan: idSchema,
  set_budget: setBudgetSchema,
} as const satisfies Record<AiActionKind, z.ZodTypeAny>;

export function parseActionInput(kind: AiActionKind, input: unknown) {
  return ACTION_SCHEMAS[kind].safeParse(input);
}

function rupees(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
function catLabel(key: string): string {
  return TXN_CATEGORY_MAP[key as TxnCategoryKey]?.label ?? key;
}

/** Short human sentence shown on the confirm card. `input` is the (already valid) payload. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function summarizeAction(kind: AiActionKind, input: any): string {
  switch (kind) {
    case "add_transaction":
      return `Add ${input.type} — ${input.title} · ${rupees(input.amount)} · ${catLabel(input.category)} · ${input.date}`;
    case "edit_transaction":
      return `Update transaction — ${input.title} · ${rupees(input.amount)} · ${catLabel(input.category)} · ${input.date}`;
    case "delete_transaction":
      return `Delete this transaction`;
    case "contribute_to_savings":
      return `Add ${rupees(input.amount)} to your savings`;
    case "set_savings_goal":
      return `Set savings goal — target ${rupees(input.targetAmount)}, ${rupees(input.monthlyContribution)}/mo`;
    case "record_loan_payment":
      return `Record a loan payment of ${rupees(input.amount)}`;
    case "add_loan":
      return `Add loan — ${input.name || input.type} · total ${rupees(input.totalLoan)}, EMI ${rupees(input.emiAmount)}`;
    case "edit_loan":
      return `Update loan — ${input.name || input.type} · total ${rupees(input.totalLoan)}, EMI ${rupees(input.emiAmount)}`;
    case "delete_loan":
      return `Delete this loan`;
    case "set_budget":
      return `Set ${input.month} budget — salary ${rupees(input.amount)}, ${input.allocations?.length ?? 0} allocations`;
  }
}

/** High-risk: any delete, or any write whose primary amount ≥ AI_LARGE_AMOUNT. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLargeAmount(kind: AiActionKind, input: any): boolean {
  if (kind === "delete_transaction" || kind === "delete_loan") return true;
  const amount =
    input?.amount ?? input?.totalLoan ?? input?.targetAmount ?? 0;
  return typeof amount === "number" && amount >= AI_LARGE_AMOUNT;
}
