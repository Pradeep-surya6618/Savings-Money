"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Ellipsis, LogOut } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, SETTINGS_NAV, isActive, type NavItem } from "@/lib/nav";
import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

/** Look up a nav item by href across all nav groups (single source of truth for icon/label/color). */
function byHref(href: string): NavItem {
  const item = [...PRIMARY_NAV, ...SECONDARY_NAV, SETTINGS_NAV].find((n) => n.href === href);
  if (!item) throw new Error(`Unknown nav href: ${href}`);
  return item;
}

const AI = byHref("/assistant");
// Four flat slots around the floating AI button: 2 left, 2 right (the last is "More").
const LEFT = [byHref("/"), byHref("/transactions")];
const RIGHT = [byHref("/analytics")];
// Everything that doesn't fit on the bar lives in the More sheet.
const MORE_ITEMS = [byHref("/budget"), ...SECONDARY_NAV, SETTINGS_NAV];

function TabItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-1"
    >
      <Icon
        className={cn("h-5 w-5 transition-colors", active ? "text-primary" : "text-muted-foreground")}
        style={active ? undefined : { color: item.color }}
      />
      <span className={cn("h-1 w-1 rounded-full transition", active ? "bg-primary" : "bg-transparent")} />
    </Link>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const aiActive = isActive(pathname, AI.href);
  const moreActive = MORE_ITEMS.some((n) => isActive(pathname, n.href));

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
        <div className="relative w-full max-w-sm">
          {/* Floating AI button — hovers above the bar, separated by a background-colored ring */}
          <Link
            href={AI.href}
            aria-label={AI.label}
            className={cn(
              "absolute -top-6 left-1/2 z-10 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-end text-white shadow-lg shadow-primary/40 ring-4 ring-background transition active:scale-95",
              aiActive && "ring-primary/30",
            )}
          >
            <AI.icon className="h-6 w-6" />
          </Link>

          {/* The bar: 2 left, center gap (for the FAB), 2 right */}
          <div className="flex items-center rounded-full border border-border bg-card/90 px-2 py-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
            {LEFT.map((item) => (
              <TabItem key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}

            {/* Center spacer so flat items don't sit under the floating AI button */}
            <span aria-hidden className="w-14 shrink-0" />

            {RIGHT.map((item) => (
              <TabItem key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}

            {/* More — opens the sheet with the remaining menus */}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              aria-haspopup="dialog"
              className="flex flex-1 flex-col items-center justify-center gap-1 py-1"
            >
              <Ellipsis
                className={cn("h-5 w-5 transition-colors", moreActive ? "text-primary" : "text-muted-foreground")}
              />
              <span className={cn("h-1 w-1 rounded-full transition", moreActive ? "bg-primary" : "bg-transparent")} />
            </button>
          </div>
        </div>
      </nav>

      {/* More bottom sheet */}
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
              <div className="mt-3 grid grid-cols-2 gap-2">
                {MORE_ITEMS.map(({ href, label, icon: Icon, color }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 transition",
                        active ? "border-primary/40 bg-primary/10" : "border-border bg-card hover:bg-card-elevated",
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
                  className="col-span-2 mt-1 flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-negative/40 hover:bg-negative/10"
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
