"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { BarChart } from "@/components/charts/bar-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { GaugeChart } from "@/components/ui/gauge-chart";
import { RingStat } from "@/components/ui/ring-stat";
import { SpendingDonut } from "./spending-donut";
import { SavingsRateTrend } from "./savings-rate-trend";
import { TopCategories } from "./top-categories";
import { IncomeExpenseChart } from "./income-expense-chart";
import { monthLabel } from "@/lib/month";
import { cn, formatCurrency } from "@/lib/utils";
import { useTabParam } from "@/lib/use-tab-param";
import { LOAN_COLOR } from "@/lib/nav";
import type { HealthBand } from "@/lib/health-score";
import type { AnalyticsDTO } from "@/services/analytics";
import type { getLoans } from "@/services/loan";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "spending", label: "Spending" },
  { key: "savings", label: "Savings" },
  { key: "loan", label: "Loan" },
] as const;
const TAB_KEYS = TABS.map((t) => t.key);

function momPct(cur: number, prev: number): number {
  return prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
}

/** Headline with a month-over-month delta chip. */
function Delta({ pct, invert = false }: { pct: number; invert?: boolean }) {
  if (pct === 0) return <span className="text-xs text-muted-foreground">no change vs last month</span>;
  const up = pct > 0;
  const good = invert ? !up : up; // for spending, up is "bad"
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", good ? "text-positive" : "text-negative")}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {Math.abs(pct)}% from last month
    </span>
  );
}

export function AnalyticsView({
  data,
  month,
  health,
  loan,
}: {
  data: AnalyticsDTO;
  month: string;
  health: { score: number; band: HealthBand };
  loan: Awaited<ReturnType<typeof getLoans>>;
}) {
  // Active analytics tab lives in the URL (?tab=) so it's deep-linkable.
  const [tab, setTab] = useTabParam("tab", TAB_KEYS, "overview");

  const monthly = data.monthly;
  const last = monthly.length ? monthly[monthly.length - 1] : null;
  const prev = monthly.length > 1 ? monthly[monthly.length - 2] : null;
  const expense = last?.expense ?? 0;
  const net = last?.net ?? 0;

  const spendBars = monthly.map((m) => ({ label: monthLabel(m.month).slice(0, 3), bars: [{ value: m.expense, color: "#16a34a" }] }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <MonthPicker month={month} basePath="/analytics" />
      </div>

      {/* Tabs */}
      <div className="-mx-1 overflow-x-auto scrollbar-hide sm:mx-0">
        <div className="inline-flex w-fit rounded-xl border border-border bg-card p-1 text-sm shadow-[var(--shadow-card)]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-1.5 font-medium transition",
                tab === t.key ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Monthly Spending</h2>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(expense)}</span>
            </div>
            <Delta pct={momPct(expense, prev?.expense ?? 0)} invert />
            <BarChart groups={spendBars} formatValue={formatCurrency} />
          </Card>

          <SpendingDonut breakdown={data.breakdown} />

          <Card className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Savings Trend</h2>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(net)}</span>
            </div>
            <Delta pct={momPct(net, prev?.net ?? 0)} />
            <Sparkline points={monthly.map((m) => m.net)} color="var(--primary)" height={64} />
          </Card>

          <Card className="flex flex-col items-center gap-2">
            <h2 className="self-start font-semibold">Financial Health Score</h2>
            <GaugeChart score={health.score} />
          </Card>
        </div>
      )}

      {tab === "spending" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SpendingDonut breakdown={data.breakdown} />
          <TopCategories top={data.top} changes={data.changes} />
        </div>
      )}

      {tab === "savings" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SavingsRateTrend savingsRate={data.savingsRate} />
          <IncomeExpenseChart monthly={data.monthly} />
        </div>
      )}

      {tab === "loan" && (
        <Card className="flex flex-col items-center gap-4 py-8">
          <h2 className="self-start font-semibold">Loan Repayment</h2>
          {loan.summary.count > 0 ? (
            <>
              <RingStat
                pct={loan.summary.overallPct}
                color={LOAN_COLOR}
                caption="of all loans repaid"
                sub={<>{formatCurrency(loan.summary.totalPaid)} of {formatCurrency(loan.summary.totalBorrowed)}</>}
              />
              <Link href="/loan">
                <Button variant="outline">View loan details</Button>
              </Link>
            </>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">No loans set up yet.</p>
          )}
        </Card>
      )}
    </div>
  );
}
