import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/dashboard/count-up";
import { cn } from "@/lib/utils";

type Accent = "positive" | "investment" | "loan" | "neutral";

const ACCENT: Record<Accent, { value: string; tile: string }> = {
  positive: { value: "text-positive", tile: "bg-positive/10 text-positive" },
  investment: { value: "text-primary-end", tile: "bg-primary-end/10 text-primary-end" },
  loan: { value: "text-primary", tile: "bg-primary/10 text-primary" },
  neutral: { value: "text-foreground", tile: "bg-card-elevated text-muted-foreground" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "neutral",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: Accent;
}) {
  const a = ACCENT[accent];
  return (
    <Card className="p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", a.tile)}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <CountUp value={value} className={cn("mt-0.5 block text-lg font-semibold", a.value)} />
    </Card>
  );
}
