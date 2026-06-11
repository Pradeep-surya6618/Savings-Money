import { LoanView } from "@/components/loan/loan-view";
import { getLoan } from "@/services/loan";

export const dynamic = "force-dynamic";

export default async function LoanPage() {
  const data = await getLoan();
  return <LoanView data={data} />;
}
