import { AllocationEditor } from "@/components/salary/allocation-editor";
import { getSalaryForEditor } from "@/services/salary";
import { currentMonth, isValidMonth } from "@/lib/month";

export default async function SalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();

  const existing = await getSalaryForEditor(month);

  return (
    <AllocationEditor
      month={month}
      initialAmount={existing?.amount ?? 0}
      initialAllocations={existing?.allocations ?? []}
    />
  );
}
