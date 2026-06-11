import { BudgetView } from "@/components/budget/budget-view";
import { BudgetEmptyState } from "@/components/budget/budget-empty-state";
import { getBudget } from "@/services/budget";
import { currentMonth, isValidMonth } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();
  const data = await getBudget(month);
  if (!data) return <BudgetEmptyState month={month} />;
  return <BudgetView data={data} month={month} />;
}
