import { SettingsView } from "@/components/settings/settings-view";
import { AiActionsCard } from "@/components/settings/ai-actions-card";
import { getCurrentUser } from "@/lib/user";
import { getAiActionsEnabled } from "@/services/settings";
import { listAiActions } from "@/services/ai-actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, settings } = await getCurrentUser();
  const [aiEnabled, aiActivity] = await Promise.all([getAiActionsEnabled(), listAiActions()]);
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
      aiActions={<AiActionsCard enabled={aiEnabled} activity={aiActivity} />}
    />
  );
}
