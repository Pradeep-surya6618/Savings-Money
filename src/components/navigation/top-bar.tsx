import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationsResult } from "@/services/notifications";

export function TopBar({
  greeting,
  name,
  notifications,
}: {
  greeting: string;
  name: string;
  notifications: NotificationsResult;
}) {
  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-xl lg:flex">
      <div>
        <p className="text-lg font-bold tracking-tight">
          {greeting}, {name} <span aria-hidden>👋</span>
        </p>
        <p className="text-sm text-muted-foreground">Here&apos;s your financial overview</p>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell items={notifications.items} />
        <ThemeToggle />
      </div>
    </header>
  );
}
