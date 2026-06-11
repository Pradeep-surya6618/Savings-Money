import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";
import { getCurrentUser } from "@/lib/user";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await getCurrentUser();
  return (
    <AppShell greeting={greetingFor(new Date())} name={user.name}>
      {children}
    </AppShell>
  );
}
