"use client";

import { useState } from "react";
import { Plus, Pencil, PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/section-card";
import { RingStat } from "@/components/ui/ring-stat";
import { DetailRow } from "@/components/ui/detail-row";
import { Timeline, type TimelineStep } from "@/components/ui/timeline";
import { AmountForm } from "@/components/trackers/amount-form";
import { SavingsForm } from "./savings-form";
import { addToSavings } from "@/lib/actions/savings";
import { formatCurrency } from "@/lib/utils";
import { currentMonth, addMonths, monthLabel } from "@/lib/month";
import { SAVINGS_COLOR } from "@/lib/nav";
import type { SavingsDTO } from "@/services/savings";

const ACCENT = SAVINGS_COLOR;

export function SavingsView({ data }: { data: SavingsDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { stats } = data;
  const isSetUp = data.targetAmount > 0;

  const targetDate =
    stats.monthsToGoal != null ? monthLabel(addMonths(currentMonth(), stats.monthsToGoal)) : "—";
  const monthsToGo = stats.reached
    ? "Reached 🎉"
    : stats.monthsToGoal != null
      ? `${stats.monthsToGoal} months`
      : "—";

  const firstUnreached = stats.milestones.findIndex((m) => !m.reached);
  const steps: TimelineStep[] = stats.milestones.map((m, i) => ({
    label: formatCurrency((data.targetAmount * m.value) / 100),
    caption: m.reached ? "Achieved" : i === firstUnreached ? "Next" : m.value === 100 ? "Target" : "Upcoming",
    state: m.reached ? "done" : i === firstUnreached ? "next" : "todo",
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Savings</h1>
        {isSetUp && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Edit goal
            </Button>
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add to savings
            </Button>
          </div>
        )}
      </div>

      {!isSetUp ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <PiggyBank className="h-10 w-10" style={{ color: ACCENT }} />
          <div>
            <p className="font-semibold">Set a savings goal</p>
            <p className="text-sm text-muted-foreground">Track your progress toward a target.</p>
          </div>
          <Button onClick={() => setEditOpen(true)}>Set up savings goal</Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
            <Card className="flex items-center justify-center py-8">
              <RingStat
                pct={stats.pct}
                color={ACCENT}
                caption="of goal achieved"
                sub={
                  <>
                    {formatCurrency(data.currentAmount)} of {formatCurrency(data.targetAmount)}
                  </>
                }
              />
            </Card>
            <SectionCard title="Goal Details">
              <DetailRow label="Goal Amount" value={formatCurrency(data.targetAmount)} />
              <DetailRow label="Current Amount" value={formatCurrency(data.currentAmount)} />
              <DetailRow label="Monthly Contribution" value={formatCurrency(data.monthlyContribution)} />
              <DetailRow label="Target Date" value={targetDate} />
              <DetailRow label="Months to Go" value={monthsToGo} />
            </SectionCard>
          </div>

          <SectionCard title="Milestones">
            <Timeline steps={steps} />
          </SectionCard>
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title={isSetUp ? "Edit savings goal" : "Set up savings goal"}>
          <SavingsForm initial={data} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add to savings">
          <AmountForm
            submitLabel="Add to savings"
            successMessage="Added to savings"
            onSubmit={(amount) => addToSavings({ amount })}
            onDone={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
