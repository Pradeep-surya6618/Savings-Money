"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTheme } from "@/lib/actions/settings";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  const active = mounted ? theme : undefined;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          aria-label={label}
          aria-pressed={active === value}
          onClick={() => {
            setTheme(value);
            void updateTheme(value);
          }}
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
