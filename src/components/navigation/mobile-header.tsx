import { Bell } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function MobileHeader({ name, greeting }: { name: string; greeting: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-end text-sm font-semibold text-white">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">{greeting}</p>
          <p className="text-sm font-semibold">{name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground"
        >
          <Bell className="h-4 w-4" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
