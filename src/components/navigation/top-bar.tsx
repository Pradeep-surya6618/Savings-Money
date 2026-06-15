import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SavingsChip } from "@/components/navigation/savings-chip";
import { ProfileMenu } from "@/components/navigation/profile-menu";
import type { NotificationsResult } from "@/services/notifications";

export function TopBar({
  greeting,
  name,
  image,
  notifications,
  savingsTotal,
}: {
  greeting: string;
  name: string;
  image: string | null;
  notifications: NotificationsResult;
  savingsTotal: number;
}) {
  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-xl lg:flex">
      <div>
        <p className="text-lg font-bold tracking-tight">
          {greeting}, {name.split(" ")[0]} <span aria-hidden>👋</span>
        </p>
        <p className="text-sm text-muted-foreground">Here&apos;s your financial overview</p>
      </div>
      <div className="flex items-center gap-3">
        <SavingsChip amount={savingsTotal} />
        <NotificationBell items={notifications.items} />
        <ThemeToggle />
        <ProfileMenu name={name} image={image} />
      </div>
    </header>
  );
}
