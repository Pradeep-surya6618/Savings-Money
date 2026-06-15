"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { updateTheme } from "@/lib/actions/settings";

type ThemeValue = "light" | "dark";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // next-themes has no theme during SSR; defer reading it until mounted to avoid a
  // hydration mismatch. One-time flag.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";
  const next: ThemeValue = isDark ? "light" : "dark";
  const Icon = isDark ? Moon : Sun;

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
    const resolvedDark = value === "dark";

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
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={(e) => changeTheme(next, e)}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card transition hover:bg-card-elevated"
    >
      <Icon className={isDark ? "h-4 w-4 text-[#818cf8]" : "h-4 w-4 text-[#f59e0b]"} />
    </button>
  );
}
