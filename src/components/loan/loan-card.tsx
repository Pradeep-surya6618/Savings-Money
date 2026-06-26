"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RingStat } from "@/components/ui/ring-stat";
import { formatCurrency } from "@/lib/utils";
import { currentMonth, addMonths, monthLabel } from "@/lib/month";
import { LOAN_TYPE_MAP } from "@/lib/loan-types";
import { LOAN_COLOR } from "@/lib/nav";
import type { LoanItemDTO } from "@/services/loan";

export function LoanCard({
  loan,
  onEdit,
  onPay,
  onDelete,
}: {
  loan: LoanItemDTO;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}) {
  const Icon = LOAN_TYPE_MAP[loan.type].icon;
  const { stats } = loan;
  const completion =
    stats.paidOff
      ? "Complete"
      : stats.monthsLeft != null
        ? monthLabel(addMonths(currentMonth(), stats.monthsLeft))
        : "—";

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${LOAN_COLOR}1f`, color: LOAN_COLOR }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{loan.displayName}</p>
            <p className="text-xs text-muted-foreground">{loan.typeLabel}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit loan"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete loan"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-negative/10 hover:text-negative"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <RingStat
          pct={stats.pct}
          color={LOAN_COLOR}
          size={84}
          caption={`${Math.round(stats.pct)}% paid`}
        />
        <dl className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="tabular-nums">
              {formatCurrency(loan.paidAmount)} / {formatCurrency(loan.totalLoan)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="tabular-nums">{formatCurrency(stats.remaining)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">EMI</dt>
            <dd className="tabular-nums">{formatCurrency(loan.emiAmount)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Est. done</dt>
            <dd>{completion}</dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={onPay}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-medium transition hover:bg-card-elevated"
      >
        <Plus className="h-4 w-4" /> Record payment
      </button>
    </Card>
  );
}
