import { TransactionsView } from "@/components/transactions/transactions-view";
import { listTransactions } from "@/services/transactions";

// Read live data per request (and keep the build from prerendering against the DB).
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await listTransactions();
  return <TransactionsView transactions={transactions} />;
}
