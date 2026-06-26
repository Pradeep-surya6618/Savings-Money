import { getLoans } from "@/services/loan";
import { LoanView } from "@/components/loan/loan-view";

export const dynamic = "force-dynamic";

export default async function LoanPage() {
  const data = await getLoans();
  return <LoanView data={data} />;
}
