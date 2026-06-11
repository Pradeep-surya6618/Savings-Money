import Link from "next/link";
import { Info, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";
import type { Insight } from "@/services/salary-stats";

const TONE: Record<Insight["tone"], { chip: string; icon: LucideIcon }> = {
  positive: { chip: "bg-positive/10 text-positive", icon: Sparkles },
  neutral: { chip: "bg-card-elevated text-muted-foreground", icon: Info },
  warning: { chip: "bg-warning/10 text-warning", icon: TriangleAlert },
};

export function SmartInsights({ insights }: { insights: Insight[] }) {
  return (
    <SectionCard title="Smart Insights">
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">No insights yet.</p>
      ) : (
        <>
          <ul className="space-y-1">
            {insights.map((i) => {
              const tone = TONE[i.tone];
              const Icon = tone.icon;
              return (
                <li
                  key={i.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-card-elevated/50"
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm">{i.text}</span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/analytics"
            className="mt-4 flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
          >
            View all insights
          </Link>
        </>
      )}
    </SectionCard>
  );
}
