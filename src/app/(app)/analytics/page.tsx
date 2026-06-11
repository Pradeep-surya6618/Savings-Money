import { AnalyticsView } from "@/components/analytics/analytics-view";
import { getAnalytics } from "@/services/analytics";
import { currentMonth, isValidMonth } from "@/lib/month";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && isValidMonth(raw) ? raw : currentMonth();
  const data = await getAnalytics(month);
  return <AnalyticsView data={data} month={month} />;
}
