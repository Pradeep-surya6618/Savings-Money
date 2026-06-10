"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { monthLabel } from "@/lib/month";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/ui/hero-section";
import { RemainingMeter } from "@/components/salary/remaining-meter";
import { AllocationRow } from "@/components/salary/allocation-row";
import { saveSalaryAllocations } from "@/lib/actions/salary";
import { formatCurrency } from "@/lib/utils";

type Amounts = Record<CategoryKey, number>;

function buildAmounts(initial: { category: string; amount: number }[]): Amounts {
  const map = Object.fromEntries(CATEGORIES.map((c) => [c.key, 0])) as Amounts;
  for (const a of initial) {
    if (a.category in map) map[a.category as CategoryKey] = a.amount;
  }
  return map;
}

export function AllocationEditor({
  month,
  initialAmount,
  initialAllocations,
}: {
  month: string;
  initialAmount: number;
  initialAllocations: { category: string; amount: number }[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(initialAmount);
  const [amounts, setAmounts] = useState<Amounts>(() => buildAmounts(initialAllocations));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allocated = Object.values(amounts).reduce((s, v) => s + v, 0);
  const over = allocated > amount;
  const disabled = saving || over || amount <= 0;
  const saveLabel = over
    ? `Over by ${formatCurrency(allocated - amount)}`
    : saving
      ? "Saving…"
      : "Save allocations";

  async function handleSave() {
    setSaving(true);
    setError(null);
    const allocations = CATEGORIES.map((c) => ({ category: c.key, amount: amounts[c.key] })).filter(
      (a) => a.amount > 0,
    );
    const res = await saveSalaryAllocations({ month, amount, allocations });
    if (res.ok) {
      router.push(`/?month=${month}`);
    } else {
      setError(res.error);
      setSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* Summary panel */}
      <aside className="space-y-4 lg:sticky lg:top-8">
        <HeroSection>
          <p className="text-xs font-medium uppercase tracking-widest text-white/70">Monthly salary</p>
          <p className="text-xs text-white/60">{monthLabel(month)}</p>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-white/80">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={amount === 0 ? "" : amount}
              placeholder="0"
              onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              aria-label="Monthly salary amount"
              className="w-full bg-transparent text-4xl font-bold tracking-tight tabular-nums text-white placeholder-white/30 outline-none"
            />
          </div>
          <div className="mt-5">
            <RemainingMeter amount={amount} allocated={allocated} />
          </div>
        </HeroSection>

        {error && (
          <p className="rounded-xl border border-negative/30 bg-negative/10 px-3 py-2 text-center text-sm text-negative">
            {error}
          </p>
        )}

        <Button onClick={handleSave} disabled={disabled} className="hidden h-12 w-full text-base lg:flex">
          {saveLabel}
        </Button>
      </aside>

      {/* Category allocations */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Allocate across categories</h2>
          <span className="text-xs tabular-nums text-muted-foreground">{CATEGORIES.length} categories</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <AllocationRow
              key={c.key}
              category={c.key}
              amount={amounts[c.key]}
              percent={amount > 0 ? Math.round((amounts[c.key] / amount) * 100) : 0}
              onChange={(v) => setAmounts((prev) => ({ ...prev, [c.key]: v }))}
            />
          ))}
        </div>
      </div>

      {/* Mobile sticky save bar */}
      <div className="sticky bottom-24 z-20 -mx-4 px-4 lg:hidden">
        <Button onClick={handleSave} disabled={disabled} className="h-12 w-full text-base shadow-lg">
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
