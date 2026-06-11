"use client";

import { useState } from "react";
import { Plus, Pencil, Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/section-card";
import { RingStat } from "@/components/ui/ring-stat";
import { DetailRow } from "@/components/ui/detail-row";
import { Sparkline } from "@/components/charts/sparkline";
import { AmountForm } from "@/components/trackers/amount-form";
import { LoanForm } from "./loan-form";
import { recordLoanPayment } from "@/lib/actions/loan";
import { formatCurrency } from "@/lib/utils";
import { currentMonth, addMonths, monthLabel } from "@/lib/month";
import { LOAN_COLOR } from "@/lib/nav";
import type { LoanDTO } from "@/services/loan";

const ACCENT = LOAN_COLOR;

export function LoanView({ data }: { data: LoanDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const { stats } = data;
  const isSetUp = data.totalLoan > 0;

  const completion = stats.monthsLeft != null ? monthLabel(addMonths(currentMonth(), stats.monthsLeft)) : null;
  const startLabel = data.startDate ? monthLabel(data.startDate.slice(0, 7)) : "—";
  const endLabel = stats.paidOff ? "Complete" : (completion ?? "—");

  // Projected cumulative repayment curve (EMI accrual to the total) — best-effort visual.
  const planMonths = data.emiAmount > 0 ? Math.min(60, Math.ceil(data.totalLoan / data.emiAmount)) : 0;
  const repaymentSeries =
    planMonths >= 2
      ? Array.from({ length: planMonths + 1 }, (_, i) => Math.min(data.totalLoan, data.emiAmount * i))
      : [data.paidAmount, data.paidAmount];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Loan</h1>
        {isSetUp && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Edit loan
            </Button>
            <Button onClick={() => setPayOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Record payment
            </Button>
          </div>
        )}
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
        <>
          <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
            <Card className="flex items-center justify-center py-8">
              <RingStat
                pct={stats.pct}
                color={ACCENT}
                caption="of loan repaid"
                sub={
                  <>
                    {formatCurrency(data.paidAmount)} of {formatCurrency(data.totalLoan)}
                  </>
                }
              />
            </Card>
            <SectionCard title="Loan Details">
              <DetailRow label="Total Loan" value={formatCurrency(data.totalLoan)} />
              <DetailRow label="Paid Amount" value={formatCurrency(data.paidAmount)} />
              <DetailRow label="Remaining Amount" value={formatCurrency(stats.remaining)} />
              <DetailRow label="EMI Amount" value={formatCurrency(data.emiAmount)} />
              <DetailRow label="Start Date" value={startLabel} />
              <DetailRow label="End Date (Est.)" value={endLabel} />
            </SectionCard>
          </div>

          <SectionCard title="Repayment Progress">
            <Sparkline points={repaymentSeries} color={ACCENT} height={72} />
          </SectionCard>
        </>
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
            successMessage="Payment recorded"
            onSubmit={(amount) => recordLoanPayment({ amount })}
            onDone={() => setPayOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
