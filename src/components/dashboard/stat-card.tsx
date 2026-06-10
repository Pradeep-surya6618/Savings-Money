import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/dashboard/count-up";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "positive" | "investment" | "loan" | "neutral";
}) {
  const accentCls = {
    positive: "text-positive",
    investment: "text-primary-end",
    loan: "text-primary",
    neutral: "text-foreground",
  }[accent ?? "neutral"];
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <CountUp value={value} className={cn("mt-1 block text-lg font-semibold", accentCls)} />
    </Card>
  );
}
