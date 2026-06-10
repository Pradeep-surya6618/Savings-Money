"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { Logo } from "@/components/brand/logo";

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
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
        <Link href="/" className="flex items-center gap-2.5" aria-label="Surya Savings home">
          <Logo className="h-9 w-9" />
          {!isCollapsed && <span className="text-base font-bold tracking-tight">Surya Savings</span>}
        </Link>
        <button
          onClick={toggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
        >
          {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {!isCollapsed && (
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Menu</p>
      )}

      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const link = (
            <Link
              href={href}
              aria-label={label}
              className={cn(
                "relative flex items-center gap-3 rounded-xl py-2 text-sm transition",
                isCollapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-primary/10 font-semibold text-foreground"
                  : "font-medium text-muted-foreground hover:bg-card-elevated hover:text-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                />
              )}
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
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
    </aside>
  );
}
