import { SavingsView } from "@/components/savings/savings-view";
import { getSavings } from "@/services/savings";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const data = await getSavings();
  return <SavingsView data={data} />;
}
