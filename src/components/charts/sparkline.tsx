"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Sparkline({
  points,
  color = "currentColor",
  height = 56,
  className,
}: {
  points: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const width = 240;
  const min = Math.min(0, ...points);
  const max = Math.max(1, ...points);
  const range = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * step : width / 2; // center a lone point
    const y = height - ((p - min) / range) * height;
    return [x, y] as const;
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-auto w-full", className)} aria-hidden="true">
      {coords.length > 1 && (
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}
      {coords.length > 0 && (
        <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={3.5} fill={color} />
      )}
    </svg>
  );
}
