import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/month";

export function BudgetEmptyState({ month }: { month: string }) {
  return (
    <Card className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-primary/25">
        <Wallet className="h-7 w-7" />
      </div>
      <div>
        <p className="font-semibold">No salary set for {monthLabel(month)}</p>
        <p className="text-sm text-muted-foreground">Set your salary and allocation to see the budget.</p>
      </div>
      <Link href={`/salary?month=${month}`}>
        <Button>Set up salary →</Button>
      </Link>
    </Card>
  );
}
