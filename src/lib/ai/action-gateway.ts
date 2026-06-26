import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";
import { Savings } from "@/models/Savings";
import { Loan } from "@/models/Loan";
import { Salary } from "@/models/Salary";
import type { LoanTypeKey } from "@/lib/loan-types";
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/actions/transactions";
import { saveSavings, addToSavings } from "@/lib/actions/savings";
import { createLoan, updateLoan, deleteLoan, recordLoanPayment } from "@/lib/actions/loan";
import { saveSalaryAllocations } from "@/lib/actions/salary";
import { type AiActionKind, parseActionInput, summarizeAction } from "./action-kinds";
import {
  computeInverse,
  type AiActionInverse,
  type InverseContext,
  type TxnSnapshot,
  type LoanSnapshot,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loanSnapshot(d: any): LoanSnapshot {
  return {
    type: d.type ?? "other",
    name: d.name ?? null,
    totalLoan: d.totalLoan,
    paidAmount: d.paidAmount,
    emiAmount: d.emiAmount,
    startDate: d.startDate ? new Date(d.startDate).toISOString().slice(0, 10) : null,
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
      const prev = await Loan.findOne({ _id: input.loanId, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Loan not found" };
      ctx.before!.loanPaid = prev.paidAmount;
      const res = await recordLoanPayment(input.loanId, input.amount);
      if (!res.ok) return res;
      break;
    }
    case "add_loan": {
      const res = await createLoan(input);
      if (!res.ok) return res;
      ctx.createdId = res.id;
      break;
    }
    case "edit_loan": {
      const prev = await Loan.findOne({ _id: input.id, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Loan not found" };
      ctx.before!.loan = loanSnapshot(prev);
      const { id, ...fields } = input;
      const res = await updateLoan(id, fields);
      if (!res.ok) return res;
      break;
    }
    case "delete_loan": {
      const prev = await Loan.findOne({ _id: input.id, userId: user.id }).lean();
      if (!prev) return { ok: false, error: "Loan not found" };
      ctx.before!.loan = loanSnapshot(prev);
      const res = await deleteLoan(input.id);
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
      await Loan.updateOne({ _id: inverse.id, userId: user.id }, { $set: { paidAmount: inverse.paidAmount } });
      break;
    case "create_loan":
      await Loan.create({
        userId: user.id,
        type: inverse.doc.type as LoanTypeKey,
        name: inverse.doc.name ?? null,
        totalLoan: inverse.doc.totalLoan,
        paidAmount: inverse.doc.paidAmount,
        emiAmount: inverse.doc.emiAmount,
        startDate: inverse.doc.startDate ? new Date(inverse.doc.startDate) : null,
      });
      break;
    case "update_loan":
      await Loan.updateOne(
        { _id: inverse.id, userId: user.id },
        { $set: {
            type: inverse.doc.type, name: inverse.doc.name ?? null,
            totalLoan: inverse.doc.totalLoan, paidAmount: inverse.doc.paidAmount, emiAmount: inverse.doc.emiAmount,
            startDate: inverse.doc.startDate ? new Date(inverse.doc.startDate) : null,
          } },
      );
      break;
    case "delete_loan_doc":
      await Loan.deleteOne({ _id: inverse.id, userId: user.id });
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
