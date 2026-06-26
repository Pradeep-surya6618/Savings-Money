"use client";

import { useState } from "react";
import { Plus, Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RingStat } from "@/components/ui/ring-stat";
import { AmountForm } from "@/components/trackers/amount-form";
import { LoanForm } from "./loan-form";
import { LoanCard } from "./loan-card";
import { recordLoanPayment, deleteLoan } from "@/lib/actions/loan";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { LOAN_COLOR } from "@/lib/nav";
import type { getLoans, LoanItemDTO } from "@/services/loan";

type LoansData = Awaited<ReturnType<typeof getLoans>>;

export function LoanView({ data }: { data: LoansData }) {
  const { loans, summary } = data;
  const [addOpen, setAddOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<LoanItemDTO | null>(null);
  const [payLoan, setPayLoan] = useState<LoanItemDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LoanItemDTO | null>(null);

  async function confirmDelete() {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    const res = await deleteLoan(target.id);
    if (res.ok) toast.success("Loan deleted");
    else toast.error(res.error);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
        {summary.count > 0 && (
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add loan
          </Button>
        )}
      </div>

      {summary.count === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Landmark className="h-10 w-10" style={{ color: LOAN_COLOR }} />
          <div>
            <p className="font-semibold">Add your loan details</p>
            <p className="text-sm text-muted-foreground">Track repayment progress and completion across all your loans.</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>Add loan details</Button>
        </Card>
      ) : (
        <>
          <Card className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <RingStat
                pct={summary.overallPct}
                color={LOAN_COLOR}
                caption="overall repaid"
                sub={<>{formatCurrency(summary.totalPaid)} of {formatCurrency(summary.totalBorrowed)}</>}
              />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Outstanding</dt><dd className="text-lg font-bold tabular-nums">{formatCurrency(summary.totalRemaining)}</dd></div>
              <div><dt className="text-muted-foreground">Monthly EMI</dt><dd className="text-lg font-bold tabular-nums">{formatCurrency(summary.totalMonthlyEmi)}</dd></div>
              <div><dt className="text-muted-foreground">Loans</dt><dd className="text-lg font-bold tabular-nums">{summary.count}</dd></div>
              <div><dt className="text-muted-foreground">Borrowed</dt><dd className="text-lg font-bold tabular-nums">{formatCurrency(summary.totalBorrowed)}</dd></div>
            </dl>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                onEdit={() => setEditLoan(loan)}
                onPay={() => setPayLoan(loan)}
                onDelete={() => setDeleteTarget(loan)}
              />
            ))}
          </div>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent title="Add loan">
          <LoanForm onDone={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editLoan !== null} onOpenChange={(o) => { if (!o) setEditLoan(null); }}>
        <DialogContent title="Edit loan">
          {editLoan && <LoanForm initial={editLoan} onDone={() => setEditLoan(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={payLoan !== null} onOpenChange={(o) => { if (!o) setPayLoan(null); }}>
        <DialogContent title={payLoan ? `Record payment — ${payLoan.displayName}` : "Record payment"}>
          {payLoan && (
            <AmountForm
              submitLabel="Record payment"
              successMessage="Payment recorded"
              onSubmit={(amount) => recordLoanPayment(payLoan.id, amount)}
              onDone={() => setPayLoan(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent title="Delete loan?">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This permanently removes this loan and its progress. This can&rsquo;t be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button onClick={() => void confirmDelete()} className="from-negative to-negative">Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
