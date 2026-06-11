import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/month";

export function DashboardEmptyState({ month }: { month: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-primary/25">
        <Wallet className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Set up {monthLabel(month)}</h1>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Add your salary and allocate it across categories to see your dashboard come alive.
        </p>
      </div>
      <Link href={`/salary?month=${month}`}>
        <Button className="h-11 gap-2 px-5">
          Get started <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
