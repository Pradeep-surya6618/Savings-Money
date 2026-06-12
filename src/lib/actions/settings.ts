"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Settings } from "@/models/Settings";
import { updatePreferencesSchema, type UpdatePreferencesInput } from "@/validations/settings";

type Result = { ok: true } | { ok: false; error: string };

export async function updateTheme(theme: "light" | "dark"): Promise<void> {
  await connectDB();
  const { user } = await getCurrentUser();
  await Settings.updateOne({ userId: user.id }, { $set: { theme } }, { upsert: true });
}

export async function updatePreferences(input: UpdatePreferencesInput): Promise<Result> {
  const parsed = updatePreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await connectDB();
  const { user } = await getCurrentUser();
  await Settings.updateOne({ userId: user.id }, { $set: parsed.data }, { upsert: true });

  revalidatePath("/settings");
  return { ok: true };
}
