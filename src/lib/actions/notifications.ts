"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { NotificationState } from "@/models/NotificationState";
import { Settings } from "@/models/Settings";
import { updateNotifyPrefsSchema, type NotifyPrefs } from "@/validations/settings";

type Result = { ok: true } | { ok: false; error: string };

async function addKeys(field: "readKeys" | "dismissedKeys", keys: string[]): Promise<Result> {
  try {
    await connectDB();
    const { user } = await getCurrentUser();
    await NotificationState.updateOne(
      { userId: user.id },
      { $addToSet: { [field]: { $each: keys } } },
      { upsert: true },
    );
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't update notifications" };
  }
}

export async function markNotificationRead(key: string): Promise<Result> {
  return addKeys("readKeys", [key]);
}

export async function markAllNotificationsRead(keys: string[]): Promise<Result> {
  if (keys.length === 0) return { ok: true };
  return addKeys("readKeys", keys);
}

export async function dismissNotification(key: string): Promise<Result> {
  return addKeys("dismissedKeys", [key]);
}

export async function updateNotifyPrefs(input: NotifyPrefs): Promise<Result> {
  const parsed = updateNotifyPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await connectDB();
    const { user } = await getCurrentUser();
    await Settings.updateOne({ userId: user.id }, { $set: { notifyPrefs: parsed.data } }, { upsert: true });
    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save notification preferences" };
  }
}
