import { Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { Logo } from "@/components/brand/logo";

export function MobileHeader({ greeting }: { greeting: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">FuFi</p>
          <p className="text-xs text-muted-foreground">{greeting}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip content="Notifications">
          <button
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
          >
            <Bell className="h-4 w-4" />
          </button>
        </Tooltip>
        <ThemeToggle />
      </div>
    </header>
  );
}
