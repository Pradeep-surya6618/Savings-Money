import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";
import { Savings } from "@/models/Savings";
import { Loan } from "@/models/Loan";
import { Salary } from "@/models/Salary";
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/actions/transactions";
import { saveSavings, addToSavings } from "@/lib/actions/savings";
import { saveLoan, recordLoanPayment } from "@/lib/actions/loan";
import { saveSalaryAllocations } from "@/lib/actions/salary";
import { type AiActionKind, parseActionInput, summarizeAction } from "./action-kinds";
import {
  computeInverse,
  type AiActionInverse,
  type InverseContext,
  type TxnSnapshot,
} from "./action-inverse";

type ApplyResult =
  | { ok: true; summary: string; inverse: AiActionInverse }
  | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function txnSnapshot(d: any): TxnSnapshot {
  return {
    title: d.title,
    amount: d.amount,
    type: d.type,
    category: d.category,
    date: new Date(d.date).toISOString().slice(0, 10),
    notes: d.notes ?? null,
  };
}

/** Validate → read "before" → perform write via the existing domain action → compute inverse.
 *  Throws nothing; returns a Result. Ownership/validation enforced here AND in each action. */
export async function applyAiAction(kind: AiActionKind, rawInput: unknown): Promise<ApplyResult> {
  const parsed = parseActionInput(kind, rawInput);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input = parsed.data as any;

  await connectDB();
  const { user } = await getCurrentUser();
  const ctx: InverseContext = { input, before: {} };

  switch (kind) {
    case "add_transaction": {
      const res = await createTransaction(input);
      if (!res.ok) return res;
      ctx.createdId = res.id;
      break;
    }
    case "edit_transaction": {
      const prev = await Transaction.findOne({ _id: input.id, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Transaction not found" };
      ctx.before!.txn = txnSnapshot(prev);
      const { id, ...fields } = input;
      const res = await updateTransaction(id, fields);
      if (!res.ok) return res;
      break;
    }
    case "delete_transaction": {
      const prev = await Transaction.findOne({ _id: input.id, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Transaction not found" };
      ctx.before!.txn = txnSnapshot(prev);
      const res = await deleteTransaction(input.id);
      if (!res.ok) return res;
      break;
    }
    case "contribute_to_savings": {
      const res = await addToSavings(input);
      if (!res.ok) return res;
      break;
    }
    case "set_savings_goal": {
      const prev = await Savings.findOne({ userId: user.id }).lean();
      ctx.before!.savings = prev
        ? { currentAmount: prev.currentAmount, targetAmount: prev.targetAmount, monthlyContribution: prev.monthlyContribution }
        : null;
      const res = await saveSavings(input);
      if (!res.ok) return res;
      break;
    }
    case "record_loan_payment": {
      const prev = await Loan.findOne({ userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Set up your loan first" };
      ctx.before!.loanPaid = prev.paidAmount;
      const res = await recordLoanPayment(input);
      if (!res.ok) return res;
      break;
    }
    case "set_loan": {
      const prev = await Loan.findOne({ userId: user.id }).lean();
      ctx.before!.loan = prev
        ? {
            totalLoan: prev.totalLoan, paidAmount: prev.paidAmount, emiAmount: prev.emiAmount,
            startDate: prev.startDate ? new Date(prev.startDate).toISOString().slice(0, 10) : null,
          }
        : null;
      const res = await saveLoan(input);
      if (!res.ok) return res;
      break;
    }
    case "set_budget": {
      const prev = await Salary.findOne({ userId: user.id, month: input.month }).lean();
      ctx.before!.salary = prev
        ? {
            month: prev.month, amount: prev.amount,
            receivedDate: prev.receivedDate ? new Date(prev.receivedDate).toISOString().slice(0, 10) : null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allocations: (prev.allocations ?? []).map((a: any) => ({ category: a.category, amount: a.amount })),
          }
        : null;
      const res = await saveSalaryAllocations(input);
      if (!res.ok) return res;
      break;
    }
  }

  return { ok: true, summary: summarizeAction(kind, input), inverse: computeInverse(kind, ctx) };
}

/** Reverse a previously-applied action. */
export async function applyInverse(inverse: AiActionInverse): Promise<void> {
  await connectDB();
  const { user } = await getCurrentUser();
  switch (inverse.op) {
    case "delete_txn":
      await Transaction.deleteOne({ _id: inverse.id, userId: user.id });
      break;
    case "update_txn":
      await Transaction.updateOne(
        { _id: inverse.id, userId: user.id },
        { $set: { ...inverse.doc, date: new Date(inverse.doc.date) } },
      );
      break;
    case "create_txn":
      await Transaction.create({ userId: user.id, ...inverse.doc, date: new Date(inverse.doc.date) });
      break;
    case "inc_savings": {
      const s = await Savings.findOne({ userId: user.id });
      if (s) {
        s.currentAmount = Math.max(0, s.currentAmount + inverse.amount);
        await s.save();
      }
      break;
    }
    case "set_savings":
      if (inverse.doc) await Savings.updateOne({ userId: user.id }, { $set: inverse.doc }, { upsert: true });
      else await Savings.deleteOne({ userId: user.id });
      break;
    case "set_loan_paid":
      await Loan.updateOne({ userId: user.id }, { $set: { paidAmount: inverse.paidAmount } });
      break;
    case "set_loan_doc":
      if (inverse.doc)
        await Loan.updateOne(
          { userId: user.id },
          { $set: { ...inverse.doc, startDate: inverse.doc.startDate ? new Date(inverse.doc.startDate) : null } },
          { upsert: true },
        );
      else await Loan.deleteOne({ userId: user.id });
      break;
    case "set_salary":
      if (inverse.doc)
        await Salary.updateOne(
          { userId: user.id, month: inverse.month },
          { $set: { amount: inverse.doc.amount, receivedDate: inverse.doc.receivedDate ? new Date(inverse.doc.receivedDate) : null, allocations: inverse.doc.allocations } },
          { upsert: true },
        );
      else await Salary.deleteOne({ userId: user.id, month: inverse.month });
      break;
  }
}
