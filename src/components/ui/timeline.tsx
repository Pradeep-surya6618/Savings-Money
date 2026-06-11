import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineStep = { label: string; caption: string; state: "done" | "next" | "todo" };

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="flex items-start justify-between">
      {steps.map((s, i) => (
        <div key={i} className="relative flex flex-1 flex-col items-center">
          {i < steps.length - 1 && (
            <span className={cn("absolute left-1/2 top-3 h-0.5 w-full", s.state === "done" ? "bg-primary" : "bg-border")} />
          )}
          <span
            className={cn(
              "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2",
              s.state === "done"
                ? "border-primary bg-primary text-white"
                : s.state === "next"
                  ? "border-primary bg-card text-primary"
                  : "border-border bg-card text-muted-foreground",
            )}
          >
            {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <span className="mt-2 text-xs font-medium tabular-nums">{s.label}</span>
          <span className="text-[10px] text-muted-foreground">{s.caption}</span>
        </div>
      ))}
    </div>
  );
}
