import { cache } from "react";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { Settings } from "@/models/Settings";
import { getSession } from "@/lib/auth/session";
import type { NotifyPrefs } from "@/validations/settings";

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

function toTheme(value: string): Theme {
  return (THEMES as readonly string[]).includes(value) ? (value as Theme) : "dark";
}

export type CurrentUser = {
  user: { id: string; name: string; email: string | null; image: string | null; hasPassword: boolean };
  settings: {
    theme: Theme;
    currency: string;
    locale: string;
    language: string;
    dateFormat: string;
    firstDayOfWeek: string;
    defaultView: string;
    openingBalance: number;
    notifyPrefs: NotifyPrefs;
  };
};

/** The logged-in user (+ settings). Redirects to /login when there is no valid session. */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  await connectDB();
  const session = await getSession();
  if (!session) redirect("/login");

  const userDoc = await User.findById(session.userId);
  if (!userDoc) redirect("/login");

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
      image: userDoc.avatarUpdatedAt
        ? `/api/profile/avatar?v=${new Date(userDoc.avatarUpdatedAt).getTime()}`
        : (userDoc.image ?? null),
      hasPassword: Boolean(userDoc.passwordHash),
    },
    settings: {
      theme: toTheme(settingsDoc.theme),
      currency: settingsDoc.currency,
      locale: settingsDoc.locale,
      language: settingsDoc.language ?? "English",
      dateFormat: settingsDoc.dateFormat ?? "DD MMM YYYY",
      firstDayOfWeek: settingsDoc.firstDayOfWeek ?? "Monday",
      defaultView: settingsDoc.defaultView ?? "Home",
      openingBalance: settingsDoc.openingBalance ?? 0,
      notifyPrefs: {
        salary: settingsDoc.notifyPrefs?.salary ?? true,
        budget: settingsDoc.notifyPrefs?.budget ?? true,
        savings: settingsDoc.notifyPrefs?.savings ?? true,
      },
    },
  };
});
