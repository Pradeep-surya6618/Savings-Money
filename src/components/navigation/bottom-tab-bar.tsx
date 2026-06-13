"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Ellipsis, LogOut } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, SETTINGS_NAV, isActive } from "@/lib/nav";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 420, damping: 36 } as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // The active secondary item (Savings/Loan/Balance), if any — the "More" button morphs into it.
  const activeSecondary = SECONDARY_NAV.find((n) => isActive(pathname, n.href));
  const MoreIcon = activeSecondary?.icon ?? Ellipsis;

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-border bg-card/80 p-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
          {[...PRIMARY_NAV, SETTINGS_NAV].map(({ href, label, icon: Icon, color }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={cn(
                  "relative isolate flex min-w-0 items-center justify-center rounded-full px-3 py-2.5",
                  !active && "shrink-0",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-active-pill"
                    aria-hidden
                    transition={SPRING}
                    className="absolute inset-0 -z-10 rounded-full bg-brand shadow-sm shadow-primary/40"
                  />
                )}
                <Icon
                  className={cn("h-5 w-5 shrink-0 transition-colors duration-200", active && "text-white")}
                  style={active ? undefined : { color }}
                />
                {active && (
                  <span className="ml-1.5 min-w-0 truncate text-xs font-semibold text-white">{label}</span>
                )}
              </Link>
            );
          })}

          {/* More — opens the sheet (Savings/Loan/Balance). When one is active it morphs
              into that item (its icon + label) instead of showing the ellipsis. */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={activeSecondary ? activeSecondary.label : "More"}
            aria-haspopup="dialog"
            className={cn(
              "relative isolate flex min-w-0 items-center justify-center rounded-full px-3 py-2.5",
              !activeSecondary && "shrink-0",
            )}
          >
            {activeSecondary && (
              <motion.span
                layoutId="bottom-active-pill"
                aria-hidden
                transition={SPRING}
                className="absolute inset-0 -z-10 rounded-full bg-brand shadow-sm shadow-primary/40"
              />
            )}
            <MoreIcon
              className={cn(
                "h-5 w-5 shrink-0 transition-colors duration-200",
                activeSecondary ? "text-white" : "text-muted-foreground",
              )}
            />
            {activeSecondary && (
              <span className="ml-1.5 min-w-0 truncate text-xs font-semibold text-white">{activeSecondary.label}</span>
            )}
          </button>
        </div>
      </nav>

      {/* Bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="More menu"
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-card-elevated" />
              <p className="px-1 text-sm font-semibold">More</p>
              <div className="mt-3 grid gap-2">
                {SECONDARY_NAV.map(({ href, label, icon: Icon, color }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 transition",
                        active
                          ? "border-primary/40 bg-primary/10"
                          : "border-border bg-card hover:bg-card-elevated",
                      )}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${color}1f`, color }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold">{label}</span>
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    logout();
                  }}
                  className="mt-1 flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-negative/40 hover:bg-negative/10"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-negative/10 text-negative">
                    <LogOut className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-negative">Log out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
