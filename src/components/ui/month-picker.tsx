"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { currentMonth, monthLabel } from "@/lib/month";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `June 2026` control: popover with year stepper + 12-month grid; navigates `?month=`. */
export function MonthPicker({ month, basePath }: { month: string; basePath: string }) {
  const router = useRouter();
  const [yr, setYr] = useState(Number(month.slice(0, 4)));
  const cur = currentMonth();
  const maxYear = Number(cur.slice(0, 4));

  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium outline-none transition hover:bg-card-elevated">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {monthLabel(month)}
        <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="end"
          className="z-50 w-64 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setYr((y) => y - 1)}
              aria-label="Previous year"
              className="rounded-lg p-1 hover:bg-card-elevated"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold tabular-nums">{yr}</span>
            <button
              type="button"
              onClick={() => setYr((y) => Math.min(y + 1, maxYear))}
              aria-label="Next year"
              className="rounded-lg p-1 hover:bg-card-elevated disabled:opacity-30"
              disabled={yr >= maxYear}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((label, i) => {
              const m = `${yr}-${String(i + 1).padStart(2, "0")}`;
              const disabled = m > cur;
              const active = m === month;
              return (
                <Popover.Close key={m} asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => router.push(`${basePath}?month=${m}`)}
                    className={cn(
                      "rounded-lg py-2 text-sm transition disabled:opacity-30",
                      active ? "bg-primary text-white" : "hover:bg-card-elevated",
                    )}
                  >
                    {label}
                  </button>
                </Popover.Close>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
