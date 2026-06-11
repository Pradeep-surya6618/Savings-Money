"use client";

import { useState } from "react";
import { Plus, Pencil, Target, CalendarClock, PiggyBank } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatTile } from "@/components/trackers/stat-tile";
import { AmountForm } from "@/components/trackers/amount-form";
import { SavingsForm } from "./savings-form";
import { addToSavings } from "@/lib/actions/savings";
import { formatCurrency } from "@/lib/utils";
import { SAVINGS_COLOR } from "@/lib/nav";
import type { SavingsDTO } from "@/services/savings";

const ACCENT = SAVINGS_COLOR; // teal — single source of truth in src/lib/nav.ts

export function SavingsView({ data }: { data: SavingsDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { stats } = data;
  const isSetUp = data.targetAmount > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Savings</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> {isSetUp ? "Edit goal" : "Set up"}
        </Button>
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
        <Card className="flex flex-col items-center gap-6 py-8">
          <ProgressRing value={stats.pct} color={ACCENT}>
            <span className="text-3xl font-bold tabular-nums">{Math.round(stats.pct)}%</span>
            <span className="mt-1 text-xs text-muted-foreground tabular-nums">
              {formatCurrency(data.currentAmount)} / {formatCurrency(data.targetAmount)}
            </span>
          </ProgressRing>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            <StatTile icon={Target} label="Remaining" value={formatCurrency(stats.remaining)} />
            <StatTile icon={PiggyBank} label="Monthly" value={formatCurrency(data.monthlyContribution)} />
            <StatTile
              icon={CalendarClock}
              label="To goal"
              value={
                stats.reached
                  ? "Reached 🎉"
                  : stats.monthsToGoal != null
                    ? `≈ ${stats.monthsToGoal} mo`
                    : "Set a monthly amount"
              }
            />
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {stats.milestones.map((m) => (
              <span
                key={m.value}
                className="rounded-full px-3 py-1 text-xs font-medium tabular-nums"
                style={
                  m.reached
                    ? // Deepen the accent so white text clears WCAG AA at this small size.
                      { backgroundColor: `color-mix(in oklab, ${ACCENT}, black 38%)`, color: "#fff" }
                    : { backgroundColor: "var(--card-elevated)", color: "var(--muted-foreground)" }
                }
              >
                {m.value}%
              </span>
            ))}
          </div>

          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add to savings
          </Button>
        </Card>
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
            onSubmit={(amount) => addToSavings({ amount })}
            onDone={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
