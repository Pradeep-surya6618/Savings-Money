"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="flex w-full max-w-md items-center justify-around rounded-full border border-border bg-card/70 p-2 shadow-lg backdrop-blur-xl">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-medium transition",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5 transition", active && "scale-110")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
