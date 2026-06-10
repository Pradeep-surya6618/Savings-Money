"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

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
      <div className={cn("mb-6 flex items-center px-1", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <span className="bg-gradient-to-br from-primary to-primary-end bg-clip-text px-1 text-xl font-bold text-transparent">
            Finance
          </span>
        )}
        <button
          onClick={toggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
        >
          {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          const link = (
            <Link
              href={href}
              aria-label={label}
              className={cn(
                "flex items-center gap-3 rounded-xl py-2 text-sm font-medium transition",
                isCollapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-gradient-to-r from-primary to-primary-end text-white shadow-sm shadow-primary/25"
                  : "text-muted-foreground hover:bg-card-elevated hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
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
