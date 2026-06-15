import { tool } from "ai";
import { ACTION_SCHEMAS } from "./action-kinds";
import { confirmAiAction } from "@/lib/actions/ai-actions";

/** AI write tools. Each requires explicit user approval (the in-chat confirm card);
 *  `execute` runs only after approval and delegates to the centralized gateway. */
export const actionTools = {
  add_transaction: tool({
    description:
      "Add a new income or expense transaction. The category must match the type (e.g. 'food' is an expense). Date is YYYY-MM-DD.",
    inputSchema: ACTION_SCHEMAS.add_transaction,
    needsApproval: true,
    execute: async (input) => confirmAiAction("add_transaction", input),
  }),
  edit_transaction: tool({
    description:
      "Edit an existing transaction. First find it with get_transactions and pass its exact id, plus the full updated fields.",
    inputSchema: ACTION_SCHEMAS.edit_transaction,
    needsApproval: true,
    execute: async (input) => confirmAiAction("edit_transaction", input),
  }),
  delete_transaction: tool({
    description: "Delete a transaction by its exact id (look it up with get_transactions first).",
    inputSchema: ACTION_SCHEMAS.delete_transaction,
    needsApproval: true,
    execute: async (input) => confirmAiAction("delete_transaction", input),
  }),
  contribute_to_savings: tool({
    description: "Add an amount to the user's savings. A savings goal must already exist.",
    inputSchema: ACTION_SCHEMAS.contribute_to_savings,
    needsApproval: true,
    execute: async (input) => confirmAiAction("contribute_to_savings", input),
  }),
  set_savings_goal: tool({
    description: "Create or update the savings goal (targetAmount, currentAmount, monthlyContribution).",
    inputSchema: ACTION_SCHEMAS.set_savings_goal,
    needsApproval: true,
    execute: async (input) => confirmAiAction("set_savings_goal", input),
  }),
  record_loan_payment: tool({
    description: "Record a loan payment by amount. A loan must already be set up.",
    inputSchema: ACTION_SCHEMAS.record_loan_payment,
    needsApproval: true,
    execute: async (input) => confirmAiAction("record_loan_payment", input),
  }),
  set_loan: tool({
    description: "Create or update the loan (totalLoan, paidAmount, emiAmount, startDate YYYY-MM-DD). Paid cannot exceed total.",
    inputSchema: ACTION_SCHEMAS.set_loan,
    needsApproval: true,
    execute: async (input) => confirmAiAction("set_loan", input),
  }),
  set_budget: tool({
    description:
      "Set the monthly budget: month (YYYY-MM), salary amount, and category allocations. Allocations cannot exceed the salary.",
    inputSchema: ACTION_SCHEMAS.set_budget,
    needsApproval: true,
    execute: async (input) => confirmAiAction("set_budget", input),
  }),
} as const;
