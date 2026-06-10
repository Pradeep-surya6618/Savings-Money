"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary } from "@/models/Salary";
import { saveSalarySchema, type SaveSalaryInput } from "@/validations/salary";

export async function saveSalaryAllocations(
  input: SaveSalaryInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = saveSalarySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { month, amount, receivedDate, allocations } = parsed.data;

  await connectDB();
  const { user } = await getCurrentUser();
  await Salary.updateOne(
    { userId: user.id, month },
    { $set: { amount, receivedDate: receivedDate ?? null, allocations } },
    { upsert: true },
  );

  revalidatePath("/");
  return { ok: true };
}
