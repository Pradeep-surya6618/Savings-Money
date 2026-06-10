"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { monthLabel } from "@/lib/month";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto max-w-xl space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-primary to-primary-end p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-wide text-white/80">Monthly salary · {monthLabel(month)}</p>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={amount === 0 ? "" : amount}
          placeholder="0"
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1 w-full bg-transparent text-3xl font-bold tracking-tight text-white placeholder-white/40 outline-none"
        />
        <div className="mt-4">
          <RemainingMeter amount={amount} allocated={allocated} />
        </div>
      </section>

      <div className="rounded-2xl border border-border bg-card p-4">
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

      {error && <p className="text-center text-sm text-negative">{error}</p>}

      <div className="sticky bottom-24 lg:bottom-4">
        <Button onClick={handleSave} disabled={saving || over || amount <= 0} className="w-full">
          {over ? `Over by ${formatCurrency(allocated - amount)}` : saving ? "Saving…" : "Save allocations"}
        </Button>
      </div>
    </div>
  );
}
