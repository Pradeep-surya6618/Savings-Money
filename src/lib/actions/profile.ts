"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/mongodb/connect";
import { getSession } from "@/lib/auth/session";
import { User } from "@/models/User";
import { Avatar } from "@/models/Avatar";
import { profileSchema, isValidAvatar, type ProfileInput } from "@/validations/profile";

type Result = { ok: true } | { ok: false; error: string };

function revalidateProfile() {
  revalidatePath("/profile");
  revalidatePath("/", "layout"); // refresh sidebar/app-bar avatar + name
}

export async function updateProfile(input: ProfileInput): Promise<Result> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const session = await getSession();
  if (!session) return { ok: false, error: "You're not signed in." };
  const { name, bio, dateOfBirth } = parsed.data;
  try {
    await connectDB();
    await User.updateOne(
      { _id: session.userId },
      { $set: { name, bio: bio || "", dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } },
    );
    revalidateProfile();
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save your profile. Please try again." };
  }
}

export async function updateAvatar(formData: FormData): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "You're not signed in." };
  const file = formData.get("avatar");
  if (!(file instanceof File)) return { ok: false, error: "No image selected." };
  if (!isValidAvatar(file.type, file.size)) return { ok: false, error: "Choose an image up to 3MB." };
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const data = await sharp(input).rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
    await connectDB();
    await Avatar.findOneAndUpdate(
      { userId: session.userId },
      { $set: { data, contentType: "image/webp" } },
      { upsert: true },
    );
    await User.updateOne({ _id: session.userId }, { $set: { avatarUpdatedAt: new Date() } });
    revalidateProfile();
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't update your photo. Please try again." };
  }
}

export async function removeAvatar(): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "You're not signed in." };
  try {
    await connectDB();
    await Avatar.deleteOne({ userId: session.userId });
    await User.updateOne({ _id: session.userId }, { $unset: { avatarUpdatedAt: "" } });
    revalidateProfile();
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't remove your photo. Please try again." };
  }
}
