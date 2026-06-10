import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Insight } from "@/services/salary-stats";

const TONE: Record<Insight["tone"], string> = {
  positive: "border-positive/30 bg-positive/10 text-positive",
  neutral: "border-border bg-card-elevated text-muted-foreground",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export function SmartInsights({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold">Smart insights</h3>
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">No insights yet.</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((i) => (
            <li key={i.id} className={cn("rounded-xl border px-3 py-2 text-xs", TONE[i.tone])}>
              {i.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
