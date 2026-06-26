"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Loan } from "@/models/Loan";
import { saveLoanSchema, quickAmountSchema, type SaveLoanInput } from "@/validations/tracker";

type Result = { ok: true } | { ok: false; error: string };

function revalidateLoan() {
  revalidatePath("/loan");
  revalidatePath("/");
  revalidatePath("/analytics");
}

export async function createLoan(
  input: SaveLoanInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = saveLoanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { startDate, name, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Loan.create({
    userId: user.id,
    ...rest,
    name: name ?? null,
    startDate: new Date(startDate),
  });
  revalidateLoan();
  return { ok: true, id: String(doc._id) };
}

export async function updateLoan(id: string, input: SaveLoanInput): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid loan" };
  const parsed = saveLoanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { startDate, name, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  const res = await Loan.updateOne(
    { _id: id, userId: user.id },
    { $set: { ...rest, name: name ?? null, startDate: new Date(startDate) } },
  );
  if (res.matchedCount === 0) return { ok: false, error: "Loan not found" };
  revalidateLoan();
  return { ok: true };
}

export async function deleteLoan(id: string): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid loan" };
  await connectDB();
  const { user } = await getCurrentUser();
  const res = await Loan.deleteOne({ _id: id, userId: user.id });
  if (res.deletedCount === 0) return { ok: false, error: "Loan not found" };
  revalidateLoan();
  return { ok: true };
}

export async function recordLoanPayment(id: string, amount: number): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid loan" };
  const parsed = quickAmountSchema.safeParse({ amount });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid amount" };

  await connectDB();
  const { user } = await getCurrentUser();
  const loan = await Loan.findOne({ _id: id, userId: user.id }).lean();
  if (!loan || loan.totalLoan <= 0) return { ok: false, error: "Loan not found" };
  const newPaid = Math.min(loan.totalLoan, loan.paidAmount + parsed.data.amount);
  await Loan.updateOne({ _id: id, userId: user.id }, { $set: { paidAmount: newPaid } });
  revalidateLoan();
  return { ok: true };
}
