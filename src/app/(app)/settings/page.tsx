import { SettingsView } from "@/components/settings/settings-view";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, settings } = await getCurrentUser();
  return (
    <SettingsView
      name={user.name}
      hasPassword={user.hasPassword}
      settings={{
        language: settings.language,
        dateFormat: settings.dateFormat,
        firstDayOfWeek: settings.firstDayOfWeek,
        defaultView: settings.defaultView,
        currency: settings.currency,
        locale: settings.locale,
      }}
      notifyPrefs={settings.notifyPrefs}
    />
  );
}
