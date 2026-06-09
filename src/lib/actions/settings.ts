"use server";

import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Settings } from "@/models/Settings";

export async function updateTheme(theme: "light" | "dark" | "system"): Promise<void> {
  await connectDB();
  const { user } = await getCurrentUser();
  await Settings.updateOne({ userId: user.id }, { $set: { theme } }, { upsert: true });
}
