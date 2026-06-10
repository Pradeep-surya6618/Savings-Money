import { TransactionsView } from "@/components/transactions/transactions-view";
import { listTransactions } from "@/services/transactions";

export default async function TransactionsPage() {
  const transactions = await listTransactions();
  return <TransactionsView transactions={transactions} />;
}
