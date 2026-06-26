import { listConversations } from "@/services/assistant";
import { isAiConfigured } from "@/lib/ai/model";
import { getCurrentUser } from "@/lib/user";
import { AssistantView } from "@/components/assistant/assistant-view";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const [conversations, { user }] = await Promise.all([listConversations(), getCurrentUser()]);
  // Current month name (e.g. "June") for the sample prompts — computed server-side so SSR and
  // hydration agree. force-dynamic keeps it fresh per request.
  const tripMonth = new Date().toLocaleDateString("en-US", { month: "long" });
  return (
    <AssistantView
      conversations={conversations}
      configured={isAiConfigured()}
      name={user.name}
      image={user.image}
      tripMonth={tripMonth}
    />
  );
}
