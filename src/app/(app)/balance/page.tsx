import { BalanceView } from "@/components/balance/balance-view";
import { getBalance } from "@/services/balance";

export const dynamic = "force-dynamic";

export default async function BalancePage() {
  const data = await getBalance();
  return <BalanceView data={data} />;
}
