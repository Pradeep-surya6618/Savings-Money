import { tool } from "ai";
import { z } from "zod";
import { getAnalytics } from "@/services/analytics";
import { listTransactions } from "@/services/transactions";
import { getBudget } from "@/services/budget";
import { getSavings } from "@/services/savings";
import { getLoan } from "@/services/loan";
import { getMonthSummary } from "@/services/salary";
import { getBalance } from "@/services/balance";
import { currentMonth } from "@/lib/month";

const monthArg = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .describe("Month as YYYY-MM")
    .optional(),
});

export const assistantTools = {
  get_spending_summary: tool({
    description: "Income, expense totals and category breakdown for a month.",
    inputSchema: monthArg,
    execute: async ({ month }) => getAnalytics(month ?? currentMonth()),
  }),
  get_transactions: tool({
    description: "Recent transactions (most recent first, capped at 50).",
    inputSchema: z.object({
      category: z.string().optional(),
      type: z.enum(["income", "expense"]).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async ({ category, type, limit }) => {
      let txns = await listTransactions();
      if (category) txns = txns.filter((t) => t.category === category);
      if (type) txns = txns.filter((t) => t.type === type);
      return txns.slice(0, limit ?? 50);
    },
  }),
  get_budget_status: tool({
    description: "Budget vs actual per category for a month.",
    inputSchema: monthArg,
    execute: async ({ month }) => getBudget(month ?? currentMonth()),
  }),
  get_savings: tool({
    description: "Savings total and goals/progress.",
    inputSchema: z.object({}),
    execute: async () => getSavings(),
  }),
  get_loans: tool({
    description: "Loans/EMIs: outstanding amounts and schedule.",
    inputSchema: z.object({}),
    execute: async () => getLoan(),
  }),
  get_salary_allocation: tool({
    description: "Salary and how it is allocated for a month.",
    inputSchema: monthArg,
    execute: async ({ month }) => getMonthSummary(month ?? currentMonth()),
  }),
  get_running_balance: tool({
    description: "Opening/closing and running cash balance.",
    inputSchema: z.object({}),
    execute: async () => getBalance(),
  }),
};
