import Link from "next/link";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/month";

export function BudgetEmptyState({ month }: { month: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <Wallet className="h-10 w-10 text-muted-foreground" />
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
