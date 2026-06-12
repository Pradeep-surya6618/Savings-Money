import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationsResult } from "@/services/notifications";

export function MobileHeader({
  greeting,
  name,
  notifications,
}: {
  greeting: string;
  name: string;
  notifications: NotificationsResult;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">{greeting},</p>
          <p className="text-sm font-bold">
            {name} <span aria-hidden>👋</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell items={notifications.items} />
        <ThemeToggle />
      </div>
    </header>
  );
}
