"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { monthGrid } from "@/lib/calendar";
import { cn } from "@/lib/utils";

const WD = ["M", "T", "W", "T", "F", "S", "S"];

function fmt(iso: string): string {
  if (!iso) return "Pick a date";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** value/onChange use "YYYY-MM-DD" strings (matches form value shapes). */
export function DatePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [y, m] = (value || "2026-01-01").split("-").map(Number);
  const [view, setView] = useState({ year: y, month: m }); // month 1–12
  const cells = monthGrid(view.year, view.month);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(view.year, view.month - 1 + n, 1));
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "inline-flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary",
          className,
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className={value ? "" : "text-muted-foreground"}>{fmt(value)}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          className="z-50 w-72 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="rounded-lg p-1 hover:bg-card-elevated"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">
              {new Date(Date.UTC(view.year, view.month - 1, 1)).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label="Next month"
              className="rounded-lg p-1 hover:bg-card-elevated"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
            {WD.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {cells.map((c) => (
              <Popover.Close key={c.date} asChild>
                <button
                  type="button"
                  onClick={() => onChange(c.date)}
                  className={cn(
                    "h-8 rounded-lg text-sm tabular-nums transition",
                    c.inMonth ? "hover:bg-card-elevated" : "text-muted-foreground/40",
                    c.date === value && "bg-primary text-white hover:bg-primary",
                  )}
                >
                  {Number(c.date.slice(8))}
                </button>
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
