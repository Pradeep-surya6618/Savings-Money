import { Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Tooltip } from "@/components/ui/tooltip";

export function TopBar({ greeting }: { greeting: string }) {
  return (
    <header className="hidden items-center justify-between border-b border-border px-6 py-4 lg:flex">
      <p className="text-sm text-muted-foreground">{greeting}</p>
      <div className="flex items-center gap-3">
        <Tooltip content="Notifications">
          <button
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
          </button>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  );
}
