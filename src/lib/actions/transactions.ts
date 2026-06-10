"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";
import { saveTransactionSchema, type SaveTransactionInput } from "@/validations/transaction";

type Result = { ok: true } | { ok: false; error: string };

export async function createTransaction(input: SaveTransactionInput): Promise<Result> {
  const parsed = saveTransactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { date, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  await Transaction.create({ userId: user.id, ...rest, date: new Date(date) });

  revalidatePath("/transactions");
  return { ok: true };
}

export async function updateTransaction(id: string, input: SaveTransactionInput): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid transaction" };
  const parsed = saveTransactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { date, ...rest } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  const res = await Transaction.updateOne(
    { _id: id, userId: user.id },
    { $set: { ...rest, date: new Date(date) } },
  );
  if (res.matchedCount === 0) return { ok: false, error: "Transaction not found" };

  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<Result> {
  if (!Types.ObjectId.isValid(id)) return { ok: false, error: "Invalid transaction" };
  await connectDB();
  const { user } = await getCurrentUser();
  await Transaction.deleteOne({ _id: id, userId: user.id });
  revalidatePath("/transactions");
  return { ok: true };
}
