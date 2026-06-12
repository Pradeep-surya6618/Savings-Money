"use client";

import { useState } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bell, Banknote, Wallet, PiggyBank, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import {
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "@/lib/actions/notifications";
import type { NotificationDTO, NotificationType } from "@/lib/notifications-math";

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tint: string; color: string }> = {
  salary: { icon: Banknote, tint: "bg-[#16a34a]/15", color: "#22c55e" },
  budget: { icon: Wallet, tint: "bg-negative/15", color: "var(--negative)" },
  savings: { icon: PiggyBank, tint: "bg-[#14b8a6]/15", color: "#14b8a6" },
};

export function NotificationBell({ items: initialItems }: { items: NotificationDTO[] }) {
  // Seeded once from server props; optimistic handlers keep it current, and each
  // action's revalidatePath("/","layout") refreshes the props on the next navigation.
  const [items, setItems] = useState(initialItems);
  // Derive the badge from items so optimistic mark-read updates it instantly.
  const unread = items.filter((n) => n.unread).length;

  async function readOne(key: string) {
    setItems((prev) => prev.map((n) => (n.key === key ? { ...n, unread: false } : n)));
    const res = await markNotificationRead(key);
    if (!res.ok) toast.error(res.error);
  }

  async function readAll() {
    const keys = items.filter((n) => n.unread).map((n) => n.key);
    if (keys.length === 0) return;
    const prev = items;
    setItems((cur) => cur.map((n) => ({ ...n, unread: false })));
    const res = await markAllNotificationsRead(keys);
    if (!res.ok) {
      setItems(prev);
      toast.error(res.error);
    }
  }

  async function dismiss(key: string) {
    const prev = items;
    setItems((cur) => cur.filter((n) => n.key !== key));
    const res = await dismissNotification(key);
    if (!res.ok) {
      setItems(prev);
      toast.error(res.error);
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={readAll} className="text-xs font-semibold text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
              <p className="text-sm font-medium">You&rsquo;re all caught up ✨</p>
              <p className="text-xs text-muted-foreground">No new notifications.</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {items.map((n) => {
                const meta = TYPE_META[n.type];
                const Icon = meta.icon;
                return (
                  <li key={n.key} className="group relative">
                    <Link
                      href={n.href}
                      onClick={() => readOne(n.key)}
                      className="flex gap-3 px-4 py-3 pr-9 transition hover:bg-card-elevated"
                    >
                      <span
                        className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tint)}
                        style={{ color: meta.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", n.unread ? "font-semibold" : "font-medium text-muted-foreground")}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">{n.context}</p>
                      </div>
                      {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </Link>
                    <button
                      onClick={() => dismiss(n.key)}
                      aria-label="Dismiss notification"
                      className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground group-hover:flex"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/settings?section=notifications"
            className="block border-t border-border px-4 py-3 text-center text-xs text-muted-foreground transition hover:text-foreground"
          >
            Notification settings →
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
