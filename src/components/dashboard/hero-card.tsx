import Link from "next/link";
import { Pencil, Banknote } from "lucide-react";
import { CountUp } from "@/components/dashboard/count-up";
import { Card } from "@/components/ui/card";
import { monthLabel } from "@/lib/month";

export function HeroCard({
  month,
  amount,
  receivedDate,
}: {
  month: string;
  amount: number;
  receivedDate: string | null;
}) {
  const received = receivedDate
    ? new Date(receivedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;
  return (
    <Card className="relative min-h-[10.5rem] overflow-hidden lg:min-h-[15rem]">
      <Banknote
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-24 w-24 -translate-y-1/2 text-muted-foreground/10 lg:right-6 lg:h-36 lg:w-36"
      />
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Total Salary ({monthLabel(month)})
          </p>
          <Link
            href={`/salary?month=${month}`}
            aria-label="Edit salary"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </div>
        <div>
          <CountUp value={amount} className="block text-4xl font-bold tracking-tight sm:text-5xl" />
          <p className="mt-2 text-sm text-muted-foreground">{received ? `Received on ${received}` : "Not received yet"}</p>
        </div>
      </div>
    </Card>
  );
}
