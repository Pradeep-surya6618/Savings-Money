import type { ReactNode } from "react";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

export function RingStat({
  pct,
  color,
  caption,
  sub,
  size = 200,
  className,
}: {
  pct: number;
  color?: string;
  caption: string;
  sub?: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <ProgressRing value={pct} color={color} size={size} strokeWidth={14}>
        <span className="text-4xl font-bold tabular-nums">{Math.round(pct)}%</span>
        <span className="mt-1 max-w-[10rem] text-center text-xs text-muted-foreground">{caption}</span>
      </ProgressRing>
      {sub && <div className="text-sm tabular-nums text-muted-foreground">{sub}</div>}
    </div>
  );
}
