import Link from "next/link";
import { Info, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";
import type { Insight } from "@/services/salary-stats";

const TONE: Record<Insight["tone"], { wrap: string; icon: LucideIcon }> = {
  positive: { wrap: "border-positive/30 bg-positive/10 text-positive", icon: Sparkles },
  neutral: { wrap: "border-border bg-card-elevated text-muted-foreground", icon: Info },
  warning: { wrap: "border-warning/30 bg-warning/10 text-warning", icon: TriangleAlert },
};

export function SmartInsights({ insights }: { insights: Insight[] }) {
  return (
    <SectionCard title="Smart Insights">
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">No insights yet.</p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {insights.map((i) => {
              const tone = TONE[i.tone];
              const Icon = tone.icon;
              return (
                <li
                  key={i.id}
                  className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm", tone.wrap)}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{i.text}</span>
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
