"use client";

import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { monthLabel } from "@/lib/month";
import type { RatePoint } from "@/lib/analytics-math";

export function SavingsRateTrend({ savingsRate }: { savingsRate: RatePoint[] }) {
  const current = savingsRate.length ? savingsRate[savingsRate.length - 1].rate : 0;
  const points = savingsRate.map((p) => p.rate);
  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Savings rate</h2>
        <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>
          {current}%
        </span>
      </div>
      <Sparkline points={points} color="var(--primary)" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{savingsRate.length ? monthLabel(savingsRate[0].month).slice(0, 3) : ""}</span>
        <span>{savingsRate.length ? monthLabel(savingsRate[savingsRate.length - 1].month).slice(0, 3) : ""}</span>
      </div>
    </Card>
  );
}
