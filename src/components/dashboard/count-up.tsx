"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";

export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce) return; // reduced motion: render the final value directly (see `shown`)
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduce]);

  const shown = reduce ? value : display;
  return <span className={cn("tabular-nums", className)}>{formatCurrency(Math.round(shown))}</span>;
}
