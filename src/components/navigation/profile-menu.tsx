"use client";

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, LogOut, User } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { logout } from "@/lib/actions/auth";

/** Profile dropdown for the desktop app bar: avatar + first name → Profile / Log out. */
export function ProfileMenu({ name, image }: { name: string; image: string | null }) {
  return (
    <Popover.Root>
      <Popover.Trigger className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 outline-none transition hover:bg-card-elevated">
        <UserAvatar name={name} imageUrl={image} className="h-7 w-7 text-xs" />
        <span className="text-sm font-medium">{name.split(" ")[0]}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-44 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-card)]"
        >
          <Popover.Close asChild>
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-card-elevated"
            >
              <User className="h-4 w-4 text-muted-foreground" /> Profile
            </Link>
          </Popover.Close>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-negative transition hover:bg-negative/10"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
