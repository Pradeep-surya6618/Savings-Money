import type { AiActionKind } from "./action-kinds";

export type TxnSnapshot = {
  title: string; amount: number; type: "income" | "expense"; category: string; date: string; notes?: string | null;
};
export type SavingsSnapshot = { currentAmount: number; targetAmount: number; monthlyContribution: number };
export type LoanSnapshot = {
  type: string; name?: string | null; totalLoan: number; paidAmount: number; emiAmount: number; startDate: string | null;
};
export type SalarySnapshot = {
  month: string; amount: number; receivedDate: string | null;
  allocations: { category: string; amount: number }[];
};

/** Reversal payload, discriminated by `op`. Stored on AiAction.inverse and applied by undo. */
export type AiActionInverse =
  | { op: "delete_txn"; id: string }
  | { op: "update_txn"; id: string; doc: TxnSnapshot }
  | { op: "create_txn"; doc: TxnSnapshot }
  | { op: "inc_savings"; amount: number }
  | { op: "set_savings"; doc: SavingsSnapshot | null }
  | { op: "set_loan_paid"; id: string; paidAmount: number }
  | { op: "create_loan"; doc: LoanSnapshot }
  | { op: "update_loan"; id: string; doc: LoanSnapshot }
  | { op: "delete_loan_doc"; id: string }
  | { op: "set_salary"; month: string; doc: SalarySnapshot | null };

/** "before"/"after" context the gateway gathers around the write. */
export type InverseContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  createdId?: string;
  before?: {
    txn?: TxnSnapshot;
    savings?: SavingsSnapshot | null;
    loan?: LoanSnapshot | null;
    loanPaid?: number;
    salary?: SalarySnapshot | null;
  };
};

export function computeInverse(kind: AiActionKind, ctx: InverseContext): AiActionInverse {
  switch (kind) {
    case "add_transaction":
      return { op: "delete_txn", id: ctx.createdId! };
    case "edit_transaction":
      return { op: "update_txn", id: ctx.input.id, doc: ctx.before!.txn! };
    case "delete_transaction":
      return { op: "create_txn", doc: ctx.before!.txn! };
    case "contribute_to_savings":
      return { op: "inc_savings", amount: -ctx.input.amount };
    case "set_savings_goal":
      return { op: "set_savings", doc: ctx.before!.savings ?? null };
    case "record_loan_payment":
      return { op: "set_loan_paid", id: ctx.input.loanId, paidAmount: ctx.before!.loanPaid! };
    case "add_loan":
      return { op: "delete_loan_doc", id: ctx.createdId! };
    case "edit_loan":
      return { op: "update_loan", id: ctx.input.id, doc: ctx.before!.loan! };
    case "delete_loan":
      return { op: "create_loan", doc: ctx.before!.loan! };
    case "set_budget":
      return { op: "set_salary", month: ctx.input.month, doc: ctx.before!.salary ?? null };
  }
}
