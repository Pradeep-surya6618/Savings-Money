import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";
import { getCurrentUser } from "@/lib/user";
import { getNotifications } from "@/services/notifications";
import { getSavings } from "@/services/savings";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await getCurrentUser();
  const [notifications, savings] = await Promise.all([getNotifications(), getSavings()]);
  return (
    <AppShell
      greeting={greetingFor(new Date())}
      name={user.name}
      notifications={notifications}
      savingsTotal={savings.currentAmount}
    >
      {children}
    </AppShell>
  );
}
