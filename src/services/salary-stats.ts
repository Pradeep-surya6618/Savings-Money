import { CATEGORY_MAP, type CategoryKey } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";

export type AllocationInput = { category: string; amount: number };

export type MonthStats = {
  expenses: number;
  savings: number;
  investments: number;
  loan: number;
  allocated: number;
  remaining: number;
};

export function computeStats(amount: number, allocations: AllocationInput[]): MonthStats {
  const stats: MonthStats = {
    expenses: 0,
    savings: 0,
    investments: 0,
    loan: 0,
    allocated: 0,
    remaining: 0,
  };
  for (const a of allocations) {
    const cat = CATEGORY_MAP[a.category as CategoryKey];
    if (!cat) continue;
    stats.allocated += a.amount;
    if (cat.group === "expense") stats.expenses += a.amount;
    else if (cat.group === "savings") stats.savings += a.amount;
    else if (cat.group === "investment") stats.investments += a.amount;
    else if (cat.group === "loan") stats.loan += a.amount;
  }
  stats.remaining = amount - stats.allocated;
  return stats;
}

export type InsightTone = "positive" | "neutral" | "warning";
export type Insight = { id: string; tone: InsightTone; text: string };

type MonthData = { amount: number; stats: MonthStats };

function savingsRate(d: MonthData): number {
  if (d.amount <= 0) return 0;
  return (d.stats.savings + d.stats.investments) / d.amount;
}

export function generateInsights(current: MonthData, previous?: MonthData | null): Insight[] {
  const insights: Insight[] = [];
  const { amount, stats } = current;

  if (stats.remaining > 0) {
    insights.push({
      id: "unallocated",
      tone: "neutral",
      text: `${formatCurrency(stats.remaining)} still unallocated.`,
    });
  } else if (stats.remaining === 0 && amount > 0) {
    insights.push({
      id: "fully-allocated",
      tone: "positive",
      text: "You've allocated 100% of your salary.",
    });
  }

  if (amount > 0) {
    const rate = Math.round(savingsRate(current) * 100);
    insights.push({
      id: "savings-rate",
      tone: rate >= 20 ? "positive" : "neutral",
      text: `You're putting ${rate}% toward savings & investments.`,
    });
  }

  if (previous && previous.amount > 0 && amount > 0) {
    const diff = Math.round((savingsRate(current) - savingsRate(previous)) * 100);
    if (diff !== 0) {
      insights.push({
        id: "vs-last-month",
        tone: diff > 0 ? "positive" : "warning",
        text: `You saved ${Math.abs(diff)}% ${diff > 0 ? "more" : "less"} than last month.`,
      });
    }
  }

  return insights.slice(0, 4);
}
