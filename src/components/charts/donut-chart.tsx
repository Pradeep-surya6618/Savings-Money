"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DonutSegment = { label: string; value: number; color: string };

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 18,
  children,
  className,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const arcs = segments.reduce<{ label: string; value: number; color: string; dash: number; start: number }[]>(
    (acc, seg) => {
      const dash = total > 0 ? (seg.value / total) * circumference : 0;
      const start = acc.reduce((s, a) => s + a.dash, 0);
      return [...acc, { ...seg, dash, start }];
    },
    [],
  );

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-border" />
        {arcs.map((a) => (
          <motion.circle
            key={a.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={a.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${a.dash} ${circumference - a.dash}`}
            strokeDashoffset={-a.start}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
      )}
    </div>
  );
}
