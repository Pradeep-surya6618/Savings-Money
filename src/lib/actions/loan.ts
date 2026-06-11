"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Loan } from "@/models/Loan";
import {
  saveLoanSchema,
  quickAmountSchema,
  type SaveLoanInput,
  type QuickAmountInput,
} from "@/validations/tracker";

type Result = { ok: true } | { ok: false; error: string };

export async function saveLoan(input: SaveLoanInput): Promise<Result> {
  const parsed = saveLoanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { startDate, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  await Loan.updateOne(
    { userId: user.id },
    { $set: { ...rest, startDate: new Date(startDate) } },
    { upsert: true },
  );

  revalidatePath("/loan");
  revalidatePath("/");
  return { ok: true };
}

export async function recordLoanPayment(input: QuickAmountInput): Promise<Result> {
  const parsed = quickAmountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const { user } = await getCurrentUser();
  const loan = await Loan.findOne({ userId: user.id }).lean();
  // Defense-in-depth: the UI hides "Record payment" until a loan is set up, but
  // never silently accept (and discard) a payment against a non-existent loan.
  if (!loan || loan.totalLoan <= 0) return { ok: false, error: "Set up your loan first" };
  // Clamp so a payment never pushes paid past the loan total.
  const newPaid = Math.min(loan.totalLoan, loan.paidAmount + parsed.data.amount);
  await Loan.updateOne({ userId: user.id }, { $set: { paidAmount: newPaid } }, { upsert: true });

  revalidatePath("/loan");
  revalidatePath("/");
  return { ok: true };
}
