"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Logo } from "@/components/brand/logo";
import { Wordmark } from "@/components/brand/wordmark";

const STORAGE_KEY = "sidebar-collapsed";
const SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;

export function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  // null = preference not read yet → SSR/first paint render expanded (no hydration mismatch).
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !(prev ?? false);
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const isCollapsed = collapsed === true;
  const items = [...PRIMARY_NAV, ...SECONDARY_NAV];

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-card/40 p-3 transition-[width] duration-300 ease-out lg:flex",
        "lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto",
        isCollapsed ? "w-[4.5rem]" : "w-60",
      )}
    >
      {/* Brand + collapse toggle */}
      <div
        className={cn(
          "mb-6 flex px-1",
          isCollapsed ? "flex-col items-center gap-3" : "items-center justify-between",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="FuFi home">
          <Logo className="h-9 w-9" />
          {!isCollapsed && <Wordmark className="text-xl" />}
        </Link>
        <Tooltip content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
          <button
            onClick={toggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
          >
            {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </Tooltip>
      </div>

      {!isCollapsed && (
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Menu</p>
      )}

      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon, color }) => {
          const active = isActive(pathname, href);
          const link = (
            <Link
              href={href}
              aria-label={label}
              className={cn(
                "relative isolate flex items-center gap-3 rounded-xl py-2 text-sm transition-colors duration-200",
                isCollapsed ? "justify-center px-0" : "px-3",
                active
                  ? "font-semibold text-primary"
                  : "font-medium text-muted-foreground hover:bg-card-elevated hover:text-foreground",
              )}
            >
              {active && (
                <>
                  {/* sliding highlight + edge bar (shared layout animation) */}
                  <motion.span
                    layoutId="nav-active-pill"
                    aria-hidden
                    transition={SPRING}
                    className="absolute inset-0 -z-10 rounded-xl bg-primary/10"
                  />
                  <motion.span
                    layoutId="nav-active-bar"
                    aria-hidden
                    transition={SPRING}
                    className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                  />
                </>
              )}
              <Icon className="h-5 w-5 shrink-0" style={{ color: active ? "var(--primary)" : color }} />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );

          return isCollapsed ? (
            <Tooltip key={href} content={label} side="right">
              {link}
            </Tooltip>
          ) : (
            <div key={href}>{link}</div>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className={cn(
          "mt-auto flex items-center gap-3 rounded-xl px-2 py-2",
          isCollapsed && "justify-center px-0",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {name.charAt(0).toUpperCase()}
        </span>
        {!isCollapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">Premium Plan</p>
          </div>
        )}
      </div>
    </aside>
  );
}
