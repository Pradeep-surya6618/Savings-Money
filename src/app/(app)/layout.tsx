import type { ReactNode } from "react";
import { AppShell } from "@/components/navigation/app-shell";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell greeting={greetingFor(new Date())}>{children}</AppShell>;
}
