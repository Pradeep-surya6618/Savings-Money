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
          {/* Floating AI button — cradled in the bar's concave notch, hovering above it.
              Animations auto-disable under prefers-reduced-motion via the MotionConfig wrapper. */}
          <Link href={AI.href} aria-label={AI.label} className="absolute -top-6 left-1/2 z-10 -translate-x-1/2">
            {/* breathing glow halo */}
            <motion.span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-primary/50 blur-md"
              animate={{ opacity: [0.3, 0.65, 0.3], scale: [1, 1.28, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* button face — gentle pulse + press feedback */}
            <motion.span
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-end text-white shadow-lg shadow-primary/40",
                aiActive && "ring-2 ring-white/50",
              )}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              whileTap={{ scale: 0.9 }}
            >
              {/* occasional friendly wiggle of the bot icon */}
              <motion.span
                animate={{ rotate: [0, -10, 10, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
              >
                <AI.icon className="h-6 w-6" />
              </motion.span>
            </motion.span>
          </Link>

          {/* The bar — a rounded rectangle with a concave notch (SVG so the border curves around the FAB) */}
          <div className="relative h-16">
            <svg
              viewBox="0 0 360 64"
              preserveAspectRatio="none"
              aria-hidden
              className="absolute inset-0 h-full w-full drop-shadow-[0_-3px_12px_rgba(0,0,0,0.12)]"
            >
              <path
                d="M0 26 Q0 0 26 0 L134 0 C140 0 143 4 146 9 A36 36 0 0 0 214 9 C217 4 220 0 226 0 L334 0 Q360 0 360 26 L360 38 Q360 64 334 64 L26 64 Q0 64 0 38 Z"
                style={{ fill: "var(--card)", stroke: "var(--border)", strokeWidth: 1 }}
              />
            </svg>

            {/* Items over the bar: 2 left, center gap (notch/FAB), 2 right */}
            <div className="relative flex h-full items-center px-2">
              {LEFT.map((item) => (
                <TabItem key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}

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
        </div>
      </nav>

      {/* More bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Plain dim overlay — no backdrop-blur (animating backdrop-filter is very janky on mobile). */}
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "linear" }}
              onClick={() => setMoreOpen(false)}
            />
            {/* Panel slides on transform only (compositor-friendly) with a short tween instead of a spring. */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="More menu"
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl will-change-transform"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
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
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-negative/40 hover:bg-negative/10"
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
