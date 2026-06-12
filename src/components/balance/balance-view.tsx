"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/ui/hero-section";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { OpeningBalanceForm } from "./opening-balance-form";
import { CountUp } from "@/components/dashboard/count-up";
import { monthLabel } from "@/lib/month";
import { cn, formatCurrency } from "@/lib/utils";
import type { BalanceDTO } from "@/services/balance";
import type { LedgerRow } from "@/lib/balance-math";

export function BalanceView({ data }: { data: BalanceDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const rows = [...data.ledger].reverse(); // newest first

  const columns: Column<LedgerRow>[] = [
    { key: "month", header: "Month", render: (r) => monthLabel(r.month) },
    { key: "opening", header: "Opening", align: "right", render: (r) => formatCurrency(r.opening) },
    {
      key: "income",
      header: "Income",
      align: "right",
      render: (r) => <span className="text-positive">+{formatCurrency(r.income)}</span>,
    },
    {
      key: "expense",
      header: "Expenses",
      align: "right",
      render: (r) => <span className="text-muted-foreground">−{formatCurrency(r.expense)}</span>,
    },
    {
      key: "closing",
      header: "Closing",
      align: "right",
      render: (r) => (
        <span className={cn("font-semibold", r.closing < 0 ? "text-negative" : "")}>{formatCurrency(r.closing)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Balance</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> Edit opening balance
        </Button>
      </div>

      <HeroSection blooms={false}>
        <p className="text-xs font-medium uppercase tracking-widest text-white/70">Total Balance</p>
        <CountUp value={data.total} className="mt-2 block text-4xl font-bold tracking-tight sm:text-5xl" />
        <p className="mt-2 text-sm text-white/80">Across all months · opening {formatCurrency(data.openingBalance)}</p>
      </HeroSection>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Monthly ledger</h2>
        {/* Desktop: table */}
        <div className="hidden lg:block">
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.month} empty="No activity yet." />
        </div>
        {/* Mobile: card list */}
        <div className="space-y-2 lg:hidden">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
              No activity yet.
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.month} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{monthLabel(r.month)}</p>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Closing</p>
                    <p className={cn("font-semibold tabular-nums", r.closing < 0 && "text-negative")}>
                      {formatCurrency(r.closing)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Opening</p>
                    <p className="text-sm tabular-nums">{formatCurrency(r.opening)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Income</p>
                    <p className="text-sm tabular-nums text-positive">+{formatCurrency(r.income)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expenses</p>
                    <p className="text-sm tabular-nums text-muted-foreground">−{formatCurrency(r.expense)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit opening balance">
          <OpeningBalanceForm initial={data.openingBalance} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
