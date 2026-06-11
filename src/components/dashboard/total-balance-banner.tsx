import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function TotalBalanceBanner({ total }: { total: number }) {
  return (
    <Link
      href="/balance"
      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "#f59e0b1f", color: "#f59e0b" }}>
          <Wallet className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Total Balance · across all months</p>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(total)}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
