"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { PRIMARY_NAV, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
      <MotionConfig reducedMotion="user">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/80 p-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="relative isolate flex items-center justify-center rounded-full px-3.5 py-2.5"
              >
                {active && (
                  <motion.span
                    layoutId="bottom-active-pill"
                    aria-hidden
                    transition={SPRING}
                    className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-primary to-primary-end shadow-sm shadow-primary/40"
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-200",
                    active ? "text-white" : "text-muted-foreground",
                  )}
                />
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span
                      key="label"
                      initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                      animate={{ width: "auto", opacity: 1, marginLeft: 6 }}
                      exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                      transition={SPRING}
                      className="overflow-hidden whitespace-nowrap text-xs font-semibold text-white"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </MotionConfig>
    </nav>
  );
}
