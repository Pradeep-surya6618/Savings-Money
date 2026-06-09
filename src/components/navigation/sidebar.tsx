"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-border bg-card/40 p-4 lg:flex">
      <div className="mb-6 bg-gradient-to-br from-primary to-primary-end bg-clip-text px-2 text-xl font-bold text-transparent">
        Finance
      </div>
      {[...PRIMARY_NAV, ...SECONDARY_NAV].map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
            isActive(pathname, href)
              ? "bg-card-elevated text-foreground"
              : "text-muted-foreground hover:bg-card-elevated hover:text-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </aside>
  );
}
