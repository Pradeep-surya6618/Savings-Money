"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTheme } from "@/lib/actions/settings";

type ThemeValue = "light" | "dark" | "system";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next-themes has no theme during SSR; defer reading it until mounted so the
  // active button's class doesn't cause a hydration mismatch. One-time flag.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  const active = mounted ? theme : undefined;

  function changeTheme(value: ThemeValue, event: React.MouseEvent<HTMLButtonElement>) {
    void updateTheme(value);

    const doc = document as ViewTransitionDocument;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // No View Transitions support (or reduced motion): switch instantly.
    if (!doc.startViewTransition || reduce) {
      setTheme(value);
      return;
    }

    const root = document.documentElement;
    const resolvedDark =
      value === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : value === "dark";

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => {
      // Apply the class synchronously so the new snapshot reflects the new theme;
      // next-themes then keeps state + storage in sync (re-applying the same class).
      root.classList.toggle("dark", resolvedDark);
      setTheme(value);
    });

    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 480,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        /* transition skipped — theme already applied */
      });
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          aria-label={label}
          aria-pressed={active === value}
          onClick={(e) => changeTheme(value, e)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition",
            active === value
              ? "bg-gradient-to-br from-primary to-primary-end text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
