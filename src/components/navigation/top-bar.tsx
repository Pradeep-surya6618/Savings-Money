import { Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Tooltip } from "@/components/ui/tooltip";

export function TopBar({ greeting, name }: { greeting: string; name: string }) {
  return (
    <header className="hidden items-center justify-between border-b border-border px-6 py-4 lg:flex">
      <div>
        <p className="text-lg font-bold tracking-tight">
          {greeting}, {name} <span aria-hidden>👋</span>
        </p>
        <p className="text-sm text-muted-foreground">Here&apos;s your financial overview</p>
      </div>
      <div className="flex items-center gap-3">
        <Tooltip content="Notifications">
          <button
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
          </button>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  );
}
