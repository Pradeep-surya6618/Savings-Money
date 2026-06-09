import { cache } from "react";
import { connectDB } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { Settings } from "@/models/Settings";

const THEMES = ["light", "dark", "system"] as const;
type Theme = (typeof THEMES)[number];

function toTheme(value: string): Theme {
  return (THEMES as readonly string[]).includes(value) ? (value as Theme) : "system";
}

export type CurrentUser = {
  user: { id: string; name: string; email: string | null; image: string | null };
  settings: { theme: Theme; currency: string; locale: string };
};

/** Resolves the single app user, creating it (and its settings) on first run. */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  await connectDB();

  const userDoc = await User.findOneAndUpdate(
    {},
    { $setOnInsert: { name: "You" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (!userDoc) throw new Error("Failed to resolve current user");

  const settingsDoc = await Settings.findOneAndUpdate(
    { userId: userDoc._id },
    { $setOnInsert: { userId: userDoc._id } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (!settingsDoc) throw new Error("Failed to resolve user settings");

  return {
    user: {
      id: String(userDoc._id),
      name: userDoc.name,
      email: userDoc.email ?? null,
      image: userDoc.image ?? null,
    },
    settings: {
      theme: toTheme(settingsDoc.theme),
      currency: settingsDoc.currency,
      locale: settingsDoc.locale,
    },
  };
});
