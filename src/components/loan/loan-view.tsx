"use client";

import { useState } from "react";
import { Plus, Pencil, Wallet, CalendarClock, Landmark, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatTile } from "@/components/trackers/stat-tile";
import { AmountForm } from "@/components/trackers/amount-form";
import { LoanForm } from "./loan-form";
import { recordLoanPayment } from "@/lib/actions/loan";
import { formatCurrency } from "@/lib/utils";
import { currentMonth, addMonths, monthLabel } from "@/lib/month";
import { LOAN_COLOR } from "@/lib/nav";
import type { LoanDTO } from "@/services/loan";

const ACCENT = LOAN_COLOR; // pink — single source of truth in src/lib/nav.ts

export function LoanView({ data }: { data: LoanDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const { stats } = data;
  const isSetUp = data.totalLoan > 0;
  const completion =
    stats.monthsLeft != null ? monthLabel(addMonths(currentMonth(), stats.monthsLeft)) : null;
  const startLabel = data.startDate ? monthLabel(data.startDate.slice(0, 7)) : "—";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Loan</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> {isSetUp ? "Edit loan" : "Set up"}
        </Button>
      </div>

      {!isSetUp ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Landmark className="h-10 w-10" style={{ color: ACCENT }} />
          <div>
            <p className="font-semibold">Add your loan details</p>
            <p className="text-sm text-muted-foreground">Track repayment progress and completion.</p>
          </div>
          <Button onClick={() => setEditOpen(true)}>Add loan details</Button>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-6 py-8">
          <ProgressRing value={stats.pct} color={ACCENT}>
            <span className="text-3xl font-bold tabular-nums">{Math.round(stats.pct)}%</span>
            <span className="mt-1 text-xs text-muted-foreground tabular-nums">
              {formatCurrency(data.paidAmount)} / {formatCurrency(data.totalLoan)}
            </span>
          </ProgressRing>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            <StatTile icon={Wallet} label="Remaining" value={formatCurrency(stats.remaining)} />
            <StatTile icon={Landmark} label="EMI" value={formatCurrency(data.emiAmount)} />
            <StatTile
              icon={CalendarClock}
              label="Months left"
              value={
                stats.paidOff
                  ? "Paid off 🎉"
                  : stats.monthsLeft != null
                    ? `${stats.monthsLeft} mo`
                    : "Set an EMI"
              }
            />
          </div>

          <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card-elevated px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Started</span>
              <span className="font-medium">{startLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Done</span>
              <span className="font-medium">{stats.paidOff ? "Complete" : (completion ?? "—")}</span>
            </div>
          </div>

          <Button onClick={() => setPayOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Record payment
          </Button>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title={isSetUp ? "Edit loan" : "Add loan details"}>
          <LoanForm initial={data} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent title="Record EMI payment">
          <AmountForm
            submitLabel="Record payment"
            onSubmit={(amount) => recordLoanPayment({ amount })}
            onDone={() => setPayOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
