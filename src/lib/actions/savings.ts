"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Savings } from "@/models/Savings";
import {
  saveSavingsSchema,
  quickAmountSchema,
  type SaveSavingsInput,
  type QuickAmountInput,
} from "@/validations/tracker";

type Result = { ok: true } | { ok: false; error: string };

export async function saveSavings(input: SaveSavingsInput): Promise<Result> {
  const parsed = saveSavingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const { user } = await getCurrentUser();
  await Savings.updateOne({ userId: user.id }, { $set: parsed.data }, { upsert: true });

  revalidatePath("/savings");
  revalidatePath("/");
  return { ok: true };
}

export async function addToSavings(input: QuickAmountInput): Promise<Result> {
  const parsed = quickAmountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const { user } = await getCurrentUser();
  // Intentionally uncapped: saving past the goal is a valid (celebrated) state.
  // savingsStats clamps pct to 100 and reports `reached`. This is asymmetric with
  // recordLoanPayment, which clamps to the total — you can't pay more than you owe.
  await Savings.updateOne(
    { userId: user.id },
    { $inc: { currentAmount: parsed.data.amount } },
    { upsert: true },
  );

  revalidatePath("/savings");
  revalidatePath("/");
  return { ok: true };
}
