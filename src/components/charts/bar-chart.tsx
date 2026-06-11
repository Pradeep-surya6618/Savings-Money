"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type BarGroup = { label: string; bars: { value: number; color: string }[] };

export function BarChart({
  groups,
  formatValue,
  className,
}: {
  groups: BarGroup[];
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...groups.flatMap((g) => g.bars.map((b) => b.value)));
  return (
    <div className={cn("flex items-end justify-between gap-2", className)} style={{ height: 160 }} aria-hidden="true">
      {groups.map((g) => (
        <div key={g.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div className="flex h-full w-full items-end justify-center gap-1">
            {g.bars.map((b) => (
              <motion.div
                key={b.color}
                className="w-2.5 rounded-t-md sm:w-3.5"
                style={{ backgroundColor: b.color }}
                initial={reduce ? false : { height: 0 }}
                animate={{ height: `${(b.value / max) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                title={formatValue ? formatValue(b.value) : String(b.value)}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">{g.label}</span>
        </div>
      ))}
    </div>
  );
}
