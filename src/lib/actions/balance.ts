"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Settings } from "@/models/Settings";
import { Transaction } from "@/models/Transaction";
import { Salary } from "@/models/Salary";
import { Savings } from "@/models/Savings";
import { Loan } from "@/models/Loan";

type Result = { ok: true } | { ok: false; error: string };

export async function setOpeningBalance(amount: number): Promise<Result> {
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: "Enter a valid amount (0 or more)" };
  await connectDB();
  const { user } = await getCurrentUser();
  await Settings.updateOne({ userId: user.id }, { $set: { openingBalance: amount } }, { upsert: true });
  revalidatePath("/balance");
  revalidatePath("/");
  return { ok: true };
}

export async function resetAllData(): Promise<Result> {
  await connectDB();
  const { user } = await getCurrentUser();
  await Promise.all([
    Transaction.deleteMany({ userId: user.id }),
    Salary.deleteMany({ userId: user.id }),
    Savings.deleteMany({ userId: user.id }),
    Loan.deleteMany({ userId: user.id }),
  ]);
  await Settings.updateOne({ userId: user.id }, { $set: { openingBalance: 0 } });
  revalidatePath("/");
  revalidatePath("/balance");
  return { ok: true };
}
