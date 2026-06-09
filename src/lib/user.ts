import { cache } from "react";
import { connectDB } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { Settings } from "@/models/Settings";

export type CurrentUser = {
  user: { id: string; name: string; email: string | null; image: string | null };
  settings: { theme: "light" | "dark" | "system"; currency: string; locale: string };
};

/** Resolves the single app user, creating it (and its settings) on first run. */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  await connectDB();

  let userDoc = await User.findOne();
  if (!userDoc) userDoc = await User.create({ name: "You" });

  let settingsDoc = await Settings.findOne({ userId: userDoc._id });
  if (!settingsDoc) settingsDoc = await Settings.create({ userId: userDoc._id });

  return {
    user: {
      id: String(userDoc._id),
      name: userDoc.name,
      email: userDoc.email ?? null,
      image: userDoc.image ?? null,
    },
    settings: {
      theme: settingsDoc.theme as "light" | "dark" | "system",
      currency: settingsDoc.currency,
      locale: settingsDoc.locale,
    },
  };
});
