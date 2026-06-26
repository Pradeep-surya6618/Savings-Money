"use client";

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Home, User } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/** Profile popup for the assistant's mobile app bar: Home (→ dashboard), Profile, theme switch. */
export function AssistantProfileMenu({ name, image }: { name: string; image: string | null }) {
  return (
    <Popover.Root>
      <Popover.Trigger aria-label="Open menu" className="cursor-pointer rounded-full outline-none">
        <UserAvatar name={name} imageUrl={image} className="h-8 w-8 text-xs" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-48 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-card)]"
        >
          <Popover.Close asChild>
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-card-elevated"
            >
              <Home className="h-4 w-4 text-muted-foreground" /> Home
            </Link>
          </Popover.Close>
          <Popover.Close asChild>
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-card-elevated"
            >
              <User className="h-4 w-4 text-muted-foreground" /> Profile
            </Link>
          </Popover.Close>
          <div className="my-1 border-t border-border" />
          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
            <span className="text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
